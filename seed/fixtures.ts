// PayVault fixtures (plan Part D). Synthetic data only, never real personal data.
//
// Every fixture exists to make a test case reachable, and wherever possible as a MINIMAL
// PAIR: a DENY case and an ALLOW control that differ in exactly one fact, so a single
// policy is the only possible cause of the DENY. Cases are listed in test/support/cases.ts.
//
// Users are keyed by Cognito USERNAME here. The seed script creates the Cognito users,
// resolves each one's immutable `sub`, and writes `sub` as user_id to DynamoDB.

import { API_ROUTES, routeKey } from "../src/shared/routes";
import type { ApiMetadataRow, KycStatus, TenantRow } from "../src/authorizer/types";

export const DAY = 24 * 3600;
export const YEAR = 365 * DAY;

// ---------------- Tenants (D2) ----------------
// Their profiles differ in KYC strictness. In the paper's model that strictness is expressed
// per endpoint (ApiMetadata.required_kyc_level) and per relationship (KycState), not as a
// tenant attribute.
export const TENANTS: TenantRow[] = [
  { tenant_id: "neobank-aurora", name: "Aurora Neobank" }, // retail banking, standard KYC
  { tenant_id: "remit-swift", name: "SwiftRemit" }, // cross-border remittance, enhanced KYC
  { tenant_id: "wealth-meridian", name: "Meridian Wealth" }, // investment / wealth, strictest KYC
];

// ---------------- API metadata (D4 + risk_threshold) ----------------
// Hand-authored on purpose (experimental control). Production would generate these rows
// from OpenAPI extensions (x-required-kyc-level / x-allowed-roles). Future work.
// allowed_roles: the roles that may call the route. P5 enforces it for EVERY route (README D13):
// a member holding none of these roles in the tenant is denied. These lists are therefore the
// role-based access matrix of the system, and segregation of duties follows from them (e.g.
// only payments_operator may SendInternational or ApprovePayment).
export const RISK_THRESHOLD = 70;

const meta = (
  method: "GET" | "POST",
  subPath: string,
  action: string,
  resource_type: string,
  required_kyc_level: number,
  allowed_roles: string[],
): ApiMetadataRow => ({
  route: `${method} /tenants/{tenantId}${subPath}`,
  action,
  resource_type,
  required_kyc_level,
  risk_threshold: RISK_THRESHOLD,
  allowed_roles,
});

export const API_METADATA: ApiMetadataRow[] = [
  meta("GET", "/accounts", "ViewAccounts", "Account", 1, ["account_holder", "account_viewer", "payments_operator", "compliance_officer", "tenant_admin"]),
  meta("GET", "/transactions", "ViewTransactions", "Transaction", 1, ["account_holder", "account_viewer", "payments_operator", "compliance_officer"]),
  meta("POST", "/payments", "InitiatePayment", "Payment", 2, ["account_holder", "payments_operator"]),
  meta("POST", "/payments/approve", "ApprovePayment", "Payment", 2, ["payments_operator"]),
  meta("POST", "/statements/export", "ExportStatements", "Statement", 2, ["account_holder", "payments_operator", "compliance_officer"]),
  meta("POST", "/remittance/international", "SendInternational", "Remittance", 3, ["payments_operator"]),
  meta("GET", "/kyc/status", "ViewKycStatus", "KycRecord", 1, ["compliance_officer", "tenant_admin"]),
  meta("POST", "/kyc/freeze", "FreezeAccount", "KycRecord", 1, ["compliance_officer"]),
  meta("POST", "/admin/users", "ManageUsers", "AdminResource", 1, ["tenant_admin"]),
  meta("POST", "/admin/roles", "ManageRoles", "AdminResource", 1, ["tenant_admin"]),
  // GET /tenants/{tenantId}/reports intentionally has no row (A5: unmapped -> fail closed).
];

/** Routes that exist in API Gateway but have no metadata (must be denied). */
export const UNMAPPED_ROUTES = API_ROUTES.map(routeKey).filter(
  (k) => !API_METADATA.some((m) => m.route === k),
);

// ---------------- Users (D5, extended) ----------------
export interface RelationshipFixture {
  tenant: string;
  roles: string[];
  kyc_level: number;
  status: KycStatus;
  /** Relative to seed time. Negative = already expired. */
  expires_in: number;
  risk_score: number;
  /** Rows deliberately NOT written for this relationship (fail-closed cases T12/T13). */
  omit?: Array<"kyc" | "risk">;
}

export interface UserFixture {
  username: string;
  description: string;
  relationships: RelationshipFixture[];
}

const rel = (
  tenant: string,
  roles: string[],
  kyc_level: number,
  opts: Partial<Pick<RelationshipFixture, "status" | "expires_in" | "risk_score" | "omit">> = {},
): RelationshipFixture => ({
  tenant,
  roles,
  kyc_level,
  status: opts.status ?? "active",
  expires_in: opts.expires_in ?? YEAR,
  risk_score: opts.risk_score ?? 10,
  ...(opts.omit ? { omit: opts.omit } : {}),
});

export const USERS: UserFixture[] = [
  {
    username: "u-alice",
    // In SwiftRemit she is also a payments_operator, so T3 (SendInternational needs L3) is
    // denied by her KYC level alone (P2), not by her role. In Aurora she is only an
    // account_holder, which G1–G4 use.
    description: "Same person, two tenants, L2 in both (T1, T2, T3, T6, T8, A2, A3, G1–G4).",
    relationships: [
      rel("neobank-aurora", ["account_holder"], 2),
      rel("remit-swift", ["account_holder", "payments_operator"], 2),
    ],
  },
  {
    username: "u-bob",
    description: "Meridian payments operator at L3. Positive control for the cross-tenant case (T2).",
    relationships: [rel("wealth-meridian", ["payments_operator"], 3, { risk_score: 5 })],
  },
  {
    username: "u-carol",
    // Also an account_holder, so T7 (InitiatePayment needs L2) is denied by her KYC level
    // alone (P2): account_holder is an allowed role for that route.
    description: "Aurora compliance officer and account holder at L1 only (T7, G3-ctl, G4-ctl).",
    relationships: [rel("neobank-aurora", ["compliance_officer", "account_holder"], 1, { risk_score: 5 })],
  },
  {
    username: "u-dave",
    // status is still "active": P3 must deny on the timestamp alone (no batch job needed).
    description: "Aurora account holder, L2, KYC expired yesterday but status still 'active' (T4).",
    relationships: [rel("neobank-aurora", ["account_holder"], 2, { expires_in: -DAY })],
  },
  {
    username: "u-erin",
    // Risk is kept normal so T5 isolates the status half of P4 (T6 tests the risk half).
    // Added (beyond D5): an active Aurora relationship, showing revocation is per tenant.
    description: "Revoked in SwiftRemit, still active in Aurora (T5, T5-ctl).",
    relationships: [
      rel("remit-swift", ["account_holder"], 2, { status: "revoked" }),
      rel("neobank-aurora", ["account_holder"], 2),
    ],
  },
  {
    username: "u-frank",
    // Added (beyond D5): positive control for the P5 role gate. The SwiftRemit relationship
    // shows roles are per tenant: tenant_admin in Aurora grants nothing in SwiftRemit (T14).
    description: "Aurora tenant admin, plain account holder in SwiftRemit (T8-ctl, T14).",
    relationships: [
      rel("neobank-aurora", ["tenant_admin"], 2, { risk_score: 5 }),
      rel("remit-swift", ["account_holder"], 2),
    ],
  },

  // ---- Extended fixtures (beyond plan D5): more scenarios, each still a minimal pair ----
  {
    username: "u-grace",
    // Same person, very different KYC per tenant: L3 in SwiftRemit, only L1 in Aurora.
    description: "SwiftRemit payments operator at L3, Aurora account holder at L1 (T3-ctl2, T9).",
    relationships: [
      rel("remit-swift", ["payments_operator"], 3, { risk_score: 5 }),
      rel("neobank-aurora", ["account_holder"], 1),
    ],
  },
  {
    username: "u-heidi",
    // status "expired" with a FUTURE expiry date: isolates the status half of P4 for the
    // "expired" value (T5 covers "revoked", T4 covers the timestamp).
    description: "Aurora status 'expired' (date still in the future); SwiftRemit active (T10, T10-ctl).",
    relationships: [
      rel("neobank-aurora", ["account_holder"], 2, { status: "expired" }),
      rel("remit-swift", ["account_holder"], 2),
    ],
  },
  {
    username: "u-ivan",
    // Fails several gates at once: shows deny-overrides reports EVERY forbid that fired.
    description: "Aurora L1, KYC expired, revoked and high risk all at once (T11a, T11b).",
    relationships: [rel("neobank-aurora", ["account_holder"], 1, { expires_in: -DAY, status: "revoked", risk_score: 95 })],
  },
  {
    username: "u-judy",
    // Membership rows exist but compliance rows are missing (data-integrity failure).
    description: "Aurora member with no KycState/RiskScores rows; SwiftRemit member with no RiskScores row (T12, T13).",
    relationships: [
      rel("neobank-aurora", ["account_holder"], 2, { omit: ["kyc", "risk"] }),
      rel("remit-swift", ["account_holder"], 2, { omit: ["risk"] }),
    ],
  },
  {
    username: "u-ken",
    // Several roles in one tenant: P5 checks for ANY allowed role, not a single role value.
    description: "Meridian compliance officer AND tenant admin at L3 (T15).",
    relationships: [rel("wealth-meridian", ["compliance_officer", "tenant_admin"], 3, { risk_score: 5 })],
  },
  {
    username: "u-nina",
    // A member whose role was removed entirely: P5 denies every route (least privilege).
    description: "Aurora member with NO role, L2, active, low risk (S2).",
    relationships: [rel("neobank-aurora", [], 2)],
  },
  {
    username: "u-mallory",
    // Dedicated to the session-revocation case (A10): her tokens are signed out globally,
    // so no other case shares her.
    description: "Aurora account holder, L2; used only by A10 (sign-out, P6).",
    relationships: [rel("neobank-aurora", ["account_holder"], 2)],
  },
];
