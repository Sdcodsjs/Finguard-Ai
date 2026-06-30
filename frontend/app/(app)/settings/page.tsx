"use client";
import { useAuth } from "@/lib/auth-context";
import { Shield, User, Key, Bell, Info } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-fg-text mb-8">Settings</h1>

      {/* Profile */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-semibold text-fg-text mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          Profile
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-fg-muted mb-1 block">Name</label>
            <input className="fg-input" value={user?.name || ""} readOnly />
          </div>
          <div>
            <label className="text-xs text-fg-muted mb-1 block">Email</label>
            <input className="fg-input" value={user?.email || ""} readOnly />
          </div>
          <div>
            <label className="text-xs text-fg-muted mb-1 block">Role</label>
            <input className="fg-input" value={user?.role?.replace("_", " ") || ""} readOnly />
          </div>
        </div>
      </div>

      {/* Model configuration */}
      <div className="glass-card p-5 mb-4">
        <h2 className="text-sm font-semibold text-fg-text mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-400" />
          Nebius Token Factory Configuration
        </h2>
        <div className="rounded-lg bg-fg-surface-2 border border-fg p-4 font-mono text-xs text-fg-muted space-y-1">
          <div>NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1</div>
          <div>NEBIUS_REASONING_MODEL=<span className="text-green-400">[configured via env]</span></div>
          <div>NEBIUS_LONG_CONTEXT_MODEL=<span className="text-green-400">[configured via env]</span></div>
          <div>NEBIUS_EXTRACTION_MODEL=<span className="text-green-400">[configured via env]</span></div>
          <div>NEBIUS_CHAT_MODEL=<span className="text-green-400">[configured via env]</span></div>
          <div>NEBIUS_EMBEDDING_MODEL=<span className="text-green-400">[configured via env]</span></div>
        </div>
        <p className="text-xs text-fg-muted mt-3">
          All model names are configured via environment variables in the backend. 
          Never hardcoded — fully swappable with any Nebius Open Model.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-fg-text mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400" />
          Disclaimer
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed">
          FinGuard AI is powered by Open Models hosted on Nebius Token Factory and is intended for 
          research and analytical purposes only. All AI-generated outputs — including health scores, 
          fraud flags, investment perspectives, and ESG ratings — are not certified financial, 
          investment, audit, or legal advice. Fraud flags are presented for review only and do not 
          constitute legal findings. Always consult a qualified financial advisor, auditor, or legal 
          counsel before making any financial or investment decisions. Past performance data does not 
          guarantee future results.
        </p>
      </div>
    </div>
  );
}
