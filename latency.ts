// Latency of the authorisation path (plan Part A §7). Shows the path is viable at
// interactive latency; it is NOT a scale study.
//
//   1. warm-up      a few requests (excluded from stats)
//   2. sequential   N requests one at a time           (ZTA_BENCH_N, default 300)
//   3. burst        M requests at concurrency C        (ZTA_BENCH_BURST, default 200; ZTA_BENCH_C, default 25)
//   4. paths        P sequential requests per decision path (ZTA_BENCH_PATHS, default 50; 0 skips):
//                   ALLOW, Cedar DENY (forbid), cross-tenant DENY, unmapped route, forged
//                   token, no token. Shows where each path stops and what it costs.
//
// Reports CLIENT round-trip (what a user sees: network + API Gateway + PEP + target) and
// SERVER-side PEP timings from the decision logs (JWT verify / DynamoDB facts / Verified
// Permissions / total), with cold-start invocations reported separately.
//
//   npm run bench

import fs from "node:fs";
import path from "node:path";
import { accessToken, call, environmentInfo, type CallResult } from "../test/support/client";
import { ROOT, RUN_ID } from "../test/support/env";
import { waitForDecisionRecords } from "../scripts/logs";
import type { DecisionRecord } from "../src/authorizer/pep";
import { tamperClaims } from "../test/support/jwt-forge";
import { writeCsv } from "../test/support/results";
import { mdTable as table, stats } from "./stats";

const N = Number(process.env.ZTA_BENCH_N ?? 300);
const BURST = Number(process.env.ZTA_BENCH_BURST ?? 200);
const C = Number(process.env.ZTA_BENCH_C ?? 25);
const PER_PATH = Number(process.env.ZTA_BENCH_PATHS ?? 50);
const WARMUP = 5;
const PATH = "/tenants/neobank-aurora/payments"; // T1: the full ALLOW path (every step runs)

async function main() {
  console.log(`Run ${RUN_ID}: warm-up ${WARMUP}, sequential ${N}, burst ${BURST} @ concurrency ${C}`);
  const token = await accessToken("u-alice", { fresh: true }); // 5-min token comfortably covers the run
  const req = (phase: string) => call({ method: "POST", path: PATH, token, caseId: "BENCH", phase });

  const client: Record<string, CallResult[]> = { warmup: [], sequential: [], burst: [] };
  for (let i = 0; i < WARMUP; i++) client.warmup!.push(await req("warmup"));
  for (let i = 0; i < N; i++) client.sequential!.push(await req("sequential"));

  let next = 0;
  await Promise.all(
    Array.from({ length: C }, async () => {
      while (next < BURST) {
        next++;
        client.burst!.push(await req("burst"));
      }
    }),
  );

  const non200 = Object.values(client).flat().filter((r) => r.status !== 200).length;
  if (non200 > 0) console.warn(`WARNING: ${non200} non-200 responses (throttling or a real deny?), see results JSON`);

  // Decision paths. Each stops at a different PEP step, so its cost differs.
  const forged = tamperClaims(await accessToken("u-alice"), { "custom:tenant_id": "wealth-meridian" });
  const frank = await accessToken("u-frank", { fresh: true });
  const paths: Array<{ name: string; expect: number; stopsAt: string; send: (phase: string) => Promise<CallResult> }> = [
    { name: "allow", expect: 200, stopsAt: "all steps (JWT, DynamoDB, Cedar ALLOW)",
      send: (phase) => call({ method: "POST", path: PATH, token, caseId: "BENCH", phase }) },
    { name: "cedar-forbid", expect: 403, stopsAt: "all steps, Cedar DENY by P2 (alice L2 -> L3 route)",
      send: (phase) => call({ method: "POST", path: "/tenants/remit-swift/remittance/international", token, caseId: "BENCH", phase }) },
    { name: "cross-tenant", expect: 403, stopsAt: "all steps, Cedar DENY (not a member)",
      send: (phase) => call({ method: "GET", path: "/tenants/wealth-meridian/accounts", token, caseId: "BENCH", phase }) },
    { name: "unmapped", expect: 403, stopsAt: "JWT + DynamoDB; no ApiMetadata row, Cedar not called",
      send: (phase) => call({ method: "GET", path: "/tenants/neobank-aurora/reports", token: frank, caseId: "BENCH", phase }) },
    { name: "forged-token", expect: 403, stopsAt: "JWT verification fails; no DynamoDB, no Cedar",
      send: (phase) => call({ method: "GET", path: "/tenants/wealth-meridian/accounts", token: forged, caseId: "BENCH", phase }) },
    { name: "no-token", expect: 401, stopsAt: "API Gateway rejects; the PEP never runs",
      send: (phase) => call({ method: "GET", path: "/tenants/neobank-aurora/accounts", caseId: "BENCH", phase }) },
  ];
  for (const p of PER_PATH > 0 ? paths : []) {
    client[`path:${p.name}`] = [];
    for (let i = 0; i < PER_PATH; i++) client[`path:${p.name}`]!.push(await p.send(`path:${p.name}`));
    const wrong = client[`path:${p.name}`]!.filter((r) => r.status !== p.expect).length;
    if (wrong > 0) console.warn(`WARNING: path ${p.name}: ${wrong} responses were not HTTP ${p.expect}`);
  }

  console.log("Waiting for authoriser decision logs to reach CloudWatch...");
  // no-token requests never reach the PEP, so they produce no decision record.
  const total = WARMUP + N + BURST + (PER_PATH > 0 ? PER_PATH * (paths.length - 1) : 0);
  const recs = await waitForDecisionRecords(RUN_ID, total, { caseId: "BENCH" });

  const clientRows = Object.keys(client).filter((p) => p !== "warmup").map((phase) => ({ phase, ...stats(client[phase]!.map((r) => r.ms)) }));
  const serverRows: Array<Record<string, string | number>> = [];
  for (const phase of Object.keys(client)) {
    for (const cold of [false, true]) {
      const sel = recs.filter((r) => r.phase === phase && r.coldStart === cold);
      if (sel.length === 0) continue;
      const s = (k: keyof DecisionRecord["timings"]) => stats(sel.map((r) => r.timings[k]));
      serverRows.push({
        phase,
        start: cold ? "cold" : "warm",
        n: sel.length,
        "total p50": s("totalMs").p50, "total p95": s("totalMs").p95,
        "jwt p50": s("jwtMs").p50, "facts p50": s("factsMs").p50, "facts p95": s("factsMs").p95,
        "avp p50": s("pdpMs").p50, "avp p95": s("pdpMs").p95,
      });
    }
  }

  console.log("\nClient round-trip (ms)");
  console.table(clientRows);
  console.log("Server-side PEP timings (ms), from decision logs");
  console.table(serverRows);

  const env = {
    ...environmentInfo(),
    Requests: `warm-up ${WARMUP} (excluded), sequential ${N}, burst ${BURST} @ ${C} concurrent, ${PER_PATH} per decision path`,
    "Non-200 responses in sequential/burst": String(non200),
  };
  const pathRows = paths.map((p) => ({ path: p.name, "stops at": p.stopsAt, "expected HTTP": p.expect }));
  const md = [
    `# Latency: run ${RUN_ID}`, "",
    ...Object.entries(env).map(([k, v]) => `- **${k}:** ${v}`), "",
    "## Client round-trip (ms): network + API Gateway + PEP + target", "", table(clientRows), "",
    "## Server-side PEP decision time (ms): from the authoriser's own timers", "",
    "`total` = whole PEP; `jwt` = Cognito token verify; `facts` = 4 parallel strongly consistent DynamoDB reads; `avp` = Verified Permissions IsAuthorized.", "",
    table(serverRows), "",
    ...(PER_PATH > 0 ? ["## Decision paths (phases `path:*`)", "", table(pathRows), ""] : []),
    "Percentiles: nearest-rank. Cold = first invocation of a new Lambda execution environment.",
    "Raw per-request values: `latency-<run>-client.csv` and `latency-<run>-server.csv`.", "",
  ].join("\n");
  fs.mkdirSync(path.join(ROOT, "results"), { recursive: true });
  const base = path.join(ROOT, "results", `latency-${RUN_ID}`);
  fs.writeFileSync(`${base}.md`, md);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ run: RUN_ID, environment: env, client: clientRows, server: serverRows, raw: { client: Object.fromEntries(Object.entries(client).map(([k, v]) => [k, v.map((r) => ({ ms: r.ms, status: r.status }))])), decisions: recs } }, null, 2));
  writeCsv(`${base}-client.csv`, Object.entries(client).flatMap(([phase, v]) => v.map((r, i) => ({ phase, i, status: r.status, ms: Math.round(r.ms * 10) / 10 }))));
  writeCsv(`${base}-server.csv`, recs.map((r) => ({ phase: r.phase ?? "", cold_start: r.coldStart, decision: r.decision, reason: r.reason, jwt_ms: r.timings.jwtMs, facts_ms: r.timings.factsMs, pdp_ms: r.timings.pdpMs, total_ms: r.timings.totalMs })));
  console.log(`Written: ${path.relative(ROOT, base)}.{md,json}, ${path.basename(base)}-{client,server}.csv`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
