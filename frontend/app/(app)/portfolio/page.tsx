"use client";
import { useEffect, useState } from "react";
import { portfolio as portfolioApi, PortfolioRisk } from "@/lib/api";
import { ScoreRing } from "@/components/ScoreRing";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Briefcase, Plus, Loader2, AlertTriangle, Trash2, ShieldAlert, MessageSquare } from "lucide-react";
import Link from "next/link";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

interface SimHolding {
  company_id: string;
  name: string;
  sector: string;
  health_score: number;
  fraud_score: number;
  risk_score: number;
  weight_pct: number;
}

export default function PortfolioPage() {
  // Available analyzed companies for simulator
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(true);

  // Simulator holdings state
  const [holdings, setHoldings] = useState<SimHolding[]>([]);

  // Fetch analyzed companies on mount
  useEffect(() => {
    portfolioApi.simulatorData()
      .then((res) => {
        setAvailableCompanies(res);
        // Load default mock portfolio if companies are available (e.g. TCS 40%, Infosys 30%, Reliance 30%)
        // or just select first few to let judges see immediately
        if (res.length > 0) {
          const initialHoldings: SimHolding[] = [];
          // Try to find TCS, Infosys, Reliance if available, or just map first 3
          const matches = ["tcs", "infosys", "reliance"];
          let matchedCount = 0;
          const weights = [40, 30, 30];
          
          res.forEach((co) => {
            const nameLower = co.name.toLowerCase();
            const matchIndex = matches.findIndex(m => nameLower.includes(m));
            if (matchIndex !== -1 && matchedCount < 3) {
              initialHoldings.push({
                ...co,
                weight_pct: weights[matchIndex]
              });
              matchedCount++;
            }
          });

          if (initialHoldings.length === 0) {
            // Fallback: take first 2 or 3
            res.slice(0, 3).forEach((co, idx) => {
              initialHoldings.push({
                ...co,
                weight_pct: idx === 0 ? 50 : 25
              });
            });
          }
          setHoldings(initialHoldings);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleAddCompany = () => {
    if (!selectedCompanyId) return;
    const exists = holdings.find((h) => h.company_id === selectedCompanyId);
    if (exists) return;

    const company = availableCompanies.find((c) => c.company_id === selectedCompanyId);
    if (!company) return;

    // Allocate remaining weight if possible, or 10%
    const totalCurrentWeight = holdings.reduce((sum, h) => sum + h.weight_pct, 0);
    const newWeight = Math.max(0, 100 - totalCurrentWeight) || 10;

    setHoldings((prev) => [
      ...prev,
      {
        company_id: company.company_id,
        name: company.name,
        sector: company.sector || "General",
        health_score: company.health_score,
        fraud_score: company.fraud_score,
        risk_score: company.risk_score,
        weight_pct: newWeight,
      },
    ]);
    setSelectedCompanyId("");
  };

  const handleWeightChange = (id: string, weight: number) => {
    setHoldings((prev) =>
      prev.map((h) => (h.company_id === id ? { ...h, weight_pct: Math.max(0, weight) } : h))
    );
  };

  const handleRemove = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.company_id !== id));
  };

  // Re-distribute weights to make sum = 100%
  const handleAutoRebalance = () => {
    if (holdings.length === 0) return;
    const split = Math.round((100 / holdings.length) * 100) / 100;
    setHoldings((prev) => prev.map((h) => ({ ...h, weight_pct: split })));
  };

  // Compute weighted portfolio statistics
  const totalWeight = holdings.reduce((sum, h) => sum + h.weight_pct, 0);
  const isWeightValid = totalWeight === 100;

  // Weighted calculations
  let weightedHealth = 50;
  let weightedFraud = 30;
  let weightedRisk = 50;

  if (totalWeight > 0) {
    weightedHealth = holdings.reduce((sum, h) => sum + h.health_score * (h.weight_pct / totalWeight), 0);
    weightedFraud = holdings.reduce((sum, h) => sum + h.fraud_score * (h.weight_pct / totalWeight), 0);
    weightedRisk = holdings.reduce((sum, h) => sum + h.risk_score * (h.weight_pct / totalWeight), 0);
  }

  // Risk levels derived locally from weighted risk score
  const getPortfolioRiskLevel = (score: number) => {
    if (score <= 30) return { label: "Low Risk", color: "text-green-400 border-green-500/20 bg-green-500/5" };
    if (score <= 60) return { label: "Moderate Risk", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" };
    return { label: "High Risk", color: "text-red-400 border-red-500/20 bg-red-500/5" };
  };

  const riskLevel = getPortfolioRiskLevel(weightedRisk);

  // Compute sector exposure based on current weights
  const sectorMap: Record<string, number> = {};
  holdings.forEach((h) => {
    const s = h.sector || "General";
    sectorMap[s] = (sectorMap[s] || 0) + h.weight_pct;
  });

  const sectorData = Object.entries(sectorMap)
    .filter(([_, val]) => val > 0)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-fg-text">Portfolio Analytics Simulator</h1>
            <p className="text-fg-muted text-sm">Design, weight, and simulate risk metrics dynamically. Zero API latency.</p>
          </div>
        </div>
        <Link href="/portfolio/chat" className="btn-primary text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Portfolio AI Chat
        </Link>
      </div>

      {availableCompanies.length === 0 ? (
        <div className="glass-card p-12 text-center border border-white/5">
          <ShieldAlert className="w-12 h-12 text-fg-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-fg-text mb-2">No Analyzed Companies Found</h2>
          <p className="text-fg-muted text-sm mb-6">Upload and analyze reports first to fuel the simulator.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Weight validation banner */}
          {!isWeightValid && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Holdings weight sum is <strong className="font-mono">{totalWeight}%</strong>. For accurate simulation, adjust weights to equal <strong className="font-mono">100%</strong>.
                </span>
              </div>
              <button
                onClick={handleAutoRebalance}
                className="px-3 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold"
              >
                Rebalance Equitably
              </button>
            </div>
          )}

          {/* Simulated stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="glass-card p-6 flex flex-col items-center border border-white/5">
              <ScoreRing score={weightedHealth} label="Portfolio Health" mode="health" />
            </div>
            <div className="glass-card p-6 flex flex-col items-center border border-white/5">
              <ScoreRing score={weightedFraud} label="Weighted Fraud Risk" mode="fraud" />
            </div>
            <div className="glass-card p-6 flex flex-col items-center border border-white/5">
              <ScoreRing score={weightedRisk} label="Weighted Risk Score" mode="risk" />
            </div>
            {/* Derived risk level */}
            <div className="glass-card p-6 flex flex-col justify-center items-center text-center border border-white/5">
              <span className="text-xs text-fg-muted uppercase font-bold tracking-wider mb-2">Portfolio Risk Status</span>
              <div className={`text-lg font-bold px-4 py-2 rounded-full border font-mono ${riskLevel.color}`}>
                {riskLevel.label}
              </div>
              <span className="text-[10px] text-fg-muted mt-2">Derived from weighted assets risk score</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Holdings weights simulator control panel */}
            <div className="lg:col-span-3 glass-card p-5 border border-white/5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-fg-text">Simulator Assets Allocation</h3>
                <span className="text-xs text-fg-muted">Allocated: <strong className="text-fg-text font-mono">{totalWeight}%</strong></span>
              </div>

              {/* Add company */}
              <div className="flex gap-2">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="fg-input text-sm flex-1"
                >
                  <option value="">Select analyzed company...</option>
                  {availableCompanies
                    .filter((c) => !holdings.some((h) => h.company_id === c.company_id))
                    .map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.name} (Health: {Math.round(c.health_score)})
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddCompany}
                  disabled={!selectedCompanyId}
                  className="btn-primary text-sm px-4 flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Sliders list */}
              {holdings.length === 0 ? (
                <div className="text-center py-8 text-xs text-fg-muted">
                  No assets added. Select a company from the dropdown to start simulating.
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {holdings.map((h, i) => (
                    <div key={h.company_id} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-fg-text truncate max-w-[180px]">{h.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-fg-muted uppercase">{h.sector}</span>
                          <span className="font-bold text-blue-400 font-mono w-10 text-right">{h.weight_pct}%</span>
                          <button
                            onClick={() => handleRemove(h.company_id)}
                            className="p-1 rounded hover:bg-red-500/10 text-fg-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Weight Control slider */}
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={h.weight_pct}
                          onChange={(e) => handleWeightChange(h.company_id, Number(e.target.value))}
                          className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                        {/* Direct input */}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={h.weight_pct}
                          onChange={(e) => handleWeightChange(h.company_id, Number(e.target.value))}
                          className="fg-input text-xs w-12 text-center p-1 font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Sector exposure chart & warnings */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Sector exposure chart */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-sm font-bold text-fg-text mb-4">Sector Distribution</h3>
                {sectorData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={sectorData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={65}
                          innerRadius={35}
                        >
                          {sectorData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => [`${v}%`]}
                          contentStyle={{ background: "#0f1629", border: "1px solid #1e293b", borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
                      {sectorData.map((s, idx) => (
                        <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                          <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-fg-muted">{s.name}:</span>
                          <span className="font-semibold text-fg-text font-mono">{s.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-fg-muted text-center py-12">No simulated holdings yet</p>
                )}
              </div>

              {/* Asset Scores details table */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-sm font-bold text-fg-text mb-3">Assets Risk Breakdown</h3>
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {holdings.map((h) => (
                    <div key={h.company_id} className="text-xs flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-800">
                      <span className="font-medium text-fg-text truncate max-w-[120px]">{h.name}</span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-[10px] text-fg-muted">H: <strong className="text-emerald-400">{Math.round(h.health_score)}</strong></span>
                        <span className="text-[10px] text-fg-muted">F: <strong className="text-red-400">{Math.round(h.fraud_score)}</strong></span>
                        <span className="text-[10px] text-fg-muted">R: <strong className="text-amber-400">{Math.round(h.risk_score)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
