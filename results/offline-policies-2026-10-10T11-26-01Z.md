# offline-policies: run 2026-10-10T11-26-01Z

- **Engine:** cedar-wasm (local Cedar evaluator), same schema + policy files as the deployed store
- **Clock:** pinned at 1800000000
- **Result:** 37/37 cases match expected

| # | Scenario | Expected | Actual | Detail | Pass |
|---|---|---|---|---|---|
| T1 | Own tenant, sufficient KYC (alice L2 -> Aurora InitiatePayment, needs L2) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T2 | Cross-tenant: alice is not a member of Meridian (P1 does not permit) | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| T2-ctl | Control: Meridian member (bob) on the same route | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T3 | Per-tenant KYC: alice L2 in SwiftRemit -> SendInternational (needs L3) | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| T3-ctl | Control: same user in Aurora -> ViewAccounts (L1) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T4 | Expired KYC (dave: past kyc_expires_at, status still 'active') | DENY [P3-kyc-expiry] | DENY [P3-kyc-expiry] | pdp-deny | ✅ |
| T5 | Revoked relationship (erin: status=revoked in SwiftRemit) | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| T5-ctl | Control: same user, other tenant, still active (revocation is per relationship) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T7 | Insufficient tier (carol L1 -> InitiatePayment, needs L2) | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| T7-ctl | Control: same user, L1 action (ViewAccounts) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T8 | Role boundary (alice account_holder -> ManageUsers, tenant_admin only) | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| T8-ctl | Control: tenant_admin (frank) on the same route | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T3-ctl2 | Control: L3 user (grace) on the L3 route in SwiftRemit (boundary: level == requirement) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T9 | Per-tenant KYC divergence: grace is L1 in Aurora -> InitiatePayment (needs L2) | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| T9-ctl | Control: same user, same moment, SwiftRemit (L3) -> InitiatePayment | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T10 | KYC status 'expired' (heidi, expiry date still in the future) | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| T10-ctl | Control: same user, other tenant, status active | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T11a | Several gates fail at once (ivan: L1, expired, revoked, risk 95) -> InitiatePayment | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| T11b | Same user -> ManageUsers (L1 is enough, so P2 does not fire; P5 does) | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| T12 | Member with NO KycState and NO RiskScores row (judy, Aurora): fail closed | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| T13 | Member with KycState but NO RiskScores row (judy, SwiftRemit): unknown risk = deny | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| T14 | Roles are per tenant: frank is tenant_admin in Aurora but not in SwiftRemit -> ManageUsers there | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| T15 | Several roles in one tenant (ken: compliance_officer + tenant_admin) -> ManageUsers | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| G1 | FINDING: account_holder (alice) -> ManageRoles (privilege escalation; intended tenant_admin only) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| G2 | FINDING: account_holder (alice) -> ApprovePayment (intended payments_operator only) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| G3 | FINDING: account_holder (alice) -> FreezeAccount (intended compliance_officer only) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| G4 | FINDING: account_holder (alice) -> ViewKycStatus (intended compliance_officer/tenant_admin only) | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| T6 | Real-time risk: risk 10 -> 90 (> 70) -> 10 | ALLOW -> DENY [P4] -> ALLOW | ALLOW -> DENY [P4-risk-revocation] -> ALLOW |  | ✅ |
| A1-off | Token fails verification | DENY | DENY | invalid-token | ✅ |
| A2-off | alice -> Meridian path with x-tenant-id: neobank-aurora | DENY | DENY | [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | ✅ |
| A3-off | Identical request replayed after status=revoked | ALLOW -> DENY | ALLOW -> DENY | [P4-risk-revocation] | ✅ |
| A5-off | Unmapped route GET /reports (tenant_admin caller) | DENY | DENY | unmapped-route | ✅ |
| X1 | Member with no KycState row | DENY | DENY | [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | ✅ |
| X2 | Member with no RiskScores row | DENY | DENY | [P4-risk-revocation] | ✅ |
| X3 | PDP returns ALLOW with evaluation errors | DENY | DENY | evaluation-error | ✅ |
| X3b | Missing risk_threshold: Cedar alone says ALLOW (P4 skipped) | DENY | DENY | evaluation-error; 1 Cedar error(s) | ✅ |
| X4 | PDP call throws | DENY | DENY | pep-error | ✅ |
