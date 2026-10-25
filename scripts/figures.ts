// Paper figures: turns one run's CSVs into static SVG charts (vector, so they scale cleanly
// in LaTeX/Word) plus an index.html to view them together.
//
//   npm run figures -- <run id>        -> results/figures-<run id>/*.svg + index.html
//
// Each figure is drawn only if its source CSV exists for that run:
//   fig1-latency-by-path.svg      latency-<run>-client.csv   (npm run bench)
//   fig2-pep-breakdown.svg        latency-<run>-server.csv   (npm run bench)
//   fig3-latency-ecdf.svg         latency-<run>-client.csv   (npm run bench)
//   fig4-revocation.svg           revocation-<run>.csv       (npm run bench:revocation)
//   fig5-grid-policies.svg        offline-grid-<run>.csv     (npm test)  how often each policy decided
//   fig6-grid-allow-rate.svg      offline-grid-<run>.csv     (npm test)
//
// No dependencies: the SVG is written by hand. Light theme only (print). The numbers behind
// every figure stay in the CSVs, which serve as the table view.

import fs from "node:fs";
import path from "node:path";
import { stats } from "../bench/stats";
import { ROOT } from "../test/support/env";

// ---------------- Palette (validated: scripts/validate_palette.js, slots 1-3 all-pairs) ----------------
const C = {
  surface: "#fcfcfb",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  s1: "#2a78d6", // blue
  s2: "#eb6834", // orange
  s3: "#1baf7a", // aqua (below 3:1 on the surface: always paired with a legend + value labels)
  s1dark: "#184f95",
};
const FONT = `system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`;
const W = 760;

// ---------------- CSV ----------------
function readCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(cell), (cell = "");
    else if (ch === "\n") row.push(cell), rows.push(row), (row = []), (cell = "");
    else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [header, ...body] = rows;
  return body.filter((r) => r.length === header!.length).map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i]!])));
}

// ---------------- SVG primitives ----------------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (x: number) => (Math.round(x * 10) / 10).toString();

function text(x: number, y: number, s: string, o: { size?: number; fill?: string; anchor?: "start" | "middle" | "end"; weight?: number } = {}) {
  return `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? C.ink2}" text-anchor="${o.anchor ?? "start"}"${o.weight ? ` font-weight="${o.weight}"` : ""}>${esc(s)}</text>`;
}
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, w = 1) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;

/** Horizontal bar from x0 to x1: 4px rounded data end on the right, square at the baseline. */
function hbar(x0: number, x1: number, y: number, h: number, fill: string, tip: string, roundEnd = true) {
  const w = Math.max(0, x1 - x0);
  const r = roundEnd ? Math.min(4, w, h / 2) : 0;
  const d = `M${f1(x0)},${f1(y)} H${f1(x0 + w - r)} Q${f1(x0 + w)},${f1(y)} ${f1(x0 + w)},${f1(y + r)} V${f1(y + h - r)} Q${f1(x0 + w)},${f1(y + h)} ${f1(x0 + w - r)},${f1(y + h)} H${f1(x0)} Z`;
  return `<path d="${d}" fill="${fill}"><title>${esc(tip)}</title></path>`;
}

/** Clean axis step for a max value (1, 2, 2.5, 5 x 10^n), about `target` ticks. */
function niceStep(max: number, target = 5): number {
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
}
const niceMax = (max: number, target = 5) => Math.ceil(max / niceStep(max, target)) * niceStep(max, target);

/** Deterministic jitter in [-0.5, 0.5) (golden-ratio sequence), so figures are reproducible. */
const jitter = (i: number) => ((i * 0.6180339887) % 1) - 0.5;

/** Greedy word wrap by character budget (labels here are short; ~5.8 px per char at 10.5 px). */
function wrap(s: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if (cur && (cur + " " + w).length > maxChars) lines.push(cur), (cur = w);
    else cur = cur ? `${cur} ${w}` : w;
  }
  return cur ? [...lines, cur] : lines;
}

function doc(h0: number, title: string, subtitle: string, note: string, body: string, desc: string) {
  const noteLines = wrap(note, 118);
  const h = h0 + (noteLines.length - 1) * 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" font-family='${FONT}' role="img">
<title>${esc(title)}</title>
<desc>${esc(desc)}</desc>
<rect width="${W}" height="${h}" fill="${C.surface}"/>
${text(24, 32, title, { size: 16, fill: C.ink, weight: 600 })}
${text(24, 52, subtitle, { size: 12, fill: C.ink2 })}
${body}
${noteLines.map((l, i) => text(24, h0 - 14 + i * 14, l, { size: 10.5, fill: C.muted })).join("\n")}
</svg>
`;
}

/** Vertical gridlines + tick labels for an x scale. */
function xAxis(x0: number, x1: number, yTop: number, yBottom: number, max: number, fmt: (v: number) => string, label: string) {
  const step = niceStep(max);
  const sx = (v: number) => x0 + (v / max) * (x1 - x0);
  let out = "";
  for (let v = 0; v <= max + 1e-9; v += step) {
    out += line(sx(v), yTop, sx(v), yBottom, v === 0 ? C.axis : C.grid);
    out += text(sx(v), yBottom + 16, fmt(v), { size: 11, fill: C.muted, anchor: "middle" });
  }
  out += text((x0 + x1) / 2, yBottom + 34, label, { size: 11, fill: C.ink2, anchor: "middle" });
  return out;
}

function legend(x: number, y: number, items: Array<[string, string]>) {
  let out = "";
  let cx = x;
  for (const [color, label] of items) {
    out += `<rect x="${f1(cx)}" y="${f1(y - 9)}" width="10" height="10" rx="2" fill="${color}"/>`;
    out += text(cx + 15, y, label, { size: 12, fill: C.ink2 });
    cx += 15 + label.length * 6.6 + 22;
  }
  return out;
}

// ---------------- Figures ----------------

const PATHS: Array<{ key: string; label: string; stops: string }> = [
  { key: "no-token", label: "No token", stops: "API Gateway, PEP not invoked" },
  { key: "forged-token", label: "Forged token", stops: "stops at JWT verification" },
  { key: "unmapped", label: "Unmapped route", stops: "JWT + DynamoDB, no Cedar call" },
  { key: "cross-tenant", label: "Cross-tenant", stops: "full PEP, Cedar DENY" },
  { key: "cedar-forbid", label: "Cedar forbid (P2)", stops: "full PEP, Cedar DENY" },
  { key: "allow", label: "ALLOW", stops: "full PEP + target Lambda" },
];

/** Strip + box plot: one row per group, raw dots, IQR box, median tick, p50/p95 label. */
function stripPlot(opts: {
  title: string;
  subtitle: string;
  note: string;
  unit: string;
  rows: Array<{ label: string; sub: string; values: number[]; extra?: string }>;
}) {
  const rowH = 46;
  const top = 78;
  const x0 = 210;
  const x1 = W - 180;
  const h = top + opts.rows.length * rowH + 70;
  const all = opts.rows.flatMap((r) => r.values);
  const cap = niceMax(Math.max(...opts.rows.map((r) => stats(r.values).p99)) * 1.05);
  const sx = (v: number) => x0 + (Math.min(v, cap) / cap) * (x1 - x0);
  let body = xAxis(x0, x1, top - 6, top + opts.rows.length * rowH, cap, (v) => `${v}`, `${opts.unit} (dots beyond ${cap} ${opts.unit} are drawn at the edge)`);
  opts.rows.forEach((r, i) => {
    const cy = top + i * rowH + rowH / 2;
    const s = stats(r.values);
    const v = [...r.values].sort((a, b) => a - b);
    const q = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.ceil(p * v.length) - 1))]!;
    body += text(24, cy - 2, r.label, { size: 12.5, fill: C.ink, weight: 600 });
    body += text(24, cy + 13, r.sub, { size: 10.5, fill: C.muted });
    // IQR box (a wash), whisker p5-p95, raw dots, median tick
    body += `<rect x="${f1(sx(q(0.25)))}" y="${f1(cy - 11)}" width="${f1(Math.max(2, sx(q(0.75)) - sx(q(0.25))))}" height="22" rx="4" fill="${C.s1}" fill-opacity="0.14"/>`;
    body += line(sx(q(0.05)), cy, sx(q(0.95)), cy, C.s1, 1.5);
    r.values.forEach((val, k) => {
      body += `<circle cx="${f1(sx(val))}" cy="${f1(cy + jitter(k) * 16)}" r="2.6" fill="${C.s1}" fill-opacity="0.45"><title>${esc(`${r.label}: ${f1(val)} ${opts.unit}`)}</title></circle>`;
    });
    body += line(sx(s.p50), cy - 12, sx(s.p50), cy + 12, C.s1dark, 2.5);
    body += text(x1 + 14, cy - 2, `p50 ${f1(s.p50)} · p95 ${f1(s.p95)} ${opts.unit}`, { size: 11.5, fill: C.ink });
    body += text(x1 + 14, cy + 13, r.extra ?? `n = ${s.n}`, { size: 10.5, fill: C.muted });
  });
  const desc = opts.rows.map((r) => `${r.label}: median ${stats(r.values).p50} ${opts.unit}, p95 ${stats(r.values).p95}`).join("; ");
  return doc(h, opts.title, opts.subtitle, opts.note + ` Total samples: ${all.length}.`, body, desc);
}

function fig1(client: Array<Record<string, string>>) {
  const rows = PATHS.map((p) => ({ label: p.label, sub: p.stops, values: client.filter((r) => r.phase === `path:${p.key}`).map((r) => Number(r.ms)) })).filter((r) => r.values.length > 0);
  if (rows.length === 0) return undefined;
  return stripPlot({
    title: "Client round-trip latency by decision path",
    subtitle: "Each dot is one request. Box: interquartile range; line: p5–p95; dark tick: median.",
    note: "Client round-trip = network + API Gateway + Lambda PEP (+ target on ALLOW). Source: latency-<run>-client.csv.",
    unit: "ms",
    rows,
  });
}

function fig2(server: Array<Record<string, string>>) {
  const warm = server.filter((r) => r.cold_start === "false");
  const rows = PATHS.filter((p) => p.key !== "no-token")
    .map((p) => {
      const sel = warm.filter((r) => r.phase === `path:${p.key}`);
      const med = (k: string) => stats(sel.map((r) => Number(r[k]))).p50;
      return { ...p, n: sel.length, jwt: med("jwt_ms"), facts: med("facts_ms"), pdp: med("pdp_ms"), total: med("total_ms") };
    })
    .filter((r) => r.n > 0);
  if (rows.length === 0) return undefined;
  const rowH = 40;
  const top = 96;
  const x0 = 210;
  const x1 = W - 110;
  const h = top + rows.length * rowH + 70;
  const max = niceMax(Math.max(...rows.map((r) => Math.max(r.total, r.jwt + r.facts + r.pdp))) * 1.05);
  const sx = (v: number) => x0 + (v / max) * (x1 - x0);
  let body = legend(24, 80, [[C.s1, "JWT verification"], [C.s2, "DynamoDB reads (4, parallel)"], [C.s3, "Verified Permissions"]]);
  body += xAxis(x0, x1, top - 6, top + rows.length * rowH, max, (v) => `${v}`, "Server-side PEP time, ms (warm invocations, median of each step)");
  rows.forEach((r, i) => {
    const y = top + i * rowH + (rowH - 20) / 2;
    const cy = y + 10;
    body += text(24, cy - 1, r.label, { size: 12.5, fill: C.ink, weight: 600 });
    body += text(24, cy + 13, r.stops, { size: 10.5, fill: C.muted });
    const segs = ([["JWT verification", r.jwt, C.s1], ["DynamoDB reads", r.facts, C.s2], ["Verified Permissions", r.pdp, C.s3]] as const).filter(([, v]) => v > 0);
    let x = sx(0);
    segs.forEach(([name, v, color], k) => {
      const last = k === segs.length - 1;
      const xEnd = sx(v) - sx(0) + x;
      // 2px surface gap between touching segments
      body += hbar(x, last ? xEnd : Math.max(x, xEnd - 2), y, 20, color, `${r.label} · ${name}: ${f1(v)} ms (median)`, last);
      x = xEnd;
    });
    body += text(Math.max(x, sx(0)) + 8, cy + 4, `${f1(r.total)} ms total`, { size: 11.5, fill: C.ink });
  });
  const desc = rows.map((r) => `${r.label}: JWT ${r.jwt} ms, DynamoDB ${r.facts} ms, Verified Permissions ${r.pdp} ms, total ${r.total} ms`).join("; ");
  return doc(h, "Where the authoriser spends its time", "Median time per PEP step for each decision path. A path that stops early never pays for the later steps.",
    "Steps are medians taken separately, so they need not sum exactly to the median total. Source: latency-<run>-server.csv.", body, desc);
}

function fig3(client: Array<Record<string, string>>) {
  const series = ([["sequential", "Sequential (1 at a time)", C.s1], ["burst", "Burst (concurrent)", C.s2]] as const)
    .map(([k, label, color]) => ({ label, color, v: client.filter((r) => r.phase === k).map((r) => Number(r.ms)).sort((a, b) => a - b) }))
    .filter((s) => s.v.length > 0);
  if (series.length === 0) return undefined;
  const top = 92;
  const x0 = 70;
  const x1 = W - 190;
  const y0 = top + 240;
  const h = y0 + 70;
  const max = niceMax(Math.max(...series.map((s) => stats(s.v).p99)) * 1.05);
  const sx = (v: number) => x0 + (Math.min(v, max) / max) * (x1 - x0);
  const sy = (p: number) => y0 - p * (y0 - top);
  let body = legend(24, 78, series.map((s) => [s.color, s.label] as [string, string]));
  body += xAxis(x0, x1, top, y0, max, (v) => `${v}`, "Client round-trip latency, ms (ALLOW path)");
  for (const p of [0, 0.25, 0.5, 0.75, 0.9, 1]) {
    body += line(x0, sy(p), x1, sy(p), p === 0 ? C.axis : C.grid);
    body += text(x0 - 8, sy(p) + 4, `${Math.round(p * 100)}%`, { size: 11, fill: C.muted, anchor: "end" });
  }
  series.forEach((s) => {
    const pts = s.v.map((v, i) => `${f1(sx(v))},${f1(sy((i + 1) / s.v.length))}`);
    body += `<polyline points="${f1(sx(s.v[0]!))},${f1(sy(0))} ${pts.join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  // Direct labels at the right edge, stacked in legend order (lines converge at 100%).
  series.forEach((s, i) => {
    const st = stats(s.v);
    const y = top + 18 + i * 38;
    body += `<rect x="${x1 + 16}" y="${y - 9}" width="10" height="10" rx="2" fill="${s.color}"/>`;
    body += text(x1 + 32, y, s.label.split(" (")[0]!, { size: 12, fill: C.ink, weight: 600 });
    body += text(x1 + 32, y + 15, `p50 ${f1(st.p50)} · p95 ${f1(st.p95)} ms`, { size: 11, fill: C.ink2 });
  });
  const desc = series.map((s) => `${s.label}: p50 ${stats(s.v).p50} ms, p95 ${stats(s.v).p95} ms, n ${s.v.length}`).join("; ");
  return doc(h, "Latency distribution under sequential and concurrent load", "Cumulative share of requests completed within a given round-trip time (ECDF).",
    `Concurrent burst size and concurrency as recorded in latency-<run>.md. Source: latency-<run>-client.csv.`, body, desc);
}

function fig4(rev: Array<Record<string, string>>) {
  const names: Record<string, [string, string]> = {
    risk: ["Risk raised", "RiskScores, P4"],
    status: ["Relationship revoked", "KycState status, P4"],
    "kyc-level": ["KYC downgraded", "KycState level, P2"],
    role: ["Role removed", "Memberships roles, P5"],
    membership: ["Offboarded", "Memberships row deleted, P5"],
    session: ["Signed out", "Sessions marker, P6"],
  };
  const rows = Object.entries(names)
    .map(([k, [label, sub]]) => {
      const sel = rev.filter((r) => r.mechanism === k && r.baseline === "ALLOW");
      const denied = sel.filter((r) => r.first_after_write === "DENY").length;
      return { label, sub, values: sel.map((r) => Number(r.write_to_decision_ms)), extra: `1st request denied: ${denied}/${sel.length}` };
    })
    .filter((r) => r.values.length > 0);
  if (rows.length === 0) return undefined;
  return stripPlot({
    title: "Time from a DynamoDB write to the denied request",
    subtitle: "Same access token throughout. Each dot is one revocation; the first request after the write is the one measured.",
    note: "Write-to-deny = write start until the DENY response arrives (one write + one full request). Source: revocation-<run>.csv.",
    unit: "ms",
    rows,
  });
}

function hbarChart(opts: {
  title: string;
  subtitle: string;
  note: string;
  axisLabel: string;
  max?: number;
  fmtAxis: (v: number) => string;
  rows: Array<{ label: string; value: number; valueLabel: string; color: string }>;
  legendItems?: Array<[string, string]>;
}) {
  const rowH = 28;
  const top = opts.legendItems ? 92 : 74;
  const x0 = 190;
  const x1 = W - 120;
  const h = top + opts.rows.length * rowH + 66;
  const max = opts.max ?? niceMax(Math.max(...opts.rows.map((r) => r.value)) * 1.05);
  const sx = (v: number) => x0 + (v / max) * (x1 - x0);
  let body = opts.legendItems ? legend(24, 78, opts.legendItems) : "";
  body += xAxis(x0, x1, top - 6, top + opts.rows.length * rowH, max, opts.fmtAxis, opts.axisLabel);
  opts.rows.forEach((r, i) => {
    const y = top + i * rowH + (rowH - 16) / 2;
    body += text(x0 - 10, y + 12, r.label, { size: 12, fill: C.ink, anchor: "end" });
    body += hbar(sx(0), sx(r.value), y, 16, r.color, `${r.label}: ${r.valueLabel}`);
    body += text(sx(r.value) + 8, y + 12, r.valueLabel, { size: 11.5, fill: C.ink2 });
  });
  return doc(h, opts.title, opts.subtitle, opts.note, body, opts.rows.map((r) => `${r.label}: ${r.valueLabel}`).join("; "));
}


function fig5(grid: Array<Record<string, string>>) {
  const n = grid.length;
  const sets = grid.map((r) => (r.actual_policies === "default deny" ? [] : r.actual_policies.split("+")));
  const share = (k: number) => `${k.toLocaleString("en")} (${((100 * k) / n).toFixed(1)}%)`;
  const fired = (p: string) => sets.filter((s) => s.includes(p)).length;
  const allow = grid.filter((r) => r.actual === "ALLOW").length;
  const unmapped = grid.filter((r) => r.reason === "unmapped-route").length;
  // Cedar's own default deny: no permit matched and no forbid fired.
  const defaultDeny = grid.filter((r) => r.reason === "pdp-deny" && r.actual_policies === "default deny").length;
  const multi = sets.filter((s) => s.filter((p) => p !== "P1").length >= 2).length;
  const names: Array<[string, string]> = [["P2", "P2 KYC tier"], ["P3", "P3 KYC expiry"], ["P4", "P4 risk / revocation"], ["P5", "P5 role"], ["P6", "P6 session revoked"]];
  const rows = [
    { label: "ALLOW (P1 permits, no forbid)", value: allow, valueLabel: share(allow), color: C.s3 },
    ...names.filter(([p]) => fired(p) > 0).map(([p, label]) => ({ label, value: fired(p), valueLabel: share(fired(p)), color: C.s1 })),
    ...(defaultDeny > 0 ? [{ label: "Default deny (no permit)", value: defaultDeny, valueLabel: share(defaultDeny), color: C.s1 }] : []),
    { label: "Unmapped route (before Cedar)", value: unmapped, valueLabel: share(unmapped), color: C.s1 },
  ];
  const agree = grid.filter((r) => r.agree === "true").length;
  return hbarChart({
    title: "How often each policy decided a request",
    subtitle: `All ${n.toLocaleString("en")} combinations of the offline grid. ${((100 * multi) / n).toFixed(1)}% of requests were denied by two or more forbids at once.`,
    note: `A denied request can be decided by several forbids, so the forbid shares add up to more than 100%. Agreement with the specification oracle: ${agree.toLocaleString("en")}/${n.toLocaleString("en")}. Full breakdown by policy set: offline-grid-<run>.md. Source: offline-grid-<run>.csv.`,
    axisLabel: "Combinations",
    fmtAxis: (v) => v.toLocaleString("en"),
    rows,
    legendItems: [[C.s3, "ALLOW"], [C.s1, "DENY reason"]],
  });
}

function fig6(grid: Array<Record<string, string>>) {
  // Actions only one role may perform (segregation of duties), from the route metadata.
  const singleRole = new Set(["ApprovePayment", "SendInternational", "FreezeAccount", "ManageUsers", "ManageRoles"]);
  const actions = [...new Set(grid.map((r) => r.action))];
  const rows = actions.map((a) => {
    const sel = grid.filter((r) => r.action === a);
    const allow = sel.filter((r) => r.actual === "ALLOW").length;
    const rate = (100 * allow) / sel.length;
    return {
      label: a === "(unmapped)" ? "Unmapped route" : a,
      value: rate,
      valueLabel: `${rate.toFixed(1)}%  (${allow}/${sel.length})`,
      color: singleRole.has(a) ? C.s2 : C.s1,
    };
  });
  return hbarChart({
    title: "Share of fact combinations allowed, per action",
    subtitle: "Same grid for every action, so differences come only from the policies and each route's KYC level and allowed roles.",
    note: "P5 requires one of the route's allowed roles, in the request's tenant, for every action. Single-role actions enforce segregation of duties (e.g. only payments_operator may approve payments or send internationally). Source: offline-grid-<run>.csv.",
    axisLabel: "Combinations allowed, %",
    fmtAxis: (v) => `${v}%`,
    rows,
    legendItems: [[C.s2, "Single-role action (segregation of duties)"], [C.s1, "Action open to several roles"]],
  });
}

// ---------------- Main ----------------

function main() {
  const run = process.argv[2];
  if (!run) throw new Error("usage: npm run figures -- <run id>");
  const dir = path.join(ROOT, "results");
  const src = (name: string) => {
    const file = path.join(dir, name);
    return fs.existsSync(file) ? readCsv(file) : undefined;
  };
  const client = src(`latency-${run}-client.csv`);
  const server = src(`latency-${run}-server.csv`);
  const rev = src(`revocation-${run}.csv`);
  const grid = src(`offline-grid-${run}.csv`);

  const figures: Array<[string, string | undefined, string]> = [
    ["fig1-latency-by-path.svg", client && fig1(client), "npm run bench"],
    ["fig2-pep-breakdown.svg", server && fig2(server), "npm run bench"],
    ["fig3-latency-ecdf.svg", client && fig3(client), "npm run bench"],
    ["fig4-revocation.svg", rev && fig4(rev), "npm run bench:revocation"],
    ["fig5-grid-policies.svg", grid && fig5(grid), "npm test"],
    ["fig6-grid-allow-rate.svg", grid && fig6(grid), "npm test"],
  ];

  const out = path.join(dir, `figures-${run}`);
  fs.mkdirSync(out, { recursive: true });
  const written: string[] = [];
  for (const [name, svg, needs] of figures) {
    if (svg) {
      fs.writeFileSync(path.join(out, name), svg);
      written.push(name);
      console.log(`  ✓ ${name}`);
    } else console.log(`  - ${name}: no data for run ${run} (run \`${needs}\` with ZTA_RUN=${run})`);
  }
  fs.writeFileSync(
    path.join(out, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Figures: ${esc(run)}</title>
<body style="margin:0;padding:24px;background:#f9f9f7;font-family:${FONT}">
<h1 style="font-size:18px;font-weight:600;color:#0b0b0b">Figures: run ${esc(run)}</h1>
${written.map((f) => `<figure style="margin:0 0 24px"><img src="${f}" alt="${f}" style="max-width:100%;height:auto;border:1px solid #e1e0d9"><figcaption style="font-size:12px;color:#52514e">${f}</figcaption></figure>`).join("\n")}
</body>
`,
  );
  console.log(`Written: ${path.relative(ROOT, out)}/ (${written.length} figures + index.html)`);
}

main();
