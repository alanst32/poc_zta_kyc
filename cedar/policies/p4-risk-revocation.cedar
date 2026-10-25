// P4 — revoked relationship or elevated live risk
forbid (principal, action, resource)
when { context.kyc_status != "active" ||
       context.risk_score > resource.risk_threshold };
