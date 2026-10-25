// Lambda entry point: wires the PEP (pep.ts) to real AWS dependencies. Clients are created
// at module scope so warm invocations reuse connections and the cached Cognito JWKS.

import { avpPdp } from "./cedar";
import { dynamoFactSource } from "./data";
import { cognitoVerifier } from "./jwt";
import { createAuthorizer } from "./pep";

const env = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
};

export const handler = createAuthorizer({
  verifier: cognitoVerifier(env("USER_POOL_ID"), env("USER_POOL_CLIENT_ID")),
  facts: dynamoFactSource({
    memberships: env("MEMBERSHIPS_TABLE"),
    kycState: env("KYC_TABLE"),
    riskScores: env("RISK_TABLE"),
    apiMetadata: env("API_METADATA_TABLE"),
    sessions: env("SESSIONS_TABLE"),
  }),
  pdp: avpPdp(env("POLICY_STORE_ID"), JSON.parse(env("POLICY_NAMES"))),
});
