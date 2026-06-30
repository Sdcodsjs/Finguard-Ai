"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface FraudFinding {
  finding: string;
  severity: "low" | "medium" | "high" | "critical";
  page?: number | null;
  paragraph?: string;
  confidence?: number;
  category?: string;
}

interface FraudAlertProps {
  finding: FraudFinding;
  defaultExpanded?: boolean;
}

const severityConfig = {
  low: {
    bg: "bg-yellow-500/5 border-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-400",
    icon: "text-yellow-400",
    label: "Low",
  },
  medium: {
    bg: "bg-orange-500/5 border-orange-500/20",
    badge: "bg-orange-500/20 text-orange-400",
    icon: "text-orange-400",
    label: "Medium",
  },
  high: {
    bg: "bg-red-500/5 border-red-500/20",
    badge: "bg-red-500/20 text-red-400",
    icon: "text-red-400",
    label: "High",
  },
  critical: {
    bg: "bg-red-600/10 border-red-600/30",
    badge: "bg-red-600/20 text-red-300",
    icon: "text-red-300",
    label: "Critical",
  },
};

const categoryLabels: Record<string, string> = {
  earnings_quality: "Earnings Quality",
  debt_concern: "Debt Concern",
  related_party: "Related Party",
  auditor_flag: "Auditor Flag",
  revenue_anomaly: "Revenue Anomaly",
  expense_anomaly: "Expense Anomaly",
};

export default function FraudAlert({ finding, defaultExpanded = false }: FraudAlertProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = severityConfig[finding.severity] || severityConfig.medium;

  return (
    <div
      className={`
        rounded-xl border transition-all duration-200
        ${config.bg}
        ${expanded ? "shadow-lg" : ""}
      `}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${config.icon}`} />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-200 line-clamp-2">
            {finding.finding}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${config.badge}`}>
            {config.label}
          </span>
          {finding.confidence != null && (
            <span className="text-[10px] font-medium text-gray-500">
              {finding.confidence}%
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          <div className="space-y-2">
            {finding.category && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Category</span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-gray-300">
                  {categoryLabels[finding.category] || finding.category}
                </span>
              </div>
            )}
            {finding.page && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Source</span>
                <span className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                  <ExternalLink className="h-3 w-3" />
                  Page {finding.page}
                </span>
              </div>
            )}
            {finding.paragraph && (
              <div className="mt-2 rounded-lg bg-black/20 p-3">
                <p className="text-xs italic text-gray-400 leading-relaxed">
                  &ldquo;{finding.paragraph}&rdquo;
                </p>
              </div>
            )}
            <p className="mt-2 text-[10px] text-gray-600">
              ⚠ Flagged for review only — this is not a definitive fraud finding.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
