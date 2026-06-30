"use client";
import { useEffect, useState } from "react";
import { alerts as alertsApi, reports, AlertRule, TriggeredAlert, Company } from "@/lib/api";
import { Bell, Plus, CheckCircle, XCircle, Loader2, AlertTriangle, Clock } from "lucide-react";

const METRICS = [
  { value: "fraud_score", label: "Fraud Score" },
  { value: "health_score", label: "Health Score" },
  { value: "risk_score", label: "Risk Score" },
  { value: "esg_score", label: "ESG Score" },
  { value: "debt_to_equity", label: "Debt/Equity" },
  { value: "current_ratio", label: "Current Ratio" },
  { value: "quick_ratio", label: "Quick Ratio" },
  { value: "roe", label: "ROE (%)" },
  { value: "roa", label: "ROA (%)" },
  { value: "interest_coverage", label: "Interest Coverage" },
  { value: "profit_margin", label: "Profit Margin (%)" },
  { value: "operating_margin", label: "Operating Margin (%)" },
];
const OPERATORS = [
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: ">=" },
  { value: "lte", label: "<=" },
];

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [feed, setFeed] = useState<TriggeredAlert[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", company_id: "", metric: "fraud_score", operator: "gt", threshold: 70 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([alertsApi.listRules(), alertsApi.feed(), reports.companies()])
      .then(([r, f, c]) => {
        setRules(r);
        setFeed(f);
        setCompanies(c);
      })
      .catch((err) => console.error("Error loading alerts:", err))
      .finally(() => setLoading(false));
  }, []);

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await alertsApi.createRule(form as any);
      const [updatedRules, updatedFeed] = await Promise.all([
        alertsApi.listRules(),
        alertsApi.feed(),
      ]);
      setRules(updatedRules);
      setFeed(updatedFeed);
      setForm({ name: "", company_id: "", metric: "fraud_score", operator: "gt", threshold: 70 });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Bell className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold text-fg-text">Alerts & Watchlist Monitoring</h1>
          <p className="text-fg-muted text-sm">Define custom threshold checks and track real-time alert triggers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Create rule */}
        <div className="glass-card p-5 lg:col-span-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg-text mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Create Custom Alert Rule
            </h2>
            <form onSubmit={createRule} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-fg-muted mb-1 block">Rule Name</label>
                <input className="fg-input" placeholder="e.g. High Leverage Alert" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-fg-muted mb-1 block">Target Company (optional)</label>
                <select className="fg-input" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  <option value="">All companies (Global Rule)</option>
                  {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-fg-muted mb-1 block">Metric</label>
                  <select className="fg-input text-xs" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                    {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-fg-muted mb-1 block">Operator</label>
                  <select className="fg-input" value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}>
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-fg-muted mb-1 block">Threshold</label>
                  <input className="fg-input" type="number" step="any" min={0} value={form.threshold}
                    onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} />
                </div>
              </div>
              <button type="submit" disabled={creating || !form.name} className="btn-primary mt-3 flex items-center gap-2 justify-center w-full">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Rule
              </button>
            </form>
          </div>
        </div>

        {/* Rules list */}
        <div className="glass-card p-5 lg:col-span-7">
          <h2 className="text-sm font-semibold text-fg-text mb-4">Active System Check Rules ({rules.length})</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-fg-muted" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-fg-muted mx-auto mb-2" />
              <p className="text-sm text-fg-muted">No rules defined. Create one on the left.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {rules.map((rule) => (
                <div key={rule.rule_id} className="p-3 rounded-lg bg-fg-surface-2 border border-fg flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-fg-text">{rule.name}</div>
                    <div className="text-xs text-fg-muted font-mono mt-0.5">
                      Check: {METRICS.find(m => m.value === rule.metric)?.label || rule.metric} {rule.operator} {rule.threshold}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700">
                      {rule.channel}
                    </span>
                    {rule.is_active
                      ? <span className="text-xs text-green-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                      : <span className="text-xs text-red-400 font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Paused</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Triggered Alerts Feed */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-fg-text mb-4 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Triggered Alerts Feed
        </h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/10 rounded-xl border border-dashed border-slate-800">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-fg-text mb-1">No Alerts Triggered</h3>
            <p className="text-xs text-fg-muted">All financial statement check metrics are within normal ranges</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {feed.map((alert) => {
              const isCrit = alert.severity === "critical";
              const isHigh = alert.severity === "high";
              const sevColor = isCrit
                ? "border-red-500/30 bg-red-500/5 text-red-400"
                : isHigh
                ? "border-orange-500/30 bg-orange-500/5 text-orange-400"
                : "border-slate-800 bg-slate-900/40 text-slate-300";

              return (
                <div key={alert.alert_id} className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white/[0.01] ${sevColor}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isCrit ? "text-red-500" : isHigh ? "text-orange-500" : "text-slate-400"}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-fg-text text-sm">{alert.company_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-fg-muted font-mono uppercase">
                          {alert.metric.replace("_", " ")}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-slate-950/40 text-fg-muted">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                        Rule <strong className="text-fg-text">&ldquo;{alert.rule_name}&rdquo;</strong> triggered because current value is <strong className="text-fg-text font-mono">{alert.value}</strong>, crossing threshold of {alert.operator} {alert.threshold}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-fg-muted font-mono shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(alert.triggered_at).toLocaleDateString()} {new Date(alert.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
