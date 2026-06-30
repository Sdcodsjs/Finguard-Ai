"use client";
import { useEffect, useState, useMemo } from "react";
import { compare as compareApi, reports, diff as diffApi, CompareResult, Company, ReportSummary } from "@/lib/api";
import { scoreColor, fraudColor, formatNumber } from "@/lib/utils";
import { ScoreRing } from "@/components/ScoreRing";
import {
  GitCompare, Plus, X, Loader2, BarChart3, AlertTriangle,
  FileText, ArrowRight, TrendingUp, TrendingDown, Minus, Trophy,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
const COLOR_NAMES = ["blue", "emerald", "amber", "purple"];

// ─── Metric row config ────────────────────────────────────
interface MetricDef {
  key: keyof CompareResult;
  label: string;
  format: (v: number) => string;
  /** true = higher is better, false = lower is better */
  higherBetter: boolean;
  description: string;
}

const METRIC_DEFS: MetricDef[] = [
  {
    key: "revenue",
    label: "Revenue (₹ Cr)",
    format: (v) => formatNumber(v),
    higherBetter: true,
    description: "Total annual revenue",
  },
  {
    key: "revenue_growth",
    label: "Revenue Growth",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
    higherBetter: true,
    description: "Year-over-year revenue growth",
  },
  {
    key: "profit_margin",
    label: "Net Profit Margin",
    format: (v) => `${v.toFixed(1)}%`,
    higherBetter: true,
    description: "Net profit as % of revenue",
  },
  {
    key: "operating_margin",
    label: "Operating Margin",
    format: (v) => `${v.toFixed(1)}%`,
    higherBetter: true,
    description: "EBITDA / operating profit margin",
  },
  {
    key: "roe",
    label: "ROE",
    format: (v) => `${v.toFixed(1)}%`,
    higherBetter: true,
    description: "Return on equity",
  },
  {
    key: "roa",
    label: "ROA",
    format: (v) => `${v.toFixed(1)}%`,
    higherBetter: true,
    description: "Return on assets",
  },
  {
    key: "debt_to_equity",
    label: "Debt / Equity",
    format: (v) => v.toFixed(2),
    higherBetter: false,
    description: "Financial leverage ratio",
  },
  {
    key: "current_ratio",
    label: "Current Ratio",
    format: (v) => v.toFixed(2),
    higherBetter: true,
    description: "Short-term liquidity",
  },
  {
    key: "interest_coverage",
    label: "Interest Coverage",
    format: (v) => `${v.toFixed(1)}x`,
    higherBetter: true,
    description: "EBITDA / Interest expense",
  },
  {
    key: "pe_ratio",
    label: "P/E Ratio",
    format: (v) => v.toFixed(1),
    higherBetter: false,
    description: "Price to earnings (AI-extracted or N/A)",
  },
  {
    key: "esg_score",
    label: "ESG Score",
    format: (v) => `${Math.round(v)}`,
    higherBetter: true,
    description: "Environmental, Social & Governance score (0–100)",
  },
  {
    key: "health_score",
    label: "Financial Health",
    format: (v) => `${Math.round(v)}/100`,
    higherBetter: true,
    description: "Composite financial health score",
  },
  {
    key: "fraud_score",
    label: "Fraud Risk",
    format: (v) => `${Math.round(v)}%`,
    higherBetter: false,
    description: "AI-detected fraud risk (lower = better)",
  },
];

// Micro inline bar showing relative rank
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// Trophy icon for the best performer per metric
function WinnerBadge() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 ml-1">
      <Trophy className="w-2.5 h-2.5 text-amber-400" />
    </span>
  );
}

function TrendIcon({ pct }: { pct?: number }) {
  if (pct == null) return <Minus className="w-3.5 h-3.5 text-slate-600" />;
  if (pct > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (pct < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

export default function ComparePage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  // Tab/Mode state
  const [mode, setMode] = useState<"benchmark" | "diff">("benchmark");

  // Benchmarking State
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Document Diff State
  const [diffCompanyId, setDiffCompanyId] = useState("");
  const [companyReports, setCompanyReports] = useState<ReportSummary[]>([]);
  const [yearFrom, setYearFrom] = useState<number | "">("");
  const [yearTo, setYearTo] = useState<number | "">("");
  const [diffResult, setDiffResult] = useState<any | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    reports.companies().then(setCompanies);
  }, []);

  // Benchmarking functions
  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const runCompare = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    try {
      const res = await compareApi.companies(selected);
      setResults(res.companies);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  // Document Diff functions
  const handleCompanyChange = async (companyId: string) => {
    setDiffCompanyId(companyId);
    setYearFrom("");
    setYearTo("");
    setDiffResult(null);
    if (!companyId) { setCompanyReports([]); return; }
    try {
      const reps = await reports.companyReports(companyId);
      setCompanyReports(reps.filter(r => r.status === "analyzed"));
    } catch (err) { console.error(err); }
  };

  const runDocumentDiff = async () => {
    if (!diffCompanyId || !yearFrom || !yearTo) return;
    setDiffLoading(true);
    try {
      const res = await diffApi.create(diffCompanyId, Number(yearFrom), Number(yearTo));
      setDiffResult(res);
    } catch (err) { console.error(err); }
    finally { setDiffLoading(false); }
  };

  // Radar chart data
  const radarData = [
    { metric: "Health" },
    { metric: "ESG" },
    { metric: "Fraud (inv.)" },
    { metric: "Risk (inv.)" },
  ].map((row) => {
    const obj: Record<string, any> = { metric: row.metric };
    results.forEach((r) => {
      if (row.metric === "Fraud (inv.)") obj[r.name] = 100 - (r.fraud_score ?? 50);
      else if (row.metric === "Risk (inv.)") obj[r.name] = 100 - (r.risk_score ?? 50);
      else if (row.metric === "Health") obj[r.name] = r.health_score ?? 50;
      else obj[r.name] = r.esg_score ?? 50;
    });
    return obj;
  });

  // Determine winner for each metric row
  const metricWinners = useMemo(() => {
    const map: Record<string, number> = {}; // metric key → winning result index
    METRIC_DEFS.forEach((def) => {
      const values = results.map((r) => r[def.key] as number | undefined);
      const valid = values.map((v, i) => ({ v, i })).filter((x) => x.v != null);
      if (!valid.length) return;
      const winner = valid.reduce((best, cur) =>
        def.higherBetter ? (cur.v! > best.v! ? cur : best) : (cur.v! < best.v! ? cur : best)
      );
      map[def.key] = winner.i;
    });
    return map;
  }, [results]);

  // Bar chart data for revenue comparison
  const revenueBarData = results.map((r, i) => ({
    name: r.name.split(" ")[0], // first word only for brevity
    value: r.revenue ?? 0,
    fill: COLORS[i],
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <GitCompare className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold text-fg-text">Comparison Explorer</h1>
          <p className="text-fg-muted text-sm">Benchmark multiple companies or perform year-over-year report diffs</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6 border-b border-fg pb-2">
        {(["benchmark", "diff"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              mode === m ? "text-blue-400 border-b-2 border-blue-400" : "text-fg-muted hover:text-fg-text"
            }`}
          >
            {m === "benchmark" ? "Cross-Company Benchmarking" : "Year-over-Year Document Diff"}
          </button>
        ))}
      </div>

      {/* ── Benchmarking Mode ── */}
      {mode === "benchmark" && (
        <>
          {/* Company selector */}
          <div className="glass-card p-5 mb-6">
            <h2 className="text-sm font-semibold text-fg-text mb-3">Select Companies ({selected.length}/4)</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {selected.map((id, idx) => {
                const co = companies.find((c) => c.company_id === id);
                return co ? (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border"
                    style={{ borderColor: COLORS[idx] + "55", background: COLORS[idx] + "18", color: COLORS[idx] }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[idx] }} />
                    {co.name}
                    <button onClick={() => toggle(id)}><X className="w-3 h-3" /></button>
                  </span>
                ) : null;
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {companies.map((c) => (
                <button
                  key={c.company_id}
                  onClick={() => toggle(c.company_id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    selected.includes(c.company_id)
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "border-fg text-fg-muted hover:border-blue-500/30 hover:text-blue-400"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <button
              onClick={runCompare}
              disabled={selected.length < 2 || loading}
              className="btn-primary mt-4 flex items-center gap-2 disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
              Compare Selected
            </button>
          </div>

          {fetched && results.length > 0 && (
            <>
              {/* Score cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {results.map((r, i) => (
                  <div key={r.company_id} className="glass-card p-5" style={{ borderTopColor: COLORS[i], borderTopWidth: 2 }}>
                    <div className="text-sm font-semibold text-fg-text mb-1 truncate" title={r.name}>{r.name}</div>
                    {r.sector && <div className="text-[10px] text-fg-muted mb-3">{r.sector}{r.year ? ` · FY${r.year}` : ""}</div>}
                    <div className="flex flex-col gap-3">
                      {[
                        { label: "Health", score: r.health_score, mode: "health" as const },
                        { label: "Fraud Risk", score: r.fraud_score, mode: "fraud" as const },
                        { label: "Risk", score: r.risk_score, mode: "risk" as const },
                        { label: "ESG", score: r.esg_score, mode: "health" as const },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center justify-between">
                          <span className="text-xs text-fg-muted">{s.label}</span>
                          <span className={`text-sm font-bold font-mono ${
                            s.mode === "fraud" || s.mode === "risk" ? fraudColor(s.score) : scoreColor(s.score)
                          }`}>
                            {s.score != null ? `${Math.round(s.score)}` : "—"}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-fg flex flex-col gap-1">
                        {[
                          { l: "Revenue", v: formatNumber(r.revenue) },
                          { l: "Margin", v: r.profit_margin != null ? `${r.profit_margin.toFixed(1)}%` : "—" },
                          { l: "D/E", v: r.debt_to_equity?.toFixed(2) ?? "—" },
                          { l: "ROE", v: r.roe != null ? `${r.roe.toFixed(1)}%` : "—" },
                        ].map((m) => (
                          <div key={m.l} className="flex items-center justify-between text-xs">
                            <span className="text-fg-muted">{m.l}</span>
                            <span className="text-fg-text font-mono">{m.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ════════════════════════════════════════
                  DETAILED METRICS COMPARISON TABLE
              ════════════════════════════════════════ */}
              <div className="glass-card mb-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-fg">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-fg-text text-sm">Detailed Metrics Comparison</h3>
                  <span className="ml-auto text-[10px] text-fg-muted font-mono flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" /> = Best in class
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    {/* Column headers */}
                    <thead>
                      <tr className="border-b border-fg/20">
                        <th className="py-3 px-5 text-left text-xs font-bold text-fg-muted uppercase tracking-wider w-44 sticky left-0 bg-[#0f1629]">
                          Metric
                        </th>
                        {results.map((r, i) => (
                          <th key={r.company_id} className="py-3 px-4 text-center min-w-[150px]">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: COLORS[i] }}
                              />
                              <span className="text-xs font-bold text-fg-text leading-tight">{r.name}</span>
                              {r.sector && <span className="text-[9px] text-fg-muted">{r.sector}</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {METRIC_DEFS.map((def, rowIdx) => {
                        const values = results.map((r) => r[def.key] as number | undefined);
                        const hasAny = values.some((v) => v != null);
                        // For mini bars, compute max/min across companies
                        const nonNull = values.filter((v) => v != null) as number[];
                        const absMax = nonNull.length ? Math.max(...nonNull.map(Math.abs)) : 1;

                        return (
                          <tr
                            key={def.key}
                            className={`border-b border-fg/10 transition-colors hover:bg-white/[0.015] ${
                              rowIdx % 2 === 0 ? "bg-transparent" : "bg-white/[0.008]"
                            }`}
                          >
                            {/* Metric label */}
                            <td className="py-3.5 px-5 sticky left-0 bg-inherit">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-fg-text">{def.label}</span>
                                <span className="text-[10px] text-fg-muted mt-0.5">{def.description}</span>
                              </div>
                            </td>

                            {/* Per-company value cells */}
                            {results.map((r, colIdx) => {
                              const val = r[def.key] as number | undefined;
                              const isWinner = hasAny && metricWinners[def.key] === colIdx;
                              const formatted = val != null ? def.format(val) : null;

                              // Color coding based on metric type
                              let textColor = "text-fg-text";
                              if (isWinner) textColor = "text-emerald-400";
                              else if (def.key === "fraud_score" && val != null) {
                                textColor = val > 60 ? "text-rose-400" : val > 35 ? "text-amber-400" : "text-emerald-400";
                              } else if (def.key === "health_score" && val != null) {
                                textColor = val >= 70 ? "text-emerald-400" : val >= 45 ? "text-amber-400" : "text-rose-400";
                              } else if (def.key === "revenue_growth" && val != null) {
                                textColor = val > 0 ? "text-emerald-400" : "text-rose-400";
                              }

                              // Mini bar value: for "lower is better" metrics, invert the bar
                              const barVal = val != null
                                ? (def.higherBetter ? Math.abs(val) : absMax - Math.abs(val) + Math.min(...nonNull.map(Math.abs)))
                                : 0;

                              return (
                                <td key={r.company_id} className="py-3.5 px-4 text-center">
                                  {val != null ? (
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div className="flex items-center justify-center gap-1">
                                        {def.key === "revenue_growth" && <TrendIcon pct={val} />}
                                        <span className={`font-mono font-bold text-sm ${textColor}`}>
                                          {formatted}
                                        </span>
                                        {isWinner && <WinnerBadge />}
                                      </div>
                                      <MiniBar
                                        value={Math.abs(val)}
                                        max={absMax}
                                        color={isWinner ? COLORS[colIdx] : COLORS[colIdx] + "70"}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-fg-muted/40 text-xs font-mono">N/A</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend footer */}
                <div className="px-6 py-3 border-t border-fg/10 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    {results.map((r, i) => (
                      <div key={r.company_id} className="flex items-center gap-1.5 text-xs text-fg-muted">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                        {r.name}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-fg-muted italic">
                    FinGuard AI — scores computed from uploaded annual reports via Nebius AI. Not financial advice.
                  </p>
                </div>
              </div>

              {/* Revenue bar chart + Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue bar */}
                {results.some(r => r.revenue) && (
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-fg-text mb-4">Revenue Comparison (₹ Cr)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={revenueBarData} barSize={36}>
                        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip
                          contentStyle={{ background: "#0f1629", border: "1px solid #1e293b", borderRadius: 8 }}
                          formatter={(v) => [formatNumber(v as number), "Revenue"]}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {revenueBarData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Radar chart */}
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-fg-text mb-4">Risk & Health Radar</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e293b", borderRadius: 8 }} />
                      <Legend iconSize={8} />
                      {results.map((r, i) => (
                        <Radar
                          key={r.company_id}
                          name={r.name}
                          dataKey={r.name}
                          stroke={COLORS[i]}
                          fill={COLORS[i]}
                          fillOpacity={0.12}
                          strokeWidth={2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Document Diff Mode ── */}
      {mode === "diff" && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-fg-text mb-4">Year-over-Year Document Diff</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-fg-muted block mb-1">Company</label>
                <select
                  value={diffCompanyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="fg-input text-sm w-full"
                >
                  <option value="">Select Company...</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-fg-muted block mb-1">Year From</label>
                <select
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : "")}
                  disabled={companyReports.length < 2}
                  className="fg-input text-sm w-full disabled:opacity-40"
                >
                  <option value="">Select Year...</option>
                  {companyReports.map((r) => (
                    <option key={r.report_id} value={r.year}>{r.year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-fg-muted block mb-1">Year To</label>
                <select
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : "")}
                  disabled={companyReports.length < 2}
                  className="fg-input text-sm w-full disabled:opacity-40"
                >
                  <option value="">Select Year...</option>
                  {companyReports.map((r) => (
                    <option key={r.report_id} value={r.year}>{r.year}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={runDocumentDiff}
              disabled={!diffCompanyId || !yearFrom || !yearTo || diffLoading}
              className="btn-primary mt-5 flex items-center gap-2 disabled:opacity-40 text-sm"
            >
              {diffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Compare Documents
            </button>
          </div>

          {diffLoading && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
              <p className="text-xs text-fg-muted">Analyzing document shifts and extracting numeric trends...</p>
            </div>
          )}

          {diffResult && !diffLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="glass-card p-5">
                  <h3 className="text-sm font-bold text-fg-text mb-4 border-b border-white/5 pb-2">Financial Statement Diff</h3>
                  <div className="space-y-4">
                    {Object.entries(diffResult.numeric_diff || {}).map(([key, item]: [string, any]) => {
                      const pct = item.pct_change;
                      const hasChange = pct != null;
                      const showGreen = key === "total_debt" ? pct <= 0 : pct >= 0;
                      const finalColor = showGreen ? "text-emerald-400" : "text-rose-400";
                      return (
                        <div key={key} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col gap-2">
                          <span className="text-xs font-bold text-fg-text uppercase tracking-wider">{item.label}</span>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-mono text-fg-muted">{yearFrom}: {formatNumber(item.from_val)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                            <span className="font-mono text-fg-text font-bold">{yearTo}: {formatNumber(item.to_val)}</span>
                          </div>
                          {hasChange ? (
                            <div className={`text-xs font-mono font-bold self-end mt-1 ${finalColor}`}>
                              {pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`} YoY
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-fg-muted self-end mt-1">—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="glass-card p-5">
                  <h3 className="text-sm font-bold text-fg-text mb-3">MD&A Language Diff Summary</h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">{diffResult.summary || "No textual analysis shifts recorded."}</p>
                </div>

                {diffResult.risk_signals && diffResult.risk_signals.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-fg-text mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Language-Shift Red Flags
                    </h3>
                    <div className="space-y-2">
                      {diffResult.risk_signals.map((sig: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400 leading-relaxed font-sans">
                          {typeof sig === "string" ? sig : sig.description || JSON.stringify(sig)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diffResult.softened_phrases && diffResult.softened_phrases.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-fg-text mb-3">Softened Language / Disclosure Shifts</h3>
                    <div className="space-y-3">
                      {diffResult.softened_phrases.map((pair: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs flex flex-col gap-1.5">
                          <div className="text-rose-400">
                            <span className="font-bold text-[10px] uppercase text-rose-500/80 block mb-0.5">Original ({yearFrom})</span>
                            &ldquo;{pair.from || pair.original || pair.from_text}&rdquo;
                          </div>
                          <div className="text-emerald-400 border-t border-white/5 pt-1.5 mt-0.5">
                            <span className="font-bold text-[10px] uppercase text-emerald-500/80 block mb-0.5">Modified ({yearTo})</span>
                            &ldquo;{pair.to || pair.modified || pair.to_text}&rdquo;
                          </div>
                          {pair.risk_signal && (
                            <div className="text-amber-400 border-t border-white/5 pt-1 mt-1 text-[10px] font-medium italic">
                              Signal: {pair.risk_signal}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
