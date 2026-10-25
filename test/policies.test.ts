// OFFLINE validation: no AWS needed (`npm test`).
//
// Runs the REAL PEP code (src/authorizer/pep.ts + cedar.ts) against in-memory fixtures and
// a local Cedar engine loaded with the SAME schema and policy files the stack deploys.
// It checks the theory (every T-case gives the expected decision for the expected policy
// reason) before any money is spent, and it reports the determining policy per case,
// which the HTTP-level deployed tests cannot observe directly.

import { afterAll, describe, expect, it } from "vitest";
import { assertPoliciesValid, loadPolicies } from "../cedar/load";
import { API_METADATA, RISK_THRESHOLD, UNMAPPED_ROUTES } from "../seed/fixtures";
import type { Pdp } from "../src/authorizer/types";
import { API_ROUTES, routeKey } from "../src/shared/routes";
import { ROLE_GATE_CASES, STATIC_CASES, T6 } from "./support/cases";
import { localPdp } from "./support/local-pdp";
import { memoryFacts } from "./support/memory-facts";
import { fmt, harness, NOW, sameSet, TOKEN_IAT } from "./support/offline";
import { ResultsTable } from "./support/results";

const results = new ResultsTable("offline-policies", {
  Engine: "cedar-wasm (local Cedar evaluator), same schema + policy files as the deployed store",
  Clock: `pinned at ${NOW}`,
});
afterAll(() => results.write());

describe("Cedar schema & policy set", () => {
  it("all policies pass STRICT validation against the schema", () => {
    expect(() => assertPoliciesValid()).not.toThrow();
  });

  it("no policy names a route or an action: every requirement comes from route metadata", () => {
    for (const p of loadPolicies()) {
      expect(p.statement, p.name).not.toMatch(/\/tenants|routeKey/);
      expect(p.statement, p.name).not.toMatch(/Action::/);
    }
  });

  it("exactly one permit (P1); every other policy is a forbid (deny-overrides)", () => {
    const effects = loadPolicies().map((p) => /^\s*(permit|forbid)\s*\(/m.exec(p.statement)?.[1]);
    expect(effects.filter((e) => e === "permit")).toHaveLength(1);
    expect(effects.filter((e) => e === "forbid")).toHaveLength(loadPolicies().length - 1);
  });

  it("every API route has metadata except the deliberately unmapped one", () => {
    expect(UNMAPPED_ROUTES).toEqual(["GET /tenants/{tenantId}/reports"]);
    for (const m of API_METADATA) expect(API_ROUTES.map(routeKey)).toContain(m.route);
  });
});

describe("Correctness matrix T1–T15, S1–S3 + role gate G1–G4 (offline)", () => {
  for (const c of [...STATIC_CASES, ...ROLE_GATE_CASES]) {
    it(`${c.id}: ${c.scenario} -> ${c.expected}`, async () => {
      const { decision, record } = await harness().call(c);
      const pass = decision === c.expected && sameSet(record.determiningPolicies, c.expectedPolicies) && record.errors.length === 0;
      results.add({ id: c.id, scenario: c.scenario, expected: `${c.expected} ${fmt(c.expectedPolicies)}`, actual: `${decision} ${fmt(record.determiningPolicies)}`, detail: record.reason, pass });
      expect(record.errors).toEqual([]);
      expect(decision).toBe(c.expected);
      expect(record.determiningPolicies.sort()).toEqual([...c.expectedPolicies].sort());
    });
  }

  it("T6: risk flipped above threshold -> DENY on the very next request; restored -> ALLOW", async () => {
    const { mem, call } = harness();
    const before = await call(T6);
    mem.riskOf(T6.user, T6.tenant).risk_score = T6.highRisk;
    const after = await call(T6);
    mem.riskOf(T6.user, T6.tenant).risk_score = T6.baselineRisk;
    const restored = await call(T6);
    const pass = before.decision === "ALLOW" && after.decision === "DENY" && restored.decision === "ALLOW";
    results.add({ id: "T6", scenario: `Real-time risk: risk ${T6.baselineRisk} -> ${T6.highRisk} (> ${RISK_THRESHOLD}) -> ${T6.baselineRisk}`, expected: "ALLOW -> DENY [P4] -> ALLOW", actual: `${before.decision} -> ${after.decision} ${fmt(after.record.determiningPolicies)} -> ${restored.decision}`, pass });
    expect([before.decision, after.decision, restored.decision]).toEqual(["ALLOW", "DENY", "ALLOW"]);
    expect(after.record.determiningPolicies).toEqual(["P4-risk-revocation"]);
  });

  it("risk exactly at the threshold is still allowed (boundary: P4 is '> 70')", async () => {
    const { mem, call } = harness();
    mem.riskOf(T6.user, T6.tenant).risk_score = RISK_THRESHOLD;
    expect((await call(T6)).decision).toBe("ALLOW");
    mem.riskOf(T6.user, T6.tenant).risk_score = RISK_THRESHOLD + 1;
    expect((await call(T6)).decision).toBe("DENY");
  });
});

describe("Adversarial / fail-closed cases that can be checked offline", () => {
  const record = (id: string, scenario: string, expected: string, actual: string, detail: string) =>
    results.add({ id, scenario, expected, actual, detail, pass: expected === actual });

  it("A1 (offline): token the verifier rejects -> DENY before any data access", async () => {
    const r = await harness().call(STATIC_CASES[0]!, { token: "forged.token.value" });
    record("A1-off", "Token fails verification", "DENY", r.decision, r.record.reason);
    expect(r.decision).toBe("DENY");
    expect(r.record.reason).toBe("invalid-token");
  });

  it("A2 (offline): tenant-confusion headers/query cannot redirect the resource tenant", async () => {
    const c = { user: "u-alice", method: "GET" as const, tenant: "wealth-meridian", subPath: "/accounts" };
    const r = await harness().call(c, { headers: { "x-tenant-id": "neobank-aurora", "x-zta-tenant": "neobank-aurora" } });
    record("A2-off", "alice -> Meridian path with x-tenant-id: neobank-aurora", "DENY", r.decision, fmt(r.record.determiningPolicies));
    expect(r.decision).toBe("DENY");
  });

  it("A3 (offline): replay after per-tenant revocation -> DENY", async () => {
    const { mem, call } = harness();
    const first = await call(T6);
    mem.kycOf(T6.user, T6.tenant).status = "revoked";
    const replay = await call(T6);
    record("A3-off", "Identical request replayed after status=revoked", "ALLOW -> DENY", `${first.decision} -> ${replay.decision}`, fmt(replay.record.determiningPolicies));
    expect([first.decision, replay.decision]).toEqual(["ALLOW", "DENY"]);
  });

  it("A5 (offline): route with no ApiMetadata row -> DENY (unmapped endpoints fail closed)", async () => {
    const r = await harness().call({ user: "u-frank", method: "GET", tenant: "neobank-aurora", subPath: "/reports" });
    record("A5-off", "Unmapped route GET /reports (tenant_admin caller)", "DENY", r.decision, r.record.reason);
    expect(r.record.reason).toBe("unmapped-route");
  });

  it("X1: member with no KycState row -> DENY (fail-closed ABSENT values fire P2, P3, P4)", async () => {
    const mem = memoryFacts(NOW);
    mem.state.kyc = mem.state.kyc.filter((k) => !(k.user_id === "u-alice" && k.tenant_id === "neobank-aurora"));
    const r = await harness({ facts: mem.source }).call(STATIC_CASES[0]!);
    record("X1", "Member with no KycState row", "DENY", r.decision, fmt(r.record.determiningPolicies));
    expect(r.decision).toBe("DENY");
    expect(r.record.determiningPolicies).toEqual(["P2-kyc-tier", "P3-kyc-expiry", "P4-risk-revocation"]);
  });

  it("X2: member with no RiskScores row -> DENY (unknown risk is treated as maximum risk)", async () => {
    const mem = memoryFacts(NOW);
    mem.state.risk = mem.state.risk.filter((k) => !(k.user_id === "u-alice" && k.tenant_id === "neobank-aurora"));
    const r = await harness({ facts: mem.source }).call(STATIC_CASES[0]!);
    record("X2", "Member with no RiskScores row", "DENY", r.decision, fmt(r.record.determiningPolicies));
    expect(r.record.determiningPolicies).toEqual(["P4-risk-revocation"]);
  });

  it("X3: Cedar evaluation errors are treated as DENY even if the PDP said ALLOW", async () => {
    const lying: Pdp = { isAuthorized: async () => ({ decision: "ALLOW", determiningPolicies: [], errors: ["P2: attribute missing"] }) };
    const r = await harness({ pdp: lying }).call(STATIC_CASES[0]!);
    record("X3", "PDP returns ALLOW with evaluation errors", "DENY", r.decision, r.record.reason);
    expect(r.record.reason).toBe("evaluation-error");
  });

  it("X3b: real Cedar error: ApiMetadata row missing risk_threshold -> P4 errors and is skipped -> PEP DENIES", async () => {
    const mem = memoryFacts(NOW);
    const row = mem.state.api.find((a) => a.action === "InitiatePayment")!;
    delete (row as Partial<typeof row>).risk_threshold; // misconfigured metadata
    const pdp = localPdp({ validateRequest: false });
    const r = await harness({ facts: mem.source, pdp }).call(STATIC_CASES[0]!);
    // Cedar on its own: P4 cannot be evaluated, so it is skipped and P1 permits.
    const raw = await pdp.isAuthorized(pdp.lastRequest!);
    record("X3b", "Missing risk_threshold: Cedar alone says " + raw.decision + " (P4 skipped)", "DENY", r.decision, `${r.record.reason}; ${raw.errors.length} Cedar error(s)`);
    expect(raw.decision).toBe("ALLOW"); // the hazard the paper describes
    expect(raw.errors.length).toBeGreaterThan(0);
    expect(r.decision).toBe("DENY"); // the PEP's fail-closed rule
    expect(r.record.reason).toBe("evaluation-error");
  });

  it("X5: session revocation: token issued before the sign-out marker -> DENY (P6); new token after it -> ALLOW", async () => {
    const mem = memoryFacts(NOW);
    mem.state.sessions.push({ user_id: "u-alice", tokens_valid_after: TOKEN_IAT + 10 }); // signed out after this token
    const signedOut = await harness({ facts: mem.source }).call(STATIC_CASES[0]!);
    mem.state.sessions[0]!.tokens_valid_after = TOKEN_IAT - 10; // signed out before this token was issued
    const reSignedIn = await harness({ facts: mem.source }).call(STATIC_CASES[0]!);
    record("X5", "Signed-out token, then a token issued after the sign-out", "DENY -> ALLOW", `${signedOut.decision} -> ${reSignedIn.decision}`, fmt(signedOut.record.determiningPolicies));
    expect(signedOut.record.determiningPolicies).toEqual(["P6-session-revocation"]);
    expect([signedOut.decision, reSignedIn.decision]).toEqual(["DENY", "ALLOW"]);
  });

  it("X4: PDP/infrastructure failure -> DENY", async () => {
    const down: Pdp = { isAuthorized: async () => { throw new Error("ThrottlingException"); } };
    const r = await harness({ pdp: down }).call(STATIC_CASES[0]!);
    record("X4", "PDP call throws", "DENY", r.decision, r.record.reason);
    expect(r.record.reason).toBe("pep-error");
  });
});
