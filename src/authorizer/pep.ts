// The Policy Enforcement Point. It holds no authorisation rules of its own: it gathers
// facts, asks the PDP, and enforces the answer. It fails closed on every error path.
//
//   1. Verify + decode the JWT (Cognito JWKS)            -> identity only
//   2-3. Read ApiMetadata[route], Memberships, KycState,
//        RiskScores, Sessions from DynamoDB (live)
//   4. Build the Cedar entities + context
//   5. Call the PDP (Verified Permissions IsAuthorized)
//   6. Return allow/deny to API Gateway
//
// Dependencies are injected so the offline tests can run this exact code with in-memory
// facts and a local Cedar engine.

import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from "aws-lambda";
import { buildAuthzRequest } from "./cedar";
import { extractBearer } from "./jwt";
import type { Decision, FactSource, Identity, Pdp, TokenVerifier } from "./types";

export interface PepDeps {
  verifier: TokenVerifier;
  facts: FactSource;
  pdp: Pdp;
  /** Epoch seconds. Injectable so tests can pin time. */
  clock?: () => number;
  log?: (record: DecisionRecord) => void;
}

/** Passed to the protected target on ALLOW (values must be scalars for HTTP API). */
export interface AuthorizerContext {
  [key: string]: string;
  userId: string;
  username: string;
  tenantId: string;
  action: string;
}

export type DenyReason =
  | "no-token"
  | "invalid-token"
  | "no-tenant-in-path"
  | "unmapped-route"
  | "pdp-deny"
  | "evaluation-error"
  | "pep-error";

/** One structured log line per decision. Used for evidence (determining policies) and latency. */
export interface DecisionRecord {
  type: "decision";
  requestId: string;
  routeKey: string;
  tenantId?: string;
  userId?: string;
  username?: string;
  action?: string;
  decision: Decision;
  reason: DenyReason | "pdp-allow";
  determiningPolicies: string[];
  errors: string[];
  coldStart: boolean;
  timings: { jwtMs: number; factsMs: number; pdpMs: number; totalMs: number };
  /** Test-harness correlation headers (x-zta-run / x-zta-case / x-zta-phase). */
  run?: string;
  case?: string;
  phase?: string;
}

type Result = APIGatewaySimpleAuthorizerWithContextResult<AuthorizerContext>;

let coldStart = true;

export function createAuthorizer(deps: PepDeps) {
  const clock = deps.clock ?? (() => Math.floor(Date.now() / 1000));
  const log = deps.log ?? ((r: DecisionRecord) => console.log(JSON.stringify(r)));

  return async function authorize(event: APIGatewayRequestAuthorizerEventV2): Promise<Result> {
    const t0 = performance.now();
    const timings = { jwtMs: 0, factsMs: 0, pdpMs: 0, totalMs: 0 };
    const headers = event.headers ?? {};
    const record: DecisionRecord = {
      type: "decision",
      requestId: event.requestContext?.requestId ?? "local",
      routeKey: event.routeKey,
      decision: "DENY",
      reason: "pep-error",
      determiningPolicies: [],
      errors: [],
      coldStart,
      timings,
      run: headers["x-zta-run"],
      case: headers["x-zta-case"],
      phase: headers["x-zta-phase"],
    };
    coldStart = false;

    const finish = (decision: Decision, reason: DecisionRecord["reason"], ctx?: AuthorizerContext): Result => {
      record.decision = decision;
      record.reason = reason;
      timings.totalMs = round(performance.now() - t0);
      log(record);
      return decision === "ALLOW" && ctx ? { isAuthorized: true, context: ctx } : { isAuthorized: false, context: {} as AuthorizerContext };
    };

    try {
      // 1. Identity (JWT). Nothing but identity is trusted from the token.
      const token = extractBearer(headers.authorization);
      if (!token) return finish("DENY", "no-token");
      let identity: Identity;
      const tJwt = performance.now();
      try {
        identity = await deps.verifier.verify(token);
      } catch (e) {
        record.errors.push(errorMessage(e));
        return finish("DENY", "invalid-token");
      } finally {
        timings.jwtMs = round(performance.now() - tJwt);
      }
      record.userId = identity.userId;
      record.username = identity.username;

      // The resource's tenant comes from the PATH only.
      const tenantId = event.pathParameters?.tenantId;
      if (!tenantId) return finish("DENY", "no-tenant-in-path");
      record.tenantId = tenantId;

      // 2-3. Live facts.
      const tFacts = performance.now();
      const facts = await deps.facts.load(identity.userId, tenantId, event.routeKey);
      timings.factsMs = round(performance.now() - tFacts);
      // No metadata = the PEP cannot describe the request to Cedar, so deny.
      if (!facts.api) return finish("DENY", "unmapped-route");
      record.action = facts.api.action;

      // 4-5. Ask the PDP.
      const request = buildAuthzRequest(identity.userId, tenantId, { ...facts, api: facts.api }, clock(), identity.issuedAt);
      const tPdp = performance.now();
      const result = await deps.pdp.isAuthorized(request);
      timings.pdpMs = round(performance.now() - tPdp);
      record.determiningPolicies = result.determiningPolicies;
      record.errors.push(...result.errors);

      // 6. Enforce. Any evaluation error means DENY: in Cedar a forbid that errors is
      // skipped, so trusting an ALLOW that came with errors could let a veto be lost.
      if (result.errors.length > 0) return finish("DENY", "evaluation-error");
      if (result.decision !== "ALLOW") return finish("DENY", "pdp-deny");
      return finish("ALLOW", "pdp-allow", {
        userId: identity.userId,
        username: identity.username,
        tenantId,
        action: facts.api.action,
      });
    } catch (e) {
      record.errors.push(errorMessage(e));
      return finish("DENY", "pep-error");
    }
  };
}

const round = (ms: number) => Math.round(ms * 100) / 100;
const errorMessage = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));
