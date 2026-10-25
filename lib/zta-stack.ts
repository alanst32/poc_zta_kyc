// The experiment stack: composes the constructs in lib/constructs/ and exports the values
// the seed, test and bench tooling read from .zta/outputs.json.
//
//   IdentityProvider ──┐
//   KycDataStore ──────┼──▶ PepAuthorizer ──▶ ProtectedApi
//   CedarPolicyStore ──┘
//
// Everything is RemovalPolicy.DESTROY, so `cdk destroy` leaves nothing behind.

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { API_ROUTES } from "../src/shared/routes";
import { LAMBDA_SETTINGS } from "./config";
import { CedarPolicyStore } from "./constructs/cedar-policy-store";
import { IdentityProvider } from "./constructs/identity-provider";
import { KycDataStore } from "./constructs/kyc-data-store";
import { PepAuthorizer } from "./constructs/pep-authorizer";
import { ProtectedApi } from "./constructs/protected-api";

export class ZtaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const identity = new IdentityProvider(this, "Identity");
    const data = new KycDataStore(this, "Data");
    const policyStore = new CedarPolicyStore(this, "PolicyStore");
    const authorizer = new PepAuthorizer(this, "Pep", { identity, data, policyStore });
    const api = new ProtectedApi(this, "Api", { authorizer, routes: API_ROUTES });

    // Output names are a contract with test/support/env.ts: keep them stable.
    const out = (name: string, value: string) => new cdk.CfnOutput(this, name, { value });
    out("ApiUrl", api.api.apiEndpoint);
    out("Region", this.region);
    out("UserPoolId", identity.userPool.userPoolId);
    out("UserPoolClientId", identity.testClient.userPoolClientId);
    out("PolicyStoreId", policyStore.policyStoreId);
    out("TenantsTable", data.tenants.tableName);
    out("MembershipsTable", data.memberships.tableName);
    out("KycTable", data.kycState.tableName);
    out("RiskTable", data.riskScores.tableName);
    out("ApiMetadataTable", data.apiMetadata.tableName);
    out("SessionsTable", data.sessions.tableName);
    out("AuthorizerFunctionName", authorizer.lambda.function.functionName);
    out("AuthorizerLogGroup", authorizer.lambda.logGroup.logGroupName);
    out("ApiAccessLogGroup", api.accessLogs.logGroupName);
    out("LambdaMemoryMb", String(LAMBDA_SETTINGS.memorySize));
  }
}
