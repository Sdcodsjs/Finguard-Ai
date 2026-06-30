"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string | null;
  unit?: string;
  prefix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  colorClass?: string;
  size?: "sm" | "md" | "lg";
}

export default function MetricCard({
  label,
  value,
  unit = "",
  prefix = "",
  trend,
  trendValue,
  subtitle,
  icon,
  colorClass = "from-blue-500/10 to-cyan-500/10 border-blue-500/20",
  size = "md",
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const numericValue = typeof value === "number" ? value : null;

  // Animate numeric values
  useEffect(() => {
    if (numericValue === null) return;
    const duration = 800;
    const start = performance.now();
    const startVal = 0;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startVal + (numericValue! - startVal) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [numericValue]);

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-gray-400",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const valueSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border bg-gradient-to-br
        backdrop-blur-xl transition-all duration-300
        hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/5
        ${colorClass} ${sizeClasses[size]}
      `}
    >
      {/* Glow effect */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {label}
          </span>
          {icon && <span className="text-gray-500">{icon}</span>}
        </div>

        {/* Value */}
        <div className={`mt-2 font-bold text-white ${valueSizes[size]}`}>
          {value === null || value === undefined ? (
            <span className="text-gray-500">—</span>
          ) : typeof value === "string" ? (
            value
          ) : (
            <>
              {prefix}
              {displayValue.toLocaleString(undefined, {
                maximumFractionDigits: value % 1 === 0 ? 0 : 2,
              })}
              {unit && <span className="ml-1 text-sm font-normal text-gray-400">{unit}</span>}
            </>
          )}
        </div>

        {/* Trend + Subtitle */}
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColors[trend]}`}>
              <TrendIcon className="h-3 w-3" />
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
          {subtitle && (
            <span className="text-xs text-gray-500">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
