"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type ChartType = "bar" | "line" | "area";

interface DataKey {
  key: string;
  color: string;
  label?: string;
}

interface FinancialChartProps {
  data: Record<string, unknown>[];
  type?: ChartType;
  dataKeys: DataKey[];
  xAxisKey?: string;
  height?: number;
  title?: string;
  subtitle?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  formatYAxis?: (value: number) => string;
}

const defaultFormat = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-semibold text-white">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FinancialChart({
  data,
  type = "bar",
  dataKeys,
  xAxisKey = "year",
  height = 300,
  title,
  subtitle,
  showGrid = true,
  showLegend = true,
  formatYAxis = defaultFormat,
}: FinancialChartProps) {
  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: 0, bottom: 5 },
  };

  const axisStyle = {
    tick: { fill: "#6b7280", fontSize: 11 },
    axisLine: { stroke: "#374151" },
    tickLine: { stroke: "#374151" },
  };

  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />}
            <XAxis dataKey={xAxisKey} {...axisStyle} />
            <YAxis tickFormatter={formatYAxis} {...axisStyle} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />}
            {dataKeys.map((dk) => (
              <Line
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.label || dk.key}
                stroke={dk.color}
                strokeWidth={2}
                dot={{ r: 4, fill: dk.color, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: dk.color }}
              />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />}
            <XAxis dataKey={xAxisKey} {...axisStyle} />
            <YAxis tickFormatter={formatYAxis} {...axisStyle} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />}
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.label || dk.key}
                stroke={dk.color}
                fill={dk.color}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      default: // bar
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />}
            <XAxis dataKey={xAxisKey} {...axisStyle} />
            <YAxis tickFormatter={formatYAxis} {...axisStyle} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />}
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.label || dk.key}
                fill={dk.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-semibold text-gray-200">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
