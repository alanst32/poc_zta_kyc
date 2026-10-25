// P2 — KYC tier for THIS tenant must meet the action's requirement
forbid (principal, action, resource)
when { context.kyc_level < resource.required_kyc_level };
