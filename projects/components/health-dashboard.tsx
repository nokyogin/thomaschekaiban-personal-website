"use client";

import { useState, useMemo } from "react";
import { healthData, HealthRecord, userProfile, getUserAge } from "@/data/health-data";
import { evaluateProblems, Problem } from "@/data/health-recommendations";

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

function getAllProblemKeys(data: HealthRecord[]): Set<MetricKey> {
  const problems = evaluateProblems(data, userProfile);
  return new Set(problems.map((p) => p.metricKey));
}

const metricExplanations: Record<MetricKey, string> = {
  weight: "Total body weight including muscle, fat, bone, and water. Best tracked as a weekly average rather than daily.",
  bodyFat: "Percentage of your body composed of fat tissue. Athletic range for males is 6-17%.",
  muscleMass: "Total mass of skeletal and smooth muscle in your body. Key driver of metabolism and athletic performance.",
  skeletalMuscleMass: "The muscle attached to your skeleton that you actively control. Directly drives strength, speed, and power output.",
  bmr: "Basal Metabolic Rate — calories your body burns at complete rest. Higher BMR means more lean mass.",
  visceralFat: "Fat stored around internal organs. Levels 1-9 are healthy. The most dangerous type of fat for long-term health.",
  water: "Percentage of your body composed of water. Above 55% indicates good hydration for athletic performance.",
  bmi: "",
  bodyFatMass: "",
  leanBodyMass: "",
  boneMass: "",
  protein: "",
  subcutaneousFat: "",
  bodyAge: "",
};

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

  const warningKeys = useMemo(() => getAllProblemKeys(healthData), []);
  const problemsByKey = useMemo(() => {
    const problems = evaluateProblems(healthData, userProfile);
    const map = new Map<MetricKey, Problem>();
    for (const p of problems) map.set(p.metricKey, p);
    return map;
  }, []);

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
          {getUserAge()} y/o &middot; {userProfile.heightCm} cm &middot;{" "}
          {formatDateLong(oldest.time)} to {formatDateLong(latest.time)} &middot;{" "}
          {healthData.length} measurements
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
          const hasWarning = warningKeys.has(m.key);
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
                gap: "0.15rem",
                borderLeft: isActive ? `3px solid ${m.color}` : `1px solid ${isActive ? m.color + "60" : "var(--bio-border)"}`,
                position: "relative",
              }}
            >
              {hasWarning && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                    boxShadow: "0 0 6px #ef444480",
                  }}
                />
              )}
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
            </button>
          );
        })}
      </div>

      {/* Metric description */}
      {(() => {
        const problem = problemsByKey.get(selectedMetric);
        return (
          <div
            style={{
              padding: "0.6rem 1rem",
              fontSize: "0.82rem",
              lineHeight: 1.6,
              color: "var(--muted)",
              marginBottom: "1rem",
              opacity: 0,
              animation: "rise 0.6s ease-out 0.07s forwards",
              background: problem ? "#ef444408" : "transparent",
              border: problem ? "1px solid #ef444420" : "none",
              borderRadius: 10,
            }}
          >
            {metricExplanations[selectedMetric]}
            {problem && (
              <>
                <div style={{ marginTop: "0.5rem", color: "#ef4444", fontWeight: 600, fontSize: "0.78rem" }}>
                  {problem.title}
                </div>
                <div style={{ marginTop: "0.25rem", color: "var(--fg)", fontSize: "0.8rem" }}>
                  {problem.action}
                </div>
              </>
            )}
          </div>
        );
      })()}

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

    </div>
  );
}
