"use client";

import { useState, useMemo } from "react";
import { healthData, HealthRecord } from "@/data/health-data";

type MetricKey = keyof Omit<HealthRecord, "time">;

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  decimals: number;
}

const metrics: MetricConfig[] = [
  { key: "weight", label: "Weight", unit: "kg", color: "#60a5fa", decimals: 1 },
  { key: "bodyFat", label: "Body Fat", unit: "%", color: "#f97316", decimals: 1 },
  { key: "muscleMass", label: "Muscle Mass", unit: "kg", color: "#34d399", decimals: 1 },
  { key: "skeletalMuscleMass", label: "Skeletal Muscle", unit: "kg", color: "#2dd4bf", decimals: 1 },
  { key: "bmr", label: "BMR", unit: "kcal", color: "#fb923c", decimals: 0 },
  { key: "visceralFat", label: "Visceral Fat", unit: "", color: "#fb7185", decimals: 0 },
  { key: "water", label: "Water", unit: "%", color: "#38bdf8", decimals: 1 },
];

const timeRanges = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 0 },
];

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateLong(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MiniChart({
  data,
  metricKey,
  color,
}: {
  data: HealthRecord[];
  metricKey: MetricKey;
  color: string;
}) {
  const width = 200;
  const height = 48;
  const padding = 4;

  const values = data.map((d) => d[metricKey] as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y =
        height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: 48 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chart({
  data,
  metric,
  hoveredIndex,
  onHover,
}: {
  data: HealthRecord[];
  metric: MetricConfig;
  hoveredIndex: number | null;
  onHover: (i: number | null) => void;
}) {
  const width = 800;
  const height = 300;
  const padL = 55;
  const padR = 20;
  const padT = 20;
  const padB = 50;

  const values = data.map((d) => d[metric.key] as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const niceMin = min - range * 0.1;
  const niceMax = max + range * 0.1;
  const niceRange = niceMax - niceMin;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const getX = (i: number) =>
    padL + (i / (values.length - 1)) * chartW;
  const getY = (v: number) =>
    padT + chartH - ((v - niceMin) / niceRange) * chartH;

  const points = values.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");

  const gradientFill = values
    .map((v, i) => `${getX(i)},${getY(v)}`)
    .join(" ");
  const fillPoints = `${padL},${padT + chartH} ${gradientFill} ${
    padL + chartW
  },${padT + chartH}`;

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    const v = niceMin + (i / (yTicks - 1)) * niceRange;
    return metric.decimals === 0 ? Math.round(v) : +v.toFixed(metric.decimals);
  });

  // X-axis labels — show ~6 labels
  const labelCount = Math.min(6, data.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (data.length - 1))
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={metric.color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTickValues.map((v, i) => (
        <line
          key={i}
          x1={padL}
          y1={getY(v)}
          x2={padL + chartW}
          y2={getY(v)}
          stroke="#1e1e1e"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {yTickValues.map((v, i) => (
        <text
          key={i}
          x={padL - 10}
          y={getY(v) + 4}
          textAnchor="end"
          fill="#666"
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          {v}
        </text>
      ))}

      {/* X-axis labels */}
      {labelIndices.map((idx) => (
        <text
          key={idx}
          x={getX(idx)}
          y={height - 10}
          textAnchor="middle"
          fill="#666"
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          {formatDate(data[idx].time)}
        </text>
      ))}

      {/* Area fill */}
      <polygon points={fillPoints} fill={`url(#grad-${metric.key})`} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={metric.color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={getX(i)}
          cy={getY(v)}
          r={hoveredIndex === i ? 5 : 3}
          fill={hoveredIndex === i ? metric.color : "#0a0a0a"}
          stroke={metric.color}
          strokeWidth="2"
          style={{ cursor: "pointer", transition: "r 0.15s" }}
        />
      ))}

      {/* Hover areas */}
      {values.map((_, i) => (
        <rect
          key={`hover-${i}`}
          x={getX(i) - chartW / values.length / 2}
          y={padT}
          width={chartW / values.length}
          height={chartH}
          fill="transparent"
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
        />
      ))}

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <g>
          <line
            x1={getX(hoveredIndex)}
            y1={padT}
            x2={getX(hoveredIndex)}
            y2={padT + chartH}
            stroke={metric.color}
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.5"
          />
          <rect
            x={getX(hoveredIndex) - 50}
            y={getY(values[hoveredIndex]) - 34}
            width="100"
            height="24"
            rx="6"
            fill="#222"
            stroke="#333"
            strokeWidth="1"
          />
          <text
            x={getX(hoveredIndex)}
            y={getY(values[hoveredIndex]) - 18}
            textAnchor="middle"
            fill="#fff"
            fontSize="12"
            fontWeight="600"
            fontFamily="Inter, sans-serif"
          >
            {metric.decimals === 0
              ? values[hoveredIndex]
              : values[hoveredIndex].toFixed(metric.decimals)}{" "}
            {metric.unit}
          </text>
        </g>
      )}
    </svg>
  );
}

interface Insight {
  label: string;
  value: string;
  status: "good" | "warning" | "neutral";
  detail: string;
}

function getInsights(data: HealthRecord[], metric: MetricConfig, filteredData: HealthRecord[]): Insight[] {
  const latest = data[data.length - 1];
  const filtered = filteredData;
  const values = filtered.map((d) => d[metric.key] as number);
  const current = latest[metric.key] as number;
  const first = filtered[0]?.[metric.key] as number;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const change = current - first;

  // Calculate trend (last 5 data points slope)
  const recentN = Math.min(5, values.length);
  const recentValues = values.slice(-recentN);
  const trendSlope = recentValues.length > 1
    ? (recentValues[recentValues.length - 1] - recentValues[0]) / (recentValues.length - 1)
    : 0;

  // Calculate volatility (standard deviation)
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);

  const fmt = (v: number) => metric.decimals === 0 ? v.toFixed(0) : v.toFixed(metric.decimals);

  const insights: Insight[] = [];

  switch (metric.key) {
    case "weight": {
      const isStable = stdDev < 1;
      const trending = trendSlope > 0.1 ? "up" : trendSlope < -0.1 ? "down" : "stable";
      insights.push({
        label: "Trend",
        value: trending === "up" ? `+${fmt(trendSlope)}/reading` : trending === "down" ? `${fmt(trendSlope)}/reading` : "Stable",
        status: trending === "stable" ? "good" : "neutral",
        detail: trending === "stable"
          ? "Your weight is holding steady — great consistency."
          : trending === "up"
            ? "Weight trending up. Check if this is muscle gain (body fat stable?) or unwanted gain."
            : "Weight trending down. Confirm body fat is dropping, not muscle mass.",
      });
      insights.push({
        label: "Stability",
        value: `${fmt(stdDev)} kg variance`,
        status: isStable ? "good" : "warning",
        detail: isStable
          ? "Low fluctuation — your nutrition and training are consistent."
          : "Higher fluctuation — could be water retention, irregular meals, or training load changes.",
      });
      insights.push({
        label: "Range",
        value: `${fmt(min)} – ${fmt(max)} kg`,
        status: (max - min) < 3 ? "good" : "warning",
        detail: (max - min) < 3
          ? "Tight range shows good control over your weight."
          : `${fmt(max - min)} kg swing. Track what weeks correlate with extremes.`,
      });
      break;
    }
    case "bodyFat": {
      const athleticRange = current >= 6 && current <= 17;
      insights.push({
        label: "Athletic Range",
        value: athleticRange ? "In range" : current < 6 ? "Too low" : "Above range",
        status: athleticRange ? "good" : "warning",
        detail: athleticRange
          ? `${fmt(current)}% is within the athletic range (6-17%). You're carrying functional leanness.`
          : current < 6
            ? "Below 6% can impair performance and hormonal health. Consider increasing slightly."
            : "Above 17% for an athletic male. A slight cut could improve power-to-weight.",
      });
      insights.push({
        label: "Period Change",
        value: `${change > 0 ? "+" : ""}${fmt(change)}%`,
        status: Math.abs(change) < 1 ? "good" : change > 1 ? "warning" : "good",
        detail: Math.abs(change) < 1
          ? "Body fat is holding steady — good maintenance."
          : change > 1
            ? "Rising body fat. Revisit caloric surplus or cardio volume."
            : "Dropping body fat — ensure you're not losing muscle with it.",
      });
      break;
    }
    case "muscleMass": {
      const gaining = change > 0;
      insights.push({
        label: "Period Change",
        value: `${change > 0 ? "+" : ""}${fmt(change)} kg`,
        status: gaining ? "good" : change < -0.5 ? "warning" : "neutral",
        detail: gaining
          ? "Muscle mass is increasing — your training stimulus and recovery are working."
          : change < -0.5
            ? "Losing muscle. Check protein intake (aim 1.6-2.2g/kg/day) and training volume."
            : "Muscle mass stable. To grow, progressively overload or increase protein.",
      });
      insights.push({
        label: "Muscle-to-Weight",
        value: `${((latest.muscleMass / latest.weight) * 100).toFixed(1)}%`,
        status: (latest.muscleMass / latest.weight) > 0.75 ? "good" : "neutral",
        detail: (latest.muscleMass / latest.weight) > 0.75
          ? "Excellent muscle-to-weight ratio for an athlete."
          : "Room to improve your muscle-to-weight ratio through recomposition.",
      });
      break;
    }
    case "skeletalMuscleMass": {
      const smRatio = (latest.skeletalMuscleMass / latest.weight) * 100;
      insights.push({
        label: "SMM Ratio",
        value: `${smRatio.toFixed(1)}% of body weight`,
        status: smRatio > 40 ? "good" : smRatio > 35 ? "neutral" : "warning",
        detail: smRatio > 40
          ? "Above 40% skeletal muscle ratio — strong athletic composition."
          : "Below 40%. Focus on compound lifts and adequate protein for hypertrophy.",
      });
      insights.push({
        label: "Trend",
        value: `${change > 0 ? "+" : ""}${fmt(change)} kg`,
        status: change >= 0 ? "good" : "warning",
        detail: change >= 0
          ? "Skeletal muscle is maintained or growing — training is effective."
          : "Declining skeletal muscle. Prioritize resistance training and recovery.",
      });
      break;
    }
    case "bmr": {
      insights.push({
        label: "Daily Baseline",
        value: `${latest.bmr} kcal`,
        status: "neutral",
        detail: `You burn ~${latest.bmr} kcal/day at rest. With athletic activity, your TDEE is likely ${Math.round(latest.bmr * 1.6)}–${Math.round(latest.bmr * 1.9)} kcal/day.`,
      });
      insights.push({
        label: "Period Change",
        value: `${change > 0 ? "+" : ""}${change.toFixed(0)} kcal`,
        status: change >= 0 ? "good" : "warning",
        detail: change >= 0
          ? "BMR stable or rising — indicates maintained or increased lean mass."
          : "BMR declining may signal muscle loss. Reassess training and nutrition.",
      });
      break;
    }
    case "visceralFat": {
      const level = current;
      insights.push({
        label: "Health Level",
        value: level <= 9 ? "Healthy" : level <= 14 ? "Elevated" : "High",
        status: level <= 9 ? "good" : "warning",
        detail: level <= 9
          ? `Level ${level} is in the healthy range (1-9). Low visceral fat reduces risk of metabolic disease.`
          : `Level ${level} is elevated. Visceral fat is the most dangerous type — prioritize steady-state cardio and reduce refined carbs.`,
      });
      insights.push({
        label: "Trend",
        value: change === 0 ? "Stable" : `${change > 0 ? "+" : ""}${change.toFixed(0)}`,
        status: change <= 0 ? "good" : "warning",
        detail: change <= 0
          ? "Visceral fat stable or decreasing — keep it up."
          : "Rising visceral fat despite training. Check stress, sleep, and alcohol intake.",
      });
      break;
    }
    case "water": {
      const wellHydrated = current >= 55;
      insights.push({
        label: "Hydration",
        value: wellHydrated ? "Well hydrated" : "Low",
        status: wellHydrated ? "good" : "warning",
        detail: wellHydrated
          ? `${fmt(current)}% body water is good for athletic performance. Stay consistent.`
          : `${fmt(current)}% is on the low side. Dehydration impairs strength, endurance, and recovery. Aim for 55%+.`,
      });
      insights.push({
        label: "Stability",
        value: `${fmt(stdDev)}% variance`,
        status: stdDev < 1 ? "good" : "warning",
        detail: stdDev < 1
          ? "Consistent hydration — your fluid intake habits are solid."
          : "Fluctuating hydration. Standardize daily water intake, especially around training.",
      });
      break;
    }
  }

  return insights;
}

export function HealthDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("weight");
  const [timeRange, setTimeRange] = useState(0); // 0 = all
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filteredData = useMemo(() => {
    if (timeRange === 0) return healthData;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - timeRange);
    return healthData.filter((d) => new Date(d.time) >= cutoff);
  }, [timeRange]);

  const metric = metrics.find((m) => m.key === selectedMetric)!;
  const latest = healthData[healthData.length - 1];
  const oldest = healthData[0];

  const currentValue = latest[selectedMetric] as number;
  const firstValue = filteredData[0]?.[selectedMetric] as number;
  const change = currentValue - firstValue;
  const changeStr =
    metric.decimals === 0 ? change.toFixed(0) : change.toFixed(metric.decimals);
  const changePercent = ((change / firstValue) * 100).toFixed(1);

  const insights = useMemo(
    () => getInsights(healthData, metric, filteredData),
    [metric, filteredData]
  );

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1100 }}>
      {/* Header */}
      <div
        style={{
          marginBottom: "1.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out forwards",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "0.25rem",
          }}
        >
          Health Dashboard
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Tracking from {formatDateLong(oldest.time)} to{" "}
          {formatDateLong(latest.time)} &middot; {healthData.length} measurements
        </p>
      </div>

      {/* KPI Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.05s forwards",
        }}
      >
        {metrics.map((m) => {
          const isActive = m.key === selectedMetric;
          const val = latest[m.key] as number;
          return (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              style={{
                background: isActive ? m.color + "15" : "var(--bio-bg)",
                border: `1px solid ${isActive ? m.color + "60" : "var(--bio-border)"}`,
                borderRadius: 10,
                padding: "0.65rem 0.75rem",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                borderLeft: isActive ? `3px solid ${m.color}` : `1px solid ${isActive ? m.color + "60" : "var(--bio-border)"}`,
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color: isActive ? m.color : "var(--muted)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: isActive ? "#e8e8e8" : "var(--fg)",
                }}
              >
                {m.decimals === 0 ? val : val.toFixed(m.decimals)}
                <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: 2 }}>
                  {m.unit}
                </span>
              </span>
              <MiniChart data={healthData} metricKey={m.key} color={isActive ? m.color : m.color + "80"} />
            </button>
          );
        })}
      </div>

      {/* Chart area */}
      <div
        style={{
          background: "var(--bio-bg)",
          border: "1px solid var(--bio-border)",
          borderRadius: 14,
          padding: "1.25rem",
          marginBottom: "1.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.1s forwards",
        }}
      >
        {/* Chart header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {metric.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.75rem", fontWeight: 600 }}>
                {metric.decimals === 0
                  ? currentValue
                  : currentValue.toFixed(metric.decimals)}
              </span>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {metric.unit}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: change > 0 ? "#f87171" : change < 0 ? "#4ade80" : "var(--muted)",
                }}
              >
                {change > 0 ? "+" : ""}
                {changeStr} ({change > 0 ? "+" : ""}
                {changePercent}%)
              </span>
            </div>
          </div>

          {/* Time range selector */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {timeRanges.map((tr) => (
              <button
                key={tr.label}
                onClick={() => setTimeRange(tr.months)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor:
                    timeRange === tr.months ? metric.color : "var(--pill-border)",
                  background:
                    timeRange === tr.months ? metric.color + "20" : "transparent",
                  color:
                    timeRange === tr.months ? metric.color : "var(--muted)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {filteredData.length > 1 ? (
          <Chart
            data={filteredData}
            metric={metric}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
        ) : (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            Not enough data for this time range.
          </div>
        )}

        {/* Hovered point info */}
        {hoveredIndex !== null && filteredData[hoveredIndex] && (
          <div
            style={{
              textAlign: "center",
              fontSize: "0.8rem",
              color: "var(--muted)",
              marginTop: "0.5rem",
            }}
          >
            {formatDateLong(filteredData[hoveredIndex].time)} &middot;{" "}
            Weight: {filteredData[hoveredIndex].weight} kg &middot;{" "}
            Body Fat: {filteredData[hoveredIndex].bodyFat}% &middot;{" "}
            Muscle: {filteredData[hoveredIndex].muscleMass} kg
          </div>
        )}
      </div>

      {/* Insights */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "0.75rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.15s forwards",
        }}
      >
        {insights.map((insight) => (
          <div
            key={insight.label}
            style={{
              background: "var(--bio-bg)",
              border: "1px solid var(--bio-border)",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              borderLeft: `3px solid ${
                insight.status === "good"
                  ? "#4ade80"
                  : insight.status === "warning"
                    ? "#fbbf24"
                    : "var(--pill-border)"
              }`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.4rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--muted)",
                  fontWeight: 500,
                }}
              >
                {insight.label}
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color:
                    insight.status === "good"
                      ? "#4ade80"
                      : insight.status === "warning"
                        ? "#fbbf24"
                        : "var(--fg)",
                }}
              >
                {insight.value}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--muted)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {insight.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
