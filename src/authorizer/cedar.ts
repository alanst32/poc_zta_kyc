// Steps 4-5 of the PEP: turn DynamoDB facts into a Cedar request, then ask the PDP.
// The shape matches the paper's policy set (Fv2_version1, Section 3.3.2).
//
// This is the heart of the experiment. Every mapping below must be defensible:
//
//   principal  PayVault::User::"<cognito sub>"
//              tenants = every tenant in the user's Memberships rows    (P1)
//   action     PayVault::Action::"<ApiMetadata.action>"
//   resource   PayVault::<ApiMetadata.resource_type>::"<tenantId>/<resource_type>"
//              tenant             = PayVault::Tenant::"<tenantId from the PATH>" (P1)
//              required_kyc_level = ApiMetadata.required_kyc_level       (P2)
//              risk_threshold     = ApiMetadata.risk_threshold           (P4)
//              allowed_roles      = ApiMetadata.allowed_roles            (P5)
//   context    resolved for (user, tenant the request addresses), never from the token:
//              kyc_level, kyc_expires_at, kyc_status <- KycState      (P2, P3, P4)
//              roles                                 <- Memberships   (P5)
//              risk_score                            <- RiskScores    (P4)
//              now                                   <- PEP clock     (P3)
//              token_iat                             <- JWT `iat`     (P6)
//              tokens_valid_after                    <- Sessions      (P6; 0 if no row)
//
// The schema makes every context attribute required, so a missing row (e.g. the user has
// no relationship with that tenant) cannot simply be left out. It is filled with a
// FAIL-CLOSED value instead: one that, on its own, makes a forbid fire (see ABSENT).

import { IsAuthorizedCommand, VerifiedPermissionsClient } from "@aws-sdk/client-verifiedpermissions";
import type { AuthzRequest, ApiMetadataRow, CedarValue, EntityRef, Pdp, RequestFacts } from "./types";

/**
 * Values used when a per-tenant row is missing. Each one independently triggers a deny:
 *   kyc_level 0          -> P2 (every action requires level >= 1)
 *   kyc_expires_at 0     -> P3 (already expired)
 *   kyc_status "absent"  -> P4 (not "active")
 *   risk_score MAX       -> P4 (above any threshold)
 *   roles []             -> P5 (no allowed role)
 *
 * The Sessions row is the exception: a missing row is the NORMAL state (the user has never
 * been signed out), so it maps to tokens_valid_after 0, which lets P6 pass.
 */
export const ABSENT = {
  kyc_level: 0,
  kyc_expires_at: 0,
  kyc_status: "absent",
  risk_score: Number.MAX_SAFE_INTEGER,
  roles: [] as string[],
} as const;

/** The schema namespace (cedar/schema.cedarschema). Verified Permissions requires one. */
export const NAMESPACE = "PayVault";

const ref = (type: string, id: string): EntityRef => ({ type: `${NAMESPACE}::${type}`, id });
const entityValue = (r: EntityRef): CedarValue => ({ __entity: r });

export function buildAuthzRequest(
  userId: string,
  tenantId: string,
  facts: RequestFacts & { api: ApiMetadataRow },
  now: number,
  tokenIssuedAt: number,
): AuthzRequest {
  const { api, kyc, risk } = facts;
  const principal = ref("User", userId);
  // Collection-level resource: "the Payments of tenant X". Instance-level ownership checks
  // (e.g. "only MY account") are out of scope for this experiment.
  const resource = ref(api.resource_type, `${tenantId}/${api.resource_type}`);
  const membership = facts.memberships.find((m) => m.tenant_id === tenantId);

  return {
    principal,
    action: ref("Action", api.action),
    resource,
    context: {
      kyc_level: kyc?.kyc_level ?? ABSENT.kyc_level,
      kyc_expires_at: kyc?.kyc_expires_at ?? ABSENT.kyc_expires_at,
      kyc_status: kyc?.status ?? ABSENT.kyc_status,
      roles: membership?.roles ?? [...ABSENT.roles],
      risk_score: risk?.risk_score ?? ABSENT.risk_score,
      now,
      token_iat: tokenIssuedAt,
      tokens_valid_after: facts.session?.tokens_valid_after ?? 0,
    },
    entities: [
      {
        uid: principal,
        attrs: { tenants: facts.memberships.map((m) => entityValue(ref("Tenant", m.tenant_id))) },
        parents: [],
      },
      {
        uid: resource,
        attrs: {
          tenant: entityValue(ref("Tenant", tenantId)),
          required_kyc_level: api.required_kyc_level,
          risk_threshold: api.risk_threshold,
          allowed_roles: api.allowed_roles,
        },
        parents: [],
      },
    ],
  };
}

/**
 * Verified Permissions PDP. Context and entities are sent as Cedar JSON, the same format
 * the offline tests evaluate with cedar-wasm, so both see identical requests.
 *
 * FAIL CLOSED ON CEDAR ERRORS (the paper states this): in Cedar a policy whose condition
 * errors is skipped, and a skipped forbid means the gate silently does not fire. So any
 * entry in the `errors` list turns the result into DENY, whatever `decision` says. pep.ts
 * enforces the same rule again for any Pdp implementation.
 *
 * @param policyNames maps AVP-generated policy ids to readable names ("P4-risk-revocation").
 */
export function avpPdp(
  policyStoreId: string,
  policyNames: Record<string, string>,
  client = new VerifiedPermissionsClient({}),
): Pdp {
  return {
    async isAuthorized(req) {
      const out = await client.send(
        new IsAuthorizedCommand({
          policyStoreId,
          principal: { entityType: req.principal.type, entityId: req.principal.id },
          action: { actionType: req.action.type, actionId: req.action.id },
          resource: { entityType: req.resource.type, entityId: req.resource.id },
          context: { cedarJson: JSON.stringify(req.context) },
          entities: { cedarJson: JSON.stringify(req.entities) },
        }),
      );
      const errors = (out.errors ?? []).map((e) => e.errorDescription ?? "unknown evaluation error");
      return {
        decision: out.decision === "ALLOW" && errors.length === 0 ? "ALLOW" : "DENY",
        determiningPolicies: (out.determiningPolicies ?? []).map((p) => policyNames[p.policyId!] ?? p.policyId!),
        errors,
      };
    },
  };
}
