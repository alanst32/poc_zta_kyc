// In-memory FactSource built from the fixtures: what DynamoDB would hold after `npm run seed`
// (user_id = username here, since offline there is no Cognito sub). Mutable, so offline
// tests can flip risk/status the same way the deployed tests flip DynamoDB rows.
import { API_METADATA, TENANTS, USERS } from "../../seed/fixtures";
import type {
  FactSource,
  KycStateRow,
  MembershipRow,
  RiskScoreRow,
  SessionRow,
} from "../../src/authorizer/types";

export function memoryFacts(now: number) {
  const memberships: MembershipRow[] = [];
  const kyc: KycStateRow[] = [];
  const risk: RiskScoreRow[] = [];
  for (const u of USERS) {
    for (const r of u.relationships) {
      const key = { user_id: u.username, tenant_id: r.tenant };
      memberships.push({ ...key, roles: [...r.roles] });
      if (!r.omit?.includes("kyc"))
        kyc.push({ ...key, kyc_level: r.kyc_level, kyc_verified_at: now - 30 * 86400, kyc_expires_at: now + r.expires_in, status: r.status });
      if (!r.omit?.includes("risk")) risk.push({ ...key, risk_score: r.risk_score, updated_at: now });
    }
  }
  const sessions: SessionRow[] = []; // nobody starts signed out
  const state = { tenants: structuredClone(TENANTS), api: structuredClone(API_METADATA), memberships, kyc, risk, sessions };
  const find = <T extends { user_id: string; tenant_id: string }>(rows: T[], u: string, t: string) =>
    rows.find((r) => r.user_id === u && r.tenant_id === t);

  const source: FactSource = {
    async load(userId, tenantId, route) {
      return structuredClone({
        api: state.api.find((a) => a.route === route),
        memberships: state.memberships.filter((m) => m.user_id === userId),
        kyc: find(state.kyc, userId, tenantId),
        risk: find(state.risk, userId, tenantId),
        session: state.sessions.find((s) => s.user_id === userId),
      });
    },
  };
  return {
    source,
    state,
    kycOf: (u: string, t: string) => find(state.kyc, u, t)!,
    riskOf: (u: string, t: string) => find(state.risk, u, t)!,
  };
}
