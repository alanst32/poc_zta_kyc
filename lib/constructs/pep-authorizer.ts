// The Policy Enforcement Point: the Lambda authoriser (src/authorizer/) wired to its three
// dependencies (identity, facts, PDP) with least-privilege access to each.
import * as cdk from "aws-cdk-lib";
import { HttpLambdaAuthorizer, HttpLambdaResponseType } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { Construct } from "constructs";
import { CedarPolicyStore } from "./cedar-policy-store";
import { IdentityProvider } from "./identity-provider";
import { KycDataStore } from "./kyc-data-store";
import { ZtaFunction } from "./zta-function";

export interface PepAuthorizerProps {
  identity: IdentityProvider;
  data: KycDataStore;
  policyStore: CedarPolicyStore;
}

export class PepAuthorizer extends Construct {
  readonly lambda: ZtaFunction;
  /** Attach to an HTTP API as its default authoriser. */
  readonly httpAuthorizer: HttpLambdaAuthorizer;

  constructor(scope: Construct, id: string, props: PepAuthorizerProps) {
    super(scope, id);

    this.lambda = new ZtaFunction(this, "Lambda", {
      entry: "src/authorizer/handler.ts",
      environment: {
        ...props.identity.pepEnvironment(),
        ...props.data.pepEnvironment(),
        ...props.policyStore.pepEnvironment(),
      },
    });

    // The ONLY permissions the PEP has (JWKS is fetched over public HTTPS, so Cognito needs no IAM).
    props.data.grantPepReads(this.lambda.function);
    props.policyStore.grantIsAuthorized(this.lambda.function);

    this.httpAuthorizer = new HttpLambdaAuthorizer("ZtaPep", this.lambda.function, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      // CRITICAL: caching disabled. A cached ALLOW would survive a revocation for the cache
      // TTL and invalidate the real-time revocation results (T6, A3).
      resultsCacheTtl: cdk.Duration.seconds(0),
      identitySource: ["$request.header.Authorization"],
    });
  }
}
