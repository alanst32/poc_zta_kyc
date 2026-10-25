// Builders for forged tokens (A1). Each takes a GENUINE access token and derives an attack
// token from it, so everything except the property under attack is realistic.
import crypto from "node:crypto";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const parts = (jwt: string) => {
  const [h, p, s] = jwt.split(".");
  return {
    header: JSON.parse(Buffer.from(h!, "base64url").toString()),
    payload: JSON.parse(Buffer.from(p!, "base64url").toString()),
    signature: s!,
  };
};

/** Edit claims but keep the original signature (payload no longer matches it). */
export function tamperClaims(jwt: string, changes: Record<string, unknown>): string {
  const { header, payload, signature } = parts(jwt);
  return `${b64(header)}.${b64({ ...payload, ...changes })}.${signature}`;
}

/** Unsigned token: alg "none", empty signature. */
export function algNone(jwt: string, changes: Record<string, unknown>): string {
  const { header, payload } = parts(jwt);
  return `${b64({ ...header, alg: "none" })}.${b64({ ...payload, ...changes })}.`;
}

/** Validly signed, but with an attacker-generated RSA key while claiming the pool's real `kid`. */
export function attackerSigned(jwt: string, changes: Record<string, unknown>): string {
  const { header, payload } = parts(jwt);
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signingInput = `${b64(header)}.${b64({ ...payload, ...changes })}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return `${signingInput}.${sig}`;
}

/** Original header and payload, signature removed ("header.payload."), alg left as RS256. */
export function stripSignature(jwt: string): string {
  const [h, p] = jwt.split(".");
  return `${h}.${p}.`;
}

/** Re-signed with an attacker key under a `kid` the pool does not publish. */
export function unknownKid(jwt: string, changes: Record<string, unknown>): string {
  const { header, payload } = parts(jwt);
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signingInput = `${b64({ ...header, kid: "attacker-kid-0001" })}.${b64({ ...payload, ...changes })}`;
  return `${signingInput}.${crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url")}`;
}

/**
 * Algorithm confusion: alg switched to HS256 and the token HMAC-signed with the pool's PUBLIC
 * key (PEM) as the secret. A verifier that trusts the header's `alg` and uses the "key" it has
 * would accept it.
 */
export function hs256WithPublicKey(jwt: string, publicKeyPem: string, changes: Record<string, unknown>): string {
  const { header, payload } = parts(jwt);
  const signingInput = `${b64({ ...header, alg: "HS256" })}.${b64({ ...payload, ...changes })}`;
  return `${signingInput}.${crypto.createHmac("sha256", publicKeyPem).update(signingInput).digest("base64url")}`;
}

/** The PEM of the pool signing key named by the token's `kid`, from the public JWKS. */
export async function poolPublicKeyPem(jwt: string, region: string, userPoolId: string): Promise<string> {
  const { header } = parts(jwt);
  const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`);
  const { keys } = (await res.json()) as { keys: Array<crypto.JsonWebKey & { kid: string }> };
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error(`kid ${header.kid} not in the pool JWKS`);
  return crypto.createPublicKey({ key: jwk, format: "jwk" }).export({ type: "spki", format: "pem" }).toString();
}
