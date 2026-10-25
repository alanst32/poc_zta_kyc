// The HTTP API fronting the protected workload. Every route goes through the PEP; the
// target Lambda stands in for the paper's EKS business tier (out of scope).
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import type { ApiRoute } from "../../src/shared/routes";
import { REMOVAL_POLICY } from "../config";
import { PepAuthorizer } from "./pep-authorizer";
import { ZtaFunction } from "./zta-function";

export interface ProtectedApiProps {
  authorizer: PepAuthorizer;
  routes: ApiRoute[];
}

export class ProtectedApi extends Construct {
  readonly api: apigw.HttpApi;
  readonly target: ZtaFunction;
  readonly accessLogs: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ProtectedApiProps) {
    super(scope, id);

    this.target = new ZtaFunction(this, "Target", { entry: "src/target/handler.ts" });

    this.api = new apigw.HttpApi(this, "HttpApi", {
      apiName: "payvault-zta",
      defaultAuthorizer: props.authorizer.httpAuthorizer, // no route can opt out
    });
    const integration = new HttpLambdaIntegration("TargetIntegration", this.target.function);
    for (const r of props.routes) {
      this.api.addRoutes({ path: r.path, methods: [apigw.HttpMethod[r.method]], integration });
    }

    // Access logs: API Gateway's own view of each request. responseLatency minus
    // integrationLatency approximates the authoriser overhead as API Gateway sees it.
    this.accessLogs = new logs.LogGroup(this, "AccessLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: REMOVAL_POLICY,
    });
    const stage = this.api.defaultStage!.node.defaultChild as apigw.CfnStage;
    stage.accessLogSettings = {
      destinationArn: this.accessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        routeKey: "$context.routeKey",
        status: "$context.status",
        responseLatency: "$context.responseLatency",
        integrationLatency: "$context.integrationLatency",
        authorizerError: "$context.authorizer.error",
        requestTimeEpoch: "$context.requestTimeEpoch",
      }),
    };
  }
}
