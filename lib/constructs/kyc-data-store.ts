// The DynamoDB tables of plan Part C2 (two-layer KYC model, Layer B per user x tenant), plus
// Sessions (README D14: per-user sign-out marker for session revocation, P6).
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { REMOVAL_POLICY } from "../config";

export class KycDataStore extends Construct {
  /** Reference data only: the paper's policies do not read tenant attributes. */
  readonly tenants: dynamodb.Table;
  /** (user_id, tenant_id) -> roles. Source of User.tenants and context.roles. */
  readonly memberships: dynamodb.Table;
  /** (user_id, tenant_id) -> kyc_level, kyc_expires_at, status. */
  readonly kycState: dynamodb.Table;
  /** (user_id, tenant_id) -> risk_score. Authoritative, read live on every request. */
  readonly riskScores: dynamodb.Table;
  /** routeKey -> action, resource_type, required_kyc_level, risk_threshold, allowed_roles. */
  readonly apiMetadata: dynamodb.Table;
  /** user_id -> tokens_valid_after (written on sign-out; P6). No row = never signed out. */
  readonly sessions: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.tenants = this.table("Tenants", "tenant_id");
    this.memberships = this.table("Memberships", "user_id", "tenant_id");
    this.kycState = this.table("KycState", "user_id", "tenant_id");
    this.riskScores = this.table("RiskScores", "user_id", "tenant_id");
    this.apiMetadata = this.table("ApiMetadata", "route");
    this.sessions = this.table("Sessions", "user_id");
  }

  /**
   * Least privilege for the PEP: point reads on the 4 per-request tables and a Query on
   * Memberships. No Scan, no writes, no access to Tenants.
   */
  grantPepReads(grantee: iam.IGrantable): void {
    grantee.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem"],
        resources: [this.kycState.tableArn, this.riskScores.tableArn, this.apiMetadata.tableArn, this.sessions.tableArn],
      }),
    );
    grantee.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({ actions: ["dynamodb:Query"], resources: [this.memberships.tableArn] }),
    );
  }

  /** Table-name environment variables the PEP expects (src/authorizer/handler.ts). */
  pepEnvironment(): Record<string, string> {
    return {
      MEMBERSHIPS_TABLE: this.memberships.tableName,
      KYC_TABLE: this.kycState.tableName,
      RISK_TABLE: this.riskScores.tableName,
      API_METADATA_TABLE: this.apiMetadata.tableName,
      SESSIONS_TABLE: this.sessions.tableName,
    };
  }

  private table(id: string, partitionKey: string, sortKey?: string): dynamodb.Table {
    return new dynamodb.Table(this, id, {
      partitionKey: { name: partitionKey, type: dynamodb.AttributeType.STRING },
      sortKey: sortKey ? { name: sortKey, type: dynamodb.AttributeType.STRING } : undefined,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: REMOVAL_POLICY,
    });
  }
}
