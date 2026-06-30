"use client";

import { Cpu, Zap, Brain, Search, Gauge } from "lucide-react";

type ModelTier = "reasoning" | "long_context" | "extraction" | "chat" | "embedding";

interface ModelTierBadgeProps {
  tier: ModelTier;
  modelName?: string;
  showModel?: boolean;
  size?: "xs" | "sm" | "md";
}

const tierConfig: Record<ModelTier, {
  label: string;
  shortLabel: string;
  icon: typeof Cpu;
  gradient: string;
  description: string;
}> = {
  reasoning: {
    label: "Heavy Reasoning",
    shortLabel: "Reasoning",
    icon: Brain,
    gradient: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300",
    description: "DeepSeek V3.2 — Deep analysis, fraud detection",
  },
  long_context: {
    label: "Long Context",
    shortLabel: "Long Ctx",
    icon: Search,
    gradient: "from-cyan-500/20 to-teal-500/20 border-cyan-500/30 text-cyan-300",
    description: "Qwen3-235B — Full-report analysis, trends",
  },
  extraction: {
    label: "Fast Extraction",
    shortLabel: "Fast",
    icon: Zap,
    gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300",
    description: "Llama-3.3-70B — Metric extraction, classification",
  },
  chat: {
    label: "Chat",
    shortLabel: "Chat",
    icon: Gauge,
    gradient: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300",
    description: "Llama-3.3-70B — AI investor assistant",
  },
  embedding: {
    label: "Embedding",
    shortLabel: "Embed",
    icon: Cpu,
    gradient: "from-blue-500/20 to-sky-500/20 border-blue-500/30 text-blue-300",
    description: "Qwen3-Embedding-8B — RAG vector search",
  },
};

export default function ModelTierBadge({
  tier,
  modelName,
  showModel = false,
  size = "sm",
}: ModelTierBadgeProps) {
  const config = tierConfig[tier];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px] gap-1",
    sm: "px-2 py-1 text-[10px] gap-1.5",
    md: "px-3 py-1.5 text-xs gap-2",
  };

  const iconSizes = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  };

  return (
    <div className="group relative inline-block">
      <span
        className={`
          inline-flex items-center rounded-full border bg-gradient-to-r
          font-semibold uppercase tracking-wider
          ${config.gradient} ${sizeClasses[size]}
        `}
      >
        <Icon className={iconSizes[size]} />
        {size === "xs" ? config.shortLabel : config.label}
      </span>

      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="whitespace-nowrap rounded-lg border border-white/10 bg-gray-900/95 px-3 py-2 shadow-xl backdrop-blur-sm">
          <p className="text-xs font-semibold text-white">{config.label}</p>
          <p className="text-[10px] text-gray-400">{config.description}</p>
          {showModel && modelName && (
            <p className="mt-1 font-mono text-[10px] text-gray-500">{modelName}</p>
          )}
          <p className="mt-1 text-[10px] text-cyan-500">Powered by Nebius AI Studio</p>
        </div>
        <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-white/10 bg-gray-900/95" />
      </div>
    </div>
  );
}
