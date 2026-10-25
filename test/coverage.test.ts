// OFFLINE coverage at scale (part of `npm test`, no AWS).
//
//   1. Fixture matrix: every seeded user x every tenant x every route (mapped or not), the
//      same cases the deployed matrix suite sends over HTTP.
//   2. Combinatorial grid: every combination of membership, roles, KYC level, KYC status,
//      KYC expiry (past / exactly now / future), risk (incl. the 70/71 boundary), missing
//      rows and sign-out state (none / before / at / after the token's issue time), for every
//      route. Not tied to fixtures, so it reaches states no user has.
//
// Both run the REAL PEP code + the local Cedar engine and compare decision, determining
// policies and PEP reason with the specification oracle (test/support/oracle.ts). Any
// disagreement is a bug in the policies, the fact-to-Cedar mapping, or the oracle.

import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { API_METADATA, RISK_THRESHOLD } from "../seed/fixtures";
import type { FactSource, KycStateRow, KycStatus, RequestFacts, RiskScoreRow, SessionRow } from "../src/authorizer/types";
import { API_ROUTES, routeKey } from "../src/shared/routes";
import { matrixCases } from "./support/cases";
import { ROOT, RUN_ID } from "./support/env";
import { harness, fmt, NOW, sameSet, TOKEN_IAT } from "./support/offline";
import { expected, policyLabel, P2, P3, P4, P5, P6 } from "./support/oracle";
import { ResultsTable, writeCsv } from "./support/results";

describe("Fixture matrix: users x tenants x routes (offline)", () => {
  const results = new ResultsTable("offline-matrix", {
    Engine: "cedar-wasm + real PEP code, in-memory fixtures",
    Oracle: "test/support/oracle.ts (P1–P6 restated over raw facts)",
    Clock: `pinned at ${NOW}`,
  });
  afterAll(() => results.write());

  it("every case agrees with the oracle on decision, determining policies and PEP reason", async () => {
    const { call } = harness();
    const cases = await matrixCases(NOW);
    let failures = 0;
    for (const c of cases) {
      const { decision, record } = await call(c);
      const pass = decision === c.expected && sameSet(record.determiningPolicies, c.expectedPolicies) && record.reason === c.reason;
      if (!pass) failures++;
      results.add({
        id: c.id,
        scenario: c.scenario,
        expected: `${c.expected} ${fmt(c.expectedPolicies)}`,
        actual: `${decision} ${fmt(record.determiningPolicies)}`,
        detail: record.reason,
        pass,
      });
    }
    expect(cases.length).toBeGreaterThan(300);
    expect(failures).toBe(0);
  });
});

// ---------------- Combinatorial grid ----------------

const TARGET = "t-target";
const OTHER = "t-other";
const ROLE_SETS: string[][] = [
  [],
  ["account_holder"],
  ["payments_operator"],
  ["compliance_officer"],
  ["tenant_admin"],
  ["account_holder", "tenant_admin"],
];
const KYC_LEVELS = [1, 2, 3];
const STATUSES: KycStatus[] = ["active", "expired", "revoked"];
const EXPIRIES = { past: NOW - 86_400, now: NOW, future: NOW + 86_400 } as const;
const RISKS = [0, RISK_THRESHOLD - 1, RISK_THRESHOLD, RISK_THRESHOLD + 1, 100];
/** Sign-out marker relative to the token's issue time (P6 denies at-or-after). */
const SIGNOUTS: Array<{ label: string; at?: number }> = [
  { label: "never" },
  { label: "before-token", at: TOKEN_IAT - 60 },
  { label: "at-token", at: TOKEN_IAT },
  { label: "after-token", at: TOKEN_IAT + 30 },
];

interface GridCase {
  route: string;
  action: string;
  member: boolean;
  roles: string;
  kyc: string; // "absent" | "L2/active/future" ...
  risk: string; // "absent" | number
  signout: string;
  facts: RequestFacts;
}

function* gridCases(): Generator<GridCase> {
  const memberships = [
    ...ROLE_SETS.map((roles) => ({ member: true, roles })),
    { member: false, roles: [] as string[] }, // member of another tenant only
  ];
  const kycs: Array<{ label: string; row?: KycStateRow }> = [{ label: "absent" }];
  for (const kyc_level of KYC_LEVELS)
    for (const status of STATUSES)
      for (const [when, kyc_expires_at] of Object.entries(EXPIRIES))
        kycs.push({
          label: `L${kyc_level}/${status}/${when}`,
          row: { user_id: "u", tenant_id: TARGET, kyc_level, status, kyc_expires_at, kyc_verified_at: NOW - 30 * 86_400 },
        });
  const risks: Array<{ label: string; row?: RiskScoreRow }> = [
    { label: "absent" },
    ...RISKS.map((risk_score) => ({ label: String(risk_score), row: { user_id: "u", tenant_id: TARGET, risk_score, updated_at: NOW } })),
  ];

  for (const r of API_ROUTES) {
    const api = API_METADATA.find((m) => m.route === routeKey(r));
    for (const m of memberships)
      for (const k of kycs)
        for (const rk of risks)
          for (const so of SIGNOUTS)
            yield {
              route: routeKey(r),
              action: api?.action ?? "(unmapped)",
              member: m.member,
              roles: m.roles.join("+") || "-",
              kyc: k.label,
              risk: rk.label,
              signout: so.label,
              facts: {
                api,
                memberships: [
                  { user_id: "u", tenant_id: OTHER, roles: ["account_holder"] },
                  ...(m.member ? [{ user_id: "u", tenant_id: TARGET, roles: m.roles }] : []),
                ],
                kyc: k.row,
                risk: rk.row,
                session: so.at === undefined ? undefined : ({ user_id: "u", tokens_valid_after: so.at } satisfies SessionRow),
              },
            };
  }
}

describe("Combinatorial grid (offline)", () => {
  it("every combination agrees with the oracle", { timeout: 300_000 }, async () => {
    let current: RequestFacts = { memberships: [] };
    const facts: FactSource = { load: async () => structuredClone(current) };
    const { call } = harness({ facts });

    const rows: Array<Record<string, unknown>> = [];
    for (const g of gridCases()) {
      current = g.facts;
      const e = expected(g.facts, TARGET, NOW, TOKEN_IAT);
      const { decision, record } = await call({ user: "u", method: "GET", tenant: TARGET, subPath: "" }, { route: g.route });
      rows.push({
        route: g.route,
        action: g.action,
        member: g.member,
        roles: g.roles,
        kyc: g.kyc,
        risk: g.risk,
        signout: g.signout,
        expected: e.decision,
        expected_policies: policyLabel(e.policies),
        actual: decision,
        actual_policies: policyLabel(record.determiningPolicies),
        reason: record.reason,
        agree: decision === e.decision && sameSet(record.determiningPolicies, e.policies) && record.reason === e.reason && record.errors.length === 0,
      });
    }
    writeGridReport(rows);
    const disagreements = rows.filter((r) => !r.agree);
    expect(disagreements.slice(0, 5)).toEqual([]);
    expect(rows.length).toBeGreaterThan(40_000);
  });
});

function writeGridReport(rows: Array<Record<string, unknown>>) {
  const n = rows.length;
  const agree = rows.filter((r) => r.agree).length;
  const allow = rows.filter((r) => r.actual === "ALLOW").length;
  const pct = (x: number, of = n) => `${((100 * x) / (of || 1)).toFixed(1)}%`;
  const countBy = (key: string, sel = rows) =>
    [...sel.reduce((m, r) => m.set(String(r[key]), (m.get(String(r[key])) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  // How often each forbid fired (a request can fire several).
  const fires = [P2, P3, P4, P5, P6].map((p) => {
    const short = p.split("-")[0]!;
    const k = rows.filter((r) => String(r.actual_policies).split("+").includes(short)).length;
    return `| ${p} | ${k} | ${pct(k)} |`;
  });
  const byAction = [...new Set(rows.map((r) => String(r.action)))].map((a) => {
    const sel = rows.filter((r) => r.action === a);
    const k = sel.filter((r) => r.actual === "ALLOW").length;
    return `| ${a} | ${sel.length} | ${k} | ${pct(k, sel.length)} |`;
  });

  const md = [
    `# offline-grid: run ${RUN_ID}`,
    "",
    "- **Engine:** cedar-wasm + real PEP code (same schema and policy files as the deployed store)",
    "- **Oracle:** test/support/oracle.ts (P1–P6 restated over raw DynamoDB facts)",
    `- **Dimensions:** ${API_ROUTES.length} routes x membership/roles (${ROLE_SETS.length} role sets + non-member) x KycState (absent, or ${KYC_LEVELS.length} levels x ${STATUSES.length} statuses x expiry past/now/future) x RiskScores (absent, or ${RISKS.join("/")}), threshold ${RISK_THRESHOLD} x sign-out (${SIGNOUTS.map((x) => x.label).join("/")})`,
    `- **Result:** ${agree}/${n} combinations agree with the oracle (${pct(agree)}): decision, determining policies and PEP reason`,
    `- **Outcome:** ${allow} ALLOW (${pct(allow)}), ${n - allow} DENY (${pct(n - allow)})`,
    "",
    "## Determining-policy sets",
    "",
    "| Determining policies | Requests | Share |",
    "|---|---|---|",
    ...countBy("actual_policies").map(([k, v]) => `| ${k} | ${v} | ${pct(v)} |`),
    "",
    "## How often each forbid fired",
    "",
    "| Policy | Requests where it fired | Share |",
    "|---|---|---|",
    ...fires,
    "",
    "## ALLOW rate per action",
    "",
    "| Action | Combinations | ALLOW | ALLOW rate |",
    "|---|---|---|---|",
    ...byAction,
    "",
    "Every combination is in the CSV next to this file.",
    "",
  ].join("\n");
  const base = path.join(ROOT, "results", `offline-grid-${RUN_ID}`);
  fs.mkdirSync(path.dirname(base), { recursive: true });
  fs.writeFileSync(`${base}.md`, md);
  writeCsv(`${base}.csv`, rows);
  console.log(`\n${md}\nWritten: ${path.relative(ROOT, base)}.{md,csv}`);
}
