"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { analysis as analysisApi, exportReport, annotations as annotationsApi, AnalysisResult, Annotation } from "@/lib/api";
import { ScoreRing, ExplainabilityPanel, FraudAlert, FinancialChart, ESGPanel, LiveFeedPanel } from "@/components";
import { fraudColor, scoreColor, formatNumber, formatPct, outlookColor } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  MessageSquare, Download, RefreshCw, TrendingUp, AlertTriangle,
  Leaf, DollarSign, Activity, CheckCircle, XCircle, Loader2, BarChart3, Search, Calendar,
} from "lucide-react";

// Feature #2: Horizontal Block-Bar Gauge
function HealthBar({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const blocksCount = Math.round(score / 10);
  const filled = "█".repeat(blocksCount);
  const empty = "░".repeat(10 - blocksCount);
  return (
    <div className="flex flex-col items-center mt-2 font-mono">
      <div className="text-sm font-semibold text-emerald-400 select-none tracking-widest">
        {filled}
        <span className="text-white/25">{empty}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit = "", change }: {
  label: string; value: number | null | undefined; unit?: string; change?: number;
}) {
  const displayVal = value != null ? `${formatNumber(value)}${unit ? " " + unit : ""}` : "N/A";
  return (
    <div className="glass-card p-4">
      <div className="text-xs text-fg-muted mb-1">{label}</div>
      <div className="text-xl font-bold font-mono text-fg-text">{displayVal}</div>
      {change != null && (
        <div className={`text-xs mt-1 ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
          {formatPct(change)} YoY
        </div>
      )}
    </div>
  );
}

function AgentBadge({ name, className }: { name: string; className: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${className}`}>
      {name}
    </span>
  );
}

// Feature #11: Confidence Meter Card
function ConfidenceMeter({ score, breakdown }: { score: number | undefined; breakdown: any }) {
  if (score == null) return null;
  return (
    <div className="glass-card p-5 mt-4 w-full border border-white/5">
      <h4 className="text-xs font-bold text-fg-text uppercase tracking-wider mb-3">Confidence Meter</h4>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-fg-muted">Verification Confidence</span>
        <span className="text-lg font-bold font-mono text-blue-400">{score}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden border border-slate-700">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-1000" 
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <div className="space-y-2 text-xs text-fg-muted">
        <div className="flex justify-between">
          <span>OCR Data Quality</span>
          <span className="font-semibold text-fg-text">{breakdown?.ocr_quality ?? 85}%</span>
        </div>
        <div className="flex justify-between">
          <span>RAG Citations Found</span>
          <span className="font-semibold text-fg-text">{breakdown?.citations_count ?? 0} refs</span>
        </div>
        <div className="flex justify-between">
          <span>Document Coverage</span>
          <span className="font-semibold text-fg-text">{breakdown?.section_coverage ?? 90}%</span>
        </div>
      </div>
    </div>
  );
}

// Feature #12: Company Timeline
function CompanyTimeline({ history }: { history: any[] }) {
  if (!history || history.length === 0) return null;
  return (
    <div className="glass-card p-6 mt-6">
      <h3 className="text-sm font-bold text-fg-text mb-6">Historical Growth Timeline</h3>
      <div className="relative border-l border-slate-800 ml-4 space-y-8 pb-4">
        {history.map((h, i) => (
          <div key={i} className="relative pl-6">
            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border border-slate-900 shadow-md"></div>
            <div className="glass-card p-4 transition-all hover:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-sm font-bold text-blue-400 font-mono">{h.year}</span>
                <span className="text-xs text-fg-muted font-mono">Health Score: {Math.round(h.health_score ?? 50)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-fg-muted block">Revenue</span>
                  <span className="font-bold text-fg-text font-mono">
                    {h.revenue != null ? `${formatNumber(h.revenue)} Cr` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-fg-muted block">Net Profit</span>
                  <span className="font-bold text-fg-text font-mono">
                    {h.net_profit != null ? `${formatNumber(h.net_profit)} Cr` : "—"}
                  </span>
                </div>
              </div>
              {h.auditor_name && (
                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-fg-muted flex justify-between">
                  <span>Auditor: <strong className="text-fg-text">{h.auditor_name}</strong></span>
                  {h.auditor_changed && <span className="text-red-400 font-semibold font-mono">⚠ Auditor Changed</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Feature #7: Boardroom Summary Card
function BoardroomSummaryBriefing({ summary }: { summary: string | undefined }) {
  if (!summary) return null;
  return (
    <div className="glass-card p-5 bg-gradient-to-r from-blue-950/15 to-indigo-950/15 border-blue-500/20 mb-6">
      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5" />
        Boardroom Summary Briefing
      </h3>
      <p className="text-sm font-medium text-slate-200 leading-relaxed font-sans">{summary}</p>
    </div>
  );
}

// Feature #5: Auditor Change Warning Banner
function AuditorChangeBanner({ alerts }: { alerts: any }) {
  const auditorChangeFlag = alerts?.flags?.find((f: any) => f.rule === "auditor_change");
  if (!auditorChangeFlag) return null;
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex gap-2.5 items-center mb-6 animate-pulse">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div>
        <span className="font-bold">Auditor Change Detected:</span> {auditorChangeFlag.detail}
      </div>
    </div>
  );
}

// Feature #13: Red Flag Counter
function RedFlagCounter({ alerts }: { alerts: any }) {
  if (!alerts) return null;
  
  const financialCount = alerts.counts_by_category?.financial ?? 0;
  const governanceCount = alerts.counts_by_category?.governance ?? 0;
  const auditorCount = alerts.counts_by_category?.auditor ?? 0;
  
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className={`p-4 rounded-xl border flex flex-col items-center bg-slate-900/40 ${financialCount > 0 ? "border-red-500/30" : "border-slate-800"}`}>
        <span className="text-2xl font-black text-red-500 font-mono">{financialCount}</span>
        <span className="text-[10px] uppercase font-bold text-fg-muted tracking-wider mt-1 text-center">Financial Red Flags</span>
      </div>
      <div className={`p-4 rounded-xl border flex flex-col items-center bg-slate-900/40 ${governanceCount > 0 ? "border-amber-500/30" : "border-slate-800"}`}>
        <span className="text-2xl font-black text-amber-500 font-mono">{governanceCount}</span>
        <span className="text-[10px] uppercase font-bold text-fg-muted tracking-wider mt-1 text-center">Governance Red Flags</span>
      </div>
      <div className={`p-4 rounded-xl border flex flex-col items-center bg-slate-900/40 ${auditorCount > 0 ? "border-red-500/30" : "border-slate-800"}`}>
        <span className="text-2xl font-black text-red-400 font-mono">{auditorCount}</span>
        <span className="text-[10px] uppercase font-bold text-fg-muted tracking-wider mt-1 text-center">Auditor Red Flags</span>
      </div>
    </div>
  );
}

// Feature #15: Investment Committee Panel
function InvestmentCommitteePanel({ committee }: { committee: any }) {
  if (!committee) return null;

  const renderCase = (title: string, data: any, type: "bull" | "bear" | "neutral") => {
    const isBull = type === "bull";
    const isBear = type === "bear";
    
    let bgColor = "bg-blue-500/5 border-blue-500/10";
    let textColor = "text-blue-400";
    let dotColor = "bg-blue-400";

    if (isBull) {
      bgColor = "bg-emerald-500/5 border-emerald-500/10";
      textColor = "text-emerald-400";
      dotColor = "bg-emerald-400";
    } else if (isBear) {
      bgColor = "bg-red-500/5 border-red-500/10";
      textColor = "text-red-400";
      dotColor = "bg-red-400";
    }

    let thesis: string | null = null;
    let points: string[] = [];

    if (data) {
      if (typeof data === "string") {
        points = [data];
      } else if (Array.isArray(data)) {
        points = data.map(String);
      } else if (typeof data === "object") {
        thesis = data.thesis || null;
        // Check for specific lists like key_drivers or key_risks, or fall back to any array property
        const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
        if (arrayKey) {
          points = data[arrayKey].map(String);
        } else if (data.points && Array.isArray(data.points)) {
          points = data.points.map(String);
        }
      }
    }

    return (
      <div className={`p-4 rounded-xl border ${bgColor}`}>
        <h4 className={`text-xs uppercase font-extrabold tracking-wider ${textColor} mb-3 flex items-center gap-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
          {title}
        </h4>
        {thesis && (
          <p className="text-xs text-slate-400 italic mb-3 leading-relaxed font-sans border-b border-white/5 pb-2">
            {thesis}
          </p>
        )}
        {points.length > 0 && (
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc pl-4 font-sans">
            {points.map((point: string, idx: number) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card p-6 mt-6">
      <h3 className="text-sm font-bold text-fg-text mb-4 uppercase tracking-widest border-b border-white/5 pb-2">Investment Committee panel</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderCase("Bull Case", committee.bull, "bull")}
        {renderCase("Neutral View", committee.neutral, "neutral")}
        {renderCase("Bear Case", committee.bear, "bear")}
      </div>
    </div>
  );
}

// Feature #9: Smart Search Explorer
function SmartSearchExplorer({ reportId }: { reportId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await analysisApi.search(reportId, query);
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-fg-text mb-2">Smart Search Explorer</h3>
        <p className="text-xs text-fg-muted mb-4">Jump directly to pages containing key information. Searches embeddings locally.</p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search auditor, related parties, borrowings..."
            className="fg-input text-sm flex-1"
          />
          <button type="submit" className="btn-primary text-sm px-5 flex items-center gap-2" disabled={searching}>
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {searching && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}

      {searched && !searching && results.length === 0 && (
        <div className="glass-card p-8 text-center text-sm text-fg-muted">
          No matches found. Try other keywords.
        </div>
      )}

      {results.length > 0 && !searching && (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Matching Sections ({results.length})</h4>
          {results.map((res, idx) => (
            <div key={idx} className="glass-card p-5 hover:bg-white/[0.03] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  Page {res.page}
                </span>
                <span className="text-[10px] text-fg-muted font-mono">Distance: {res.distance}</span>
              </div>
              <p className="text-sm text-slate-300 font-sans italic leading-relaxed">
                &ldquo;{res.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Feature #23: Collaborative Annotations Panel
function AnnotationsPanel({ reportId }: { reportId: string }) {
  const [list, setList] = useState<Annotation[]>([]);
  const [comment, setComment] = useState("");
  const [targetRef, setTargetRef] = useState("General Comment");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await annotationsApi.get(reportId);
      setList(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reportId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await annotationsApi.create(reportId, {
        target_ref: targetRef,
        comment: comment.trim(),
        target_type: "citation",
      });
      setComment("");
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      {/* Left: post comment */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-fg-text mb-4">Add Auditor Annotation</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-fg-muted mb-1 block">Context Reference</label>
            <select className="fg-input" value={targetRef} onChange={(e) => setTargetRef(e.target.value)}>
              <option value="General Comment">General Comment</option>
              <option value="Revenue Metric">Revenue Metric</option>
              <option value="Fraud Citation">Fraud Citation</option>
              <option value="Health Score">Health Score</option>
              <option value="Auditor Warning">Auditor Warning</option>
              <option value="ESG Governance">ESG Governance</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-fg-muted mb-1 block">Your Annotation Comment</label>
            <textarea
              className="fg-input min-h-[100px] text-sm"
              placeholder="e.g. Need to verify related-party transaction values with secondary sources..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={submitting || !comment} className="btn-primary text-sm flex items-center gap-2 justify-center">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Post Annotation
          </button>
        </form>
      </div>

      {/* Right: annotations list */}
      <div className="lg:col-span-2 glass-card p-5">
        <h3 className="text-sm font-bold text-fg-text mb-4">Collaborative Annotations Feed ({list.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-fg-muted" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-fg-muted mx-auto mb-2" />
            <p className="text-sm text-fg-muted">No annotations posted yet. Start the thread!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {list.map((ann) => (
              <div key={ann.annotation_id} className="p-4 rounded-xl bg-fg-surface-2 border border-fg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400">{ann.author}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-fg-muted font-mono uppercase">
                      {ann.target_ref}
                    </span>
                  </div>
                  <span className="text-[10px] text-fg-muted font-mono">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-300 font-sans leading-relaxed">{ann.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Scenario Sensitivity Simulator Component
function ScenarioSimulator({ financials, ratios }: { financials: any; ratios: any }) {
  const [revenueChange, setRevenueChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  const [debtChange, setDebtChange] = useState(0);

  const baseRevenue = financials?.revenue ?? 0;
  const baseNetProfit = financials?.net_profit ?? 0;
  const baseDebt = financials?.total_debt ?? 0;
  const baseEquity = financials?.total_equity ?? 0;
  const baseAssets = financials?.total_assets ?? 0;

  const simRevenue = baseRevenue * (1 + revenueChange / 100);
  const simDebt = baseDebt * (1 + debtChange / 100);
  
  const baseExpenses = baseRevenue - baseNetProfit;
  const simExpenses = baseExpenses * (1 + expenseChange / 100);
  const simNetProfit = simRevenue - simExpenses;

  const profitDelta = simNetProfit - baseNetProfit;
  const simEquity = Math.max(1, baseEquity + profitDelta);
  const simAssets = Math.max(1, baseAssets + profitDelta + (simDebt - baseDebt));

  const simROE = simEquity > 0 ? (simNetProfit / simEquity) * 100 : 0;
  const simDE = simEquity > 0 ? simDebt / simEquity : 0;
  const simProfitMargin = simRevenue > 0 ? (simNetProfit / simRevenue) * 100 : 0;

  const baseCR = ratios?.current_ratio ?? 1.5;
  const estCL = baseDebt > 0 ? baseDebt * 0.5 : baseAssets * 0.2;
  const estCA = baseCR * estCL;
  const simCA = Math.max(0, estCA + profitDelta);
  const simCR = estCL > 0 ? simCA / estCL : 0;

  const getSimHealth = () => {
    let score = 50;
    score += revenueChange * 0.2;
    if (simProfitMargin > 15) score += 15;
    else if (simProfitMargin < 5) score -= 15;
    if (simDE > 2) score -= 20;
    else if (simDE < 0.5) score += 10;
    if (simCR < 1.0) score -= 15;
    else if (simCR > 1.8) score += 10;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const simHealth = getSimHealth();

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-fg-text">Scenario Sensitivity Simulator</h3>
          <p className="text-xs text-fg-muted">Simulate operational changes and estimate their impact on financial health and solvency ratios.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <span className="text-xs text-fg-muted font-medium">Estimated Health Score</span>
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-sm font-bold font-mono text-blue-400">
            {simHealth} / 100
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6 border-r border-white/5 pr-0 lg:pr-8">
          <h4 className="text-xs font-bold uppercase text-blue-400 tracking-wider">Adjustment Controls</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-fg-muted font-medium">Revenue Change</span>
              <span className={`font-bold font-mono ${revenueChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {revenueChange >= 0 ? "+" : ""}{revenueChange}%
              </span>
            </div>
            <input 
              type="range" 
              min="-50" 
              max="50" 
              value={revenueChange} 
              onChange={(e) => setRevenueChange(Number(e.target.value))} 
              className="w-full accent-blue-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-fg-muted font-mono">
              <span>-50%</span>
              <span>Baseline</span>
              <span>+50%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-fg-muted font-medium">Operating Expense Change</span>
              <span className={`font-bold font-mono ${expenseChange <= 0 ? "text-green-400" : "text-red-400"}`}>
                {expenseChange >= 0 ? "+" : ""}{expenseChange}%
              </span>
            </div>
            <input 
              type="range" 
              min="-50" 
              max="50" 
              value={expenseChange} 
              onChange={(e) => setExpenseChange(Number(e.target.value))} 
              className="w-full accent-blue-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-fg-muted font-mono">
              <span>-50% (Cut)</span>
              <span>Baseline</span>
              <span>+50% (Rise)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-fg-muted font-medium">Total Debt Change</span>
              <span className={`font-bold font-mono ${debtChange <= 0 ? "text-green-400" : "text-red-400"}`}>
                {debtChange >= 0 ? "+" : ""}{debtChange}%
              </span>
            </div>
            <input 
              type="range" 
              min="-50" 
              max="100" 
              value={debtChange} 
              onChange={(e) => setDebtChange(Number(e.target.value))} 
              className="w-full accent-blue-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-fg-muted font-mono">
              <span>-50% (Paydown)</span>
              <span>Baseline</span>
              <span>+100% (Lever)</span>
            </div>
          </div>
          
          <button 
            onClick={() => { setRevenueChange(0); setExpenseChange(0); setDebtChange(0); }} 
            className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-xs font-semibold rounded-lg transition-colors border border-white/5"
          >
            Reset to Baseline
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-xs font-bold uppercase text-blue-400 tracking-wider">Simulated Financials</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-fg-muted tracking-wider block mb-1">Simulated Revenue</span>
              <span className="text-lg font-bold font-mono text-fg-text">{formatNumber(simRevenue)} Cr</span>
              <span className={`text-[10px] block mt-1 font-mono ${revenueChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {revenueChange >= 0 ? "↑" : "↓"} {Math.abs(revenueChange)}% vs base
              </span>
            </div>

            <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-fg-muted tracking-wider block mb-1">Simulated Net Profit</span>
              <span className={`text-lg font-bold font-mono ${simNetProfit >= 0 ? "text-fg-text" : "text-red-400"}`}>{formatNumber(simNetProfit)} Cr</span>
              <span className={`text-[10px] block mt-1 font-mono ${profitDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {profitDelta >= 0 ? "↑" : "↓"} {formatNumber(Math.abs(profitDelta))} Cr delta
              </span>
            </div>

            <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-fg-muted tracking-wider block mb-1">Simulated Leverage</span>
              <span className="text-lg font-bold font-mono text-fg-text">{formatNumber(simDebt)} Cr</span>
              <span className={`text-[10px] block mt-1 font-mono ${debtChange <= 0 ? "text-green-400" : "text-red-400"}`}>
                {debtChange >= 0 ? "↑" : "↓"} {Math.abs(debtChange)}% vs base
              </span>
            </div>
          </div>

          <h4 className="text-xs font-bold uppercase text-blue-400 tracking-wider pt-2">Simulated Health Indicators</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <span className="text-xs font-bold text-fg-text border-b border-white/5 pb-1">Solvency & Return</span>
              <div className="flex justify-between text-xs">
                <span className="text-fg-muted">D/E Ratio</span>
                <div className="font-mono flex gap-2">
                  <span className="text-fg-muted line-through">{formatNumber(ratios?.debt_to_equity ?? 0)}</span>
                  <span className={`font-bold ${simDE > 2.0 ? "text-red-400" : "text-fg-text"}`}>{formatNumber(simDE)}</span>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-fg-muted">ROE</span>
                <div className="font-mono flex gap-2">
                  <span className="text-fg-muted line-through">{formatPct(ratios?.roe ?? 0)}</span>
                  <span className={`font-bold ${simROE >= 15 ? "text-green-400" : (simROE < 5 ? "text-red-400" : "text-fg-text")}`}>{formatPct(simROE)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <span className="text-xs font-bold text-fg-text border-b border-white/5 pb-1">Liquidity & Margins</span>
              <div className="flex justify-between text-xs">
                <span className="text-fg-muted">Current Ratio</span>
                <div className="font-mono flex gap-2">
                  <span className="text-fg-muted line-through">{formatNumber(baseCR)}</span>
                  <span className={`font-bold ${simCR < 1.0 ? "text-red-400" : "text-fg-text"}`}>{formatNumber(simCR)}</span>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-fg-muted">Profit Margin</span>
                <div className="font-mono flex gap-2">
                  <span className="text-fg-muted line-through">{formatPct(ratios?.profit_margin ?? 0)}</span>
                  <span className={`font-bold ${simProfitMargin < 5 ? "text-red-400" : "text-fg-text"}`}>{formatPct(simProfitMargin)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "fraud" | "esg" | "forecast" | "simulation" | "search" | "annotations">("overview");

  useEffect(() => {
    Promise.all([
      analysisApi.get(reportId),
      analysisApi.history(reportId).catch(() => []),
    ]).then(([a, h]) => {
      setData(a);
      setHistory(h);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [reportId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportReport(reportId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FinGuard_Analysis_${reportId}.pdf`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    await analysisApi.recompute(reportId).catch(() => {});
    setTimeout(() => { setRecomputing(false); window.location.reload(); }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!data || data.status !== "analyzed") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-fg-text mb-2">Analysis in Progress</h2>
        <p className="text-fg-muted mb-6">Status: <span className="text-blue-400">{data?.status || "processing"}</span></p>
        <button onClick={() => window.location.reload()} className="btn-ghost text-sm">
          Refresh
        </button>
      </div>
    );
  }

  // Chart data
  const subScores = [
    { name: "Profitability", value: data.profitability_score ?? 50, fill: "#3b82f6" },
    { name: "Liquidity", value: data.liquidity_score ?? 50, fill: "#10b981" },
    { name: "Solvency", value: data.solvency_score ?? 50, fill: "#f59e0b" },
    { name: "Growth", value: data.growth_score ?? 50, fill: "#8b5cf6" },
  ];

  const esgScores = [
    { name: "Environmental", value: data.esg_environmental ?? 50, fill: "#10b981" },
    { name: "Social", value: data.esg_social ?? 50, fill: "#3b82f6" },
    { name: "Governance", value: data.esg_governance ?? 50, fill: "#8b5cf6" },
  ];

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "fraud", label: "Fraud & Risk" },
    { id: "esg", label: "ESG" },
    { id: "forecast", label: "History & Timeline" },
    { id: "simulation", label: "Scenario Simulator" },
    { id: "search", label: "Smart Search" },
    { id: "annotations", label: "Annotations (Collaborative)" },
  ] as const;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-fg-text">Analysis Report</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-fg-muted font-mono">ID: {reportId.slice(0, 8)}…</span>
            {data.self_critique_passed != null && (
              <span className={`text-xs flex items-center gap-1 ${data.self_critique_passed ? "text-green-400" : "text-amber-400"}`}>
                {data.self_critique_passed
                  ? <><CheckCircle className="w-3 h-3" /> Self-critique passed</>
                  : <><AlertTriangle className="w-3 h-3" /> Reviewed by self-critique</>}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/chat/${reportId}`} className="btn-ghost text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Chat
          </Link>
          <button
            id="recompute-btn"
            onClick={handleRecompute}
            disabled={recomputing}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${recomputing ? "animate-spin" : ""}`} />
            Recompute
          </button>
          <button
            id="export-btn"
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting…" : "Export Investment Memo"}
          </button>
        </div>
      </div>

      {/* Auditor change alert banner (Feature #5) */}
      <AuditorChangeBanner alerts={data.local_fraud_alerts} />

      {/* Score Rings (Feature #2 health bar below health score) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 flex flex-col items-center">
          <ScoreRing score={data.health_score} label="Health Score" mode="health"
            sublabel={data.health_score != null ? (data.health_score >= 70 ? "Strong" : data.health_score >= 45 ? "Moderate" : "Weak") : undefined} />
          <HealthBar score={data.health_score} />
        </div>
        <div className="glass-card p-6 flex flex-col items-center">
          <ScoreRing score={data.fraud_score} label="Fraud Risk" mode="fraud"
            sublabel={data.fraud_score != null ? (data.fraud_score <= 30 ? "Low Risk" : data.fraud_score <= 60 ? "Moderate" : "High Risk") : undefined} />
        </div>
        <div className="glass-card p-6 flex flex-col items-center">
          <ScoreRing score={data.risk_score} label="Risk Score" mode="risk"
            sublabel={data.risk_score != null ? (data.risk_score <= 30 ? "Low" : data.risk_score <= 60 ? "Moderate" : "High") : undefined} />
        </div>
        <div className="glass-card p-6 flex flex-col items-center">
          <ScoreRing score={data.esg_score} label="ESG Score" mode="health"
            sublabel={data.esg_score != null ? (data.esg_score >= 70 ? "Strong" : data.esg_score >= 45 ? "Adequate" : "Weak") : undefined} />
        </div>
      </div>

      {/* Boardroom Summary generator (Feature #7) */}
      <BoardroomSummaryBriefing summary={data.boardroom_summary} />

      {/* Investment outlook */}
      <div className={`glass-card p-4 mb-6 flex items-center gap-4`}>
        <TrendingUp className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <span className="text-sm text-fg-muted">Investment Outlook: </span>
          <span className={`text-sm font-bold ${outlookColor(data.investment_outlook)}`}>
            {data.investment_outlook || "Neutral"}
          </span>
        </div>
        <div className="ml-auto text-xs text-fg-muted">
          Not financial advice — for review only
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-fg pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-fg-muted hover:text-fg-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: financials */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Key metrics */}
            <div>
              <h3 className="text-sm font-semibold text-fg-text mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                Key Financial Metrics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard label="Revenue" value={data.financials.revenue} />
                <MetricCard label="Net Profit" value={data.financials.net_profit} />
                <MetricCard label="EBITDA" value={data.financials.ebitda} />
                <MetricCard label="Total Debt" value={data.financials.total_debt} />
                <MetricCard label="Cash & Equiv." value={data.financials.cash_and_equivalents} />
                <MetricCard label="Operating CF" value={data.financials.operating_cash_flow} />
              </div>
            </div>

            {/* Feature #1: Ratios grid containing all 8 ratios */}
            <div>
              <h3 className="text-sm font-semibold text-fg-text mb-3">Financial Ratio Engine</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="ROE" value={data.ratios.roe} unit="%" />
                <MetricCard label="ROA" value={data.ratios.roa} unit="%" />
                <MetricCard label="Debt/Equity" value={data.ratios.debt_to_equity} />
                <MetricCard label="Current Ratio" value={data.ratios.current_ratio} />
                <MetricCard label="Quick Ratio" value={data.ratios.quick_ratio} />
                <MetricCard label="Interest Coverage" value={data.ratios.interest_coverage} />
                <MetricCard label="Profit Margin" value={data.ratios.profit_margin} unit="%" />
                <MetricCard label="Operating Margin" value={data.ratios.operating_margin} unit="%" />
              </div>
            </div>

            {/* Sub-score chart */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-fg-text mb-4">Health Score Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={subScores} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0f1629", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
                    formatter={(v: any) => [`${v}/100`]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {subScores.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Feature #15: Investment Committee Mode Panel */}
            <InvestmentCommitteePanel committee={data.investment_committee} />

            {/* Narrative */}
            {data.executive_summary && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-fg-text mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Executive Summary
                  <AgentBadge name="Financial Analyst" className="border-blue-500/30 text-blue-400 bg-blue-500/5" />
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed">{data.executive_summary}</p>
              </div>
            )}
          </div>

          {/* Right: citations + Confidence Meter */}
          <div>
            <ExplainabilityPanel
              fraudCitations={data.fraud_citations}
              healthCitations={data.health_citations}
              riskCitations={data.risk_citations}
            />
            {/* Feature #11: Confidence Meter */}
            <ConfidenceMeter score={data.confidence_score} breakdown={data.confidence_breakdown} />
          </div>
        </div>
      )}

      {/* Fraud & Risk Tab */}
      {activeTab === "fraud" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              All fraud findings are flagged for review only. They do not constitute legal fraud findings or certified audit opinions.
            </div>

            {/* Feature #13: Red flag counter */}
            <RedFlagCounter alerts={data.local_fraud_alerts} />

            {/* Feature #3: Fraud Rules Engine alerts list using FraudAlert component */}
            {data.local_fraud_alerts?.flags && data.local_fraud_alerts.flags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-fg-text">Detected Warnings & Signals</h3>
                {data.local_fraud_alerts.flags.map((flag, idx) => (
                  <FraudAlert
                    key={idx}
                    finding={{
                      finding: flag.flag,
                      severity: flag.severity,
                      category: flag.category,
                      paragraph: flag.detail,
                      confidence: 90,
                    }}
                    defaultExpanded={idx === 0}
                  />
                ))}
              </div>
            )}

            {data.fraud_narrative && (
              <div className="glass-card p-5 agent-fraud">
                <h3 className="text-sm font-semibold text-fg-text mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Fraud Intelligence Summary
                  <AgentBadge name="Fraud Investigator" className="border-red-500/30 text-red-400 bg-red-500/5" />
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed">{data.fraud_narrative}</p>
              </div>
            )}

            {data.risk_narrative && (
              <div className="glass-card p-5 agent-risk">
                <h3 className="text-sm font-semibold text-fg-text mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Risk Analysis
                  <AgentBadge name="Risk Auditor" className="border-amber-500/30 text-amber-400 bg-amber-500/5" />
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed">{data.risk_narrative}</p>
              </div>
            )}
          </div>

          {/* Right: Feature #4 Risk Heatmap */}
          <div>
            {data.risk_heatmap && (
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-sm font-bold text-fg-text mb-4 uppercase tracking-widest">Risk Heatmap</h3>
                <div className="space-y-4">
                  {[
                    { label: "Debt Risk", value: data.risk_heatmap.debt_risk },
                    { label: "Liquidity Risk", value: data.risk_heatmap.liquidity_risk },
                    { label: "Interest Coverage Risk", value: data.risk_heatmap.interest_coverage_risk },
                    { label: "Fraud Risk", value: data.risk_heatmap.fraud_risk },
                    { label: "Governance Risk", value: data.risk_heatmap.governance_risk },
                  ].map((item, idx) => {
                    const level = item.value?.level || "Low";
                    const color =
                      level === "Critical"
                        ? "text-red-400 bg-red-500/10 border-red-500/20"
                        : level === "High"
                        ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                        : level === "Medium"
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-green-400 bg-green-500/10 border-green-500/20";
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                        <span className="text-xs font-semibold text-fg-text">{item.label}</span>
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${color}`}>
                          {level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <ExplainabilityPanel
                fraudCitations={data.fraud_citations}
                healthCitations={[]}
                riskCitations={data.risk_citations}
              />
            </div>
          </div>
        </div>
      )}

      {/* ESG & News Feed Tab */}
      {activeTab === "esg" && (
        <div className="flex flex-col gap-8 max-w-7xl">
          <ESGPanel analysis={data} />
          
          <div className="mt-4">
            <h2 className="text-xl font-bold text-fg-text mb-2">Live Corporate Intelligence</h2>
            <p className="text-sm text-fg-muted mb-4">
              Real-time regulatory announcements, BSE/NSE filings, and promoter trading activity pulled via Nebius agentic search.
            </p>
            {data.financials?.revenue && data.company_id ? (
              <LiveFeedPanel companyId={data.company_id} />
            ) : null}
          </div>
        </div>
      )}

      {/* History & Timeline Tab */}
      {activeTab === "forecast" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Feature #6: Revenue Trend Charts using FinancialChart component */}
            {history.length > 0 ? (
              <div className="space-y-6">
                <FinancialChart
                  title="Revenue & Net Profit Trends"
                  subtitle="YoY corporate top-line and bottom-line development (Cr)"
                  data={history}
                  type="bar"
                  dataKeys={[
                    { key: "revenue", color: "#3b82f6", label: "Revenue" },
                    { key: "net_profit", color: "#10b981", label: "Net Profit" }
                  ]}
                  height={300}
                />
                <FinancialChart
                  title="Debt Exposure Development"
                  subtitle="Total leverage exposure across fiscal periods (Cr)"
                  data={history}
                  type="area"
                  dataKeys={[
                    { key: "total_debt", color: "#ef4444", label: "Total Debt" }
                  ]}
                  height={250}
                />
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <BarChart3 className="w-10 h-10 text-fg-muted mx-auto mb-3" />
                <p className="text-fg-muted text-sm">Upload more years of reports to see multi-year trend analysis</p>
              </div>
            )}
          </div>

          {/* Right: Feature #12 timeline */}
          <div>
            <CompanyTimeline history={history} />
          </div>
        </div>
      )}

      {/* Scenario Simulator Tab */}
      {activeTab === "simulation" && (
        <ScenarioSimulator financials={data.financials} ratios={data.ratios} />
      )}

      {/* Smart Search Explorer Tab */}
      {activeTab === "search" && (
        <SmartSearchExplorer reportId={reportId} />
      )}

      {/* Annotations Tab */}
      {activeTab === "annotations" && (
        <AnnotationsPanel reportId={reportId} />
      )}
    </div>
  );
}
