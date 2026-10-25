// P6 — tokens issued at or before the user's last sign-out are no longer accepted
forbid (principal, action, resource)
when { context.token_iat <= context.tokens_valid_after };
