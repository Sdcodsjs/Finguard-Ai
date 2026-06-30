"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { reports, watchlist, WatchlistItem, RecentReport } from "@/lib/api";
import {
  Upload, TrendingUp, AlertTriangle, Shield, Eye,
  ArrowRight, BarChart3, Clock, CheckCircle, XCircle, Loader2,
  Zap, Cpu, Brain, Database, MessageSquare, FileText,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      watchlist.get().catch(() => [] as WatchlistItem[]),
      reports.list().catch(() => [] as RecentReport[]),
    ]).then(([wl, reps]) => {
      setWatchlistItems(wl);
      setRecentReports(reps);
      setLoading(false);
    });
  }, []);

  const statusIcon = (status: string) => {
    switch (status) {
      case "analyzed": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "processing": return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const renderHealthGauge = (score: number | undefined) => {
    if (score == null) return <span className="text-fg-muted font-mono">—</span>;
    const blocks = Math.round(score / 10);
    return (
      <div className="font-mono flex items-center gap-1.5 text-xs">
        <span className="text-emerald-400 tracking-wider">{"█".repeat(blocks)}<span className="text-white/10">{"░".repeat(10 - blocks)}</span></span>
        <span className="font-bold text-fg-text">{score}</span>
      </div>
    );
  };

  const renderFraudScore = (score: number | undefined) => {
    if (score == null) return <span className="text-fg-muted font-mono">—</span>;
    const color = score <= 30 ? "text-green-400" : score <= 60 ? "text-amber-400" : "text-red-400";
    return (
      <span className={`font-mono font-bold text-xs ${color}`}>
        {score}%
      </span>
    );
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 animate-fade-in">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg-text">
          Good {new Date().getHours() < 12 ? "morning" : "evening"},{" "}
          <span className="gradient-text">{user?.name?.split(" ")[0] || "Analyst"}</span>
        </h1>
        <p className="text-fg-muted mt-1">
          Enterprise Financial Risk Intelligence Platform
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            href: "/upload",
            icon: Upload,
            label: "Upload Report",
            desc: "Analyze a new annual report",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
          },
          {
            href: "/watchlist",
            icon: Eye,
            label: "Watchlist",
            desc: `${watchlistItems.length} companies tracked`,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
          },
          {
            href: "/compare",
            icon: BarChart3,
            label: "Compare",
            desc: "Side-by-side analysis",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
          },
          {
            href: "/portfolio",
            icon: TrendingUp,
            label: "Portfolio",
            desc: "Aggregate risk view",
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "border-green-500/20",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`glass-card p-5 flex items-center gap-4 group border ${card.border} hover:border-opacity-60 transition-all`}
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-fg-text text-sm">{card.label}</div>
              <div className="text-xs text-fg-muted">{card.desc}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-fg-muted ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Recent Financial Analyses */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-fg-text flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Recent Financial Analyses
              </h2>
              <span className="text-xs text-fg-muted font-mono">
                {recentReports.length} reports total
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-fg/20 rounded-xl bg-fg-surface-2/40">
                <Upload className="w-10 h-10 text-fg-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-fg-text">No reports uploaded yet</p>
                <p className="text-xs text-fg-muted mt-1 mb-4">Upload an annual report to begin analyzing risk.</p>
                <Link href="/upload" className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  Upload First Report
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto animate-fade-in">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-fg/10 text-xs font-bold text-fg-muted uppercase tracking-wider">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">FY</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Health Gauge</th>
                      <th className="py-3 px-4">Fraud Risk</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fg/5 text-sm">
                    {recentReports.map((report) => (
                      <tr key={report.report_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-fg-text">
                          {report.company_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-fg-muted">
                          {report.year}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-fg-text capitalize">
                            {statusIcon(report.status)}
                            <span>{report.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {report.status === "analyzed" ? (
                            renderHealthGauge(report.health_score)
                          ) : (
                            <span className="text-xs text-fg-muted italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {report.status === "analyzed" ? (
                            renderFraudScore(report.fraud_score)
                          ) : (
                            <span className="text-xs text-fg-muted italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {report.status === "analyzed" ? (
                              <>
                                <Link
                                  href={`/analysis/${report.report_id}`}
                                  className="text-xs text-blue-400 hover:underline px-2 py-1 hover:bg-blue-500/10 rounded transition-all"
                                >
                                  View Analysis
                                </Link>
                                <Link
                                  href={`/chat/${report.report_id}`}
                                  className="text-xs text-purple-400 hover:underline px-2 py-1 hover:bg-purple-500/10 rounded transition-all"
                                >
                                  Chat
                                </Link>
                              </>
                            ) : report.status === "failed" ? (
                              <span className="text-xs text-red-400 font-medium max-w-[120px] truncate" title="Pipeline execution failed. Click upload to try again.">
                                Failed
                              </span>
                            ) : (
                              <span className="text-xs text-blue-400 animate-pulse">
                                Processing...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* How to start */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-fg-text mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Getting Started
            </h2>
            <div className="flex flex-col gap-3">
              {[
                { step: "1", title: "Upload an Annual Report PDF", desc: "Any publicly listed company's annual report (up to 50MB)", href: "/upload" },
                { step: "2", title: "Wait ~60 seconds for analysis", desc: "5 AI agents analyze the report simultaneously via Nebius Token Factory", href: null },
                { step: "3", title: "Review your Intelligence Dashboard", desc: "Health Score, Fraud Score, ESG, Investment Thesis, Citations", href: null },
                { step: "4", title: "Chat with the AI Analyst", desc: "Ask any question about the report and get sourced answers", href: null },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 p-3 rounded-lg bg-fg-surface-2 border border-fg">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-fg-text">{s.title}</div>
                    <div className="text-xs text-fg-muted mt-0.5">{s.desc}</div>
                  </div>
                  {s.href && (
                    <Link href={s.href} className="ml-auto">
                      <ArrowRight className="w-4 h-4 text-blue-400" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Platform modules */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-fg-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Intelligence Modules
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                "M1 Financial Extraction", "M2 Fraud Detection",
                "M3 Health Score", "M4 AI Chat",
                "M5 Earnings Calls", "M6 RAG Engine",
                "M7 Benchmarking", "M8 Sector Risk",
                "M9 Multi-Year Trends", "M10 Explainability",
                "M11 Watchlists", "M12 Portfolio",
                "M13 Comparison", "M14 Export",
                "M15 Self-Critique", "M16 Forecasting",
              ].map((m) => (
                <div key={m} className="flex items-center gap-2 text-xs text-fg-muted py-1">
                  <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Powered by Nebius AI Widget */}
          <div className="glass-card p-5 mb-6 relative overflow-hidden group">
            {/* Glow effect */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-fg-text">Powered by Nebius AI</h3>
            </div>
            
            <p className="text-xs text-fg-muted mb-4 leading-relaxed">
              FinGuard utilizes a multi-model architecture hosted on Nebius AI Studio for optimal performance and latency.
            </p>

            <div className="flex flex-col gap-3">
              {/* Model 1: Reasoning */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <Brain className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-fg-text">DeepSeek-V3.2</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">Reasoning</span>
                  </div>
                  <p className="text-[10px] text-fg-muted">Drives fraud detection, risk scoring, and investment committee simulation.</p>
                </div>
              </div>

              {/* Model 2: Long Context */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <FileText className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-fg-text">Qwen3-235B</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Long Context</span>
                  </div>
                  <p className="text-[10px] text-fg-muted">Processes massive 10-K annual reports entirely in-context.</p>
                </div>
              </div>

              {/* Model 3: Chat / Extraction */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-fg-text">Llama-3.3-70B</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Chat & Extract</span>
                  </div>
                  <p className="text-[10px] text-fg-muted">Powers document Q&A, structured data extraction, and general chat.</p>
                </div>
              </div>

              {/* Model 4: Embedding */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <Database className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-fg-text">Qwen3-Embedding-8B</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">Vector RAG</span>
                  </div>
                  <p className="text-[10px] text-fg-muted">Creates semantic chunks for ChromaDB vector search.</p>
                </div>
              </div>
            </div>
            
            <a href="https://nebius.com/studio" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors w-full p-2 border border-blue-500/20 rounded-lg bg-blue-500/5">
              Explore Nebius AI Studio <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Watchlist */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-fg-text text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                Watchlist
              </h3>
              <Link href="/watchlist" className="text-xs text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-fg-muted animate-spin" />
              </div>
            ) : watchlistItems.length === 0 ? (
              <div className="text-center py-6">
                <Eye className="w-8 h-8 text-fg-muted mx-auto mb-2" />
                <p className="text-sm text-fg-muted">No companies watched yet</p>
                <Link href="/watchlist" className="text-xs text-blue-400 mt-1 inline-block">
                  Add companies →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {watchlistItems.slice(0, 5).map((item) => (
                  <div key={item.company_id} className="flex items-center gap-3 p-2 rounded-lg bg-fg-surface-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">
                      {item.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg-text truncate">{item.name}</div>
                      <div className="text-xs text-fg-muted">{item.sector || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-amber-400 mb-1">Disclaimer</div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  FinGuard AI outputs are not certified financial or investment advice. 
                  Fraud flags are for review only. Consult a qualified advisor before making decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
