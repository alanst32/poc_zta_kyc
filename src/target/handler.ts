// The protected workload stand-in (the paper's EKS business tier is out of scope).
// It is deliberately trivial and has no authorisation logic: if this code runs, the PEP
// has already allowed the request. It echoes the authoriser context as evidence.

import type { APIGatewayProxyEventV2WithLambdaAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import type { AuthorizerContext } from "../authorizer/pep";

export async function handler(
  event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
): Promise<APIGatewayProxyResultV2> {
  const auth = event.requestContext.authorizer.lambda;
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ok: true,
      route: event.routeKey,
      data: `dummy ${auth.action} payload for ${auth.tenantId}`,
      authorisedAs: { userId: auth.userId, username: auth.username, tenantId: auth.tenantId },
    }),
  };
}
