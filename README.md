# PayVault: ZTA / KYC authorisation experiment (Paper 1)

This is the serverless reference implementation that checks the paper's authorisation control plane:

```
Client ──JWT──▶ API Gateway (HTTP API) ──REQUEST authoriser, cache OFF──▶ Lambda PEP ──IsAuthorized──▶ Verified Permissions (Cedar PDP)
                        │                                                   │
                        │ ALLOW                                             └─ live, strongly consistent reads ─▶ DynamoDB
                        ▼                                                      Memberships · KycState · RiskScores · ApiMetadata (+ Tenants, reference only)
               Protected target Lambda (stand-in for the EKS business tier)
```

The PEP holds **no authorisation rules**. It verifies identity, loads the facts and asks Cedar one question:
*may this principal perform this action on this resource in this context?* It enforces the answer and fails closed on every error path.

Scope: this is a "reference implementation with functional validation", not a comprehensive empirical evaluation (plan Part A §0).

---

## 1. Prerequisites (on your build machine)

| Need | Why |
|---|---|
| Node.js 20+ | CDK app, scripts and tests. The deployed Lambdas run Node.js 22 (see §9, D7) |
| AWS CLI v2, configured for **your own dev account** | CDK, seed and tests use your default credentials and region |
| `npx cdk bootstrap` run once per account/region | creates the CDK asset bucket and roles |

No Docker is needed. `esbuild` is a dev dependency, so `NodejsFunction` bundles locally.

## 2. Run it

```bash
npm i
npm run build            # typecheck
npm test                 # OFFLINE: Cedar policies + real PEP code + 429-case matrix + 51,744-case grid + CDK assertions. No AWS, ~2 min
npm run validate         # STRICT schema validation evidence (paper §5.3); add -- --deployed after deploy
npx cdk bootstrap        # once per account/region
npm run deploy           # cdk deploy; writes stack outputs to .zta/outputs.json
npm run seed             # creates synthetic Cognito users + writes all fixture rows
npm run test:aws         # DEPLOYED: T1–T15, S1–S3, G1–G4, 429-case matrix, lifecycle L1–L7, attacks A1–A10 (except A4)
npm run test:aws:slow    # also A4 expired-token reuse (waits ~5 min)
npm run decisions -- <run id>   # determining Cedar policy per request, from the decision logs
npm run bench            # latency: 300 sequential + 200 at 25 concurrent + 50 per decision path
npm run bench:revocation # revocation: 6 mechanisms x 20 iterations, write-to-deny distribution
npm run figures -- <run id>     # paper figures (SVG) from that run's CSVs -> results/figures-<run id>/
npm run validate -- --deployed  # deployed store is STRICT + its policies are byte-identical to cedar/policies/
npm run destroy          # removes everything (all resources are RemovalPolicy.DESTROY)
```

Every suite writes `results/<suite>-<run id>.md` (paste into the paper), `.json` (raw evidence) and `.csv` (for plotting).
`npm run seed` is idempotent and resets every fixture. Re-run it if a test run was interrupted.

To pin the region: `AWS_REGION=ap-southeast-2 npm run deploy`. Report the region with the numbers.

This is the quick reference. §3 walks through the same commands one at a time, with what to expect from each.

## 3. Running the experiment end to end

Run every command from `zta-experiment/`. Pick how far you need to go:

| Goal | Steps | AWS needed |
|---|---|---|
| Check the policies and PEP logic only | 1–3 | no |
| Functional validation (correctness + attacks + determining policies) | 1–10, then 13 | yes |
| Full set of numbers for the paper | 1–13 | yes |

### Step 1: check your environment

```bash
node -v                          # v20 or later
aws sts get-caller-identity      # the dev account you expect
aws configure get region         # the region everything deploys to (or set AWS_REGION)
```

If you want a region other than your default, `export AWS_REGION=<region>` now and keep it for every step. Seed, tests and bench read the region from the stack outputs, but deploy and destroy use your environment.

### Step 2: install and typecheck

```bash
npm i
npm run build
```

**Expect:** `build` prints nothing and exits 0. Any output is a type error.

### Step 3: offline tests and validation (no AWS)

```bash
npm test
npm run validate
```

`npm test` runs the real PEP code against the Cedar policies in memory (cedar-wasm, no Verified Permissions), plus CDK assertions on the stack (authoriser cache off, STRICT store, least-privilege IAM, DESTROY policy).

**Expect:** every test passes in a few seconds. Then check:

- `results/offline-policies-<run id>.md`: T1–T15, S1–S3, G1–G4 and X1–X5, each with the expected decision **and** the expected determining policy (compare with the table in §7).
- `results/offline-matrix-<run id>.md`: every user × tenant × route (429 cases) against the specification oracle.
- `results/offline-grid-<run id>.md` + `.csv`: 51,744 combinations of membership, roles, KYC level/status/expiry, risk, missing rows and sign-out state, for every route. Must be 100% agreement. It also tabulates which policy sets decided and how often each forbid fired.
- `results/validation-<run id>.md`: every policy validates under the STRICT schema.

If you only needed the offline checks, stop here.

### Step 4: bootstrap CDK (once per account and region)

```bash
npx cdk bootstrap
```

Skip this if the account/region has been bootstrapped before. Running it again is harmless.

### Step 5: deploy the stack

```bash
npm run deploy
```

It creates the Cognito pool, the six DynamoDB tables, the Verified Permissions store with P1–P6, the PEP and target Lambdas and the HTTP API. Confirm the IAM changes when CDK asks. It takes a few minutes.

**Expect:** CDK ends with `✅ ZtaKycExperiment` and a list of outputs. They are also saved to `.zta/outputs.json` (`ApiUrl`, `Region`, `UserPoolId`, the table names, the log groups, ...). Every later step reads that file.

### Step 6: seed users and data

```bash
npm run seed
```

It creates the thirteen synthetic Cognito users (`u-alice` … `u-mallory`, see `seed/fixtures.ts`) with random passwords, then writes every Tenants, ApiMetadata, Memberships, KycState and RiskScores row (§6).

**Expect:** each user printed with its Cognito `sub`, one `+ ...` line per row, three `- ... (absent)` lines for u-judy's missing rows (T12/T13), one `- ... (absent)` Sessions line per user (nobody starts signed out), and `Seed complete.` The passwords are saved to `.zta/test-users.json` (mode 600).

Seed is idempotent and resets every fixture to its starting value. Re-run it whenever a deployed test run was interrupted (T6, A3, A10, the lifecycle suite and `bench:revocation` change live data and restore it when they finish).

### Step 7: choose a run id

```bash
export ZTA_RUN=$(date -u +%Y-%m-%dT%H-%M-%SZ)
```

Every request is tagged with the run id (`x-zta-run` header), and every results file is named with it. If you don't set it, each command makes its own timestamp id. Setting it once makes the correctness, attacks, decisions and latency results of one session share a single id, which is easier to join and cite.

### Step 8: deployed correctness and attack tests

```bash
npm run test:aws
```

It logs in as the synthetic users and calls the real API over HTTP, about 470 requests in two to three minutes:

- **correctness**: T1–T15 (including T6, which raises alice's risk score live and measures the time until she is denied) segregation-of-duties cases S1–S3, and the role-gate cases G1–G4 (each with a control).
- **matrix**: every user × tenant × route (429 requests), expected outcomes from the specification oracle (`test/support/oracle.ts`).
- **lifecycle**: L1–L7, a fact changes live while the user keeps the same token (risk boundary, KYC downgrade, KYC expiry by time alone, role grant/revoke, offboarding, reinstatement).
- **attacks**: A1–A10 except A4 (forged tokens incl. algorithm confusion, ID token, path and header tricks, session revocation).

**Expect:** all tests pass. Then check:

- `results/correctness-<run id>.md`: the T-matrix with expected vs actual HTTP result. G1–G4 and S1–S3 are expected **DENY** by P5 (D13): an account holder cannot reach privileged actions, an admin cannot move money, a member with no role gets nothing. Each -ctl is the matching ALLOW with the right role.
- `results/matrix-<run id>.md`: 429/429.
- `results/lifecycle-<run id>.md`: each step's decision and its write-to-decision time.
- `results/attacks-<run id>.md`: every attack denied. A10 is **ALLOW -> DENY -> ALLOW**: a signed-out token is refused on the next request (P6, D14), and a new sign-in works.

### Step 9 (optional): expired-token test

```bash
ZTA_RUN=$ZTA_RUN-slow npm run test:aws:slow
```

It runs the attack suite again plus A4, which waits for a real access token to expire (5-minute validity) and checks it is then denied. Allow about 7 minutes. On a laptop, keep the machine awake (macOS: prefix the command with `caffeinate -i`), otherwise sleep can stretch the wait past the test's timeout. The separate `-slow` id stops it overwriting step 8's `attacks` file.

### Step 10: determining policies from the decision logs

```bash
npm run decisions -- $ZTA_RUN
```

HTTP status only shows ALLOW or DENY. This step reads the PEP's decision logs from CloudWatch and shows, for each request, **which Cedar policy decided it**.

It also **checks** them. Every correctness, matrix and lifecycle row carries the policies it should be decided by (§7), and the script compares them with what Cedar actually reported.

**Expect:** a table in the terminal and `results/decisions-<run id>.md`, headed by `Determining policies checked: N/N match` (about 440 checks) and `Expected cases with no decision record yet: 0`. The command exits non-zero if any policy does not match.
If it prints `No decision records yet`, or some expected cases have no record yet, CloudWatch has not ingested the logs. Wait a minute and run it again.

### Step 11: latency benchmark

```bash
npm run bench
```

It sends 5 warm-up requests, 300 sequential requests and a burst of 200 at concurrency 25, all on T1 (the full ALLOW path, so every PEP step runs). It then sends 50 requests down each **decision path**: ALLOW, Cedar forbid, cross-tenant, unmapped route, forged token, no token. Each path stops at a different PEP step. Finally it pulls the server-side timings from the decision logs. Change the sizes with `ZTA_BENCH_N`, `ZTA_BENCH_BURST`, `ZTA_BENCH_C` and `ZTA_BENCH_PATHS` (0 skips the paths).

**Expect:** `results/latency-<run id>.md` with client round-trip p50/p95/p99 and the PEP breakdown (JWT verification, DynamoDB reads, Verified Permissions call) per phase and path, warm vs cold. Raw per-request values are in `latency-<run id>-client.csv` and `-server.csv`. Note where the client ran: client latency includes your network path to the region (§8).

Then the revocation benchmark:

```bash
npm run bench:revocation
```

It repeats five revocation mechanisms 20 times each (`ZTA_REVOKE_N`) on one access token: risk raised, relationship revoked, KYC downgraded, role removed, membership deleted. Each iteration runs baseline (ALLOW), write, **the very next request** (must be DENY), undo, then a request (must be ALLOW).

**Expect:** `results/revocation-<run id>.md` with `denied on 1st request` at N/N for every mechanism (no stale window) and the write-to-deny p50/p95/max. Every sample is in the `.csv`.

Then turn the run into figures:

```bash
npm run figures -- $ZTA_RUN
```

**Expect:** `results/figures-<run id>/` with up to six SVGs and an `index.html` to view them together. A figure is skipped, with a message naming the missing command, if its CSV is not there for that run id.

| Figure | Shows | Needs |
|---|---|---|
| `fig1-latency-by-path.svg` | Client round-trip per decision path (every request as a dot, IQR, median) | `bench` |
| `fig2-pep-breakdown.svg` | Server-side PEP time split into JWT / DynamoDB / Verified Permissions, per path | `bench` |
| `fig3-latency-ecdf.svg` | Latency distribution, sequential vs concurrent burst | `bench` |
| `fig4-revocation.svg` | Write-to-deny per revocation mechanism, with the first-request deny rate | `bench:revocation` |
| `fig5-grid-policies.svg` | Which policy sets decided the 51,744 grid combinations | `npm test` |
| `fig6-grid-allow-rate.svg` | ALLOW rate per action; single-role (segregation-of-duties) actions highlighted | `npm test` |

SVG is vector, so it scales cleanly. Word and Overleaf (`\usepackage{svg}`) take it directly. For PDF or PNG, open it in a browser and print or save, or use `rsvg-convert -f pdf` (`brew install librsvg`). The numbers behind each figure are in the CSVs.

### Step 12: validate the deployed policy store

```bash
npm run validate -- --deployed
```

**Expect:** `results/validation-<run id>.md` now also shows the deployed store's mode is STRICT and its policies are byte-identical to `cedar/policies/`. This proves the tested store runs the policies printed in the paper.

### Step 13: tear down

```bash
npm run destroy
```

Confirm when CDK asks. Every resource uses `RemovalPolicy.DESTROY`, so nothing with a standing cost remains. `results/` and `.zta/` stay on your machine. `.zta/` is stale after a destroy and is overwritten by the next deploy and seed.

### If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `.zta/outputs.json not found` | The stack is not deployed, or deploy failed | Step 5 |
| `.zta/test-users.json not found` | Seed has not run | Step 6 |
| Deployed tests fail after an earlier run was interrupted | A live fact (risk score, KYC status) was left changed | Step 6 (re-seed), then repeat the step |
| `decisions` finds no records | CloudWatch ingestion lag (~10–60 s) | Wait and re-run step 10 |
| CDK complains the environment is not bootstrapped | First deploy in this account/region | Step 4 |
| Commands hit the wrong region | `AWS_REGION` differs between steps | Use one region for every step (step 1) |

## 4. Repository map

Standard `cdk init` layout: `bin/` is the CDK entry point and `lib/` is the infrastructure. Lambda code lives in `src/`.

```
zta-experiment/
├─ README.md                      this file: deploy, test, reproduce, design decisions
├─ package.json                   dependencies + npm scripts (build, test, deploy, seed, bench, validate, ...)
├─ cdk.json                       CDK app config (runs bin/app.ts through tsx)
├─ tsconfig.json
├─ vitest.config.ts               sequential test execution (deployed suites mutate shared state)
│
├─ bin/
│  └─ app.ts                      CDK app entry: instantiates ZtaStack
│
├─ lib/                           infrastructure (CDK)
│  ├─ zta-stack.ts                composes the constructs + stack outputs (no resources defined directly)
│  ├─ config.ts                   Lambda settings (reported with latency), removal policy
│  └─ constructs/
│     ├─ identity-provider.ts     Cognito user pool + test client (identity only)
│     ├─ kyc-data-store.ts        the 5 DynamoDB tables + grantPepReads() (least-privilege reads)
│     ├─ cedar-policy-store.ts    Verified Permissions store (STRICT) + P1–P6 from cedar/ + grantIsAuthorized()
│     ├─ zta-function.ts          standard TypeScript Lambda (esbuild, log group, experiment settings)
│     ├─ pep-authorizer.ts        the PEP Lambda wired to identity/data/PDP + HTTP authoriser (cache TTL 0)
│     └─ protected-api.ts         HTTP API, routes, dummy target, access logs
│
├─ cedar/                         the theory: the paper's policies (Fv2_version1 §3.3.2) + PayVault namespace (D11) + revised P5 (D13) + P6 (D14)
│  ├─ schema.cedarschema          Cedar schema (human-readable source of truth; converted to JSON at synth)
│  ├─ load.ts                     loads schema/policies for BOTH the stack and the offline tests (one source)
│  └─ policies/
│     ├─ p1-tenant-isolation.cedar  permit: principal.tenants.contains(resource.tenant)
│     ├─ p2-kyc-tier.cedar          forbid: per-tenant kyc_level below the action's requirement
│     ├─ p3-kyc-expiry.cedar        forbid: per-tenant KYC expired
│     ├─ p4-risk-revocation.cedar   forbid: relationship not active, or live risk above threshold
│     ├─ p5-role.cedar              forbid: any action without one of the route's allowed roles (D13)
│     └─ p6-session-revocation.cedar forbid: token issued at or before the user's last sign-out (D14)
│
├─ src/                           Lambda code (bundled by esbuild at synth)
│  ├─ authorizer/                 the PEP
│  │  ├─ handler.ts               Lambda entry: wires pep.ts to real AWS clients
│  │  ├─ pep.ts                   the 6 steps, fail-closed handling, structured decision log
│  │  ├─ cedar.ts                 DynamoDB facts -> Cedar entities + context (the mapping to defend), AVP call
│  │  ├─ data.ts                  4 parallel, strongly consistent DynamoDB reads
│  │  ├─ jwt.ts                   Cognito access-token verification (aws-jwt-verify)
│  │  └─ types.ts                 table rows, Cedar request, PDP/verifier interfaces
│  ├─ target/
│  │  └─ handler.ts               dummy protected workload (returns 200)
│  └─ shared/
│     └─ routes.ts                the API routes (the stack creates exactly these)
│
├─ seed/
│  ├─ fixtures.ts                 PayVault tenants, API metadata, users (plan Part D), built as minimal pairs
│  └─ seed.ts                     creates Cognito users + writes all table rows (idempotent reset)
│
├─ test/
│  ├─ policies.test.ts            OFFLINE: cedar-wasm + in-memory facts + the real PEP code (T1–T15, S1–S3, G1–G4, X1–X5)
│  ├─ coverage.test.ts            OFFLINE: fixture matrix (429) + combinatorial grid (51,744) vs the oracle
│  ├─ infra.test.ts               OFFLINE: CDK assertions (cache off, all routes authorised, STRICT, IAM, DESTROY)
│  ├─ correctness.test.ts         DEPLOYED: T1–T15, S1–S3, G1–G4 over HTTP
│  ├─ matrix.test.ts              DEPLOYED: every user x tenant x route (429 requests)
│  ├─ lifecycle.test.ts           DEPLOYED: L1–L7 live fact changes on the same token
│  ├─ attacks.test.ts             DEPLOYED: A1–A10 adversarial cases
│  └─ support/
│     ├─ cases.ts                 the T/G cases + the matrix generator, shared by offline and deployed suites
│     ├─ oracle.ts                specification oracle: P1–P6 restated over raw facts (expected decision + policies)
│     ├─ offline.ts               offline harness: real PEP + fake verifier + local Cedar + pinned clock
│     ├─ env.ts                   reads .zta/ (stack outputs, test-user credentials), run id
│     ├─ client.ts                Cognito login + HTTP client for the deployed API
│     ├─ state.ts                 changes live DynamoDB facts (snapshot + exact restore) for T6/A3/A10/L1–L7
│     ├─ jwt-forge.ts             forged-token builders for A1
│     ├─ local-pdp.ts             offline PDP: cedar-wasm with the repo schema + policies
│     ├─ memory-facts.ts          offline FactSource built from the fixtures
│     └─ results.ts               writes results/*.md + *.json + *.csv evidence tables
│
├─ bench/
│  ├─ latency.ts                  latency: sequential + burst + per decision path, client and server-side timings
│  ├─ revocation.ts               revocation: 6 mechanisms x N iterations, deny on the first request after a write
│  └─ stats.ts                    percentiles + Markdown tables
│
├─ scripts/                       operational tooling (not infrastructure)
│  ├─ validate.ts                 STRICT validation evidence (offline + deployed store)
│  ├─ decisions.ts                decision-log extractor; checks determining policies against the expected ones
│  ├─ figures.ts                  paper figures (SVG) from a run's CSVs, no dependencies
│  └─ logs.ts                     CloudWatch Logs Insights helper used by decisions + bench
│
├─ results/                       evidence output (*.md for the paper, *.json raw)
└─ .zta/                          (gitignored) stack outputs + synthetic test-user credentials
```

## 5. The Cedar model (what each policy proves)

The policy files are the policy set printed in the paper (Fv2_version1, Section 3.3.2), with three deviations. **The paper should print the policies as they are here.**

- **Namespace (D11).** The schema is in the `PayVault` namespace, because Verified Permissions rejects a schema without one. Every type is therefore `PayVault::<Type>`.
- **P5 revised (D13).** The printed P5 gates `ManageUsers` only, which left every other action open to any member (the role gap, §10). P5 now applies to **every action** and requires one of the route's `allowed_roles`.
- **P6 added (D14).** Session revocation: a token issued at or before the user's last sign-out is refused.
`npm run validate -- --deployed` proves the deployed store holds byte-identical statements.

The PEP builds this request for every call (`src/authorizer/cedar.ts`):

| Cedar element | Value | Source |
|---|---|---|
| `principal` | `PayVault::User::"<cognito sub>"`, `tenants` = set of every tenant the user belongs to | JWT `sub` + Memberships (Query) |
| `action` | `PayVault::Action::"<ApiMetadata.action>"` | ApiMetadata[routeKey] |
| `resource` | `PayVault::<resource_type>::"<tenant>/<resource_type>"` with `tenant`, `required_kyc_level`, `risk_threshold`, `allowed_roles` | **path** `{tenantId}` + ApiMetadata |
| `context.kyc_level`, `kyc_expires_at`, `kyc_status` | for (user, tenant the request addresses) | KycState |
| `context.roles` | roles in that tenant | Memberships |
| `context.risk_score` | live risk for (user, tenant) | RiskScores |
| `context.now` | PEP clock | — |
| `context.token_iat` | the access token's issued-at time | JWT `iat` |
| `context.tokens_valid_after` | the user's last sign-out (0 if never) | Sessions |

| Policy | Effect | Rule |
|---|---|---|
| P1 tenant isolation | **permit** (the only one) | `principal.tenants.contains(resource.tenant)` |
| P2 KYC tier | forbid | `context.kyc_level < resource.required_kyc_level` |
| P3 expiry | forbid | `context.kyc_expires_at <= context.now` (timestamp, not status) |
| P4 risk / revocation | forbid | `kyc_status != "active"` or `risk_score > resource.risk_threshold` |
| P5 role | forbid | unless `context.roles.containsAny(resource.allowed_roles)` (every action) |
| P6 session revocation | forbid | `context.token_iat <= context.tokens_valid_after` |

Cedar is default-deny and forbid-overrides-permit. A request is allowed only if P1 matches and no forbid matches.

In access-control terms, **P5 is an RBAC check on every API**: each route lists its allowed roles (`ApiMetadata.allowed_roles`), and the caller must hold one of them **in the tenant in the URL**. The other policies add live attributes on top (KYC level and expiry, risk, relationship status, sign-out), so a request needs the right role **and** valid live facts: RBAC + ABAC.
Adding an endpoint means one ApiMetadata row (with its KYC level, risk threshold and allowed roles), plus one `action` line in the schema if the action is new. **No policy changes**: no policy names a route or an action.

**Fail closed on Cedar errors** (the paper states this). In Cedar a policy whose condition errors is *skipped*, so a broken forbid silently does not fire. Both `cedar.ts` and `pep.ts` turn any non-empty `errors` list into DENY. Offline case **X3b** shows this with the real engine: an ApiMetadata row missing `risk_threshold` makes P4 error, Cedar on its own returns **ALLOW**, and the PEP denies.

## 6. The DynamoDB tables (the facts Cedar reasons over)

Six tables, defined in `lib/constructs/kyc-data-store.ts`: the five of plan Part C2, plus Sessions (D14). All are on-demand (`PAY_PER_REQUEST`), all keys are strings, and all are `RemovalPolicy.DESTROY`. TypeScript row types are in `src/authorizer/types.ts`. Rows are written by `npm run seed` from `seed/fixtures.ts`.

KYC follows a **two-layer model**. Layer A is identity: who the person is, from the Cognito JWT `sub`. Layer B is compliance state **per (user × tenant)**. Memberships, KycState and RiskScores all share the composite key `(user_id, tenant_id)`. The same person can be L2 and active in one tenant and revoked in another (u-erin).

| Table | Partition key | Sort key | Read by the PEP | Access | Feeds |
|---|---|---|---|---|---|
| Tenants | `tenant_id` | — | **no** (reference data) | — | nothing (no policy reads tenant attributes) |
| Memberships | `user_id` | `tenant_id` | yes | `Query` on `user_id` (all of the user's tenants) | `principal.tenants`, `context.roles` |
| KycState | `user_id` | `tenant_id` | yes | `GetItem` (user, path tenant) | `context.kyc_level`, `kyc_expires_at`, `kyc_status` |
| RiskScores | `user_id` | `tenant_id` | yes | `GetItem` (user, path tenant) | `context.risk_score` |
| ApiMetadata | `route` | — | yes | `GetItem` (API Gateway routeKey) | `action`, resource type, `resource.required_kyc_level`, `resource.risk_threshold` |

The four reads run in parallel, all with `ConsistentRead: true` (`src/authorizer/data.ts`, D3). `user_id` is always the Cognito **`sub`** (immutable), never the username. The seed script resolves `u-alice` → `sub` before it writes. Timestamps are **epoch seconds** (DynamoDB `N`). `roles` and `allowed_roles` are stored as DynamoDB **string sets** (`SS`), and the PEP turns them back into arrays.

### Tenants

| Attribute | Type | Notes |
|---|---|---|
| `tenant_id` | S (PK) | e.g. `neobank-aurora`, `remit-swift`, `wealth-meridian` |
| `name` | S | display name |

```json
{ "tenant_id": "remit-swift", "name": "SwiftRemit" }
```

### Memberships

| Attribute | Type | Notes |
|---|---|---|
| `user_id` | S (PK) | Cognito `sub` |
| `tenant_id` | S (SK) | |
| `roles` | SS | e.g. `account_holder`, `payments_operator`, `compliance_officer`, `tenant_admin` |

One row per tenant the user belongs to. Querying on `user_id` returns them all. Together they make `principal.tenants` (P1), and the row for the path tenant gives `context.roles` (P5).

```json
{ "user_id": "6b1f0c2e-7a3d-4c55-9e1a-2f8d4b7c9a10", "tenant_id": "neobank-aurora", "roles": ["account_holder"] }
{ "user_id": "6b1f0c2e-7a3d-4c55-9e1a-2f8d4b7c9a10", "tenant_id": "remit-swift",    "roles": ["account_holder"] }
```

### KycState (Layer B)

| Attribute | Type | Notes |
|---|---|---|
| `user_id` | S (PK) | Cognito `sub` |
| `tenant_id` | S (SK) | |
| `kyc_level` | N | 1–3, compared with `required_kyc_level` (P2) |
| `kyc_verified_at` | N | epoch seconds. Stored, not read by policies |
| `kyc_expires_at` | N | epoch seconds, compared with `context.now` (P3) |
| `status` | S | `active` \| `expired` \| `revoked`. Anything but `active` denies (P4) |

```json
{
  "user_id": "6b1f0c2e-7a3d-4c55-9e1a-2f8d4b7c9a10",
  "tenant_id": "neobank-aurora",
  "kyc_level": 2,
  "kyc_verified_at": 1757500000,
  "kyc_expires_at": 1791628000,
  "status": "active"
}
```

P3 checks the timestamp, not `status`. u-dave's row has `kyc_expires_at` in the past and `status: "active"`, and is still denied (T4). No batch job is needed to flip status.

### RiskScores

| Attribute | Type | Notes |
|---|---|---|
| `user_id` | S (PK) | Cognito `sub` |
| `tenant_id` | S (SK) | |
| `risk_score` | N | 0–100, denied above the route's `risk_threshold` (P4) |
| `updated_at` | N | epoch seconds |

```json
{ "user_id": "6b1f0c2e-7a3d-4c55-9e1a-2f8d4b7c9a10", "tenant_id": "neobank-aurora", "risk_score": 10, "updated_at": 1760092000 }
```

This is the table that T6/A3 change live (10 → 90 → 10). The next request sees the new value because nothing is cached (D2, D3).

### Sessions

| Attribute | Type | Notes |
|---|---|---|
| `user_id` | S (PK) | Cognito `sub` |
| `tokens_valid_after` | N | epoch seconds. Tokens with `iat` at or before it are refused (P6) |

One row per user, written when the user is signed out (by the application's logout handler or an administrator, alongside Cognito `GlobalSignOut`; Cognito has no sign-out event to hook). **No row is the normal state** (never signed out), so unlike the compliance tables a missing row maps to `0` and lets P6 pass. Read with a strongly consistent `GetItem` in parallel with the other four reads.

```json
{ "user_id": "6b1f0c2e-7a3d-4c55-9e1a-2f8d4b7c9a10", "tokens_valid_after": 1760092000 }
```

### ApiMetadata

| Attribute | Type | Notes |
|---|---|---|
| `route` | S (PK) | API Gateway routeKey, exactly as API Gateway sends it, e.g. `POST /tenants/{tenantId}/payments` |
| `action` | S | Cedar action id (`PayVault::Action::"<action>"`) |
| `resource_type` | S | Cedar entity type of the resource, without the `PayVault::` namespace |
| `required_kyc_level` | N | minimum `kyc_level` (P2) |
| `risk_threshold` | N | maximum allowed `risk_score` (P4). `70` on every row |
| `allowed_roles` | SS | roles that may call the route. P5 requires one of them for every action (D13); together these lists are the system's role matrix |

```json
{
  "route": "POST /tenants/{tenantId}/payments",
  "action": "InitiatePayment",
  "resource_type": "Payment",
  "required_kyc_level": 2,
  "risk_threshold": 70,
  "allowed_roles": ["account_holder", "payments_operator"]
}
```

Seeded routes:

| Route | Action | Resource type | Required KYC |
|---|---|---|---|
| `GET /tenants/{tenantId}/accounts` | ViewAccounts | Account | 1 |
| `GET /tenants/{tenantId}/transactions` | ViewTransactions | Transaction | 1 |
| `POST /tenants/{tenantId}/payments` | InitiatePayment | Payment | 2 |
| `POST /tenants/{tenantId}/payments/approve` | ApprovePayment | Payment | 2 |
| `POST /tenants/{tenantId}/statements/export` | ExportStatements | Statement | 2 |
| `POST /tenants/{tenantId}/remittance/international` | SendInternational | Remittance | 3 |
| `GET /tenants/{tenantId}/kyc/status` | ViewKycStatus | KycRecord | 1 |
| `POST /tenants/{tenantId}/kyc/freeze` | FreezeAccount | KycRecord | 1 |
| `POST /tenants/{tenantId}/admin/users` | ManageUsers | AdminResource | 1 |
| `POST /tenants/{tenantId}/admin/roles` | ManageRoles | AdminResource | 1 |
| `GET /tenants/{tenantId}/reports` | *(no row)* | — | denied (A5) |

### Missing rows

A missing row never leads to ALLOW:

| Missing | Effect |
|---|---|
| ApiMetadata row | DENY before Cedar is called (unmapped route, A5) |
| Membership for the path tenant | P1 does not permit. `roles` = `[]` |
| KycState row | `kyc_level 0`, `kyc_expires_at 0`, `kyc_status "absent"`, so P2, P3 and P4 fire |
| RiskScores row | `risk_score` = `MAX_SAFE_INTEGER`, so P4 fires |

See D4 and `src/authorizer/cedar.ts`.

### Putting it together: one request

`alice` calls `POST /tenants/neobank-aurora/payments`. The PEP reads ApiMetadata[`POST /tenants/{tenantId}/payments`], all of alice's Memberships, and KycState + RiskScores for (alice, `neobank-aurora`). Cedar then gets:

```text
principal = PayVault::User::"<alice sub>"           tenants = [neobank-aurora, remit-swift]
action    = PayVault::Action::"InitiatePayment"
resource  = PayVault::Payment::"neobank-aurora/Payment"  tenant = neobank-aurora, required_kyc_level = 2, risk_threshold = 70
context   = { kyc_level: 2, kyc_expires_at: <+1y>, kyc_status: "active", roles: ["account_holder"], risk_score: 10, now: <now> }
```

P1 permits, no forbid fires, so the result is **ALLOW** (T1).

## 7. Evidence produced

| Suite | What it shows | Paper section |
|---|---|---|
| `validation` | STRICT schema validation per policy. With `--deployed`: the store's mode is STRICT and its policies are identical to the repo | §5.3 |
| `offline-policies` | Every case gives the expected decision **for the expected policy reason** (determining policies), plus fail-closed checks X1–X4 | Methodology (policies checked before deploy) |
| `offline-matrix` | 429 user × tenant × route cases agree with the specification oracle (decision, policies, PEP reason) | Methodology |
| `offline-grid` | 51,744 fact combinations agree with the oracle; distribution of determining-policy sets, forbid fire rates, ALLOW rate per action | Methodology / Results (coverage) |
| `correctness` | T1–T15 end-to-end over HTTP, including T6 real-time risk revocation with write-to-deny time; G1–G4 role gate with controls | Results: correctness matrix |
| `matrix` | The same 429 cases over HTTP | Results: correctness at scale |
| `lifecycle` | L1–L7: every fact type changed live, same token, next request reflects it (both losing and gaining access) | Results: real-time revocation |
| `attacks` | A1a–h forged JWTs (incl. alg confusion, unknown kid, extended exp), A2 cross-tenant + tenant confusion, A3 replay after revocation, A4 expired token, A5 unmapped route, A6 no token, A7 ID token, A8 path tenant tricks, A9 header tricks, A10 session revocation (P6) | Results: adversarial |
| `decisions-<run>` | Determining policy for each deployed request, **checked** against the expected policies | Results (supports the matrix) |
| `latency` | Client round-trip + server-side PEP breakdown (JWT / DynamoDB / AVP), warm vs cold, and per decision path | Results: latency |
| `revocation` | Write-to-deny distribution for 6 revocation mechanisms (incl. sign-out); deny rate of the first request after the write | Results: real-time revocation |

Graph material (all in the CSVs): latency per decision path (box plot), PEP time split JWT / DynamoDB / AVP (stacked bar), write-to-deny per revocation mechanism (box or strip plot), determining-policy sets across the grid (bar), ALLOW rate per action (bar; shows the role gap).

Expected determining policies (checked offline, observable when deployed through `npm run decisions`):

| Case (plan D6) | Expected | Determining | Control |
|---|---|---|---|
| T1 alice → Aurora InitiatePayment (L2, has L2) | ALLOW | P1 | — |
| T2 alice → Meridian (not a member) | DENY | P1 does not permit; P2, P3, P4, P5 also fire on the fail-closed values | T2-ctl bob → Meridian: ALLOW |
| T3 alice L2 → SwiftRemit SendInternational (needs L3) | DENY | P2 | T3-ctl alice → Aurora ViewAccounts: ALLOW |
| T4 dave, KYC past expiry, status still `active` | DENY | P3 | T1 |
| T5 erin revoked in SwiftRemit | DENY | P4 | T5-ctl erin → Aurora (active): ALLOW |
| T6 alice risk 10 → 90 → 10 | ALLOW → DENY → ALLOW | P4 | itself (before/after) |
| T7 carol L1 → InitiatePayment (needs L2) | DENY | P2 | T7-ctl carol → ViewAccounts (L1): ALLOW |
| T8 alice → ManageUsers | DENY | P5 | T8-ctl frank (tenant_admin): ALLOW |
| T3-ctl2 grace L3 → SwiftRemit SendInternational (needs L3) | ALLOW | P1 | (boundary: level == requirement) |
| T9 grace is L1 in Aurora → InitiatePayment | DENY | P2 | T9-ctl grace → SwiftRemit (L3): ALLOW |
| T10 heidi status `expired`, date in the future | DENY | P4 | T10-ctl heidi → SwiftRemit (active): ALLOW |
| T11a ivan (L1, expired, revoked, risk 95) → InitiatePayment | DENY | P2, P3, P4 | — |
| T11b ivan → ManageUsers | DENY | P3, P4, P5 | — |
| T12 judy, member with no KycState/RiskScores row | DENY | P2, P3, P4 | — |
| T13 judy, member with no RiskScores row | DENY | P4 | — |
| T14 frank (tenant_admin in Aurora only) → SwiftRemit ManageUsers | DENY | P5 | T8-ctl |
| T15 ken (compliance_officer + tenant_admin) → ManageUsers | ALLOW | P1 | — |
| S1 ken (tenant_admin + compliance_officer, L3) → SendInternational | DENY | P5 | S1-ctl bob (payments_operator): ALLOW |
| S2 nina, member with no role → ViewAccounts | DENY | P5 | — |
| S3 frank (tenant_admin) → InitiatePayment | DENY | P5 | T1 |
| G1–G4 alice (account_holder, Aurora) → ManageRoles / ApprovePayment / FreezeAccount / ViewKycStatus | DENY | P5 | G1-ctl frank (tenant_admin), G2-ctl alice in SwiftRemit (payments_operator there), G3/G4-ctl carol (compliance_officer): ALLOW |
| A10 mallory, same token after sign-out | ALLOW → DENY → ALLOW (new token) | P6 on the signed-out token | — |

## 8. Reproducing the numbers

1. Same commit, `npm ci`, then deploy to a fresh region/account.
2. `npm run seed`, then `npm test`, `npm run test:aws`, `npm run test:aws:slow`, `npm run bench`, `npm run bench:revocation`.
3. Report with the results: region, Lambda memory (512 MB, `LAMBDA_SETTINGS` in `lib/zta-stack.ts`), arm64, Node.js 22, authoriser cache **disabled**, client location (latency includes your network path to the region).
4. `npm run destroy`. Nothing has a standing cost after that.

Cost: everything is pay-per-use, with no standing cost while idle. A full session (tests + both benchmarks, about 2,000 requests) costs well under US$0.10. Verified Permissions bills $5 per million `IsAuthorized` calls (since June 2025); API Gateway HTTP API, Lambda, on-demand DynamoDB and CloudWatch Logs are each fractions of a cent at this volume. Logs are kept one week.

## 9. Design decisions (worth stating in the paper)

- **D1. JWT = identity only.** The PEP reads only `sub`/`username` from the token (plus `iat`, the token's own issue time, for P6). Tenant, KYC, roles and risk always come from DynamoDB, resolved for the tenant in the request path. The Cognito pool has no tenant custom attributes. This removes Reviewer #2's JWT-vs-DynamoDB inconsistency by construction. A1a shows injected claims cannot help an attacker.
- **D2. Authoriser caching disabled (TTL 0).** With caching on, a cached ALLOW would outlive a revocation and invalidate T6/A3.
- **D3. Strongly consistent reads.** Without them, a read straight after a revocation could return the old value and break "deny on the next request".
- **D4. Missing per-tenant rows get fail-closed values.** The schema makes every context attribute required, so a missing row (no relationship with that tenant) cannot be left out. The PEP fills `kyc_level 0`, `kyc_expires_at 0`, `kyc_status "absent"`, `roles []`, `risk_score MAX`. Each of these on its own makes a forbid fire. That is why T2 shows P2/P3/P4/P5 alongside P1 not permitting, and it is covered by offline cases X1/X2.
- **D5. Evaluation errors = DENY** (§5, X3/X3b).
- **D6. Fixture additions beyond plan D5.** Erin also keeps an active Aurora relationship (T5-ctl: revocation is per relationship). u-frank (tenant_admin) is the positive control for T8. Dave's record is past `kyc_expires_at` but still `status: "active"`, so P3 alone denies T4. Every ApiMetadata row has `risk_threshold: 70`. Extended set: u-grace (L3 in SwiftRemit, L1 in Aurora), u-heidi (status `expired`), u-ivan (fails P2–P4 at once), u-judy (missing KycState/RiskScores rows), u-ken (two roles), u-nina (member with no role, S2), u-mallory (A10 only), and a SwiftRemit relationship for u-frank (roles are per tenant). Under D13 two fixtures gained a role so their P2 cases stay minimal pairs: u-alice is also a payments_operator in SwiftRemit (T3), and u-carol also an account_holder in Aurora (T7).
- **D13. P5 revised: role gate on every action, driven by route data.** The printed P5 (`action == ManageUsers` unless `roles.contains("tenant_admin")`) left every other action open to any member with enough KYC: an account holder could reach role management (a self-elevation path), approve payments and freeze accounts, and a tenant admin or compliance officer could send international transfers (no segregation of duties). One hard-coded role cannot fix this, because each action has different owners. P5 now reads:
  ```cedar
  forbid (principal, action, resource)
  unless { context.roles.containsAny(resource.allowed_roles) };
  ```
  `allowed_roles` comes from the route's ApiMetadata row, so the metadata is the role matrix: changing who may call a route is a data change, not a policy change, and a member with no role is denied everything (least privilege). For ManageUsers (`allowed_roles: [tenant_admin]`) the behaviour is identical to the printed P5. An intermediate version that gated only a "Privileged" group of five actions was tried first; its grid showed InitiatePayment, SendInternational and ExportStatements still open to every role, so the gate now covers all actions. G1–G4, S1–S3 and L7 show it on the deployed stack.
- **D14. P6 session revocation.** The PEP verifies tokens offline, so a Cognito `GlobalSignOut` alone does not stop a token until it expires (A10, original finding). The logout path now also writes `Sessions.tokens_valid_after`, the PEP passes the token's `iat` and that marker into the Cedar context, and P6 refuses `token_iat <= tokens_valid_after`. The check lives in Cedar, not in PEP code, so the PEP still holds no rules. It costs one more DynamoDB `GetItem`, run in parallel with the other four reads. Caveats: `iat` has one-second resolution, so a token issued in the same second as the sign-out is also refused; and the marker must be written by the application, since Cognito emits no sign-out event.
- **D12. Specification oracle.** The matrix and grid suites take their expectations from `test/support/oracle.ts`, a restatement of P1–P6 over the raw DynamoDB facts that is independent of the PEP's Cedar mapping. Agreement checks the policies, the mapping (including the fail-closed values) and the engine together. A one-character change to the oracle (`>` to `>=` at the risk threshold) is caught by the grid.
- **D7. Lambda runtime Node.js 22** (plan said 20). Lambda's Node.js 20 runtime is deprecated as of 2026.
- **D8. Tenant in the path.** Routes are `/tenants/{tenantId}/…` and ApiMetadata is keyed by the API Gateway routeKey. The PEP never takes the tenant from a header, the query string or the token (A2b).
- **D9. Collection-level resources.** Resources are "Payments of tenant X". Instance ownership ("only my account", BOLA) is out of scope.
- **D10. Metadata hand-authored** (plan A §0): an experimental control. OpenAPI-derived metadata is future work. `allowed_roles` is stored (plan C2) and read by P5 for every action (D13), so the hand-authored lists are part of the security design and should be reviewed as such.
- **D11. Schema namespace `PayVault`** (paper prints none). Verified Permissions rejects a schema whose namespace is empty ("Namespace lengths must be at least 1"), so the deploy fails without one. No policy names a type or an action, so the policies themselves are unaffected. The paper should either print the qualified name or state that types are namespaced in the deployment.

## 10. Known limitations and candidate findings

- **Role gap in the printed P5 (resolved by D13).** The paper's P5 gates `ManageUsers` only, so an `account_holder` with enough KYC was **allowed** ManageRoles, ApprovePayment, FreezeAccount and ViewKycStatus, contradicting plan D4 ("ApprovePayment and the /admin/\* routes are role-gated (P5)"). Measured on run `2026-10-10T11-26-01Z`: G1–G4 returned 200. With P5 applied to every action they return 403, their role-holding controls 200, and S1–S3 show segregation of duties. The paper should print the revised P5 and can cite the before/after as a finding of the validation.
- **Facts are not bound to a tenant inside Cedar.** The flat context means Cedar trusts that the PEP resolved the KYC/roles/risk for the right tenant. Correctness rests on `data.ts` keying every read by the path tenant. Hardening option, not in the paper: add a `kyc_tenant` context attribute and require `== resource.tenant` in P1.
- **Session revocation (resolved by D14).** `aws-jwt-verify` checks tokens offline, so before P6 a token revoked via Cognito `GlobalSignOut` passed the PEP until it expired (≤ 5 min): on run `2026-10-10T11-26-01Z`, A10 showed Cognito's own `GetUser` rejecting the token while the PEP returned 200. With P6 the same token is refused on the next request. What remains: the sign-out marker must be written by the application's logout path (Cognito has no event for it), and a token revoked only through Cognito `RevokeToken`, without the marker, still lives until `exp`.
- The `context.now` clock belongs to the PEP. Clock skew between PEP instances affects P3 only at second granularity.
- Latency includes the client's network path. Report where the client ran.

## 11. Safety

- Synthetic users only (`u-alice` … `u-frank`). Their random passwords are in `.zta/test-users.json` (gitignored, mode 600).
- The authoriser's IAM role allows `dynamodb:GetItem` on 3 tables, `dynamodb:Query` on Memberships, and `verifiedpermissions:IsAuthorized` on this policy store. Nothing else.
- All AWS commands are run by you, against your own account.
