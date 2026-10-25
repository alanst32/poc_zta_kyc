// Local state shared by seed, tests and bench. Lives in .zta/ (gitignored).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ZTA_DIR = path.join(ROOT, ".zta");
const OUTPUTS = path.join(ZTA_DIR, "outputs.json");
const USERS = path.join(ZTA_DIR, "test-users.json");
const STACK = "ZtaKycExperiment";

export interface StackOutputs {
  ApiUrl: string;
  Region: string;
  UserPoolId: string;
  UserPoolClientId: string;
  PolicyStoreId: string;
  TenantsTable: string;
  MembershipsTable: string;
  KycTable: string;
  RiskTable: string;
  ApiMetadataTable: string;
  SessionsTable: string;
  AuthorizerFunctionName: string;
  AuthorizerLogGroup: string;
  ApiAccessLogGroup: string;
  LambdaMemoryMb: string;
}

export type TestUsers = Record<string, { sub: string; password: string }>;

export function readOutputs(): StackOutputs {
  if (!fs.existsSync(OUTPUTS)) {
    throw new Error(`${OUTPUTS} not found. Run \`npm run deploy\` first (it writes the stack outputs there).`);
  }
  const all = JSON.parse(fs.readFileSync(OUTPUTS, "utf8"));
  if (!all[STACK]) throw new Error(`Stack ${STACK} missing from ${OUTPUTS}`);
  return all[STACK];
}

export function readTestUsers(): TestUsers {
  if (!fs.existsSync(USERS)) throw new Error(`${USERS} not found. Run \`npm run seed\` first.`);
  return JSON.parse(fs.readFileSync(USERS, "utf8"));
}

export function writeTestUsers(users: TestUsers): void {
  fs.mkdirSync(ZTA_DIR, { recursive: true });
  fs.writeFileSync(USERS, JSON.stringify(users, null, 2), { mode: 0o600 });
}

/** One id per test run, sent as x-zta-run so decision logs can be joined to results. */
export const RUN_ID = process.env.ZTA_RUN ?? new Date().toISOString().replace(/[:.]/g, "-");
