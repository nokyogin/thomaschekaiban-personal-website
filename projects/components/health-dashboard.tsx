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

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.05s forwards",
        }}
      >
        {[
          { label: "Weight", value: `${latest.weight} kg`, sub: `Body Fat ${latest.bodyFat}%`, color: "#60a5fa" },
          { label: "Body Fat", value: `${latest.bodyFat}%`, sub: `Visceral ${latest.visceralFat}`, color: "#f97316" },
          { label: "Muscle Mass", value: `${latest.muscleMass} kg`, sub: `Skeletal ${latest.skeletalMuscleMass} kg`, color: "#34d399" },
          { label: "Skeletal Muscle", value: `${latest.skeletalMuscleMass} kg`, sub: `Water ${latest.water}%`, color: "#2dd4bf" },
          { label: "Visceral Fat", value: `${latest.visceralFat}`, sub: `BMR ${latest.bmr} kcal`, color: "#fb7185" },
          { label: "BMR", value: `${latest.bmr}`, sub: "kcal/day", color: "#fb923c" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--bio-bg)",
              border: "1px solid var(--bio-border)",
              borderRadius: 12,
              padding: "1rem",
              borderLeft: `3px solid ${card.color}`,
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {card.label}
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 600 }}>
              {card.value}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {card.sub}
            </div>
          </div>
        ))}
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

      {/* Metric selector grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "0.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.15s forwards",
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
                padding: "0.75rem",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: isActive ? m.color : "var(--muted)",
                    fontWeight: 500,
                  }}
                >
                  {m.label}
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: isActive ? "#e8e8e8" : "var(--fg)",
                  }}
                >
                  {m.decimals === 0 ? val : val.toFixed(m.decimals)}
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: 2 }}>
                    {m.unit}
                  </span>
                </span>
              </div>
              <MiniChart data={healthData} metricKey={m.key} color={m.color} />
            </button>
          );
        })}
      </div>

      {/* Data table */}
      <div
        style={{
          marginTop: "1.5rem",
          background: "var(--bio-bg)",
          border: "1px solid var(--bio-border)",
          borderRadius: 14,
          overflow: "hidden",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.2s forwards",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem 0.75rem",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          Recent Measurements
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderTop: "1px solid var(--bio-border)",
                  borderBottom: "1px solid var(--bio-border)",
                }}
              >
                {["Date", "Weight", "Body Fat", "Muscle", "Skel. Muscle", "BMR", "V.Fat", "Water"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.6rem 0.75rem",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {[...healthData].reverse().slice(0, 15).map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--bio-border)",
                  }}
                >
                  <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>
                    {formatDateLong(row.time)}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{row.weight}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{row.bodyFat}%</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{row.muscleMass}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{row.skeletalMuscleMass}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{row.bmr}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{row.visceralFat}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{row.water}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
