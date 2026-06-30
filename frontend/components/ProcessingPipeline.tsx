"use client";

import { CheckCircle, Loader2, Clock, AlertCircle, FileText, Database, Brain, BarChart3 } from "lucide-react";

export type PipelineStep = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "complete" | "error";
  icon: typeof FileText;
};

interface ProcessingPipelineProps {
  steps: PipelineStep[];
  currentStep?: string;
}

const defaultSteps: PipelineStep[] = [
  {
    id: "upload",
    label: "Upload",
    description: "PDF received & validated",
    status: "pending",
    icon: FileText,
  },
  {
    id: "ocr",
    label: "OCR & Parsing",
    description: "Extracting text with PyMuPDF + Tesseract",
    status: "pending",
    icon: FileText,
  },
  {
    id: "embed",
    label: "RAG Embedding",
    description: "Chunking & embedding via Nebius",
    status: "pending",
    icon: Database,
  },
  {
    id: "extract",
    label: "Data Extraction",
    description: "Financial metrics via Nebius AI",
    status: "pending",
    icon: BarChart3,
  },
  {
    id: "analyze",
    label: "Multi-Agent Analysis",
    description: "5 AI agents analyzing report",
    status: "pending",
    icon: Brain,
  },
  {
    id: "complete",
    label: "Complete",
    description: "Scores & dashboard ready",
    status: "pending",
    icon: CheckCircle,
  },
];

const statusConfig = {
  pending: {
    color: "text-gray-600",
    bgLine: "bg-gray-800",
    bgDot: "bg-gray-700 border-gray-600",
  },
  running: {
    color: "text-cyan-400",
    bgLine: "bg-gradient-to-b from-cyan-500 to-cyan-500/20",
    bgDot: "bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20",
  },
  complete: {
    color: "text-emerald-400",
    bgLine: "bg-emerald-500/50",
    bgDot: "bg-emerald-500/20 border-emerald-400",
  },
  error: {
    color: "text-red-400",
    bgLine: "bg-red-500/50",
    bgDot: "bg-red-500/20 border-red-400",
  },
};

export default function ProcessingPipeline({
  steps = defaultSteps,
}: ProcessingPipelineProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
      <h3 className="mb-6 text-sm font-semibold text-gray-200">Processing Pipeline</h3>

      <div className="space-y-0">
        {steps.map((step, index) => {
          const config = statusConfig[step.status];
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex gap-4">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div
                  className={`
                    flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2
                    transition-all duration-500
                    ${config.bgDot}
                  `}
                >
                  {step.status === "running" ? (
                    <Loader2 className={`h-4 w-4 animate-spin ${config.color}`} />
                  ) : step.status === "complete" ? (
                    <CheckCircle className={`h-4 w-4 ${config.color}`} />
                  ) : step.status === "error" ? (
                    <AlertCircle className={`h-4 w-4 ${config.color}`} />
                  ) : (
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[24px] ${config.bgLine} transition-all duration-500`} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                <p
                  className={`text-sm font-medium transition-colors duration-300 ${
                    step.status === "running"
                      ? "text-cyan-300"
                      : step.status === "complete"
                      ? "text-emerald-300"
                      : step.status === "error"
                      ? "text-red-300"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                  {step.status === "running" && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                      Processing
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { defaultSteps };
