// Collects expected-vs-actual rows and writes them as Markdown (paste into the paper's
// Results section) and JSON (machine-readable evidence) under results/.
import fs from "node:fs";
import path from "node:path";
import { ROOT, RUN_ID } from "./env";

export interface ResultRow {
  id: string;
  scenario: string;
  expected: string;
  actual: string;
  /** HTTP status for deployed runs, determining policies for offline runs, etc. */
  detail?: string;
  pass: boolean;
  /**
   * Determining policies the authoriser's decision log should show for this case, keyed by
   * x-zta-phase ("" when the request had no phase). `npm run decisions -- <run>` checks them.
   */
  expectedPolicies?: Record<string, string[]>;
}

export class ResultsTable {
  readonly rows: ResultRow[] = [];
  constructor(readonly suite: string, readonly environment: Record<string, string> = {}) {}

  add(row: ResultRow): void {
    this.rows.push(row);
  }

  write(): string {
    const dir = path.join(ROOT, "results");
    fs.mkdirSync(dir, { recursive: true });
    const base = path.join(dir, `${this.suite}-${RUN_ID}`);
    const passed = this.rows.filter((r) => r.pass).length;
    const esc = (s: string) => s.replace(/\|/g, "\\|");
    const md = [
      `# ${this.suite}: run ${RUN_ID}`,
      "",
      ...Object.entries(this.environment).map(([k, v]) => `- **${k}:** ${v}`),
      `- **Result:** ${passed}/${this.rows.length} cases match expected`,
      "",
      "| # | Scenario | Expected | Actual | Detail | Pass |",
      "|---|---|---|---|---|---|",
      ...this.rows.map(
        (r) => `| ${r.id} | ${esc(r.scenario)} | ${r.expected} | ${r.actual} | ${esc(r.detail ?? "")} | ${r.pass ? "✅" : "❌"} |`,
      ),
      "",
    ].join("\n");
    fs.writeFileSync(`${base}.md`, md);
    fs.writeFileSync(`${base}.json`, JSON.stringify({ suite: this.suite, run: RUN_ID, environment: this.environment, rows: this.rows }, null, 2));
    writeCsv(`${base}.csv`, this.rows.map(({ expectedPolicies: _, ...r }) => r));
    console.log(`\n${md}\nWritten: ${path.relative(ROOT, base)}.{md,json,csv}`);
    return base;
  }
}

/** Writes rows as CSV (header from the first row's keys), for plotting in a spreadsheet, R or pandas. */
export function writeCsv(file: string, rows: Array<Record<string, unknown>>): void {
  const cols = Object.keys(rows[0] ?? {});
  const cell = (v: unknown) => {
    const s = Array.isArray(v) ? v.join(" ") : v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  fs.writeFileSync(file, [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n");
}
