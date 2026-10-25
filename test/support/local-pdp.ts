// Offline PDP: the same Cedar policies + schema evaluated locally with cedar-wasm (the
// Cedar engine compiled to WebAssembly). The PEP sends AVP the same Cedar JSON request,
// so offline and deployed decisions should match.
import * as cedar from "@cedar-policy/cedar-wasm/nodejs";
import { loadPolicies, loadSchemaText } from "../../cedar/load";
import type { AuthzRequest, Pdp } from "../../src/authorizer/types";

/**
 * @param opts.validateRequest false = evaluate without schema checks on the request, the way
 *   a malformed-but-accepted request would be evaluated. Used to show Cedar's "an erroring
 *   policy is skipped" behaviour and that the PEP fails closed on it.
 */
export function localPdp(opts: { validateRequest?: boolean } = {}): Pdp & { lastRequest?: AuthzRequest } {
  const validate = opts.validateRequest ?? true;
  const schema = loadSchemaText();
  const staticPolicies = Object.fromEntries(loadPolicies().map((p) => [p.name, p.statement]));
  const pdp: Pdp & { lastRequest?: AuthzRequest } = {
    async isAuthorized(req) {
      pdp.lastRequest = req;
      const answer = cedar.isAuthorized({
        principal: req.principal,
        action: req.action,
        resource: req.resource,
        context: req.context,
        entities: req.entities,
        policies: { staticPolicies },
        ...(validate ? { schema, validateRequest: true } : {}), // reject non-conforming requests
      });
      if (answer.type === "failure") {
        // A malformed request is an evaluation error, so the PEP fails closed.
        return { decision: "DENY", determiningPolicies: [], errors: answer.errors.map((e) => e.message) };
      }
      const { decision, diagnostics } = answer.response;
      return {
        decision: decision === "allow" ? "ALLOW" : "DENY",
        determiningPolicies: [...diagnostics.reason].sort(),
        errors: diagnostics.errors.map((e) => `${e.policyId}: ${e.error.message}`),
      };
    },
  };
  return pdp;
}
