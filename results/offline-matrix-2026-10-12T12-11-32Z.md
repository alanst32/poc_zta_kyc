# offline-matrix: run 2026-10-12T12-11-32Z

- **Engine:** cedar-wasm + real PEP code, in-memory fixtures
- **Oracle:** test/support/oracle.ts (P1–P6 restated over raw facts)
- **Clock:** pinned at 1800000000
- **Result:** 429/429 cases match expected

| # | Scenario | Expected | Actual | Detail | Pass |
|---|---|---|---|---|---|
| M-alice-aurora-ViewAccounts | u-alice -> neobank-aurora GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-aurora-ViewTransactions | u-alice -> neobank-aurora GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-aurora-InitiatePayment | u-alice -> neobank-aurora POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-aurora-ApprovePayment | u-alice -> neobank-aurora POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-aurora-ExportStatements | u-alice -> neobank-aurora POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-aurora-SendInternational | u-alice -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-alice-aurora-ViewKycStatus | u-alice -> neobank-aurora GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-aurora-FreezeAccount | u-alice -> neobank-aurora POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-aurora-ManageUsers | u-alice -> neobank-aurora POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-aurora-ManageRoles | u-alice -> neobank-aurora POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-aurora-unmapped-reports | u-alice -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-alice-swift-ViewAccounts | u-alice -> remit-swift GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-swift-ViewTransactions | u-alice -> remit-swift GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-swift-InitiatePayment | u-alice -> remit-swift POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-swift-ApprovePayment | u-alice -> remit-swift POST /payments/approve | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-swift-ExportStatements | u-alice -> remit-swift POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-alice-swift-SendInternational | u-alice -> remit-swift POST /remittance/international | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| M-alice-swift-ViewKycStatus | u-alice -> remit-swift GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-swift-FreezeAccount | u-alice -> remit-swift POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-swift-ManageUsers | u-alice -> remit-swift POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-swift-ManageRoles | u-alice -> remit-swift POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-alice-swift-unmapped-reports | u-alice -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-alice-meridian-ViewAccounts | u-alice -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-ViewTransactions | u-alice -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-InitiatePayment | u-alice -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-ApprovePayment | u-alice -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-ExportStatements | u-alice -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-SendInternational | u-alice -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-ViewKycStatus | u-alice -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-FreezeAccount | u-alice -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-ManageUsers | u-alice -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-ManageRoles | u-alice -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-alice-meridian-unmapped-reports | u-alice -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-bob-aurora-ViewAccounts | u-bob -> neobank-aurora GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-ViewTransactions | u-bob -> neobank-aurora GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-InitiatePayment | u-bob -> neobank-aurora POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-ApprovePayment | u-bob -> neobank-aurora POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-ExportStatements | u-bob -> neobank-aurora POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-SendInternational | u-bob -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-ViewKycStatus | u-bob -> neobank-aurora GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-FreezeAccount | u-bob -> neobank-aurora POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-ManageUsers | u-bob -> neobank-aurora POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-ManageRoles | u-bob -> neobank-aurora POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-aurora-unmapped-reports | u-bob -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-bob-swift-ViewAccounts | u-bob -> remit-swift GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-ViewTransactions | u-bob -> remit-swift GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-InitiatePayment | u-bob -> remit-swift POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-ApprovePayment | u-bob -> remit-swift POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-ExportStatements | u-bob -> remit-swift POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-SendInternational | u-bob -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-ViewKycStatus | u-bob -> remit-swift GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-FreezeAccount | u-bob -> remit-swift POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-ManageUsers | u-bob -> remit-swift POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-ManageRoles | u-bob -> remit-swift POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-bob-swift-unmapped-reports | u-bob -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-bob-meridian-ViewAccounts | u-bob -> wealth-meridian GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-bob-meridian-ViewTransactions | u-bob -> wealth-meridian GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-bob-meridian-InitiatePayment | u-bob -> wealth-meridian POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-bob-meridian-ApprovePayment | u-bob -> wealth-meridian POST /payments/approve | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-bob-meridian-ExportStatements | u-bob -> wealth-meridian POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-bob-meridian-SendInternational | u-bob -> wealth-meridian POST /remittance/international | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-bob-meridian-ViewKycStatus | u-bob -> wealth-meridian GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-bob-meridian-FreezeAccount | u-bob -> wealth-meridian POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-bob-meridian-ManageUsers | u-bob -> wealth-meridian POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-bob-meridian-ManageRoles | u-bob -> wealth-meridian POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-bob-meridian-unmapped-reports | u-bob -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-carol-aurora-ViewAccounts | u-carol -> neobank-aurora GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-carol-aurora-ViewTransactions | u-carol -> neobank-aurora GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-carol-aurora-InitiatePayment | u-carol -> neobank-aurora POST /payments | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| M-carol-aurora-ApprovePayment | u-carol -> neobank-aurora POST /payments/approve | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-carol-aurora-ExportStatements | u-carol -> neobank-aurora POST /statements/export | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| M-carol-aurora-SendInternational | u-carol -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-carol-aurora-ViewKycStatus | u-carol -> neobank-aurora GET /kyc/status | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-carol-aurora-FreezeAccount | u-carol -> neobank-aurora POST /kyc/freeze | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-carol-aurora-ManageUsers | u-carol -> neobank-aurora POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-carol-aurora-ManageRoles | u-carol -> neobank-aurora POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-carol-aurora-unmapped-reports | u-carol -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-carol-swift-ViewAccounts | u-carol -> remit-swift GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-ViewTransactions | u-carol -> remit-swift GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-InitiatePayment | u-carol -> remit-swift POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-ApprovePayment | u-carol -> remit-swift POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-ExportStatements | u-carol -> remit-swift POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-SendInternational | u-carol -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-ViewKycStatus | u-carol -> remit-swift GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-FreezeAccount | u-carol -> remit-swift POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-ManageUsers | u-carol -> remit-swift POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-ManageRoles | u-carol -> remit-swift POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-swift-unmapped-reports | u-carol -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-carol-meridian-ViewAccounts | u-carol -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-ViewTransactions | u-carol -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-InitiatePayment | u-carol -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-ApprovePayment | u-carol -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-ExportStatements | u-carol -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-SendInternational | u-carol -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-ViewKycStatus | u-carol -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-FreezeAccount | u-carol -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-ManageUsers | u-carol -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-ManageRoles | u-carol -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-carol-meridian-unmapped-reports | u-carol -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-dave-aurora-ViewAccounts | u-dave -> neobank-aurora GET /accounts | DENY [P3-kyc-expiry] | DENY [P3-kyc-expiry] | pdp-deny | ✅ |
| M-dave-aurora-ViewTransactions | u-dave -> neobank-aurora GET /transactions | DENY [P3-kyc-expiry] | DENY [P3-kyc-expiry] | pdp-deny | ✅ |
| M-dave-aurora-InitiatePayment | u-dave -> neobank-aurora POST /payments | DENY [P3-kyc-expiry] | DENY [P3-kyc-expiry] | pdp-deny | ✅ |
| M-dave-aurora-ApprovePayment | u-dave -> neobank-aurora POST /payments/approve | DENY [P3-kyc-expiry, P5-role] | DENY [P3-kyc-expiry, P5-role] | pdp-deny | ✅ |
| M-dave-aurora-ExportStatements | u-dave -> neobank-aurora POST /statements/export | DENY [P3-kyc-expiry] | DENY [P3-kyc-expiry] | pdp-deny | ✅ |
| M-dave-aurora-SendInternational | u-dave -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P5-role] | pdp-deny | ✅ |
| M-dave-aurora-ViewKycStatus | u-dave -> neobank-aurora GET /kyc/status | DENY [P3-kyc-expiry, P5-role] | DENY [P3-kyc-expiry, P5-role] | pdp-deny | ✅ |
| M-dave-aurora-FreezeAccount | u-dave -> neobank-aurora POST /kyc/freeze | DENY [P3-kyc-expiry, P5-role] | DENY [P3-kyc-expiry, P5-role] | pdp-deny | ✅ |
| M-dave-aurora-ManageUsers | u-dave -> neobank-aurora POST /admin/users | DENY [P3-kyc-expiry, P5-role] | DENY [P3-kyc-expiry, P5-role] | pdp-deny | ✅ |
| M-dave-aurora-ManageRoles | u-dave -> neobank-aurora POST /admin/roles | DENY [P3-kyc-expiry, P5-role] | DENY [P3-kyc-expiry, P5-role] | pdp-deny | ✅ |
| M-dave-aurora-unmapped-reports | u-dave -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-dave-swift-ViewAccounts | u-dave -> remit-swift GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-ViewTransactions | u-dave -> remit-swift GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-InitiatePayment | u-dave -> remit-swift POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-ApprovePayment | u-dave -> remit-swift POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-ExportStatements | u-dave -> remit-swift POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-SendInternational | u-dave -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-ViewKycStatus | u-dave -> remit-swift GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-FreezeAccount | u-dave -> remit-swift POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-ManageUsers | u-dave -> remit-swift POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-ManageRoles | u-dave -> remit-swift POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-swift-unmapped-reports | u-dave -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-dave-meridian-ViewAccounts | u-dave -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-ViewTransactions | u-dave -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-InitiatePayment | u-dave -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-ApprovePayment | u-dave -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-ExportStatements | u-dave -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-SendInternational | u-dave -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-ViewKycStatus | u-dave -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-FreezeAccount | u-dave -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-ManageUsers | u-dave -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-ManageRoles | u-dave -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-dave-meridian-unmapped-reports | u-dave -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-erin-aurora-ViewAccounts | u-erin -> neobank-aurora GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-erin-aurora-ViewTransactions | u-erin -> neobank-aurora GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-erin-aurora-InitiatePayment | u-erin -> neobank-aurora POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-erin-aurora-ApprovePayment | u-erin -> neobank-aurora POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-erin-aurora-ExportStatements | u-erin -> neobank-aurora POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-erin-aurora-SendInternational | u-erin -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-erin-aurora-ViewKycStatus | u-erin -> neobank-aurora GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-erin-aurora-FreezeAccount | u-erin -> neobank-aurora POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-erin-aurora-ManageUsers | u-erin -> neobank-aurora POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-erin-aurora-ManageRoles | u-erin -> neobank-aurora POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-erin-aurora-unmapped-reports | u-erin -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-erin-swift-ViewAccounts | u-erin -> remit-swift GET /accounts | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-erin-swift-ViewTransactions | u-erin -> remit-swift GET /transactions | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-erin-swift-InitiatePayment | u-erin -> remit-swift POST /payments | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-erin-swift-ApprovePayment | u-erin -> remit-swift POST /payments/approve | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-swift-ExportStatements | u-erin -> remit-swift POST /statements/export | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-erin-swift-SendInternational | u-erin -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-swift-ViewKycStatus | u-erin -> remit-swift GET /kyc/status | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-swift-FreezeAccount | u-erin -> remit-swift POST /kyc/freeze | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-swift-ManageUsers | u-erin -> remit-swift POST /admin/users | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-swift-ManageRoles | u-erin -> remit-swift POST /admin/roles | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-swift-unmapped-reports | u-erin -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-erin-meridian-ViewAccounts | u-erin -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-ViewTransactions | u-erin -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-InitiatePayment | u-erin -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-ApprovePayment | u-erin -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-ExportStatements | u-erin -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-SendInternational | u-erin -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-ViewKycStatus | u-erin -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-FreezeAccount | u-erin -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-ManageUsers | u-erin -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-ManageRoles | u-erin -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-erin-meridian-unmapped-reports | u-erin -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-frank-aurora-ViewAccounts | u-frank -> neobank-aurora GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-aurora-ViewTransactions | u-frank -> neobank-aurora GET /transactions | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-aurora-InitiatePayment | u-frank -> neobank-aurora POST /payments | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-aurora-ApprovePayment | u-frank -> neobank-aurora POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-aurora-ExportStatements | u-frank -> neobank-aurora POST /statements/export | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-aurora-SendInternational | u-frank -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-frank-aurora-ViewKycStatus | u-frank -> neobank-aurora GET /kyc/status | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-aurora-FreezeAccount | u-frank -> neobank-aurora POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-aurora-ManageUsers | u-frank -> neobank-aurora POST /admin/users | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-aurora-ManageRoles | u-frank -> neobank-aurora POST /admin/roles | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-aurora-unmapped-reports | u-frank -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-frank-swift-ViewAccounts | u-frank -> remit-swift GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-swift-ViewTransactions | u-frank -> remit-swift GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-swift-InitiatePayment | u-frank -> remit-swift POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-swift-ApprovePayment | u-frank -> remit-swift POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-swift-ExportStatements | u-frank -> remit-swift POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-frank-swift-SendInternational | u-frank -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-frank-swift-ViewKycStatus | u-frank -> remit-swift GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-swift-FreezeAccount | u-frank -> remit-swift POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-swift-ManageUsers | u-frank -> remit-swift POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-swift-ManageRoles | u-frank -> remit-swift POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-frank-swift-unmapped-reports | u-frank -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-frank-meridian-ViewAccounts | u-frank -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-ViewTransactions | u-frank -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-InitiatePayment | u-frank -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-ApprovePayment | u-frank -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-ExportStatements | u-frank -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-SendInternational | u-frank -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-ViewKycStatus | u-frank -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-FreezeAccount | u-frank -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-ManageUsers | u-frank -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-ManageRoles | u-frank -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-frank-meridian-unmapped-reports | u-frank -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-grace-aurora-ViewAccounts | u-grace -> neobank-aurora GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-aurora-ViewTransactions | u-grace -> neobank-aurora GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-aurora-InitiatePayment | u-grace -> neobank-aurora POST /payments | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| M-grace-aurora-ApprovePayment | u-grace -> neobank-aurora POST /payments/approve | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-grace-aurora-ExportStatements | u-grace -> neobank-aurora POST /statements/export | DENY [P2-kyc-tier] | DENY [P2-kyc-tier] | pdp-deny | ✅ |
| M-grace-aurora-SendInternational | u-grace -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-grace-aurora-ViewKycStatus | u-grace -> neobank-aurora GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-aurora-FreezeAccount | u-grace -> neobank-aurora POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-aurora-ManageUsers | u-grace -> neobank-aurora POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-aurora-ManageRoles | u-grace -> neobank-aurora POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-aurora-unmapped-reports | u-grace -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-grace-swift-ViewAccounts | u-grace -> remit-swift GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-swift-ViewTransactions | u-grace -> remit-swift GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-swift-InitiatePayment | u-grace -> remit-swift POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-swift-ApprovePayment | u-grace -> remit-swift POST /payments/approve | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-swift-ExportStatements | u-grace -> remit-swift POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-swift-SendInternational | u-grace -> remit-swift POST /remittance/international | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-grace-swift-ViewKycStatus | u-grace -> remit-swift GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-swift-FreezeAccount | u-grace -> remit-swift POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-swift-ManageUsers | u-grace -> remit-swift POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-swift-ManageRoles | u-grace -> remit-swift POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-grace-swift-unmapped-reports | u-grace -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-grace-meridian-ViewAccounts | u-grace -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-ViewTransactions | u-grace -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-InitiatePayment | u-grace -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-ApprovePayment | u-grace -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-ExportStatements | u-grace -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-SendInternational | u-grace -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-ViewKycStatus | u-grace -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-FreezeAccount | u-grace -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-ManageUsers | u-grace -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-ManageRoles | u-grace -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-grace-meridian-unmapped-reports | u-grace -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-heidi-aurora-ViewAccounts | u-heidi -> neobank-aurora GET /accounts | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-heidi-aurora-ViewTransactions | u-heidi -> neobank-aurora GET /transactions | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-heidi-aurora-InitiatePayment | u-heidi -> neobank-aurora POST /payments | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-heidi-aurora-ApprovePayment | u-heidi -> neobank-aurora POST /payments/approve | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-aurora-ExportStatements | u-heidi -> neobank-aurora POST /statements/export | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-heidi-aurora-SendInternational | u-heidi -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-aurora-ViewKycStatus | u-heidi -> neobank-aurora GET /kyc/status | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-aurora-FreezeAccount | u-heidi -> neobank-aurora POST /kyc/freeze | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-aurora-ManageUsers | u-heidi -> neobank-aurora POST /admin/users | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-aurora-ManageRoles | u-heidi -> neobank-aurora POST /admin/roles | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-aurora-unmapped-reports | u-heidi -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-heidi-swift-ViewAccounts | u-heidi -> remit-swift GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-heidi-swift-ViewTransactions | u-heidi -> remit-swift GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-heidi-swift-InitiatePayment | u-heidi -> remit-swift POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-heidi-swift-ApprovePayment | u-heidi -> remit-swift POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-heidi-swift-ExportStatements | u-heidi -> remit-swift POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-heidi-swift-SendInternational | u-heidi -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-heidi-swift-ViewKycStatus | u-heidi -> remit-swift GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-heidi-swift-FreezeAccount | u-heidi -> remit-swift POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-heidi-swift-ManageUsers | u-heidi -> remit-swift POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-heidi-swift-ManageRoles | u-heidi -> remit-swift POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-heidi-swift-unmapped-reports | u-heidi -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-heidi-meridian-ViewAccounts | u-heidi -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-ViewTransactions | u-heidi -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-InitiatePayment | u-heidi -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-ApprovePayment | u-heidi -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-ExportStatements | u-heidi -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-SendInternational | u-heidi -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-ViewKycStatus | u-heidi -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-FreezeAccount | u-heidi -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-ManageUsers | u-heidi -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-ManageRoles | u-heidi -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-heidi-meridian-unmapped-reports | u-heidi -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-ivan-aurora-ViewAccounts | u-ivan -> neobank-aurora GET /accounts | DENY [P3-kyc-expiry, P4-risk-revocation] | DENY [P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-ivan-aurora-ViewTransactions | u-ivan -> neobank-aurora GET /transactions | DENY [P3-kyc-expiry, P4-risk-revocation] | DENY [P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-ivan-aurora-InitiatePayment | u-ivan -> neobank-aurora POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-ivan-aurora-ApprovePayment | u-ivan -> neobank-aurora POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-aurora-ExportStatements | u-ivan -> neobank-aurora POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-ivan-aurora-SendInternational | u-ivan -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-aurora-ViewKycStatus | u-ivan -> neobank-aurora GET /kyc/status | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-aurora-FreezeAccount | u-ivan -> neobank-aurora POST /kyc/freeze | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-aurora-ManageUsers | u-ivan -> neobank-aurora POST /admin/users | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-aurora-ManageRoles | u-ivan -> neobank-aurora POST /admin/roles | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-aurora-unmapped-reports | u-ivan -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-ivan-swift-ViewAccounts | u-ivan -> remit-swift GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-ViewTransactions | u-ivan -> remit-swift GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-InitiatePayment | u-ivan -> remit-swift POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-ApprovePayment | u-ivan -> remit-swift POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-ExportStatements | u-ivan -> remit-swift POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-SendInternational | u-ivan -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-ViewKycStatus | u-ivan -> remit-swift GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-FreezeAccount | u-ivan -> remit-swift POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-ManageUsers | u-ivan -> remit-swift POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-ManageRoles | u-ivan -> remit-swift POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-swift-unmapped-reports | u-ivan -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-ivan-meridian-ViewAccounts | u-ivan -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-ViewTransactions | u-ivan -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-InitiatePayment | u-ivan -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-ApprovePayment | u-ivan -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-ExportStatements | u-ivan -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-SendInternational | u-ivan -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-ViewKycStatus | u-ivan -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-FreezeAccount | u-ivan -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-ManageUsers | u-ivan -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-ManageRoles | u-ivan -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ivan-meridian-unmapped-reports | u-ivan -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-judy-aurora-ViewAccounts | u-judy -> neobank-aurora GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-aurora-ViewTransactions | u-judy -> neobank-aurora GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-aurora-InitiatePayment | u-judy -> neobank-aurora POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-aurora-ApprovePayment | u-judy -> neobank-aurora POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-aurora-ExportStatements | u-judy -> neobank-aurora POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-aurora-SendInternational | u-judy -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-aurora-ViewKycStatus | u-judy -> neobank-aurora GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-aurora-FreezeAccount | u-judy -> neobank-aurora POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-aurora-ManageUsers | u-judy -> neobank-aurora POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-aurora-ManageRoles | u-judy -> neobank-aurora POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-aurora-unmapped-reports | u-judy -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-judy-swift-ViewAccounts | u-judy -> remit-swift GET /accounts | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-swift-ViewTransactions | u-judy -> remit-swift GET /transactions | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-swift-InitiatePayment | u-judy -> remit-swift POST /payments | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-swift-ApprovePayment | u-judy -> remit-swift POST /payments/approve | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-swift-ExportStatements | u-judy -> remit-swift POST /statements/export | DENY [P4-risk-revocation] | DENY [P4-risk-revocation] | pdp-deny | ✅ |
| M-judy-swift-SendInternational | u-judy -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-swift-ViewKycStatus | u-judy -> remit-swift GET /kyc/status | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-swift-FreezeAccount | u-judy -> remit-swift POST /kyc/freeze | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-swift-ManageUsers | u-judy -> remit-swift POST /admin/users | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-swift-ManageRoles | u-judy -> remit-swift POST /admin/roles | DENY [P4-risk-revocation, P5-role] | DENY [P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-swift-unmapped-reports | u-judy -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-judy-meridian-ViewAccounts | u-judy -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-ViewTransactions | u-judy -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-InitiatePayment | u-judy -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-ApprovePayment | u-judy -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-ExportStatements | u-judy -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-SendInternational | u-judy -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-ViewKycStatus | u-judy -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-FreezeAccount | u-judy -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-ManageUsers | u-judy -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-ManageRoles | u-judy -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-judy-meridian-unmapped-reports | u-judy -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-ken-aurora-ViewAccounts | u-ken -> neobank-aurora GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-ViewTransactions | u-ken -> neobank-aurora GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-InitiatePayment | u-ken -> neobank-aurora POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-ApprovePayment | u-ken -> neobank-aurora POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-ExportStatements | u-ken -> neobank-aurora POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-SendInternational | u-ken -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-ViewKycStatus | u-ken -> neobank-aurora GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-FreezeAccount | u-ken -> neobank-aurora POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-ManageUsers | u-ken -> neobank-aurora POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-ManageRoles | u-ken -> neobank-aurora POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-aurora-unmapped-reports | u-ken -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-ken-swift-ViewAccounts | u-ken -> remit-swift GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-ViewTransactions | u-ken -> remit-swift GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-InitiatePayment | u-ken -> remit-swift POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-ApprovePayment | u-ken -> remit-swift POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-ExportStatements | u-ken -> remit-swift POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-SendInternational | u-ken -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-ViewKycStatus | u-ken -> remit-swift GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-FreezeAccount | u-ken -> remit-swift POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-ManageUsers | u-ken -> remit-swift POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-ManageRoles | u-ken -> remit-swift POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-ken-swift-unmapped-reports | u-ken -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-ken-meridian-ViewAccounts | u-ken -> wealth-meridian GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-ken-meridian-ViewTransactions | u-ken -> wealth-meridian GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-ken-meridian-InitiatePayment | u-ken -> wealth-meridian POST /payments | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-ken-meridian-ApprovePayment | u-ken -> wealth-meridian POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-ken-meridian-ExportStatements | u-ken -> wealth-meridian POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-ken-meridian-SendInternational | u-ken -> wealth-meridian POST /remittance/international | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-ken-meridian-ViewKycStatus | u-ken -> wealth-meridian GET /kyc/status | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-ken-meridian-FreezeAccount | u-ken -> wealth-meridian POST /kyc/freeze | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-ken-meridian-ManageUsers | u-ken -> wealth-meridian POST /admin/users | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-ken-meridian-ManageRoles | u-ken -> wealth-meridian POST /admin/roles | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-ken-meridian-unmapped-reports | u-ken -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-nina-aurora-ViewAccounts | u-nina -> neobank-aurora GET /accounts | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-ViewTransactions | u-nina -> neobank-aurora GET /transactions | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-InitiatePayment | u-nina -> neobank-aurora POST /payments | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-ApprovePayment | u-nina -> neobank-aurora POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-ExportStatements | u-nina -> neobank-aurora POST /statements/export | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-SendInternational | u-nina -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-nina-aurora-ViewKycStatus | u-nina -> neobank-aurora GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-FreezeAccount | u-nina -> neobank-aurora POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-ManageUsers | u-nina -> neobank-aurora POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-ManageRoles | u-nina -> neobank-aurora POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-nina-aurora-unmapped-reports | u-nina -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-nina-swift-ViewAccounts | u-nina -> remit-swift GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-ViewTransactions | u-nina -> remit-swift GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-InitiatePayment | u-nina -> remit-swift POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-ApprovePayment | u-nina -> remit-swift POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-ExportStatements | u-nina -> remit-swift POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-SendInternational | u-nina -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-ViewKycStatus | u-nina -> remit-swift GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-FreezeAccount | u-nina -> remit-swift POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-ManageUsers | u-nina -> remit-swift POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-ManageRoles | u-nina -> remit-swift POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-swift-unmapped-reports | u-nina -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-nina-meridian-ViewAccounts | u-nina -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-ViewTransactions | u-nina -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-InitiatePayment | u-nina -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-ApprovePayment | u-nina -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-ExportStatements | u-nina -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-SendInternational | u-nina -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-ViewKycStatus | u-nina -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-FreezeAccount | u-nina -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-ManageUsers | u-nina -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-ManageRoles | u-nina -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-nina-meridian-unmapped-reports | u-nina -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-mallory-aurora-ViewAccounts | u-mallory -> neobank-aurora GET /accounts | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-mallory-aurora-ViewTransactions | u-mallory -> neobank-aurora GET /transactions | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-mallory-aurora-InitiatePayment | u-mallory -> neobank-aurora POST /payments | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-mallory-aurora-ApprovePayment | u-mallory -> neobank-aurora POST /payments/approve | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-mallory-aurora-ExportStatements | u-mallory -> neobank-aurora POST /statements/export | ALLOW [P1-tenant-isolation] | ALLOW [P1-tenant-isolation] | pdp-allow | ✅ |
| M-mallory-aurora-SendInternational | u-mallory -> neobank-aurora POST /remittance/international | DENY [P2-kyc-tier, P5-role] | DENY [P2-kyc-tier, P5-role] | pdp-deny | ✅ |
| M-mallory-aurora-ViewKycStatus | u-mallory -> neobank-aurora GET /kyc/status | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-mallory-aurora-FreezeAccount | u-mallory -> neobank-aurora POST /kyc/freeze | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-mallory-aurora-ManageUsers | u-mallory -> neobank-aurora POST /admin/users | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-mallory-aurora-ManageRoles | u-mallory -> neobank-aurora POST /admin/roles | DENY [P5-role] | DENY [P5-role] | pdp-deny | ✅ |
| M-mallory-aurora-unmapped-reports | u-mallory -> neobank-aurora GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-mallory-swift-ViewAccounts | u-mallory -> remit-swift GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-ViewTransactions | u-mallory -> remit-swift GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-InitiatePayment | u-mallory -> remit-swift POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-ApprovePayment | u-mallory -> remit-swift POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-ExportStatements | u-mallory -> remit-swift POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-SendInternational | u-mallory -> remit-swift POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-ViewKycStatus | u-mallory -> remit-swift GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-FreezeAccount | u-mallory -> remit-swift POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-ManageUsers | u-mallory -> remit-swift POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-ManageRoles | u-mallory -> remit-swift POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-swift-unmapped-reports | u-mallory -> remit-swift GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
| M-mallory-meridian-ViewAccounts | u-mallory -> wealth-meridian GET /accounts | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-ViewTransactions | u-mallory -> wealth-meridian GET /transactions | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-InitiatePayment | u-mallory -> wealth-meridian POST /payments | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-ApprovePayment | u-mallory -> wealth-meridian POST /payments/approve | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-ExportStatements | u-mallory -> wealth-meridian POST /statements/export | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-SendInternational | u-mallory -> wealth-meridian POST /remittance/international | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-ViewKycStatus | u-mallory -> wealth-meridian GET /kyc/status | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-FreezeAccount | u-mallory -> wealth-meridian POST /kyc/freeze | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-ManageUsers | u-mallory -> wealth-meridian POST /admin/users | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-ManageRoles | u-mallory -> wealth-meridian POST /admin/roles | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | DENY [P2-kyc-tier, P3-kyc-expiry, P4-risk-revocation, P5-role] | pdp-deny | ✅ |
| M-mallory-meridian-unmapped-reports | u-mallory -> wealth-meridian GET /reports | DENY [] | DENY [] | unmapped-route | ✅ |
