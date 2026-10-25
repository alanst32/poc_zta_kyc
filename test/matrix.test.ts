// DEPLOYED fixture matrix: every seeded user x every tenant x every route (mapped or not),
// over real HTTP. Expected outcomes come from the specification oracle over the seeded facts
// (test/support/oracle.ts); the same cases run offline in test/coverage.test.ts.
//
// The matrix is read-only (no fact is changed), so requests run with bounded concurrency.
// Determining policies are checked afterwards from the decision logs: `npm run decisions -- <run id>`.

import { afterAll, describe, expect, it } from "vitest";
import { matrixCases, urlPathOf, type MatrixCase } from "./support/cases";
import { accessToken, call, environmentInfo } from "./support/client";
import { ResultsTable } from "./support/results";

const CONCURRENCY = Number(process.env.ZTA_MATRIX_C ?? 8);

const results = new ResultsTable("matrix", { ...environmentInfo(), Concurrency: String(CONCURRENCY) });
afterAll(() => results.write());

describe("Fixture matrix: users x tenants x routes (deployed)", () => {
  it("every request gets the decision the oracle predicts", { timeout: 300_000 }, async () => {
    const cases = await matrixCases(Math.floor(Date.now() / 1000));
    const outcome = new Map<string, { decision: string; status: number }>();

    const queue = [...cases];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let c = queue.shift(); c; c = queue.shift()) {
          const r = await call({ method: c.method, path: urlPathOf(c), token: await accessToken(c.user), caseId: c.id });
          outcome.set(c.id, r);
        }
      }),
    );

    // Rows in matrix order (requests finished in any order).
    const failed: MatrixCase[] = [];
    for (const c of cases) {
      const r = outcome.get(c.id)!;
      const pass = r.decision === c.expected;
      if (!pass) failed.push(c);
      results.add({
        id: c.id,
        scenario: c.scenario,
        expected: c.expected,
        actual: r.decision,
        detail: `HTTP ${r.status}`,
        pass,
        expectedPolicies: { "": c.expectedPolicies },
      });
    }
    expect(failed.map((c) => c.id)).toEqual([]);
  });
});
