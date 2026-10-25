// Mutates live DynamoDB facts during tests (T6, A3, the lifecycle suite, the revocation
// benchmark), the way a risk engine, compliance officer or admin would in production.
// Every mutation is undone: callers snapshot the row first and restore it in `finally`.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { KycStatus } from "../../src/authorizer/types";
import { outputs, testUsers } from "./client";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: outputs.Region }));
const key = (username: string, tenant: string) => ({ user_id: testUsers[username]!.sub, tenant_id: tenant });

export type FactTable = "memberships" | "kyc" | "risk" | "sessions";
const tableName = (t: FactTable) =>
  ({ memberships: outputs.MembershipsTable, kyc: outputs.KycTable, risk: outputs.RiskTable, sessions: outputs.SessionsTable })[t];
/** Sessions is keyed by user only; the other fact tables by (user, tenant). */
const keyFor = (t: FactTable, username: string, tenant: string) =>
  t === "sessions" ? { user_id: testUsers[username]!.sub } : key(username, tenant);

/** Sets attributes on an existing row (fails if the row does not exist). */
async function update(table: FactTable, username: string, tenant: string, values: Record<string, unknown>): Promise<void> {
  const names = Object.keys(values);
  await ddb.send(
    new UpdateCommand({
      TableName: tableName(table),
      Key: key(username, tenant),
      UpdateExpression: `SET ${names.map((_, i) => `#k${i} = :v${i}`).join(", ")}`,
      ExpressionAttributeNames: Object.fromEntries(names.map((n, i) => [`#k${i}`, n])),
      ExpressionAttributeValues: Object.fromEntries(names.map((n, i) => [`:v${i}`, values[n]])),
      ConditionExpression: "attribute_exists(user_id)",
    }),
  );
}

export const setRiskScore = (username: string, tenant: string, risk_score: number) =>
  update("risk", username, tenant, { risk_score, updated_at: Math.floor(Date.now() / 1000) });

export const setKycStatus = (username: string, tenant: string, status: KycStatus) => update("kyc", username, tenant, { status });

export const setKycLevel = (username: string, tenant: string, kyc_level: number) => update("kyc", username, tenant, { kyc_level });

export const setKycExpiry = (username: string, tenant: string, kyc_expires_at: number) => update("kyc", username, tenant, { kyc_expires_at });

/** Roles are a DynamoDB string set; an empty set is not allowed, so pass at least one role. */
export const setRoles = (username: string, tenant: string, roles: string[]) => update("memberships", username, tenant, { roles: new Set(roles) });

export async function deleteRow(table: FactTable, username: string, tenant = ""): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: tableName(table), Key: keyFor(table, username, tenant) }));
}

/**
 * Records a sign-out: tokens issued at or before `at` (epoch seconds) are refused (P6). In
 * production the application's logout handler or an administrator writes this, alongside
 * Cognito GlobalSignOut (Cognito has no sign-out event to hook).
 */
export async function signOutMarker(username: string, at = Math.floor(Date.now() / 1000)): Promise<void> {
  await ddb.send(new PutCommand({ TableName: outputs.SessionsTable, Item: { user_id: testUsers[username]!.sub, tokens_valid_after: at } }));
}

/** A copy of the row as it is now (or undefined), to hand to `restore`. */
export async function snapshot(table: FactTable, username: string, tenant = "") {
  const res = await ddb.send(new GetCommand({ TableName: tableName(table), Key: keyFor(table, username, tenant), ConsistentRead: true }));
  return { table, username, tenant, item: res.Item };
}

/** Puts the snapshotted row back exactly (or deletes it if it did not exist). */
export async function restore(snap: Awaited<ReturnType<typeof snapshot>>): Promise<void> {
  if (snap.item) await ddb.send(new PutCommand({ TableName: tableName(snap.table), Item: snap.item }));
  else await deleteRow(snap.table, snap.username, snap.tenant);
}
