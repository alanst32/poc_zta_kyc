// The specification oracle: the policy set P1–P6 (P5 revised in README D13, P6 added in D14) restated as plain TypeScript over
// the RAW DynamoDB facts. It gives the expected decision and determining policies for any
// generated case, so the matrix and grid suites can check hundreds or thousands of cases
// without hand-writing each expectation.
//
// It is deliberately independent of src/authorizer/cedar.ts: it does not use the ABSENT
// fail-closed constants or build a Cedar request. It states what a missing row MUST mean
// ("unknown KYC fails every KYC gate", "unknown risk is too risky"). Agreement between the
// oracle and Cedar therefore checks the PEP's fact-to-Cedar mapping as well as the policies.
//
// Determining policies follow Cedar's semantics:
//   ALLOW               -> ["P1-tenant-isolation"]  (the permit that matched)
//   DENY, forbid(s) hit -> every forbid whose condition holds (sorted)
//   DENY, nothing hit   -> []                        (no permit matched: implicit deny)

import type { Decision, RequestFacts } from "../../src/authorizer/types";

export const P1 = "P1-tenant-isolation";
export const P2 = "P2-kyc-tier";
export const P3 = "P3-kyc-expiry";
export const P4 = "P4-risk-revocation";
export const P5 = "P5-role";
export const P6 = "P6-session-revocation";

export interface Expectation {
  decision: Decision;
  policies: string[];
  /** The PEP's reason, as logged in the decision record. */
  reason: "unmapped-route" | "pdp-deny" | "pdp-allow";
}

/** @param tokenIat the access token's issued-at time (epoch seconds), for P6. */
export function expected(facts: RequestFacts, tenantId: string, now: number, tokenIat: number): Expectation {
  const { api, kyc, risk } = facts;
  if (!api) return { decision: "DENY", policies: [], reason: "unmapped-route" };

  const membership = facts.memberships.find((m) => m.tenant_id === tenantId);
  const roles = membership?.roles ?? [];
  const fired: string[] = [];

  // P2: KYC tier for this tenant below the action's requirement (unknown tier = below).
  if (!kyc || kyc.kyc_level < api.required_kyc_level) fired.push(P2);
  // P3: KYC for this tenant expired by timestamp (unknown expiry = expired).
  if (!kyc || kyc.kyc_expires_at <= now) fired.push(P3);
  // P4: relationship not active, or live risk above the route's threshold (unknown = too risky).
  if (!kyc || kyc.status !== "active" || !risk || risk.risk_score > api.risk_threshold) fired.push(P4);
  // P5: every action needs one of the route's allowed roles IN THIS TENANT.
  if (!roles.some((r) => api.allowed_roles.includes(r))) fired.push(P5);
  // P6: the token was issued at or before the user's last sign-out (no row = never signed out).
  if (facts.session && tokenIat <= facts.session.tokens_valid_after) fired.push(P6);

  if (fired.length > 0) return { decision: "DENY", policies: fired.sort(), reason: "pdp-deny" };
  // P1: the only permit. Membership of the path tenant.
  if (!membership) return { decision: "DENY", policies: [], reason: "pdp-deny" };
  return { decision: "ALLOW", policies: [P1], reason: "pdp-allow" };
}

/** Short label for a determining-policy set, e.g. "P2+P3+P4", "P1", "default deny". */
export function policyLabel(policies: string[]): string {
  if (policies.length === 0) return "default deny";
  return policies.map((p) => p.split("-")[0]).join("+");
}
