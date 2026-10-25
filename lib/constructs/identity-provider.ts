// Cognito: identity only. Tokens carry `sub`/`username`; no tenant, KYC or risk claims
// (those are authoritative in DynamoDB and read live by the PEP).
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { REMOVAL_POLICY } from "../config";

export class IdentityProvider extends Construct {
  readonly userPool: cognito.UserPool;
  readonly testClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false, // only the seed script creates (synthetic) users
      signInAliases: { username: true },
      passwordPolicy: { minLength: 16, requireSymbols: false },
      removalPolicy: REMOVAL_POLICY,
    });

    this.testClient = this.userPool.addClient("TestClient", {
      authFlows: { userPassword: true }, // USER_PASSWORD_AUTH, used by the test harness
      generateSecret: false,
      // Shortest Cognito allows. Revocation does NOT depend on this (risk/KYC are read live),
      // but a short TTL limits stale identity and makes the expired-token case (A4) practical.
      accessTokenValidity: cdk.Duration.minutes(5),
      idTokenValidity: cdk.Duration.minutes(5),
      refreshTokenValidity: cdk.Duration.hours(1),
      preventUserExistenceErrors: true,
    });
  }

  /** Environment variables the PEP's JWT verifier expects. */
  pepEnvironment(): Record<string, string> {
    return {
      USER_POOL_ID: this.userPool.userPoolId,
      USER_POOL_CLIENT_ID: this.testClient.userPoolClientId,
    };
  }
}
