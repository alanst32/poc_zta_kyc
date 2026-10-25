// Loads the Cedar schema and policies from disk. The CDK stack (to create the Verified
// Permissions policy store) and the offline policy tests (cedar-wasm) both use this, so
// what gets deployed and what gets tested offline come from the same files.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cedar from "@cedar-policy/cedar-wasm/nodejs";

const CEDAR_DIR = path.dirname(fileURLToPath(import.meta.url));

export interface PolicyFile {
  /** Stable, human-readable name, e.g. "P2-kyc-tier" (derived from the file name). */
  name: string;
  statement: string;
}

/** Human-readable Cedar schema text (the source of truth). */
export function loadSchemaText(): string {
  return fs.readFileSync(path.join(CEDAR_DIR, "schema.cedarschema"), "utf8");
}

/**
 * Cedar JSON schema, the format the Verified Permissions PutSchema API expects. Type
 * references are fully resolved (plain "Long", "Entity", ...) rather than the newer
 * "EntityOrCommon" form, so it works with whichever Cedar version the managed service runs.
 */
export function loadSchemaJson(): object {
  const answer = cedar.schemaToJsonWithResolvedTypes(loadSchemaText());
  if (answer.type !== "success") {
    throw new Error(`Invalid Cedar schema: ${answer.errors.map((e) => e.message).join("; ")}`);
  }
  return answer.json;
}

/** p1-tenant-isolation.cedar -> { name: "P1-tenant-isolation", statement: "permit ..." } */
export function loadPolicies(): PolicyFile[] {
  const dir = path.join(CEDAR_DIR, "policies");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".cedar"))
    .sort()
    .map((f) => ({
      name: f.replace(/\.cedar$/, "").replace(/^p(\d)/, "P$1"),
      statement: fs.readFileSync(path.join(dir, f), "utf8"),
    }));
}

/** Strict validation of every policy against the schema. Throws on any error. */
export function assertPoliciesValid(): void {
  const answer = cedar.validate({
    schema: loadSchemaText(),
    policies: { staticPolicies: Object.fromEntries(loadPolicies().map((p) => [p.name, p.statement])) },
    validationSettings: { mode: "strict" },
  });
  if (answer.type === "failure") {
    throw new Error(`Cedar validation failed: ${answer.errors.map((e) => e.message).join("; ")}`);
  }
  if (answer.validationErrors.length > 0) {
    const msgs = answer.validationErrors.map((e) => `${e.policyId}: ${e.error.message}`);
    throw new Error(`Cedar policy validation errors:\n  ${msgs.join("\n  ")}`);
  }
}
