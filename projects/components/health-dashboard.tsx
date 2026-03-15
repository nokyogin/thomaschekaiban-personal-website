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

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    const v = niceMin + (i / (yTicks - 1)) * niceRange;
    return metric.decimals === 0 ? Math.round(v) : +v.toFixed(metric.decimals);
  });

  const labelCount = Math.min(6, data.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (data.length - 1))
  );

  const tooltipText = hoveredIndex !== null
    ? `${metric.decimals === 0 ? values[hoveredIndex] : values[hoveredIndex].toFixed(metric.decimals)} ${metric.unit}`
    : "";
  const tooltipWidth = tooltipText.length * 7.5 + 16;

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

      <polygon points={fillPoints} fill={`url(#grad-${metric.key})`} />

      <polyline
        points={points}
        fill="none"
        stroke={metric.color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {values.map((v, i) => (
        <circle
          key={i}
          cx={getX(i)}
          cy={getY(v)}
          r={3}
          fill={hoveredIndex === i ? metric.color : "#0a0a0a"}
          stroke={metric.color}
          strokeWidth="2"
          style={{ cursor: "pointer" }}
        />
      ))}

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

      {hoveredIndex !== null && (
        <g>
          <rect
            x={getX(hoveredIndex) - tooltipWidth / 2}
            y={getY(values[hoveredIndex]) - 32}
            width={tooltipWidth}
            height="22"
            rx="6"
            fill="#222"
            stroke="#333"
            strokeWidth="1"
          />
          <text
            x={getX(hoveredIndex)}
            y={getY(values[hoveredIndex]) - 17}
            textAnchor="middle"
            fill="#fff"
            fontSize="11"
            fontWeight="600"
            fontFamily="Inter, sans-serif"
          >
            {tooltipText}
          </text>
          <text
            x={getX(hoveredIndex)}
            y={padT + chartH + 16}
            textAnchor="middle"
            fill="#888"
            fontSize="10"
            fontFamily="Inter, sans-serif"
          >
            {formatDate(data[hoveredIndex].time)}
          </text>
        </g>
      )}
    </svg>
  );
}

interface Problem {
  metricLabel: string;
  metricColor: string;
  severity: number;
  title: string;
  action: string;
}

function getTopProblems(data: HealthRecord[]): Problem[] {
  const latest = data[data.length - 1];
  const first = data[0];
  const values = (key: MetricKey) => data.map((d) => d[key] as number);
  const stdDev = (key: MetricKey) => {
    const vals = values(key);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.sqrt(vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / vals.length);
  };

  const problems: Problem[] = [];

  // Weight stability
  const weightStd = stdDev("weight");
  if (weightStd > 2) {
    problems.push({
      metricLabel: "Weight",
      metricColor: "#60a5fa",
      severity: weightStd,
      title: `High weight variance (${weightStd.toFixed(1)} kg)`,
      action: "Weigh yourself at the same time daily (morning, fasted). Track weekly averages. Log meals on high/low weeks — sodium and carb-heavy days cause the biggest swings.",
    });
  }

  // Body fat
  const bf = latest.bodyFat;
  if (bf > 17) {
    problems.push({
      metricLabel: "Body Fat",
      metricColor: "#f97316",
      severity: (bf - 17) * 2,
      title: `Body fat above athletic range (${bf}%)`,
      action: "Create a mild deficit (~300 kcal/day). Prioritize protein (2g/kg/day). Add 2-3 zone-2 cardio sessions/week. Cut sugary drinks and processed snacks first.",
    });
  } else if (bf < 6) {
    problems.push({
      metricLabel: "Body Fat",
      metricColor: "#f97316",
      severity: (6 - bf) * 3,
      title: `Body fat dangerously low (${bf}%)`,
      action: "Increase healthy fats (avocado, nuts, olive oil) to 25-30% of calories. Reduce training volume temporarily. Monitor hormone and energy levels.",
    });
  }

  // Muscle mass decline
  const muscleChange = latest.muscleMass - first.muscleMass;
  if (muscleChange < -0.5) {
    problems.push({
      metricLabel: "Muscle Mass",
      metricColor: "#34d399",
      severity: Math.abs(muscleChange) * 2,
      title: `Losing muscle mass (${muscleChange.toFixed(1)} kg)`,
      action: "Increase protein to 2g/kg/day. Prioritize compound lifts (squat, deadlift, press) 3-4x/week. Sleep 7-9 hours. Avoid caloric deficits steeper than 300 kcal.",
    });
  }

  // Skeletal muscle ratio
  const smRatio = (latest.skeletalMuscleMass / latest.weight) * 100;
  if (smRatio < 40) {
    problems.push({
      metricLabel: "Skeletal Muscle",
      metricColor: "#2dd4bf",
      severity: (40 - smRatio) * 0.8,
      title: `Skeletal muscle ratio below 40% (${smRatio.toFixed(1)}%)`,
      action: "Focus on compound movements 3-4x/week with progressive overload. Eat 1.8-2.2g protein/kg/day. Consider creatine monohydrate (5g/day).",
    });
  }

  // BMR decline
  const bmrChange = latest.bmr - first.bmr;
  if (bmrChange < -20) {
    problems.push({
      metricLabel: "BMR",
      metricColor: "#fb923c",
      severity: Math.abs(bmrChange) * 0.1,
      title: `BMR declining (${bmrChange} kcal)`,
      action: "Increase resistance training frequency. Eat more protein. Take a diet break if you've been cutting for >12 weeks. BMR drops signal muscle loss.",
    });
  }

  // Visceral fat
  const vf = latest.visceralFat;
  if (vf > 9) {
    problems.push({
      metricLabel: "Visceral Fat",
      metricColor: "#fb7185",
      severity: (vf - 9) * 3,
      title: `Visceral fat elevated (level ${vf})`,
      action: "Add 30 min zone-2 cardio 3-4x/week. Cut refined carbs and alcohol. Manage stress and sleep (cortisol drives visceral fat). Add fiber-rich foods.",
    });
  }

  // Hydration
  const water = latest.water;
  if (water < 55) {
    problems.push({
      metricLabel: "Water",
      metricColor: "#38bdf8",
      severity: (55 - water) * 1.5,
      title: `Low hydration (${water}%)`,
      action: "Drink 35-40ml per kg of body weight daily. Add 500ml per hour of training. Include electrolytes during intense sessions. Reduce caffeine and alcohol.",
    });
  }

  // Sort by severity descending, take top 3
  problems.sort((a, b) => b.severity - a.severity);
  return problems.slice(0, 3);
}

function getTabStatus(data: HealthRecord[], metricKey: MetricKey): "good" | "warning" | "neutral" {
  const latest = data[data.length - 1];
  const values = data.map((d) => d[metricKey] as number);
  const current = latest[metricKey] as number;
  const first = data[0]?.[metricKey] as number;
  const change = current - first;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);

  switch (metricKey) {
    case "weight":
      return stdDev > 2 ? "warning" : "good";
    case "bodyFat":
      return current > 17 ? "warning" : current < 6 ? "warning" : "good";
    case "muscleMass":
      return change < -0.5 ? "warning" : change > 0 ? "good" : "neutral";
    case "skeletalMuscleMass": {
      const ratio = (latest.skeletalMuscleMass / latest.weight) * 100;
      return ratio > 40 ? "good" : ratio > 35 ? "neutral" : "warning";
    }
    case "bmr":
      return change < -20 ? "warning" : change >= 0 ? "good" : "neutral";
    case "visceralFat":
      return current > 9 ? "warning" : "good";
    case "water":
      return current < 55 ? "warning" : "good";
    default:
      return "neutral";
  }
}

function getRecommendation(data: HealthRecord[], metric: MetricConfig, filteredData: HealthRecord[]): string | null {
  const latest = data[data.length - 1];
  const values = filteredData.map((d) => d[metric.key] as number);
  const current = latest[metric.key] as number;
  const first = filteredData[0]?.[metric.key] as number;
  const change = current - first;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);

  const recentN = Math.min(5, values.length);
  const recentValues = values.slice(-recentN);
  const trendSlope = recentValues.length > 1
    ? (recentValues[recentValues.length - 1] - recentValues[0]) / (recentValues.length - 1)
    : 0;

  switch (metric.key) {
    case "weight": {
      const trending = trendSlope > 0.1 ? "up" : trendSlope < -0.1 ? "down" : "stable";
      if (trending === "stable") return "Weight stable — keep current nutrition and training consistent.";
      if (trending === "up") return "Weight trending up. Compare with body fat — if fat% is rising, reduce ~200 kcal/day or add 2 LISS cardio sessions/week.";
      return "Weight trending down. Ensure protein is at 1.8-2.2g/kg/day and you're not losing muscle mass.";
    }
    case "bodyFat": {
      if (current >= 6 && current <= 17) return `${current.toFixed(1)}% is within the athletic range (6-17%). Maintain current diet and training balance.`;
      if (current < 6) return "Below 6% — increase healthy fats to 25-30% of calories and reduce training volume temporarily.";
      return "Above 17% — create a mild deficit (~300 kcal). Prioritize protein, add 2-3 zone-2 cardio sessions/week.";
    }
    case "muscleMass": {
      if (change > 0) return "Muscle mass increasing — training stimulus and recovery are working. Keep it up.";
      if (change < -0.5) return "Losing muscle. Increase protein to 2g/kg/day, prioritize compound lifts, and sleep 7-9 hours.";
      return "Muscle mass plateau. Add weight or reps each week. Eat at slight surplus (+200 kcal on training days).";
    }
    case "skeletalMuscleMass": {
      const smRatio = (latest.skeletalMuscleMass / latest.weight) * 100;
      if (smRatio > 40) return "Above 40% skeletal muscle ratio — strong athletic composition. Maintain current program.";
      return "Below 40%. Focus on compound movements 3-4x/week with progressive overload. Eat 1.8-2.2g protein/kg/day.";
    }
    case "bmr": {
      const tdeeAvg = Math.round(latest.bmr * 1.75);
      if (change >= 0) return `BMR stable. Your estimated TDEE is ~${tdeeAvg} kcal/day. To cut: subtract 300. To bulk: add 200-300 on training days.`;
      return "BMR declining — signals muscle loss. Increase resistance training and protein. Take a diet break if cutting >12 weeks.";
    }
    case "visceralFat": {
      if (current <= 9) return `Level ${current} is in the healthy range (1-9). Low visceral fat = low metabolic disease risk.`;
      return "Elevated visceral fat. Add 30 min zone-2 cardio 3-4x/week. Cut refined carbs, manage stress, and prioritize sleep.";
    }
    case "water": {
      if (current >= 55) return `${current.toFixed(1)}% body water — well hydrated for athletic performance. Stay consistent.`;
      return `${current.toFixed(1)}% is low. Drink 35-40ml per kg body weight daily. Add 500ml per hour of training with electrolytes.`;
    }
    default:
      return null;
  }
}

export function HealthDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("weight");
  const [timeRange, setTimeRange] = useState(0);
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

  const recommendation = useMemo(
    () => getRecommendation(healthData, metric, filteredData),
    [metric, filteredData]
  );

  const topProblems = useMemo(() => getTopProblems(healthData), []);

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
          marginBottom: "0.75rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.05s forwards",
        }}
      >
        {metrics.map((m) => {
          const isActive = m.key === selectedMetric;
          const val = latest[m.key] as number;
          const tabStatus = getTabStatus(healthData, m.key);
          const statusColor = tabStatus === "good" ? "#4ade80" : tabStatus === "warning" ? "#fbbf24" : "var(--pill-border)";
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
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: statusColor,
                  boxShadow: tabStatus === "warning" ? "0 0 6px #fbbf2480" : undefined,
                }}
              />
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

      {/* Single recommendation for selected metric */}
      {recommendation && (
        <div
          style={{
            padding: "0.6rem 1rem",
            background: metric.color + "10",
            border: `1px solid ${metric.color}30`,
            borderRadius: 10,
            marginBottom: "1.5rem",
            fontSize: "0.82rem",
            lineHeight: 1.5,
            color: "var(--muted)",
            opacity: 0,
            animation: "rise 0.6s ease-out 0.07s forwards",
          }}
        >
          <span style={{ color: metric.color, fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {metric.label}
          </span>
          {" — "}
          {recommendation}
        </div>
      )}

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
                  color: metric.color,
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
      </div>

      {/* Top 3 Problems — ordered by importance (most important on the right) */}
      {topProblems.length > 0 && (
        <div
          style={{
            opacity: 0,
            animation: "rise 0.6s ease-out 0.15s forwards",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: "0.5rem" }}>
            Top priorities
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: topProblems.length === 1 ? "1fr" : topProblems.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
              gap: "0.75rem",
            }}
          >
            {[...topProblems].reverse().map((problem, i) => (
              <div
                key={problem.metricLabel}
                style={{
                  background: "var(--bio-bg)",
                  border: "1px solid var(--bio-border)",
                  borderRadius: 12,
                  padding: "1rem 1.25rem",
                  borderLeft: `3px solid ${problem.metricColor}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      color: "#fbbf24",
                      background: "#fbbf2415",
                      padding: "0.15rem 0.4rem",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    #{topProblems.length - i}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: problem.metricColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {problem.metricLabel}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--fg)", marginBottom: "0.35rem" }}>
                  {problem.title}
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
                  {problem.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
