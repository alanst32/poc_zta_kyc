// Joins a test run to the authoriser's decision logs: for every request it shows which
// Cedar policies determined the outcome. HTTP status alone cannot show that.
//
// It also CHECKS them: every results/*-<run id>.json row that carries `expectedPolicies`
// (correctness, matrix, lifecycle) is matched to its decision records by case id + phase,
// and the logged determining policies must equal the expected ones.
//
//   npm run decisions -- <run id>        (the run id is printed in each results/*.md)
import fs from "node:fs";
import path from "node:path";
import type { ResultRow } from "../test/support/results";
import { ROOT } from "../test/support/env";
import { fetchDecisionRecords } from "./logs";

/** "<case>|<phase>" -> expected determining policies, from this run's result files. */
function loadExpectations(run: string): Map<string, string[]> {
  const dir = path.join(ROOT, "results");
  const expected = new Map<string, string[]>();
  if (!fs.existsSync(dir)) return expected;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(`-${run}.json`))) {
    const { rows } = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { rows?: ResultRow[] };
    for (const row of rows ?? []) {
      for (const [phase, policies] of Object.entries(row.expectedPolicies ?? {})) expected.set(`${row.id}|${phase}`, policies);
    }
  }
  return expected;
}

const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

async function main() {
  const run = process.argv[2];
  if (!run) throw new Error("usage: npm run decisions -- <run id>");
  const recs = await fetchDecisionRecords(run);
  if (recs.length === 0) {
    console.log("No decision records yet (CloudWatch ingestion can lag ~10-60 s). Retry shortly.");
    return;
  }
  const expectations = loadExpectations(run);
  const rows = recs.map((r) => {
    const want = r.case ? expectations.get(`${r.case}|${r.phase ?? ""}`) : undefined;
    return {
      case: [r.case, r.phase].filter(Boolean).join(" / ") || "-",
      user: r.username ?? "-",
      route: `${r.routeKey} @ ${r.tenantId ?? "-"}`,
      decision: r.decision,
      reason: r.reason,
      policies: r.determiningPolicies.join(", ") || "(none: default deny)",
      expected: want ? want.join(", ") || "(none: default deny)" : "",
      match: want ? (same(want, r.determiningPolicies) ? "✅" : "❌") : "",
      errors: r.errors.join("; "),
      totalMs: r.timings.totalMs,
    };
  });
  const checked = rows.filter((r) => r.match !== "");
  const matched = checked.filter((r) => r.match === "✅").length;
  const seen = new Set(recs.map((r) => `${r.case}|${r.phase ?? ""}`));
  const missing = [...expectations.keys()].filter((k) => !seen.has(k));

  console.table(rows.map(({ errors: _e, ...r }) => r));
  const summary = [
    `- **Decision records:** ${recs.length}`,
    `- **Determining policies checked:** ${matched}/${checked.length} match the expected policies`,
    `- **Expected cases with no decision record yet:** ${missing.length}${missing.length ? ` (${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ", ..." : ""}; CloudWatch lag, or denied before the PEP ran, e.g. HTTP 401)` : ""}`,
  ];
  console.log(summary.join("\n"));
  const md = [
    `# Decision log: run ${run}`,
    "",
    ...summary,
    "",
    "| Case | User | Route @ tenant | Decision | PEP reason | Determining policies | Expected | Match | Errors | PEP ms |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.case} | ${r.user} | ${r.route} | ${r.decision} | ${r.reason} | ${r.policies} | ${r.expected} | ${r.match} | ${r.errors.replace(/\|/g, "\\|")} | ${r.totalMs} |`),
    "",
  ].join("\n");
  const file = path.join(ROOT, "results", `decisions-${run}.md`);
  fs.writeFileSync(file, md);
  console.log(`Written: ${path.relative(ROOT, file)}`);
  if (checked.length > matched) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
