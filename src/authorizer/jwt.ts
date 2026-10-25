// Step 1 of the PEP: verify the Cognito access token and extract identity.
//
// aws-jwt-verify checks the RS256 signature against the user pool's JWKS (fetched once and
// cached across warm invocations), plus `iss`, `exp`, `token_use` = "access" and `client_id`.
// A tampered payload, an `alg: none` token or a token signed with another key fails here (A1).

import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Identity, TokenVerifier } from "./types";

export function cognitoVerifier(userPoolId: string, clientId: string): TokenVerifier {
  const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "access" });
  return {
    async verify(token: string): Promise<Identity> {
      const payload = await verifier.verify(token);
      // Only identity (and the token's own issue time, for P6) is taken from the token. Any
      // other claim (e.g. an injected "tenant_id" or "kyc_level") is ignored by design.
      return { userId: payload.sub, username: String(payload.username ?? payload.sub), issuedAt: payload.iat };
    },
  };
}

/** "Bearer <jwt>" -> "<jwt>" (API Gateway lower-cases header names in payload v2). */
export function extractBearer(authorizationHeader: string | undefined): string | undefined {
  const m = /^Bearer\s+(\S+)$/i.exec(authorizationHeader ?? "");
  return m?.[1];
}
