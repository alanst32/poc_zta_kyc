// Schema-validation evidence for the paper (Section 5.3).
//
//   npm run validate               offline: STRICT validation of every policy against the schema
//   npm run validate -- --deployed also checks the deployed Verified Permissions store: its
//                                  validation mode is STRICT, and the deployed policy statements
//                                  are byte-identical to cedar/policies/*.cedar (paper = code = deployed)
import fs from "node:fs";
import path from "node:path";
import * as cedar from "@cedar-policy/cedar-wasm/nodejs";
import {
  GetPolicyCommand,
  GetPolicyStoreCommand,
  ListPoliciesCommand,
  VerifiedPermissionsClient,
} from "@aws-sdk/client-verifiedpermissions";
import { loadPolicies, loadSchemaText } from "../cedar/load";
import { readOutputs, ROOT, RUN_ID } from "../test/support/env";

async function main() {
  const lines: string[] = [`# Cedar schema validation: run ${RUN_ID}`, ""];
  const schema = loadSchemaText();
  const policies = loadPolicies();
  let ok = true;

  // ---- offline STRICT validation, per policy and as a set ----
  lines.push(`- **Validator:** Cedar ${cedar.getCedarVersion()} (cedar-wasm), mode **strict**`, "",
    "| Policy | Effect | Strict validation |", "|---|---|---|");
  for (const p of policies) {
    const v = cedar.validate({ schema, policies: { staticPolicies: { [p.name]: p.statement } }, validationSettings: { mode: "strict" } });
    const errs = v.type === "failure" ? v.errors.map((e) => e.message) : v.validationErrors.map((e) => e.error.message);
    const warns = v.type === "success" ? v.validationWarnings.length + v.otherWarnings.length : v.warnings.length;
    ok &&= errs.length === 0;
    const effect = /^\s*(permit|forbid)/m.exec(p.statement)?.[1] ?? "?";
    lines.push(`| ${p.name} | ${effect} | ${errs.length === 0 ? `pass (0 errors, ${warns} warnings)` : `FAIL: ${errs.join("; ")}`} |`);
  }

  // ---- deployed store ----
  if (process.argv.includes("--deployed")) {
    const out = readOutputs();
    const avp = new VerifiedPermissionsClient({ region: out.Region });
    const store = await avp.send(new GetPolicyStoreCommand({ policyStoreId: out.PolicyStoreId }));
    const mode = store.validationSettings?.mode;
    ok &&= mode === "STRICT";
    lines.push("", `- **Deployed policy store:** ${out.PolicyStoreId} (${out.Region}), validation mode **${mode}**`, "",
      "| Policy | Deployed statement identical to repo file |", "|---|---|");
    const ids = (await avp.send(new ListPoliciesCommand({ policyStoreId: out.PolicyStoreId }))).policies ?? [];
    const deployed = new Map<string, string>();
    for (const { policyId } of ids) {
      const p = await avp.send(new GetPolicyCommand({ policyStoreId: out.PolicyStoreId, policyId: policyId! }));
      const def = p.definition && "static" in p.definition ? p.definition.static : undefined;
      if (def?.description) deployed.set(def.description, def.statement ?? "");
    }
    for (const p of policies) {
      const same = deployed.get(p.name) === p.statement;
      ok &&= same;
      lines.push(`| ${p.name} | ${same ? "yes" : deployed.has(p.name) ? "NO: differs" : "NO: missing"} |`);
    }
    if (deployed.size !== policies.length) {
      ok = false;
      lines.push("", `**Deployed store has ${deployed.size} policies, repo has ${policies.length}.**`);
    }
  }

  lines.push("", `**Overall: ${ok ? "PASS" : "FAIL"}**`, "");
  const md = lines.join("\n");
  fs.mkdirSync(path.join(ROOT, "results"), { recursive: true });
  const file = path.join(ROOT, "results", `validation-${RUN_ID}.md`);
  fs.writeFileSync(file, md);
  console.log(md + `\nWritten: ${path.relative(ROOT, file)}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
