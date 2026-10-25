// Verified Permissions (the Cedar PDP): a STRICT-validated policy store loaded with the
// schema and the P1-P5 policy files from cedar/, the same files the offline tests evaluate.
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as avp from "aws-cdk-lib/aws-verifiedpermissions";
import { Construct } from "constructs";
import { assertPoliciesValid, loadPolicies, loadSchemaJson } from "../../cedar/load";
import { REMOVAL_POLICY } from "../config";

export class CedarPolicyStore extends Construct {
  readonly store: avp.CfnPolicyStore;
  readonly policies: ReadonlyArray<{ name: string; policy: avp.CfnPolicy }>;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    assertPoliciesValid(); // fail at synth time, not at deploy time

    this.store = new avp.CfnPolicyStore(this, "Store", {
      description: "PayVault ZTA/KYC experiment",
      validationSettings: { mode: "STRICT" },
      schema: { cedarJson: JSON.stringify(loadSchemaJson()) },
    });
    this.store.applyRemovalPolicy(REMOVAL_POLICY);

    this.policies = loadPolicies().map((p) => {
      const policy = new avp.CfnPolicy(this, p.name, {
        policyStoreId: this.store.attrPolicyStoreId,
        // The readable name goes in the description; scripts/validate.ts matches on it.
        definition: { static: { statement: p.statement, description: p.name } },
      });
      policy.applyRemovalPolicy(REMOVAL_POLICY);
      return { name: p.name, policy };
    });
  }

  get policyStoreId(): string {
    return this.store.attrPolicyStoreId;
  }

  /** IsAuthorized on THIS store only. No other policy-store operations. */
  grantIsAuthorized(grantee: iam.IGrantable): void {
    grantee.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({ actions: ["verifiedpermissions:IsAuthorized"], resources: [this.store.attrArn] }),
    );
  }

  /**
   * Environment variables the PEP expects. AVP generates policy ids, so the PEP gets an
   * id -> name map and logs "P4-risk-revocation" instead of an opaque id.
   */
  pepEnvironment(): Record<string, string> {
    return {
      POLICY_STORE_ID: this.policyStoreId,
      POLICY_NAMES: cdk.Stack.of(this).toJsonString(
        Object.fromEntries(this.policies.map(({ name, policy }) => [policy.attrPolicyId, name])),
      ),
    };
  }
}
