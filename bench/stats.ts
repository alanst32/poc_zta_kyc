// Summary statistics and Markdown tables shared by the benchmarks.

export interface Stats { n: number; p50: number; p95: number; p99: number; min: number; max: number; mean: number }

export function stats(values: number[]): Stats {
  const v = [...values].sort((a, b) => a - b);
  // Nearest-rank percentile: simple, and conventional for small samples.
  const pct = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))] ?? NaN;
  const r = (x: number) => Math.round(x * 10) / 10;
  return { n: v.length, p50: r(pct(50)), p95: r(pct(95)), p99: r(pct(99)), min: r(v[0] ?? NaN), max: r(v.at(-1) ?? NaN), mean: r(v.reduce((a, b) => a + b, 0) / (v.length || 1)) };
}

export function mdTable(rows: Array<Record<string, unknown>>): string {
  const cols = Object.keys(rows[0] ?? {});
  return [`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${cols.map((c) => r[c]).join(" | ")} |`)].join("\n");
}
