// Explainability Panel — citations linking scores to source pages
"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Citation } from "@/lib/api";

interface ExplainabilityPanelProps {
  fraudCitations: Citation[];
  healthCitations: Citation[];
  riskCitations: Citation[];
}

function CitationCard({ cite, index }: { cite: Citation; index: number }) {
  const impactColor =
    cite.impact === "negative"
      ? "border-red-500/30 bg-red-500/5"
      : cite.impact === "positive"
      ? "border-green-500/30 bg-green-500/5"
      : "border-fg bg-fg-surface-2";

  const impactIcon =
    cite.impact === "negative" ? (
      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
    ) : (
      <TrendingUp className="w-3 h-3 text-green-400 shrink-0" />
    );

  return (
    <div className={cn("rounded-lg border p-3 flex gap-3 items-start text-sm", impactColor)}>
      <span className="font-mono text-xs text-fg-muted shrink-0 mt-0.5">[{index + 1}]</span>
      {impactIcon}
      <div className="flex-1 min-w-0">
        <p className="text-fg-text leading-relaxed line-clamp-3">{cite.text}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <FileText className="w-3 h-3 text-fg-muted" />
          <span className="text-xs text-fg-muted font-mono">Page {cite.page}</span>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full capitalize",
              cite.impact === "negative"
                ? "bg-red-500/10 text-red-400"
                : cite.impact === "positive"
                ? "bg-green-500/10 text-green-400"
                : "bg-fg-surface text-fg-muted"
            )}
          >
            {cite.impact}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  citations: Citation[];
  defaultOpen?: boolean;
  accentColor: string;
}

function CitationSection({ title, citations, defaultOpen, accentColor }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  if (!citations?.length) return null;

  return (
    <div className="rounded-xl border border-fg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-fg-surface-2 hover:bg-fg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", accentColor)} />
          <span className="text-sm font-semibold text-fg-text">{title}</span>
          <span className="text-xs text-fg-muted bg-fg-surface px-1.5 py-0.5 rounded-full">
            {citations.length}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-fg-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-fg-muted" />
        )}
      </button>

      {open && (
        <div className="p-3 flex flex-col gap-2 bg-fg-surface">
          {citations.map((cite, i) => (
            <CitationCard key={i} cite={cite} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExplainabilityPanel({
  fraudCitations,
  healthCitations,
  riskCitations,
}: ExplainabilityPanelProps) {
  const totalCitations =
    (fraudCitations?.length || 0) +
    (healthCitations?.length || 0) +
    (riskCitations?.length || 0);

  if (totalCitations === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-fg-text">Source Citations</h3>
        <span className="text-xs text-fg-muted ml-auto">
          {totalCitations} citations · Module 10
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <CitationSection
          title="Fraud & Risk Flags"
          citations={fraudCitations}
          defaultOpen
          accentColor="bg-red-400"
        />
        <CitationSection
          title="Financial Health Evidence"
          citations={healthCitations}
          accentColor="bg-green-400"
        />
        <CitationSection
          title="Risk Analysis"
          citations={riskCitations}
          accentColor="bg-amber-400"
        />
      </div>

      <p className="text-xs text-fg-muted mt-4 pt-4 border-t border-fg">
        Citations link AI findings to exact source paragraphs in the uploaded report.
        This is not a certified audit opinion.
      </p>
    </div>
  );
}
