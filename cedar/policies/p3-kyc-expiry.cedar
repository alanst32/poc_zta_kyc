// P3 — expired KYC for this tenant
forbid (principal, action, resource)
when { context.kyc_expires_at <= context.now };
