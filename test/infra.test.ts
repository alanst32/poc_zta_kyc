// OFFLINE infrastructure assertions (part of `npm test`). Synthesises the stack and pins the
// properties the experiment's claims depend on, so a refactor cannot silently weaken them.
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPolicies } from "../cedar/load";
import { ZtaStack } from "../lib/zta-stack";
import { API_ROUTES } from "../src/shared/routes";

let template: Template;

beforeAll(() => {
  // Skip esbuild bundling: these tests are about infrastructure, not Lambda code.
  const app = new cdk.App({ context: { "aws:cdk:bundling-stacks": [] } });
  const stack = new ZtaStack(app, "ZtaKycExperiment", { env: { account: "111111111111", region: "ap-southeast-2" } });
  template = Template.fromStack(stack);
});

describe("Infrastructure invariants", () => {
  it("authoriser result caching is disabled (real-time revocation, T6/A3)", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Authorizer", {
      AuthorizerType: "REQUEST",
      AuthorizerResultTtlInSeconds: 0,
      EnableSimpleResponses: true,
    });
  });

  it("every API route is behind the PEP (no unauthenticated route)", () => {
    const routes = template.findResources("AWS::ApiGatewayV2::Route");
    expect(Object.keys(routes)).toHaveLength(API_ROUTES.length);
    for (const r of Object.values(routes)) expect(r.Properties.AuthorizationType).toBe("CUSTOM");
  });

  it("Verified Permissions store validates STRICT and holds exactly the repo policy files", () => {
    template.hasResourceProperties("AWS::VerifiedPermissions::PolicyStore", { ValidationSettings: { Mode: "STRICT" } });
    const deployed = Object.values(template.findResources("AWS::VerifiedPermissions::Policy"))
      .map((p) => p.Properties.Definition.Static.Statement)
      .sort();
    expect(deployed).toEqual(loadPolicies().map((p) => p.statement).sort());
  });

  it("PEP IAM is least privilege: GetItem x4, Query x1, IsAuthorized x1, nothing else", () => {
    const pepPolicies = Object.values(template.findResources("AWS::IAM::Policy")).filter((p) =>
      JSON.stringify(p).includes("verifiedpermissions:IsAuthorized"),
    );
    expect(pepPolicies).toHaveLength(1);
    const statements = pepPolicies[0]!.Properties.PolicyDocument.Statement as Array<{ Action: string; Resource: unknown }>;
    expect(statements.map((s) => s.Action).sort()).toEqual([
      "dynamodb:GetItem",
      "dynamodb:Query",
      "verifiedpermissions:IsAuthorized",
    ]);
    const getItem = statements.find((s) => s.Action === "dynamodb:GetItem")!;
    expect(getItem.Resource).toHaveLength(4);
  });

  it("everything stateful is disposable (cdk destroy leaves nothing)", () => {
    for (const type of ["AWS::DynamoDB::Table", "AWS::Cognito::UserPool", "AWS::Logs::LogGroup", "AWS::VerifiedPermissions::PolicyStore", "AWS::VerifiedPermissions::Policy"]) {
      for (const [id, r] of Object.entries(template.findResources(type))) {
        expect(r.DeletionPolicy, `${type} ${id}`).toBe("Delete");
      }
    }
    template.allResourcesProperties("AWS::DynamoDB::Table", { BillingMode: "PAY_PER_REQUEST" });
  });

  it("stack outputs consumed by the tooling are present", () => {
    for (const name of ["ApiUrl", "Region", "UserPoolId", "UserPoolClientId", "PolicyStoreId", "TenantsTable", "MembershipsTable", "KycTable", "RiskTable", "ApiMetadataTable", "SessionsTable", "AuthorizerFunctionName", "AuthorizerLogGroup", "ApiAccessLogGroup", "LambdaMemoryMb"]) {
      template.hasOutput(name, Match.anyValue());
    }
  });
});
