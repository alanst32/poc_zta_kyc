// DEPLOYED adversarial cases A1–A10 (plan Part A §6 / C4.2, extended). A bounded set, not a
// pen-test: it shows the framework denies the attacks the paper warns about.
//   npm run test:aws         runs everything except A4
//   npm run test:aws:slow    also runs A4 (waits ~5 min for a real token to expire)

import { GetUserCommand, GlobalSignOutCommand } from "@aws-sdk/client-cognito-identity-provider";
import { afterAll, describe, expect, it } from "vitest";
import { accessToken, call, cognito, decodePayload, environmentInfo, outputs, signIn, testUsers } from "./support/client";
import {
  algNone,
  attackerSigned,
  hs256WithPublicKey,
  poolPublicKeyPem,
  stripSignature,
  tamperClaims,
  unknownKid,
} from "./support/jwt-forge";
import { ResultsTable } from "./support/results";
import { restore, setKycStatus, signOutMarker, snapshot } from "./support/state";

const results = new ResultsTable("attacks", environmentInfo());
afterAll(() => results.write());

const AURORA_PAYMENTS = "/tenants/neobank-aurora/payments";
const MERIDIAN_ACCOUNTS = "/tenants/wealth-meridian/accounts";

function record(id: string, attack: string, method: string, expected: string, actual: string, detail: string) {
  results.add({ id, scenario: `${attack}: ${method}`, expected, actual, detail, pass: expected === actual });
}

describe("A1 forged / edited JWTs -> DENY (signature verification in the PEP)", () => {
  // Each forgery tries to make alice look like bob (a Meridian member) and/or inject
  // tenant/KYC claims, then targets bob's tenant.
  const variants: Array<[string, string, (jwt: string, bobSub: string) => string | Promise<string>]> = [
    ["A1a", "inject tenant_id/kyc_level claims, keep original signature",
      (jwt) => tamperClaims(jwt, { "custom:tenant_id": "wealth-meridian", kyc_level: 3, tenant_id: "wealth-meridian" })],
    ["A1b", "swap sub to another user (impersonation), keep original signature",
      (jwt, bob) => tamperClaims(jwt, { sub: bob, username: "u-bob" })],
    ["A1c", "alg=none unsigned token with swapped sub",
      (jwt, bob) => algNone(jwt, { sub: bob, username: "u-bob" })],
    ["A1d", "re-signed with attacker RSA key, real kid, swapped sub",
      (jwt, bob) => attackerSigned(jwt, { sub: bob, username: "u-bob" })],
    ["A1e", "re-signed with attacker RSA key under an unknown kid, swapped sub",
      (jwt, bob) => unknownKid(jwt, { sub: bob, username: "u-bob" })],
    ["A1f", "signature stripped (header.payload.), alg still RS256",
      (jwt) => stripSignature(jwt)],
    ["A1g", "algorithm confusion: HS256 signed with the pool's public key, swapped sub",
      async (jwt, bob) => hs256WithPublicKey(jwt, await poolPublicKeyPem(jwt, outputs.Region, outputs.UserPoolId), { sub: bob, username: "u-bob" })],
    ["A1h", "lifetime extended: exp + 24 h, original signature",
      (jwt) => tamperClaims(jwt, { exp: (decodePayload(jwt).exp as number) + 86_400 })],
  ];
  for (const [id, method, forge] of variants) {
    it(`${id}: ${method}`, async () => {
      const forged = await forge(await accessToken("u-alice"), testUsers["u-bob"]!.sub);
      const r = await call({ method: "GET", path: MERIDIAN_ACCOUNTS, token: forged, caseId: id });
      record(id, "Forged claims", method, "DENY", r.decision, `HTTP ${r.status}`);
      expect(r.status).toBe(403);
    });
  }
});

describe("A2 valid token, another tenant's resource -> DENY (P1)", () => {
  it("A2a: alice (valid token) -> Meridian accounts", async () => {
    const r = await call({ method: "GET", path: MERIDIAN_ACCOUNTS, token: await accessToken("u-alice"), caseId: "A2a" });
    record("A2a", "Cross-tenant", "valid token, other tenant's path", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(403);
  });

  it("A2b: tenant confusion: Meridian path + x-tenant-id header + tenantId query for her own tenant", async () => {
    const r = await call({
      method: "GET",
      path: MERIDIAN_ACCOUNTS,
      token: await accessToken("u-alice"),
      headers: { "x-tenant-id": "neobank-aurora" },
      query: "tenantId=neobank-aurora",
      caseId: "A2b",
    });
    record("A2b", "Tenant confusion", "path=Meridian, header/query=Aurora", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(403);
  });

  it("A2-ctl: same token on her own tenant is allowed (the token itself is fine)", async () => {
    const r = await call({ method: "GET", path: "/tenants/neobank-aurora/accounts", token: await accessToken("u-alice"), caseId: "A2-ctl" });
    record("A2-ctl", "Control", "same token, own tenant", "ALLOW", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(200);
  });
});

describe("A3 replay after revocation -> DENY on the next request", () => {
  it("A3: capture an allowed request, revoke in DynamoDB, replay byte-for-byte", async () => {
    const captured = { method: "POST", path: AURORA_PAYMENTS, token: await accessToken("u-alice"), caseId: "A3" };
    try {
      const original = await call({ ...captured, phase: "original" });
      await setKycStatus("u-alice", "neobank-aurora", "revoked");
      const replay = await call({ ...captured, phase: "replay" });
      const actual = `${original.decision} -> ${replay.decision}`;
      record("A3", "Replay after revocation", "same token + request after status=revoked", "ALLOW -> DENY", actual, `HTTP ${original.status} -> ${replay.status}`);
      expect([original.status, replay.status]).toEqual([200, 403]);
    } finally {
      await setKycStatus("u-alice", "neobank-aurora", "active");
    }
  });
});

describe.runIf(process.env.ZTA_SLOW === "1")("A4 expired-token reuse (slow)", () => {
  it("A4: a genuine token is denied once expired", { timeout: 15 * 60_000 }, async () => {
    const token = await accessToken("u-alice", { fresh: true });
    const exp = decodePayload(token).exp as number;
    const before = await call({ method: "GET", path: "/tenants/neobank-aurora/accounts", token, caseId: "A4", phase: "valid" });
    const waitMs = Math.max(0, exp * 1000 - Date.now()) + 5_000;
    console.log(`A4: waiting ${(waitMs / 1000).toFixed(0)} s for the token to expire...`);
    await new Promise((res) => setTimeout(res, waitMs));
    const after = await call({ method: "GET", path: "/tenants/neobank-aurora/accounts", token, caseId: "A4", phase: "expired" });
    record("A4", "Expired-token reuse", "same genuine token after exp", "ALLOW -> DENY", `${before.decision} -> ${after.decision}`, `HTTP ${before.status} -> ${after.status}`);
    expect([before.status, after.status]).toEqual([200, 403]);
  });
});

describe("A7 wrong token type -> DENY", () => {
  it("A7: a genuine, validly signed ID token is used instead of the access token", async () => {
    const { IdToken } = await signIn("u-alice");
    const r = await call({ method: "GET", path: "/tenants/neobank-aurora/accounts", token: IdToken!, caseId: "A7" });
    record("A7", "Wrong token type", "valid ID token (token_use=id) on her own tenant", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(403);
  });
});

describe("A8 path tenant manipulation -> DENY (the tenant is taken from the path only)", () => {
  const variants: Array<[string, string, string]> = [
    ["A8a", "case variant of her own tenant id (NEOBANK-AURORA)", "/tenants/NEOBANK-AURORA/accounts"],
    ["A8b", "tenant that does not exist", "/tenants/ghost-tenant/accounts"],
    ["A8c", "encoded traversal in the tenant segment (neobank-aurora%2F..%2Fwealth-meridian)", "/tenants/neobank-aurora%2F..%2Fwealth-meridian/accounts"],
    ["A8d", "own tenant id with trailing whitespace (neobank-aurora%20)", "/tenants/neobank-aurora%20/accounts"],
  ];
  for (const [id, method, path] of variants) {
    it(`${id}: ${method}`, async () => {
      const r = await call({ method: "GET", path, token: await accessToken("u-alice"), caseId: id });
      record(id, "Path tenant manipulation", method, "DENY", r.decision, `HTTP ${r.status}`);
      expect(r.decision).toBe("DENY");
    });
  }
});

describe("A9 Authorization header tricks -> DENY", () => {
  it("A9a: token sent in the query string instead of the header", async () => {
    const token = await accessToken("u-alice");
    const r = await call({ method: "GET", path: "/tenants/neobank-aurora/accounts", query: `access_token=${token}`, caseId: "A9a" });
    record("A9a", "Header tricks", "token in ?access_token=, no Authorization header", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(401);
  });

  it("A9b: two tokens in one header (her own + bob's)", async () => {
    const raw = `Bearer ${await accessToken("u-alice")} ${await accessToken("u-bob")}`;
    const r = await call({ method: "GET", path: "/tenants/wealth-meridian/accounts", rawAuthorization: raw, caseId: "A9b" });
    record("A9b", "Header tricks", "'Bearer <alice> <bob>' on bob's tenant", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(403);
  });

  it("A9c: Basic auth with the real password instead of a token", async () => {
    const raw = `Basic ${Buffer.from(`u-alice:${testUsers["u-alice"]!.password}`).toString("base64")}`;
    const r = await call({ method: "GET", path: "/tenants/neobank-aurora/accounts", rawAuthorization: raw, caseId: "A9c" });
    record("A9c", "Header tricks", "Authorization: Basic <real credentials>", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(403);
  });

  it("A9d: identity headers claiming to be bob, on bob's tenant", async () => {
    const r = await call({
      method: "GET",
      path: "/tenants/wealth-meridian/accounts",
      token: await accessToken("u-alice"),
      headers: { "x-user-id": testUsers["u-bob"]!.sub, "x-username": "u-bob", "x-forwarded-user": "u-bob" },
      caseId: "A9d",
    });
    record("A9d", "Header tricks", "alice's token + x-user-id/x-username: bob", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(403);
  });
});

describe("A10 session revocation -> DENY on the next request (P6, README D14)", () => {
  // Cognito GlobalSignOut revokes the user's tokens inside Cognito, but the PEP verifies tokens
  // offline (signature + exp) and cannot see that. The logout path therefore also writes a
  // per-user sign-out marker (Sessions.tokens_valid_after), which P6 compares with the token's
  // `iat` on every request. A token issued after the sign-out works again.
  it("A10: signed-out token is refused at once; a new sign-in works", async () => {
    const user = "u-mallory";
    const path = "/tenants/neobank-aurora/accounts";
    const session = await snapshot("sessions", user);
    const results10: string[] = [];
    try {
      const token = (await signIn(user, { fresh: true })).AccessToken!;
      const before = await call({ method: "GET", path, token, caseId: "A10", phase: "signed-in" });
      results10.push(before.decision);

      // The logout path: Cognito GlobalSignOut + the sign-out marker for P6.
      await cognito.send(new GlobalSignOutCommand({ AccessToken: token }));
      // Marker = the old token's own iat (Cognito's clock), so the test does not depend on this
      // machine's clock. A production logout handler would write its server time.
      await signOutMarker(user, decodePayload(token).iat as number);
      const cognitoSays = await cognito.send(new GetUserCommand({ AccessToken: token })).then(
        () => "accepted",
        (e: Error) => `rejected (${e.name})`,
      );
      const afterSignOut = await call({ method: "GET", path, token, caseId: "A10", phase: "signed-out" });
      results10.push(afterSignOut.decision);

      // iat has 1-second resolution and P6 refuses iat <= marker, so sign in again a moment later.
      await new Promise((r) => setTimeout(r, 1500));
      const fresh = (await signIn(user, { fresh: true })).AccessToken!;
      const reSignedIn = await call({ method: "GET", path, token: fresh, caseId: "A10", phase: "new-sign-in" });
      results10.push(reSignedIn.decision);

      results.add({
        id: "A10",
        scenario: "Session revocation: same access token after sign-out (Cognito GlobalSignOut + sign-out marker), then a new sign-in",
        expected: "ALLOW -> DENY -> ALLOW",
        actual: results10.join(" -> "),
        detail: `Cognito GetUser on the old token: ${cognitoSays}; PEP HTTP ${before.status} -> ${afterSignOut.status} -> ${reSignedIn.status}`,
        pass: results10.join() === "ALLOW,DENY,ALLOW",
        expectedPolicies: { "signed-in": ["P1-tenant-isolation"], "signed-out": ["P6-session-revocation"], "new-sign-in": ["P1-tenant-isolation"] },
      });
      expect(results10).toEqual(["ALLOW", "DENY", "ALLOW"]);
      expect(cognitoSays).toMatch(/^rejected/);
    } finally {
      await restore(session);
    }
  });
});

describe("A5–A6 fail-closed defaults", () => {
  it("A5: a route with no ApiMetadata row is denied, even for a tenant_admin", async () => {
    const r = await call({ method: "GET", path: "/tenants/neobank-aurora/reports", token: await accessToken("u-frank"), caseId: "A5" });
    record("A5", "Unmapped endpoint", "valid admin token, route without metadata", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(403);
  });

  it("A6: no Authorization header is rejected by API Gateway before the PEP runs", async () => {
    const r = await call({ method: "GET", path: "/tenants/neobank-aurora/accounts", caseId: "A6" });
    record("A6", "Missing token", "no Authorization header", "DENY", r.decision, `HTTP ${r.status}`);
    expect(r.status).toBe(401);
  });
});
