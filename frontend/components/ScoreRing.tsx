// Score Ring Component — animated SVG gauge for 0-100 scores
"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number | null | undefined;
  size?: number;
  label: string;
  sublabel?: string;
  colorClass?: string; // override ring color
  mode?: "health" | "fraud" | "risk" | "esg" | "generic";
}

function getStrokeColor(score: number | null | undefined, mode: string) {
  if (score == null) return "#334155";
  if (mode === "fraud" || mode === "risk") {
    if (score <= 30) return "#10b981";
    if (score <= 60) return "#f59e0b";
    return "#ef4444";
  }
  if (score >= 70) return "#10b981";
  if (score >= 45) return "#f59e0b";
  return "#ef4444";
}

function getGradientId(mode: string, score: number | null | undefined) {
  if (mode === "fraud" || mode === "risk") return score && score > 60 ? "grad-fraud" : "grad-health";
  return score && score >= 70 ? "grad-health" : score && score >= 45 ? "grad-amber" : "grad-risk";
}

export function ScoreRing({
  score,
  size = 140,
  label,
  sublabel,
  mode = "generic",
}: ScoreRingProps) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score != null ? score / 100 : 0;
  const offset = circumference * (1 - pct);
  const color = getStrokeColor(score, mode);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(score ?? 0), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={10}
          />
          {/* Score ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.3s",
              filter: `drop-shadow(0 0 8px ${color}80)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold"
            style={{ fontSize: size * 0.22, color, lineHeight: 1 }}
          >
            {score != null ? Math.round(score) : "—"}
          </span>
          <span className="text-xs text-fg-muted mt-0.5">/100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-fg-text">{label}</div>
        {sublabel && (
          <div className="text-xs text-fg-muted mt-0.5">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
