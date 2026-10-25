// The HTTP routes the experiment exposes. The CDK stack creates exactly these API Gateway
// routes; the ApiMetadata fixtures describe each one to Cedar.
//
// Every route is tenant-scoped through the PATH ({tenantId}). The PEP takes the resource's
// tenant from the path and never from the token, a header or the query string. That is
// what the cross-tenant / tenant-confusion attacks (T2, A2) test.

export interface ApiRoute {
  method: "GET" | "POST";
  path: string;
}

export const TENANT_PREFIX = "/tenants/{tenantId}";

export const API_ROUTES: ApiRoute[] = [
  { method: "GET", path: `${TENANT_PREFIX}/accounts` },
  { method: "GET", path: `${TENANT_PREFIX}/transactions` },
  { method: "POST", path: `${TENANT_PREFIX}/payments` },
  { method: "POST", path: `${TENANT_PREFIX}/payments/approve` },
  { method: "POST", path: `${TENANT_PREFIX}/statements/export` },
  { method: "POST", path: `${TENANT_PREFIX}/remittance/international` },
  { method: "GET", path: `${TENANT_PREFIX}/kyc/status` },
  { method: "POST", path: `${TENANT_PREFIX}/kyc/freeze` },
  { method: "POST", path: `${TENANT_PREFIX}/admin/users` },
  { method: "POST", path: `${TENANT_PREFIX}/admin/roles` },
  // Deliberately has NO ApiMetadata row: proves an unmapped endpoint fails closed (A5).
  { method: "GET", path: `${TENANT_PREFIX}/reports` },
];

/** API Gateway HTTP API routeKey, e.g. "POST /tenants/{tenantId}/payments". */
export const routeKey = (r: ApiRoute): string => `${r.method} ${r.path}`;
