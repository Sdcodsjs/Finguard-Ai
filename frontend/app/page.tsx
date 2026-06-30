// FinGuard AI — Landing Page
import Link from "next/link";
import {
  Shield, BarChart3, AlertTriangle, Brain, TrendingUp,
  FileText, GitCompare, Zap, ArrowRight, CheckCircle,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Multi-Agent AI Analysis",
    desc: "5 specialized agents — Financial Analyst, Fraud Investigator, Risk Auditor, ESG Analyst, Investment Advisor — collaborate on every report.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: AlertTriangle,
    title: "Fraud Detection Engine",
    desc: "Detects revenue manipulation, earnings quality issues, related-party anomalies, and auditor red flags with source-level citations.",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: BarChart3,
    title: "Financial Health Score",
    desc: "Composite 0–100 score across profitability, liquidity, solvency, and growth with explainability per sub-score.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: FileText,
    title: "RAG Engine",
    desc: "300+ page reports chunked, embedded, and semantically searched via ChromaDB. Every answer is grounded in the source document.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: GitCompare,
    title: "Document Diff",
    desc: "Year-over-year MD&A diffing surfaces softened language and removed commitments — often leading indicators before the numbers move.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: TrendingUp,
    title: "Financial Forecasting",
    desc: "AI-generated 1/3/5-year revenue and profit forecasts with confidence scores and explicit assumptions.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

const STAT_ITEMS = [
  { value: "< 60s", label: "Time to full analysis" },
  { value: "5", label: "Specialized AI agents" },
  { value: "24", label: "Intelligence modules" },
  { value: "100%", label: "Open models (Nebius)" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-fg-bg">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-fg bg-fg-surface/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">FinGuard AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/auth/signup" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 noise-overlay">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-blue-600/8 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/6 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/6 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center pt-24 pb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-400 mb-8">
            <Zap className="w-3.5 h-3.5" />
            Powered by Nebius Token Factory Open Models
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="gradient-text">Institutional-Grade</span>
            <br />
            <span className="text-fg-text">Financial Intelligence</span>
          </h1>

          <p className="text-xl text-fg-muted max-w-3xl mx-auto leading-relaxed mb-10">
            Upload any annual report. Get a complete fraud assessment, financial health score,
            ESG rating, investment thesis, and AI chat — in under 60 seconds. 
            Powered by 5 specialized AI agents, all running on Nebius Open Models.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn-primary text-base flex items-center gap-2 justify-center">
              Start Analyzing
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login" className="btn-ghost text-base flex items-center gap-2 justify-center">
              Sign in
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {STAT_ITEMS.map((s) => (
              <div key={s.label} className="glass-card p-5 text-center">
                <div className="text-3xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-sm text-fg-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-fg-text mb-4">
              Bloomberg Terminal Lite meets Moody's Risk Analytics
            </h2>
            <p className="text-lg text-fg-muted max-w-2xl mx-auto">
              Every module built for institutional depth, not a demo chatbot.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card p-6 flex flex-col gap-4">
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-fg-text mb-2">{f.title}</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline visual */}
      <section className="py-24 px-6 bg-fg-surface/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-fg-text mb-4">
            AI Pipeline — PDF to Intelligence in 60s
          </h2>
          <p className="text-fg-muted mb-12">
            Every step powered by Nebius Token Factory Open Models.
          </p>

          <div className="flex flex-wrap justify-center gap-3 items-center">
            {[
              "PDF Upload", "OCR", "Chunking", "Embeddings", "ChromaDB",
              "RAG Retrieval", "5-Agent System", "Consensus Engine", "Dashboard"
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-lg bg-fg-surface-2 border border-fg text-sm text-fg-text font-medium">
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer + Footer */}
      <footer className="py-12 px-6 border-t border-fg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
            <div className="max-w-xl">
              <p className="text-xs text-fg-muted leading-relaxed">
                <strong className="text-fg-text">Disclaimer:</strong> FinGuard AI outputs are generated by AI models and are 
                not certified financial, investment, or audit advice. Fraud flags are presented 
                for review only and do not constitute legal findings. Always consult a qualified 
                financial advisor before making investment decisions.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-fg-muted shrink-0">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>FinGuard AI © {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
