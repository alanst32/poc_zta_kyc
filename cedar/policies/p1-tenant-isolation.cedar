// P1 — permit only inside a tenant the principal belongs to
permit (principal, action, resource)
when { principal.tenants.contains(resource.tenant) };
