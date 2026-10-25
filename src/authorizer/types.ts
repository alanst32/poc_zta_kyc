// Shared types for the PEP. The "Row" types mirror the DynamoDB tables in the plan (Part C2).

// ---------- DynamoDB rows ----------

export interface TenantRow {
  tenant_id: string;
  name: string;
}

export interface MembershipRow {
  user_id: string;
  tenant_id: string;
  roles: string[];
}

export type KycStatus = "active" | "expired" | "revoked";

/** Layer B of the two-layer KYC model: compliance state per (user x tenant). */
export interface KycStateRow {
  user_id: string;
  tenant_id: string;
  kyc_level: number;
  kyc_verified_at: number; // epoch seconds
  kyc_expires_at: number; // epoch seconds
  status: KycStatus;
}

export interface RiskScoreRow {
  user_id: string;
  tenant_id: string;
  risk_score: number; // 0-100
  updated_at: number; // epoch seconds
}

/** Per user (not per tenant): sign-out marker. Tokens issued at or before it are refused (P6). */
export interface SessionRow {
  user_id: string;
  tokens_valid_after: number; // epoch seconds
}

/** Hand-authored route -> requirements (future work: derive from the OpenAPI contract). */
export interface ApiMetadataRow {
  route: string; // API Gateway routeKey
  action: string; // Cedar action id, e.g. "InitiatePayment"
  resource_type: string; // Cedar entity type WITHOUT the PayVault:: namespace, e.g. "Payment"
  required_kyc_level: number;
  /** Deny above this live risk score (P4). */
  risk_threshold: number;
  /** Roles allowed to call this route (plan C2). P5 requires one of them, in the request's
   *  tenant, for every action (README D13). */
  allowed_roles: string[];
}

/** Everything the PEP reads from DynamoDB for one request. All reads are strongly consistent. */
export interface RequestFacts {
  api?: ApiMetadataRow;
  /** ALL of the user's memberships: they become the User entity's parents. */
  memberships: MembershipRow[];
  /** Relationship-level facts for (user, requested tenant). */
  kyc?: KycStateRow;
  risk?: RiskScoreRow;
  /** The user's sign-out marker, if they have ever been signed out (P6). */
  session?: SessionRow;
}

/** Where the PEP gets its facts: DynamoDB when deployed, in-memory fixtures in offline tests. */
export interface FactSource {
  load(userId: string, tenantId: string, route: string): Promise<RequestFacts>;
}

// ---------- Cedar request (Cedar JSON format, sent to AVP and to cedar-wasm unchanged) ----------

export interface EntityRef {
  type: string;
  id: string;
}

export type CedarValue =
  | string
  | number
  | boolean
  | { __entity: EntityRef }
  | CedarValue[]
  | { [key: string]: CedarValue };

export interface CedarEntity {
  uid: EntityRef;
  attrs: Record<string, CedarValue>;
  parents: EntityRef[];
}

export interface AuthzRequest {
  principal: EntityRef;
  action: EntityRef;
  resource: EntityRef;
  context: Record<string, CedarValue>;
  entities: CedarEntity[];
}

// ---------- decisions ----------

export type Decision = "ALLOW" | "DENY";

export interface PdpResult {
  decision: Decision;
  /** Policy names (e.g. "P4-risk-revocation") that determined the decision. */
  determiningPolicies: string[];
  errors: string[];
}

/** The Policy Decision Point: Verified Permissions when deployed, cedar-wasm offline. */
export interface Pdp {
  isAuthorized(request: AuthzRequest): Promise<PdpResult>;
}

/** Verified identity. The JWT is used for identity only: no tenant, KYC or risk is read from it. */
export interface Identity {
  userId: string; // Cognito `sub`
  username: string;
  /** Token issued-at time (`iat`), epoch seconds. Compared with the sign-out marker (P6). */
  issuedAt: number;
}

export interface TokenVerifier {
  verify(token: string): Promise<Identity>;
}
