// Deployed-stack client: authenticates fixture users against Cognito and calls the API as
// a real external client. Decisions are observed at the HTTP level: 200 = ALLOW, 403 = DENY
// (Lambda authoriser returned isAuthorized=false), 401 = no Authorization header.
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Decision } from "../../src/authorizer/types";
import { readOutputs, readTestUsers, RUN_ID } from "./env";

export const outputs = readOutputs();
export const testUsers = readTestUsers();
export const cognito = new CognitoIdentityProviderClient({ region: outputs.Region });
const tokenCache = new Map<string, { tokens: AuthenticationResultType; exp: number }>();

/** Signs in via USER_PASSWORD_AUTH. Tokens are cached until 30 s before the access token expires. */
export async function signIn(username: string, { fresh = false } = {}): Promise<AuthenticationResultType> {
  const cached = tokenCache.get(username);
  if (!fresh && cached && cached.exp - 30 > Date.now() / 1000) return cached.tokens;
  const user = testUsers[username];
  if (!user) throw new Error(`Unknown fixture user ${username} (did you run npm run seed?)`);
  const res = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: outputs.UserPoolClientId,
      AuthParameters: { USERNAME: username, PASSWORD: user.password },
    }),
  );
  const tokens = res.AuthenticationResult;
  if (!tokens?.AccessToken) throw new Error(`No access token for ${username}`);
  tokenCache.set(username, { tokens, exp: decodePayload(tokens.AccessToken).exp as number });
  return tokens;
}

/** Access token for a fixture user (the token the API expects). */
export async function accessToken(username: string, opts: { fresh?: boolean } = {}): Promise<string> {
  return (await signIn(username, opts)).AccessToken!;
}

export interface CallResult {
  status: number;
  decision: Decision;
  ms: number;
  requestId?: string;
  body: string;
}

export async function call(opts: {
  method: string;
  path: string; // e.g. /tenants/neobank-aurora/payments
  token?: string; // omit for no Authorization header
  rawAuthorization?: string;
  headers?: Record<string, string>;
  caseId?: string;
  phase?: string;
  query?: string;
}): Promise<CallResult> {
  const headers: Record<string, string> = { "x-zta-run": RUN_ID, ...opts.headers };
  if (opts.caseId) headers["x-zta-case"] = opts.caseId;
  if (opts.phase) headers["x-zta-phase"] = opts.phase;
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.rawAuthorization) headers.authorization = opts.rawAuthorization;
  if (opts.method === "POST") headers["content-type"] = "application/json";

  const t0 = performance.now();
  const res = await fetch(`${outputs.ApiUrl}${opts.path}${opts.query ? `?${opts.query}` : ""}`, {
    method: opts.method,
    headers,
    body: opts.method === "POST" ? JSON.stringify({ synthetic: true }) : undefined,
  });
  const body = await res.text();
  const ms = performance.now() - t0;
  return {
    status: res.status,
    decision: res.status === 200 ? "ALLOW" : "DENY",
    ms,
    requestId: res.headers.get("apigw-requestid") ?? undefined,
    body,
  };
}

export function decodePayload(jwt: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(jwt.split(".")[1]!, "base64url").toString("utf8"));
}

export const environmentInfo = () => ({
  Region: outputs.Region,
  "Authoriser Lambda": `${outputs.LambdaMemoryMb} MB, arm64, Node.js 22`,
  "Authoriser cache": "disabled (TTL 0)",
  // The endpoint URL is deliberately not recorded, so result files are safe to publish.
  API: "API Gateway HTTP API (endpoint not recorded)",
  Run: RUN_ID,
});
