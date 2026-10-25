// DEPLOYED lifecycle cases L1–L6: a fact changes in DynamoDB while the user keeps the SAME
// access token, and the very next request must reflect it. They extend T6 (risk) to every
// kind of fact the policies read, in both directions (losing and gaining access):
//
//   L1  risk boundary        RiskScores 70 -> 71              P4 '>' threshold, exactly at the edge
//   L2  KYC downgrade        KycState level 2 -> 1            P2
//   L3  KYC expiry passes    KycState expires_at = now + 5 s  P3, by time alone (no write at expiry)
//   L4  role grant / revoke  Memberships roles + tenant_admin P5 (access GAINED, then lost)
//   L5  offboarding          Memberships row deleted          P1 no longer permits; P5 (no role left)
//   L6  reinstatement        KycState revoked -> active       P4 (access comes back without a new token)
//   L7  role downgrade       Memberships account_holder -> account_viewer   P5 (stops moving money)
//
// Every test snapshots the rows it touches and restores them exactly in `finally`.

import { afterAll, describe, expect, it } from "vitest";
import { RISK_THRESHOLD } from "../seed/fixtures";
import { LIFECYCLE, urlPathOf } from "./support/cases";
import { accessToken, call, environmentInfo } from "./support/client";
import { P1, P2, P3, P4, P5 } from "./support/oracle";
import { ResultsTable } from "./support/results";
import {
  deleteRow,
  restore,
  setKycExpiry,
  setKycLevel,
  setKycStatus,
  setRiskScore,
  setRoles,
  snapshot,
  type FactTable,
} from "./support/state";

const results = new ResultsTable("lifecycle", environmentInfo());
afterAll(() => results.write());

const { user, tenant } = LIFECYCLE;
type Route = { method: "GET" | "POST"; subPath: string; tenant: string };
const payments: Route = { ...LIFECYCLE.payments, tenant };
const manageUsers: Route = { ...LIFECYCLE.manageUsers, tenant };
const accounts: Route = { method: "GET", subPath: "/accounts", tenant };

/** Runs `body` with the given rows snapshotted, and restores them afterwards. */
async function withRestore(tables: FactTable[], body: () => Promise<void>) {
  const snaps = await Promise.all(tables.map((t) => snapshot(t, user, tenant)));
  try {
    await body();
  } finally {
    for (const s of snaps) await restore(s);
  }
}

/** A stateful case: a series of (phase, request) steps with expected decisions. */
async function steps(
  id: string,
  scenario: string,
  plan: Array<{ phase: string; route: Route; expect: "ALLOW" | "DENY"; policies: string[]; before?: () => Promise<unknown> }>,
) {
  const token = await accessToken(user);
  const actual: string[] = [];
  const timings: string[] = [];
  for (const s of plan) {
    const t0 = performance.now();
    if (s.before) await s.before();
    const r = await call({ method: s.route.method, path: urlPathOf(s.route), token, caseId: id, phase: s.phase });
    actual.push(r.decision);
    if (s.before) timings.push(`${s.phase}: write-to-decision ${(performance.now() - t0).toFixed(0)} ms`);
  }
  const want = plan.map((s) => s.expect);
  results.add({
    id,
    scenario,
    expected: want.join(" -> "),
    actual: actual.join(" -> "),
    detail: timings.join("; "),
    pass: actual.join() === want.join(),
    expectedPolicies: Object.fromEntries(plan.map((s) => [s.phase, s.policies])),
  });
  expect(actual).toEqual(want);
}

describe("Lifecycle: live fact changes, same token (deployed)", () => {
  it("L1: risk exactly at the threshold is allowed, one above is denied", async () => {
    await withRestore(["risk"], () =>
      steps("L1", `Risk boundary: ${RISK_THRESHOLD} (= threshold) -> ${RISK_THRESHOLD + 1}`, [
        { phase: "at-threshold", route: payments, expect: "ALLOW", policies: [P1], before: () => setRiskScore(user, tenant, RISK_THRESHOLD) },
        { phase: "above-threshold", route: payments, expect: "DENY", policies: [P4], before: () => setRiskScore(user, tenant, RISK_THRESHOLD + 1) },
      ]),
    );
  });

  it("L2: KYC downgraded from L2 to L1 -> L2 route denied, L1 route still allowed", async () => {
    await withRestore(["kyc"], () =>
      steps("L2", "KYC downgrade 2 -> 1 (InitiatePayment needs L2; ViewAccounts needs L1)", [
        { phase: "baseline", route: payments, expect: "ALLOW", policies: [P1] },
        { phase: "downgraded", route: payments, expect: "DENY", policies: [P2], before: () => setKycLevel(user, tenant, 1) },
        { phase: "downgraded-l1-route", route: accounts, expect: "ALLOW", policies: [P1] },
      ]),
    );
  });

  it("L3: KYC expiry passes with no write at all -> denied once now >= expires_at", { timeout: 60_000 }, async () => {
    await withRestore(["kyc"], async () => {
      const token = await accessToken(user);
      const req = (phase: string) => call({ method: payments.method, path: urlPathOf(payments), token, caseId: "L3", phase });
      const expiresAt = Math.floor(Date.now() / 1000) + 5;
      await setKycExpiry(user, tenant, expiresAt);
      const before = await req("before-expiry");

      // Poll once a second. The PEP clock (Lambda) decides; the client clock only paces the poll.
      let polled = before;
      let deniedAtS = NaN;
      for (let i = 0; i < 30 && polled.decision === "ALLOW"; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        polled = await req("polling");
        if (polled.decision === "DENY") deniedAtS = Date.now() / 1000 - expiresAt;
      }
      const after = await req("after-expiry"); // one clean request whose policies are checked
      const actual = `${before.decision} -> ${after.decision}`;
      results.add({
        id: "L3",
        scenario: "KYC expiry passes by time alone (expires_at = now + 5 s, no further write)",
        expected: "ALLOW -> DENY",
        actual,
        detail: `first DENY ${deniedAtS.toFixed(1)} s after expires_at (client clock)`,
        pass: actual === "ALLOW -> DENY",
        expectedPolicies: { "before-expiry": [P1], "after-expiry": [P3] },
      });
      expect(actual).toBe("ALLOW -> DENY");
    });
  });

  it("L4: tenant_admin granted -> ManageUsers allowed; revoked -> denied again", async () => {
    await withRestore(["memberships"], () =>
      steps("L4", "Role grant then revoke (account_holder -> +tenant_admin -> account_holder), ManageUsers", [
        { phase: "baseline", route: manageUsers, expect: "DENY", policies: [P5] },
        { phase: "granted", route: manageUsers, expect: "ALLOW", policies: [P1], before: () => setRoles(user, tenant, ["account_holder", "tenant_admin"]) },
        { phase: "revoked", route: manageUsers, expect: "DENY", policies: [P5], before: () => setRoles(user, tenant, ["account_holder"]) },
      ]),
    );
  });

  it("L5: membership deleted (offboarding) -> P1 no longer permits", async () => {
    await withRestore(["memberships"], () =>
      steps("L5", "Offboarding: Memberships row deleted (KYC and risk rows left in place)", [
        { phase: "baseline", route: payments, expect: "ALLOW", policies: [P1] },
        // KYC/risk are still fine. With no membership there is no role either, so P5 fires
        // (and P1 no longer permits).
        { phase: "offboarded", route: payments, expect: "DENY", policies: [P5], before: () => deleteRow("memberships", user, tenant) },
      ]),
    );
  });

  it("L7: downgraded to a view-only role -> can still view, can no longer initiate payments", async () => {
    await withRestore(["memberships"], () =>
      steps("L7", "Role downgrade (account_holder -> account_viewer): payments stop, viewing continues", [
        { phase: "baseline", route: payments, expect: "ALLOW", policies: [P1] },
        { phase: "downgraded", route: payments, expect: "DENY", policies: [P5], before: () => setRoles(user, tenant, ["account_viewer"]) },
        { phase: "downgraded-view", route: accounts, expect: "ALLOW", policies: [P1] },
      ]),
    );
  });

  it("L6: relationship revoked then reinstated -> access returns on the same token", async () => {
    await withRestore(["kyc"], () =>
      steps("L6", "Revoke then reinstate (KycState status active -> revoked -> active)", [
        { phase: "baseline", route: payments, expect: "ALLOW", policies: [P1] },
        { phase: "revoked", route: payments, expect: "DENY", policies: [P4], before: () => setKycStatus(user, tenant, "revoked") },
        { phase: "reinstated", route: payments, expect: "ALLOW", policies: [P1], before: () => setKycStatus(user, tenant, "active") },
      ]),
    );
  });
});
