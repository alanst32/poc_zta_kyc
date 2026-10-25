// Seeds a deployed stack: creates the synthetic Cognito users, then writes every fixture
// table. Run after `npm run deploy` (it reads .zta/outputs.json). Idempotent: re-running
// resets every fixture row to its initial state (useful after an interrupted test run).
//
// Writes .zta/test-users.json ({ username: { sub, password } }), which is gitignored. The
// passwords are random and only belong to synthetic users in your disposable pool.

import crypto from "node:crypto";
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { API_METADATA, TENANTS, USERS } from "./fixtures";
import { readOutputs, writeTestUsers, type TestUsers } from "../test/support/env";

async function main() {
  const out = readOutputs();
  const cognito = new CognitoIdentityProviderClient({ region: out.Region });
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: out.Region }));
  const now = Math.floor(Date.now() / 1000);

  const short = (TableName: string) => TableName.split("-").slice(1, 2)[0] ?? TableName;
  const put = async (TableName: string, Item: Record<string, unknown>) => {
    await ddb.send(new PutCommand({ TableName, Item }));
    console.log(`  + ${short(TableName)}: ${JSON.stringify(Item, replacer)}`);
  };
  // Deliberately missing rows are deleted too, so a re-seed also resets them.
  const del = async (TableName: string, Key: Record<string, string>) => {
    await ddb.send(new DeleteCommand({ TableName, Key }));
    console.log(`  - ${short(TableName)}: ${JSON.stringify(Key)} (absent)`);
  };

  // ---- Cognito users -> sub ----
  console.log("Cognito users");
  const testUsers: TestUsers = {};
  for (const u of USERS) {
    const password = `Zta-${crypto.randomBytes(18).toString("base64url")}`;
    try {
      await cognito.send(
        new AdminCreateUserCommand({ UserPoolId: out.UserPoolId, Username: u.username, MessageAction: "SUPPRESS" }),
      );
    } catch (e) {
      if (!(e instanceof UsernameExistsException)) throw e;
    }
    await cognito.send(
      new AdminSetUserPasswordCommand({ UserPoolId: out.UserPoolId, Username: u.username, Password: password, Permanent: true }),
    );
    const got = await cognito.send(new AdminGetUserCommand({ UserPoolId: out.UserPoolId, Username: u.username }));
    const sub = got.UserAttributes?.find((a) => a.Name === "sub")?.Value;
    if (!sub) throw new Error(`No sub for ${u.username}`);
    testUsers[u.username] = { sub, password };
    console.log(`  ${u.username} -> ${sub}`);
  }
  writeTestUsers(testUsers);

  // ---- Tables ----
  console.log("Tenants");
  for (const t of TENANTS) await put(out.TenantsTable, { ...t });

  console.log("ApiMetadata");
  for (const m of API_METADATA) await put(out.ApiMetadataTable, { ...m, allowed_roles: new Set(m.allowed_roles) });

  console.log("Memberships / KycState / RiskScores");
  for (const u of USERS) {
    const user_id = testUsers[u.username]!.sub;
    for (const r of u.relationships) {
      const key = { user_id, tenant_id: r.tenant };
      // DynamoDB string sets cannot be empty: a member with no role has no `roles` attribute.
      await put(out.MembershipsTable, r.roles.length ? { ...key, roles: new Set(r.roles) } : { ...key });
      if (r.omit?.includes("kyc")) await del(out.KycTable, key);
      else
        await put(out.KycTable, {
          ...key,
          kyc_level: r.kyc_level,
          kyc_verified_at: now - 30 * 24 * 3600,
          kyc_expires_at: now + r.expires_in,
          status: r.status,
        });
      if (r.omit?.includes("risk")) await del(out.RiskTable, key);
      else await put(out.RiskTable, { ...key, risk_score: r.risk_score, updated_at: now });
    }
  }
  // No user starts signed out: remove any sign-out marker a test may have left behind.
  console.log("Sessions");
  for (const u of USERS) await del(out.SessionsTable, { user_id: testUsers[u.username]!.sub });

  console.log("\nSeed complete.");
}

const replacer = (_k: string, v: unknown) => (v instanceof Set ? [...v] : v);

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
