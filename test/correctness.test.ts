// DEPLOYED correctness matrix T1–T15 + role gate G1–G4 (plan Part A §5 / C4.1, extended). Needs a deployed + seeded
// stack (`npm run deploy && npm run seed`), then `npm run test:aws`.
//
// Each case authenticates as the fixture user, calls the route through API Gateway, and
// checks that the HTTP outcome matches the expected decision. Determining policies are in
// the authoriser's decision logs (`npm run decisions -- <run id>`).

import { afterAll, describe, expect, it } from "vitest";
import { ROLE_GATE_CASES, STATIC_CASES, T6, urlPathOf } from "./support/cases";
import { accessToken, call, environmentInfo } from "./support/client";
import { ResultsTable } from "./support/results";
import { P1, P4 } from "./support/oracle";
import { setRiskScore } from "./support/state";

const results = new ResultsTable("correctness", environmentInfo());
afterAll(() => results.write());

describe("Correctness matrix T1–T15 + G1–G4 (deployed)", () => {
  for (const c of [...STATIC_CASES, ...ROLE_GATE_CASES]) {
    it(`${c.id}: ${c.scenario} -> ${c.expected}`, async () => {
      const r = await call({ method: c.method, path: urlPathOf(c), token: await accessToken(c.user), caseId: c.id });
      results.add({
        id: c.id,
        scenario: c.scenario,
        expected: c.expected,
        actual: r.decision,
        detail: `HTTP ${r.status}`,
        pass: r.decision === c.expected,
        expectedPolicies: { "": c.expectedPolicies },
      });
      expect(r.decision).toBe(c.expected);
    });
  }

  it("T6: flip risk score above threshold -> DENY on the very next request", async () => {
    const token = await accessToken(T6.user);
    const req = { method: T6.method, path: urlPathOf(T6), token, caseId: "T6" };
    const steps: string[] = [];
    try {
      const before = await call({ ...req, phase: "baseline" });
      steps.push(before.decision);

      const tWrite = performance.now();
      await setRiskScore(T6.user, T6.tenant, T6.highRisk);
      const after = await call({ ...req, phase: "after-flip" }); // NO wait, NO new token
      const msToDeny = performance.now() - tWrite;
      steps.push(after.decision);

      await setRiskScore(T6.user, T6.tenant, T6.baselineRisk);
      const restored = await call({ ...req, phase: "restored" });
      steps.push(restored.decision);

      const pass = steps.join(",") === "ALLOW,DENY,ALLOW";
      results.add({
        id: "T6",
        scenario: `Real-time risk revocation: risk ${T6.baselineRisk} -> ${T6.highRisk} -> ${T6.baselineRisk}, same token`,
        expected: "ALLOW -> DENY -> ALLOW",
        actual: steps.join(" -> "),
        detail: `write-to-deny ${msToDeny.toFixed(0)} ms (1st request after write)`,
        pass,
        expectedPolicies: { baseline: [P1], "after-flip": [P4], restored: [P1] },
      });
      expect(steps).toEqual(["ALLOW", "DENY", "ALLOW"]);
    } finally {
      await setRiskScore(T6.user, T6.tenant, T6.baselineRisk); // never leave fixtures dirty
    }
  });
});
