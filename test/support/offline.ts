// Offline harness shared by the offline suites: the REAL PEP (src/authorizer/pep.ts) wired to
// a fake token verifier, in-memory facts and the local Cedar engine, with a pinned clock.
import type { APIGatewayRequestAuthorizerEventV2 } from "aws-lambda";
import { createAuthorizer, type DecisionRecord } from "../../src/authorizer/pep";
import type { FactSource, Pdp, TokenVerifier } from "../../src/authorizer/types";
import { routeKeyOf, type DecisionCase } from "./cases";
import { localPdp } from "./local-pdp";
import { memoryFacts } from "./memory-facts";

export const NOW = 1_800_000_000; // pinned clock (epoch seconds) so expiry cases are deterministic
/** Issued-at time of every offline token: one minute before NOW. */
export const TOKEN_IAT = NOW - 60;

// Offline stand-in for Cognito: "user:<username>" is a valid token, anything else is not.
export const fakeVerifier: TokenVerifier = {
  async verify(token) {
    const m = /^user:(.+)$/.exec(token);
    if (!m) throw new Error("JwtInvalidSignatureError: invalid signature");
    return { userId: m[1]!, username: m[1]!, issuedAt: TOKEN_IAT };
  },
};

export function harness(opts: { facts?: FactSource; pdp?: Pdp } = {}) {
  const mem = memoryFacts(NOW);
  const records: DecisionRecord[] = [];
  const authorize = createAuthorizer({
    verifier: fakeVerifier,
    facts: opts.facts ?? mem.source,
    pdp: opts.pdp ?? localPdp(),
    clock: () => NOW,
    log: (r) => records.push(r),
  });
  const call = async (
    c: Pick<DecisionCase, "user" | "method" | "tenant" | "subPath">,
    o: { token?: string; headers?: Record<string, string>; route?: string } = {},
  ) => {
    const event = {
      routeKey: o.route ?? routeKeyOf(c),
      pathParameters: { tenantId: c.tenant },
      headers: { authorization: `Bearer ${o.token ?? `user:${c.user}`}`, ...o.headers },
      requestContext: { requestId: "offline" },
    } as unknown as APIGatewayRequestAuthorizerEventV2;
    const res = await authorize(event);
    return { decision: res.isAuthorized ? "ALLOW" : "DENY", record: records.at(-1)! };
  };
  return { mem, call };
}

export const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
export const fmt = (p: string[]) => `[${p.join(", ")}]`;
