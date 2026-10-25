// CloudWatch Logs Insights helper: fetches the authoriser's structured decision records
// (one JSON line per request, see DecisionRecord in src/authorizer/pep.ts) for a test run.
import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import type { DecisionRecord } from "../src/authorizer/pep";
import { readOutputs } from "../test/support/env";

export async function fetchDecisionRecords(run: string, sinceMinutes = 180): Promise<DecisionRecord[]> {
  const out = readOutputs();
  const logs = new CloudWatchLogsClient({ region: out.Region });
  const end = Math.floor(Date.now() / 1000) + 60;
  const { queryId } = await logs.send(
    new StartQueryCommand({
      logGroupName: out.AuthorizerLogGroup,
      startTime: end - sinceMinutes * 60,
      endTime: end,
      // `run` is a parsed JSON field; filtering server-side keeps the result small.
      queryString: `fields @message | filter type = "decision" and run = "${run.replace(/"/g, "")}" | sort @timestamp asc | limit 10000`,
    }),
  );
  for (;;) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await logs.send(new GetQueryResultsCommand({ queryId }));
    if (res.status === "Complete") {
      return (res.results ?? [])
        .map((row) => row.find((f) => f.field === "@message")?.value)
        .filter((m): m is string => !!m)
        .map((m) => JSON.parse(m.slice(m.indexOf("{"))) as DecisionRecord);
    }
    if (res.status === "Failed" || res.status === "Cancelled" || res.status === "Timeout") {
      throw new Error(`Logs Insights query ${res.status}`);
    }
  }
}

/**
 * Logs arrive in CloudWatch a few seconds after the request; wait until `expected` are visible.
 * `caseId` limits the count to one case's records: a run id is shared by every suite of a session.
 */
export async function waitForDecisionRecords(run: string, expected: number, { caseId, timeoutMs = 120_000 }: { caseId?: string; timeoutMs?: number } = {}) {
  const deadline = Date.now() + timeoutMs;
  let recs: DecisionRecord[] = [];
  while (Date.now() < deadline) {
    recs = (await fetchDecisionRecords(run)).filter((r) => !caseId || r.case === caseId);
    if (recs.length >= expected) return recs;
    console.log(`  ...${recs.length}/${expected} decision records ingested, waiting`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.warn(`  timed out with ${recs.length}/${expected} records; reporting what arrived`);
  return recs;
}
