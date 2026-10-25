// P5 — every action requires one of the route's allowed roles, held in THIS tenant
forbid (principal, action, resource)
unless { context.roles.containsAny(resource.allowed_roles) };
