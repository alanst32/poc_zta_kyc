// The authorisation-correctness matrix (plan Part A §5 / D6), shared by the offline policy
// tests and the deployed-stack tests so both check exactly the same cases.
//
// "-ctl" rows are positive controls. Each one differs from its DENY case in a single fact,
// so the expected determining policy is the only possible cause of the DENY.
//
// expectedPolicies: the policies Cedar reports as determining the decision.
//   ALLOW                -> ["P1-tenant-isolation"] (the permit that matched)
//   DENY by a forbid     -> the forbid(s) that matched
//   DENY by default      -> [] (no permit matched: Cedar's implicit deny)

import { TENANTS, USERS } from "../../seed/fixtures";
import type { Decision } from "../../src/authorizer/types";
import { API_ROUTES } from "../../src/shared/routes";
import { memoryFacts } from "./memory-facts";
import { expected, type Expectation } from "./oracle";

export interface DecisionCase {
  id: string;
  scenario: string;
  user: string;
  method: "GET" | "POST";
  tenant: string;
  subPath: string;
  expected: Decision;
  expectedPolicies: string[];
}

const P1 = "P1-tenant-isolation";
// A user with no relationship to the tenant has no KycState/RiskScores/Memberships row there,
// so the PEP fills the fail-closed ABSENT values (src/authorizer/cedar.ts). P1 does not
// permit, and P2/P3/P4 fire on those values, and P5 on the empty role set.
const NO_RELATIONSHIP = ["P2-kyc-tier", "P3-kyc-expiry", "P4-risk-revocation", "P5-role"];
// A member (so they have a role) whose KycState and RiskScores rows are missing.
const NO_COMPLIANCE_ROWS = ["P2-kyc-tier", "P3-kyc-expiry", "P4-risk-revocation"];

export const STATIC_CASES: DecisionCase[] = [
  { id: "T1", scenario: "Own tenant, sufficient KYC (alice L2 -> Aurora InitiatePayment, needs L2)",
    user: "u-alice", method: "POST", tenant: "neobank-aurora", subPath: "/payments", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T2", scenario: "Cross-tenant: alice is not a member of Meridian (P1 does not permit)",
    user: "u-alice", method: "GET", tenant: "wealth-meridian", subPath: "/accounts", expected: "DENY", expectedPolicies: NO_RELATIONSHIP },
  { id: "T2-ctl", scenario: "Control: Meridian member (bob) on the same route",
    user: "u-bob", method: "GET", tenant: "wealth-meridian", subPath: "/accounts", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T3", scenario: "Per-tenant KYC: alice L2 in SwiftRemit -> SendInternational (needs L3; she holds the role)",
    user: "u-alice", method: "POST", tenant: "remit-swift", subPath: "/remittance/international", expected: "DENY", expectedPolicies: ["P2-kyc-tier"] },
  { id: "T3-ctl", scenario: "Control: same user in Aurora -> ViewAccounts (L1)",
    user: "u-alice", method: "GET", tenant: "neobank-aurora", subPath: "/accounts", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T4", scenario: "Expired KYC (dave: past kyc_expires_at, status still 'active')",
    user: "u-dave", method: "POST", tenant: "neobank-aurora", subPath: "/payments", expected: "DENY", expectedPolicies: ["P3-kyc-expiry"] },

  { id: "T5", scenario: "Revoked relationship (erin: status=revoked in SwiftRemit)",
    user: "u-erin", method: "GET", tenant: "remit-swift", subPath: "/accounts", expected: "DENY", expectedPolicies: ["P4-risk-revocation"] },
  { id: "T5-ctl", scenario: "Control: same user, other tenant, still active (revocation is per relationship)",
    user: "u-erin", method: "GET", tenant: "neobank-aurora", subPath: "/accounts", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T7", scenario: "Insufficient tier (carol L1 -> InitiatePayment, needs L2; she holds an allowed role)",
    user: "u-carol", method: "POST", tenant: "neobank-aurora", subPath: "/payments", expected: "DENY", expectedPolicies: ["P2-kyc-tier"] },
  { id: "T7-ctl", scenario: "Control: same user, L1 action (ViewAccounts)",
    user: "u-carol", method: "GET", tenant: "neobank-aurora", subPath: "/accounts", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T8", scenario: "Role boundary (alice account_holder -> ManageUsers, tenant_admin only)",
    user: "u-alice", method: "POST", tenant: "neobank-aurora", subPath: "/admin/users", expected: "DENY", expectedPolicies: ["P5-role"] },
  { id: "T8-ctl", scenario: "Control: tenant_admin (frank) on the same route",
    user: "u-frank", method: "POST", tenant: "neobank-aurora", subPath: "/admin/users", expected: "ALLOW", expectedPolicies: [P1] },

  // ---- Extended cases (beyond plan D6) ----
  { id: "T3-ctl2", scenario: "Control: L3 user (grace) on the L3 route in SwiftRemit (boundary: level == requirement)",
    user: "u-grace", method: "POST", tenant: "remit-swift", subPath: "/remittance/international", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T9", scenario: "Per-tenant KYC divergence: grace is L1 in Aurora -> InitiatePayment (needs L2)",
    user: "u-grace", method: "POST", tenant: "neobank-aurora", subPath: "/payments", expected: "DENY", expectedPolicies: ["P2-kyc-tier"] },
  { id: "T9-ctl", scenario: "Control: same user, same moment, SwiftRemit (L3) -> InitiatePayment",
    user: "u-grace", method: "POST", tenant: "remit-swift", subPath: "/payments", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T10", scenario: "KYC status 'expired' (heidi, expiry date still in the future)",
    user: "u-heidi", method: "GET", tenant: "neobank-aurora", subPath: "/accounts", expected: "DENY", expectedPolicies: ["P4-risk-revocation"] },
  { id: "T10-ctl", scenario: "Control: same user, other tenant, status active",
    user: "u-heidi", method: "GET", tenant: "remit-swift", subPath: "/accounts", expected: "ALLOW", expectedPolicies: [P1] },

  { id: "T11a", scenario: "Several gates fail at once (ivan: L1, expired, revoked, risk 95) -> InitiatePayment",
    user: "u-ivan", method: "POST", tenant: "neobank-aurora", subPath: "/payments", expected: "DENY", expectedPolicies: ["P2-kyc-tier", "P3-kyc-expiry", "P4-risk-revocation"] },
  { id: "T11b", scenario: "Same user -> ManageUsers (L1 is enough, so P2 does not fire; P5 does)",
    user: "u-ivan", method: "POST", tenant: "neobank-aurora", subPath: "/admin/users", expected: "DENY", expectedPolicies: ["P3-kyc-expiry", "P4-risk-revocation", "P5-role"] },

  { id: "T12", scenario: "Member with NO KycState and NO RiskScores row (judy, Aurora): fail closed",
    user: "u-judy", method: "GET", tenant: "neobank-aurora", subPath: "/accounts", expected: "DENY", expectedPolicies: NO_COMPLIANCE_ROWS },
  { id: "T13", scenario: "Member with KycState but NO RiskScores row (judy, SwiftRemit): unknown risk = deny",
    user: "u-judy", method: "GET", tenant: "remit-swift", subPath: "/accounts", expected: "DENY", expectedPolicies: ["P4-risk-revocation"] },

  { id: "T14", scenario: "Roles are per tenant: frank is tenant_admin in Aurora but not in SwiftRemit -> ManageUsers there",
    user: "u-frank", method: "POST", tenant: "remit-swift", subPath: "/admin/users", expected: "DENY", expectedPolicies: ["P5-role"] },

  { id: "T15", scenario: "Several roles in one tenant (ken: compliance_officer + tenant_admin) -> ManageUsers",
    user: "u-ken", method: "POST", tenant: "wealth-meridian", subPath: "/admin/users", expected: "ALLOW", expectedPolicies: [P1] },

  // ---- Segregation of duties (P5 applies to every action, README D13) ----
  { id: "S1", scenario: "Segregation of duties: tenant admin + compliance officer (ken, L3) -> SendInternational (payments_operator only)",
    user: "u-ken", method: "POST", tenant: "wealth-meridian", subPath: "/remittance/international", expected: "DENY", expectedPolicies: ["P5-role"] },
  { id: "S1-ctl", scenario: "Control: payments_operator (bob, L3), same tenant -> SendInternational",
    user: "u-bob", method: "POST", tenant: "wealth-meridian", subPath: "/remittance/international", expected: "ALLOW", expectedPolicies: [P1] },
  { id: "S2", scenario: "Least privilege: member with NO role (nina, L2, active) -> ViewAccounts",
    user: "u-nina", method: "GET", tenant: "neobank-aurora", subPath: "/accounts", expected: "DENY", expectedPolicies: ["P5-role"] },
  { id: "S3", scenario: "Segregation of duties: tenant admin (frank, L2) -> InitiatePayment (account_holder/payments_operator only)",
    user: "u-frank", method: "POST", tenant: "neobank-aurora", subPath: "/payments", expected: "DENY", expectedPolicies: ["P5-role"] },
];

/**
 * G-cases: privileged actions (README D13). With the paper's original P5 (ManageUsers only),
 * G1–G4 were ALLOWED: an account holder could reach role management, payment approval,
 * account freezing and KYC status. Each DENY has a control that differs only in holding one
 * of the route's allowed roles.
 */
export const ROLE_GATE_CASES: DecisionCase[] = [
  { id: "G1", scenario: "account_holder (alice) -> ManageRoles: cannot reach role management (no self-elevation)",
    user: "u-alice", method: "POST", tenant: "neobank-aurora", subPath: "/admin/roles", expected: "DENY", expectedPolicies: ["P5-role"] },
  { id: "G1-ctl", scenario: "Control: tenant_admin (frank), same tenant -> ManageRoles",
    user: "u-frank", method: "POST", tenant: "neobank-aurora", subPath: "/admin/roles", expected: "ALLOW", expectedPolicies: [P1] },
  { id: "G2", scenario: "account_holder (alice, Aurora) -> ApprovePayment (payments_operator only)",
    user: "u-alice", method: "POST", tenant: "neobank-aurora", subPath: "/payments/approve", expected: "DENY", expectedPolicies: ["P5-role"] },
  { id: "G2-ctl", scenario: "Control: same user in SwiftRemit, where she IS a payments_operator -> ApprovePayment",
    user: "u-alice", method: "POST", tenant: "remit-swift", subPath: "/payments/approve", expected: "ALLOW", expectedPolicies: [P1] },
  { id: "G3", scenario: "account_holder (alice) -> FreezeAccount (compliance_officer only)",
    user: "u-alice", method: "POST", tenant: "neobank-aurora", subPath: "/kyc/freeze", expected: "DENY", expectedPolicies: ["P5-role"] },
  { id: "G3-ctl", scenario: "Control: compliance_officer (carol), same tenant -> FreezeAccount",
    user: "u-carol", method: "POST", tenant: "neobank-aurora", subPath: "/kyc/freeze", expected: "ALLOW", expectedPolicies: [P1] },
  { id: "G4", scenario: "account_holder (alice) -> ViewKycStatus (compliance_officer / tenant_admin only)",
    user: "u-alice", method: "GET", tenant: "neobank-aurora", subPath: "/kyc/status", expected: "DENY", expectedPolicies: ["P5-role"] },
  { id: "G4-ctl", scenario: "Control: compliance_officer (carol), same tenant -> ViewKycStatus",
    user: "u-carol", method: "GET", tenant: "neobank-aurora", subPath: "/kyc/status", expected: "ALLOW", expectedPolicies: [P1] },
];

/** T6 (real-time risk revocation) is stateful: baseline -> flip risk -> re-request -> restore. */
export const T6 = {
  user: "u-alice",
  method: "POST" as const,
  tenant: "neobank-aurora",
  subPath: "/payments",
  highRisk: 90,
  baselineRisk: 10,
};

/** Mutated live by the deployed lifecycle suite (test/lifecycle.test.ts) and restored after. */
export const LIFECYCLE = {
  user: "u-alice",
  tenant: "neobank-aurora",
  payments: { method: "POST" as const, subPath: "/payments" }, // L2 route
  manageUsers: { method: "POST" as const, subPath: "/admin/users" }, // P5 route
};

// ---------------- Generated matrix ----------------

export interface MatrixCase extends DecisionCase {
  reason: Expectation["reason"];
}

/**
 * Every fixture user x every tenant x every API route (mapped or not), with the expected
 * outcome from the specification oracle (./oracle.ts) over the seeded facts. Ids look like
 * "M-alice-aurora-InitiatePayment".
 */
export async function matrixCases(now: number): Promise<MatrixCase[]> {
  const mem = memoryFacts(now);
  const cases: MatrixCase[] = [];
  for (const u of USERS) {
    for (const t of TENANTS) {
      for (const r of API_ROUTES) {
        const subPath = r.path.replace("/tenants/{tenantId}", "");
        const route = `${r.method} ${r.path}`;
        const facts = await mem.source.load(u.username, t.tenant_id, route);
        // Fixtures have no sign-out markers, so the token's issue time does not matter here.
        const e = expected(facts, t.tenant_id, now, now);
        const action = facts.api?.action ?? `unmapped${subPath.replace(/\//g, "-")}`;
        cases.push({
          id: `M-${u.username.slice(2)}-${t.tenant_id.split("-")[1]}-${action}`,
          scenario: `${u.username} -> ${t.tenant_id} ${r.method} ${subPath}`,
          user: u.username,
          method: r.method,
          tenant: t.tenant_id,
          subPath,
          expected: e.decision,
          expectedPolicies: e.policies,
          reason: e.reason,
        });
      }
    }
  }
  return cases;
}

export const routeKeyOf = (c: { method: string; subPath: string }) => `${c.method} /tenants/{tenantId}${c.subPath}`;
export const urlPathOf = (c: { tenant: string; subPath: string }) => `/tenants/${c.tenant}${c.subPath}`;
