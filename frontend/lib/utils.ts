// Shared utility helpers
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number | undefined | null): string {
  if (score == null) return "text-fg-muted";
  if (score >= 70) return "text-fg-green";
  if (score >= 45) return "text-fg-amber";
  return "text-fg-red";
}

export function fraudColor(score: number | undefined | null): string {
  // For fraud: lower is better
  if (score == null) return "text-fg-muted";
  if (score <= 30) return "text-fg-green";
  if (score <= 60) return "text-fg-amber";
  return "text-fg-red";
}

export function scoreLabel(score: number | undefined | null): string {
  if (score == null) return "N/A";
  if (score >= 75) return "Strong";
  if (score >= 55) return "Moderate";
  if (score >= 35) return "Weak";
  return "Poor";
}

export function fraudLabel(score: number | undefined | null): string {
  if (score == null) return "N/A";
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "High Risk";
  return "Critical";
}

export function formatNumber(
  val: number | undefined | null,
  decimals = 1
): string {
  if (val == null) return "N/A";
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}T`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(decimals);
}

export function formatPct(val: number | undefined | null): string {
  if (val == null) return "N/A";
  return `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;
}

export function outlookColor(outlook: string | undefined): string {
  switch (outlook?.toLowerCase()) {
    case "positive":
      return "text-fg-green";
    case "neutral":
      return "text-fg-amber";
    case "cautious":
    case "avoid":
      return "text-fg-red";
    default:
      return "text-fg-muted";
  }
}
