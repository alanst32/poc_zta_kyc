// Revocation benchmark: how quickly, and how reliably, a change in DynamoDB takes effect on
// a user who keeps the SAME access token. T6 and the lifecycle suite show it once per
// mechanism; this repeats each mechanism N times so the paper can report a distribution.
//
// Each iteration, per mechanism:
//   1. baseline request             (must be ALLOW)
//   2. write the revoking fact      (timed: DynamoDB write acknowledged)
//   3. the very next request        (must be DENY; timed: write start -> decision received)
//   4. undo the write, request      (must be ALLOW again: access recovers without a new token)
//
// The key figure is the deny rate of the FIRST request after the write. With strongly
// consistent reads and no authoriser cache it should be 100%: there is no stale window.
//
//   npm run bench:revocation              (ZTA_REVOKE_N iterations per mechanism, default 20)

import fs from "node:fs";
import path from "node:path";
import { accessToken, call, decodePayload, environmentInfo } from "../test/support/client";
import { ROOT, RUN_ID } from "../test/support/env";
import { writeCsv } from "../test/support/results";
import {
  deleteRow,
  restore,
  setKycLevel,
  setKycStatus,
  setRiskScore,
  setRoles,
  signOutMarker,
  snapshot,
  type FactTable,
} from "../test/support/state";
import { mdTable, stats } from "./stats";

const N = Number(process.env.ZTA_REVOKE_N ?? 20);
const USER = "u-alice";
const TENANT = "neobank-aurora";
const PAYMENTS = { method: "POST", path: `/tenants/${TENANT}/payments` };
const MANAGE_USERS = { method: "POST", path: `/tenants/${TENANT}/admin/users` };

interface Mechanism {
  name: string;
  /** What the write models in production. */
  meaning: string;
  table: FactTable;
  policy: string;
  route: { method: string; path: string };
  /** Puts the user in the "allowed" state before the iterations start (optional). */
  setup?: () => Promise<unknown>;
  revoke: () => Promise<unknown>;
  undo: () => Promise<unknown>;
}

const MECHANISMS: Mechanism[] = [
  { name: "risk", meaning: "risk engine raises the score above the threshold", table: "risk", policy: "P4", route: PAYMENTS,
    revoke: () => setRiskScore(USER, TENANT, 90), undo: () => setRiskScore(USER, TENANT, 10) },
  { name: "status", meaning: "compliance revokes the relationship", table: "kyc", policy: "P4", route: PAYMENTS,
    revoke: () => setKycStatus(USER, TENANT, "revoked"), undo: () => setKycStatus(USER, TENANT, "active") },
  { name: "kyc-level", meaning: "KYC tier downgraded below the route's requirement", table: "kyc", policy: "P2", route: PAYMENTS,
    revoke: () => setKycLevel(USER, TENANT, 1), undo: () => setKycLevel(USER, TENANT, 2) },
  { name: "role", meaning: "tenant_admin role removed", table: "memberships", policy: "P5", route: MANAGE_USERS,
    setup: () => setRoles(USER, TENANT, ["account_holder", "tenant_admin"]),
    revoke: () => setRoles(USER, TENANT, ["account_holder"]), undo: () => setRoles(USER, TENANT, ["account_holder", "tenant_admin"]) },
  { name: "membership", meaning: "user offboarded from the tenant (row deleted)", table: "memberships", policy: "P5 (no role; P1 no permit)", route: PAYMENTS,
    revoke: () => deleteRow("memberships", USER, TENANT), undo: () => restore(membershipSnap!) },
  // Marker = the token's own iat (Cognito clock), so the result does not depend on this machine's clock.
  { name: "session", meaning: "user signed out (sign-out marker written)", table: "sessions", policy: "P6", route: PAYMENTS,
    revoke: () => signOutMarker(USER, tokenIat), undo: () => deleteRow("sessions", USER) },
];

/** The benchmark token's issued-at time, set in main(). */
let tokenIat = 0;

// The deleted membership row is re-created from the snapshot taken before the run.
let membershipSnap: Awaited<ReturnType<typeof snapshot>> | undefined;

interface Sample {
  mechanism: string;
  iteration: number;
  baseline: string;
  write_ms: number;
  first_after_write: string;
  first_request_ms: number;
  write_to_decision_ms: number;
  recovered: string;
}

async function main() {
  console.log(`Run ${RUN_ID}: ${N} iterations x ${MECHANISMS.length} mechanisms on ${USER} @ ${TENANT}`);
  const token = await accessToken(USER, { fresh: true });
  tokenIat = decodePayload(token).iat as number;
  const req = (route: { method: string; path: string }, caseId: string, phase: string) =>
    call({ method: route.method, path: route.path, token, caseId, phase });

  const snaps = await Promise.all((["memberships", "kyc", "risk", "sessions"] as const).map((t) => snapshot(t, USER, TENANT)));
  membershipSnap = snaps[0];
  const samples: Sample[] = [];
  try {
    for (const m of MECHANISMS) {
      process.stdout.write(`  ${m.name.padEnd(11)}`);
      if (m.setup) await m.setup();
      for (let i = 1; i <= N; i++) {
        const caseId = `REV-${m.name}`;
        const baseline = await req(m.route, caseId, "baseline");
        const t0 = performance.now();
        await m.revoke();
        const writeMs = performance.now() - t0;
        const first = await req(m.route, caseId, "first-after-write");
        const writeToDecision = performance.now() - t0;
        await m.undo();
        const recovered = await req(m.route, caseId, "recovered");
        samples.push({
          mechanism: m.name,
          iteration: i,
          baseline: baseline.decision,
          write_ms: round(writeMs),
          first_after_write: first.decision,
          first_request_ms: round(first.ms),
          write_to_decision_ms: round(writeToDecision),
          recovered: recovered.decision,
        });
        process.stdout.write(first.decision === "DENY" ? "." : "!");
      }
      process.stdout.write("\n");
    }
  } finally {
    for (const s of snaps) await restore(s);
  }

  const summary = MECHANISMS.map((m) => {
    const sel = samples.filter((s) => s.mechanism === m.name);
    const valid = sel.filter((s) => s.baseline === "ALLOW");
    const denied = valid.filter((s) => s.first_after_write === "DENY").length;
    const recovered = valid.filter((s) => s.recovered === "ALLOW").length;
    const w2d = stats(valid.map((s) => s.write_to_decision_ms));
    const w = stats(valid.map((s) => s.write_ms));
    return {
      mechanism: m.name,
      models: m.meaning,
      policy: m.policy,
      n: valid.length,
      "denied on 1st request": `${denied}/${valid.length}`,
      "recovered on undo": `${recovered}/${valid.length}`,
      "write p50": w.p50,
      "write-to-deny p50": w2d.p50,
      "write-to-deny p95": w2d.p95,
      "write-to-deny max": w2d.max,
    };
  });
  console.table(summary);

  const env = { ...environmentInfo(), Iterations: `${N} per mechanism`, Subject: `${USER} @ ${TENANT}, one access token for the whole run` };
  const md = [
    `# Revocation: run ${RUN_ID}`, "",
    ...Object.entries(env).map(([k, v]) => `- **${k}:** ${v}`), "",
    "Per iteration: baseline request (ALLOW) -> DynamoDB write -> the very next request (must be DENY) -> undo -> request (must be ALLOW).", "",
    "`write` = DynamoDB write acknowledged (ms). `write-to-deny` = write start until the next request's DENY is received (write + one full request). There is no polling: the first request after the write either sees the change or it does not.", "",
    mdTable(summary), "",
    "Iterations whose baseline was not ALLOW are excluded (a fixture left dirty). Every sample is in the CSV next to this file.", "",
  ].join("\n");
  const base = path.join(ROOT, "results", `revocation-${RUN_ID}`);
  fs.mkdirSync(path.dirname(base), { recursive: true });
  fs.writeFileSync(`${base}.md`, md);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ run: RUN_ID, environment: env, summary, samples }, null, 2));
  writeCsv(`${base}.csv`, samples as unknown as Array<Record<string, unknown>>);
  console.log(`Written: ${path.relative(ROOT, base)}.{md,json,csv}`);
}

const round = (ms: number) => Math.round(ms * 10) / 10;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
