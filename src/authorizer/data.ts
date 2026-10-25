// Step 3 of the PEP: read the request's facts from DynamoDB, live, on every request.
//
// Every read is STRONGLY CONSISTENT (ConsistentRead: true). Without that, a read right after
// a revocation could return the previous value from an eventually consistent replica. That
// would undermine the "denied on the very next request" claim (T6, A3).
//
// The five reads are independent, so they run in parallel: latency is the slowest read,
// not the sum.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type {
  ApiMetadataRow,
  FactSource,
  KycStateRow,
  MembershipRow,
  RequestFacts,
  RiskScoreRow,
  SessionRow,
} from "./types";

// The Tenants table is reference data (plan C2): the paper's policies do not read tenant
// attributes, so the PEP does not query it on the hot path.
export interface TableNames {
  memberships: string;
  kycState: string;
  riskScores: string;
  apiMetadata: string;
  sessions: string;
}

export function dynamoFactSource(tables: TableNames, client = new DynamoDBClient({})): FactSource {
  const ddb = DynamoDBDocumentClient.from(client);

  const get = async <T>(TableName: string, Key: Record<string, string>): Promise<T | undefined> =>
    (await ddb.send(new GetCommand({ TableName, Key, ConsistentRead: true }))).Item as T | undefined;

  return {
    async load(userId, tenantId, route): Promise<RequestFacts> {
      const [api, memberships, kyc, risk, session] = await Promise.all([
        get<ApiMetadataRow>(tables.apiMetadata, { route }),
        ddb
          .send(
            new QueryCommand({
              TableName: tables.memberships,
              KeyConditionExpression: "user_id = :u",
              ExpressionAttributeValues: { ":u": userId },
              ConsistentRead: true,
            }),
          )
          .then((r) => (r.Items ?? []) as MembershipRow[]),
        get<KycStateRow>(tables.kycState, { user_id: userId, tenant_id: tenantId }),
        get<RiskScoreRow>(tables.riskScores, { user_id: userId, tenant_id: tenantId }),
        get<SessionRow>(tables.sessions, { user_id: userId }),
      ]);

      // DynamoDB string sets (SS) come back as JS Sets; normalise to arrays.
      return {
        api: api && { ...api, allowed_roles: toArray(api.allowed_roles) },
        memberships: memberships.map((m) => ({ ...m, roles: toArray(m.roles) })),
        kyc,
        risk,
        session,
      };
    },
  };
}

const toArray = (v: Iterable<string> | undefined): string[] => (v ? [...v] : []);
