"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { HealthRecord, userProfile, getUserAge } from "@/data/health-data";
import { evaluateMetricHealth, generateAdvice, MetricStatus } from "@/data/health-recommendations";
import { CSVUploader } from "./csv-uploader";

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

  // Filter out 0 values (missing data from CSV imports)
  const validData = data.filter((d) => (d[metric.key] as number) > 0);
  if (validData.length < 2) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#666" fontSize="13" fontFamily="Inter, sans-serif">
          Not enough data for {metric.label}.
        </text>
      </svg>
    );
  }

  const values = validData.map((d) => d[metric.key] as number);
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

  const labelCount = Math.min(6, validData.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (validData.length - 1))
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
          {formatDate(validData[idx].time)}
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
            {formatDate(validData[hoveredIndex].time)}
          </text>
        </g>
      )}
    </svg>
  );
}

const STATUS_COLORS: Record<MetricStatus, string> = {
  green: "#34d399",
  orange: "#f59e0b",
  red: "#ef4444",
};


export function HealthDashboard() {
  const [data, setData] = useState<HealthRecord[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("weight");
  const [timeRange, setTimeRange] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [lastUploadDate, setLastUploadDate] = useState<string | null>(null);

  // Fetch from DB on mount
  useEffect(() => {
    fetch("/api/health", { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.records && res.records.length > 0) {
          setData(res.records);
        }
        setDbLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load health data:", err);
        setDbLoaded(true);
      });
  }, []);

  const hasCustomData = dbLoaded && data.length > 0;

  const handleUpload = useCallback(
    (records: HealthRecord[]) => {
      const sorted = [...records].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      setData(sorted);
      setShowUploader(false);
      setLastUploadDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
      // Persist to DB
      fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ records: sorted }),
      }).catch((err) => console.error("Failed to save health data:", err));
    },
    []
  );


  const [resetStep, setResetStep] = useState(0);
  const [resetPhrase, setResetPhrase] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = useCallback(() => {
    setShowResetModal(true);
    setResetStep(1);
    setResetPhrase("");
  }, []);

  const handleResetConfirm = useCallback(() => {
    if (resetStep === 1) { setResetStep(2); return; }
    if (resetStep === 2) { setResetStep(3); return; }
    if (resetStep === 3 && resetPhrase === "Zidane validates this data reset") {
      setData([]);
      setLastUploadDate(null);
      setResetStep(0);
      setShowResetModal(false);
      setResetPhrase("");
      fetch("/api/health", { method: "DELETE", credentials: "same-origin" }).catch(console.error);
    }
  }, [resetStep, resetPhrase]);

  const handleResetCancel = useCallback(() => {
    setShowResetModal(false);
    setResetStep(0);
    setResetPhrase("");
  }, []);

  // Listen for sidebar events
  useEffect(() => {
    const handleUploadEvent = () => setShowUploader((v) => !v);
    const handleResetEvent = () => handleReset();
    window.addEventListener("sidebar:upload", handleUploadEvent);
    window.addEventListener("sidebar:reset", handleResetEvent);
    return () => {
      window.removeEventListener("sidebar:upload", handleUploadEvent);
      window.removeEventListener("sidebar:reset", handleResetEvent);
    };
  }, [handleReset]);

  const filteredData = useMemo(() => {
    if (timeRange === 0) return data;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - timeRange);
    return data.filter((d) => new Date(d.time) >= cutoff);
  }, [timeRange, data]);

  const metric = metrics.find((m) => m.key === selectedMetric)!;
  const hasData = data.length > 0;
  const latest = hasData ? data[data.length - 1] : null;
  const oldest = hasData ? data[0] : null;

  // Use latest non-zero value as current display value
  const latestNonZeroRecord = hasData ? [...data].reverse().find((d) => (d[selectedMetric] as number) > 0) : null;
  const currentValue = latestNonZeroRecord ? (latestNonZeroRecord[selectedMetric] as number) : latest ? (latest[selectedMetric] as number) : 0;
  // Find the first non-zero value for comparison
  const firstNonZero = filteredData.find((d) => (d[selectedMetric] as number) > 0);
  const firstValue = firstNonZero ? (firstNonZero[selectedMetric] as number) : currentValue;
  const change = currentValue - firstValue;
  const changeStr =
    metric.decimals === 0 ? change.toFixed(0) : change.toFixed(metric.decimals);
  const changePercent = firstValue !== 0 ? ((change / firstValue) * 100).toFixed(1) : "0.0";

  const metricHealth = useMemo(() => evaluateMetricHealth(data, userProfile), [data]);
  const advice = useMemo(() => generateAdvice(data, userProfile), [data]);
  const [expandedAdvice, setExpandedAdvice] = useState<Record<string, boolean>>({});

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1100 }}>
      {/* Top loading bar */}
      {!dbLoaded && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            zIndex: 9999,
            background: "rgba(96, 165, 250, 0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "40%",
              background: "#60a5fa",
              borderRadius: 2,
              animation: "loadingBar 1s ease-in-out infinite",
            }}
          />
        </div>
      )}
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
          }}
        >
          Health Dashboard
        </h1>
      </div>

      {/* Loading skeleton */}
      {!dbLoaded && (
        <div style={{ opacity: 0, animation: "rise 0.4s ease-out 0.1s forwards" }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes shimmer {
              0% { background-position: -400px 0; }
              100% { background-position: 400px 0; }
            }
            .skeleton {
              background: linear-gradient(90deg, #141414 25%, #1e1e1e 50%, #141414 75%);
              background-size: 800px 100%;
              animation: shimmer 1.5s ease-in-out infinite;
              border-radius: 14px;
            }
          ` }} />
          <div className="skeleton" style={{ height: 380 }} />
        </div>
      )}

      {/* KPI Tabs */}
      {hasData && (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.05s forwards",
          alignItems: "stretch",
        }}
      >
        {metrics.map((m) => {
          const isActive = m.key === selectedMetric;
          // Show latest non-zero value for each metric
          const latestNonZero = [...data].reverse().find((d) => (d[m.key] as number) > 0);
          const val = latestNonZero ? (latestNonZero[m.key] as number) : latest ? (latest[m.key] as number) : 0;
          const health = metricHealth[m.key];
          const dotColor = STATUS_COLORS[health?.status ?? "green"];
          return (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              style={{
                background: isActive ? m.color + "15" : "var(--bio-bg)",
                border: `1.5px solid ${isActive ? m.color + "60" : "var(--bio-border)"}`,
                borderRadius: 10,
                padding: "0.65rem 0.75rem",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.15rem",
                boxShadow: isActive ? `inset 3px 0 0 ${m.color}` : "none",
                position: "relative",
                flex: "1 1 140px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dotColor,
                  boxShadow: health?.status !== "green" ? `0 0 6px ${dotColor}80` : "none",
                  opacity: health?.status === "green" ? 0.6 : 1,
                }}
              />
              <span
                style={{
                  fontSize: "0.7rem",
                  color: isActive ? m.color : "var(--muted)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  transition: "color 0.2s ease",
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: isActive ? "#e8e8e8" : "var(--fg)",
                  transition: "color 0.2s ease",
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
      )}

      {/* CSV Uploader (when toggled) */}
      {showUploader && hasData && (
        <div
          style={{
            marginBottom: "1rem",
            opacity: 0,
            animation: "rise 0.4s ease-out forwards",
          }}
        >
          <CSVUploader onUpload={handleUpload} />
        </div>
      )}

      {/* Empty state with inline uploader */}
      {!hasData && dbLoaded && (
        <div
          style={{
            opacity: 0,
            animation: "rise 0.6s ease-out 0.1s forwards",
            marginBottom: "1.5rem",
          }}
        >
          <CSVUploader onUpload={handleUpload} />
        </div>
      )}

      {/* Reset data modal — clears measurement records, keeps profile */}
      {showResetModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
          onClick={handleResetCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#1a1a1a", border: "1px solid var(--bio-border)", borderRadius: 14, padding: "1.5rem", maxWidth: 400, width: "100%", opacity: 0, animation: "rise 0.3s ease-out forwards" }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem", color: "#ef4444" }}>
              {resetStep === 1 && "Reset data?"}
              {resetStep === 2 && "Are you sure?"}
              {resetStep === 3 && "Final confirmation"}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {resetStep === 1 && "This will delete all uploaded measurement records. Your profile (height, age, sex) will not be affected."}
              {resetStep === 2 && "All measurement history will be permanently erased. There is no recovery."}
              {resetStep === 3 && (<>Type <span style={{ color: "var(--fg)", fontWeight: 600 }}>Zidane validates this data reset</span> to confirm.</>)}
            </p>
            {resetStep === 3 && (
              <input
                type="text" value={resetPhrase} onChange={(e) => setResetPhrase(e.target.value)} onPaste={(e) => e.preventDefault()}
                placeholder="Type the phrase above" autoFocus
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #ef444440", background: "var(--bio-bg)", color: "var(--fg)", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", marginBottom: "1rem" }}
              />
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={handleResetCancel} style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid var(--bio-border)", background: "transparent", color: "var(--muted)", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button
                onClick={handleResetConfirm}
                disabled={resetStep === 3 && resetPhrase !== "Zidane validates this data reset"}
                style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #ef4444", background: "#ef444420", color: "#ef4444", fontSize: "0.85rem", fontWeight: 500, cursor: resetStep === 3 && resetPhrase !== "Zidane validates this data reset" ? "default" : "pointer", fontFamily: "inherit", opacity: resetStep === 3 && resetPhrase !== "Zidane validates this data reset" ? 0.4 : 1 }}
              >
                {resetStep === 3 ? "Delete everything" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {hasData && (
      <>
      {/* Unified advice panel — 3 pillars with collapsible detail */}
      {advice && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {([advice.activity, advice.diet, advice.recovery] as const).map((item) => {
            const colorMap: Record<string, { accent: string; bg: string; border: string }> = {
              activity: { accent: "#60a5fa", bg: "#60a5fa08", border: "#60a5fa20" },
              diet: { accent: "#34d399", bg: "#34d39908", border: "#34d39920" },
              recovery: { accent: "#a78bfa", bg: "#a78bfa08", border: "#a78bfa20" },
            };
            const colors = colorMap[item.icon] ?? colorMap.activity;
            const urgencyBorder = item.urgency >= 2 ? "#ef444440" : colors.border;
            const isExpanded = expandedAdvice[item.icon] ?? false;

            // Split text: first sentence is the key takeaway, rest is detail
            const firstDot = item.text.indexOf(". ");
            const takeaway = firstDot > 0 ? item.text.slice(0, firstDot + 1) : item.text;
            const detail = firstDot > 0 ? item.text.slice(firstDot + 2) : "";

            return (
              <div
                key={item.icon}
                style={{
                  padding: "0.65rem 0.75rem",
                  background: colors.bg,
                  border: `1px solid ${urgencyBorder}`,
                  borderRadius: 10,
                  fontSize: "0.78rem",
                  lineHeight: 1.55,
                  color: "var(--muted)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: item.urgency >= 2 ? "#ef4444" : colors.accent,
                    marginBottom: "0.35rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {item.label}
                    {item.urgency >= 2 && " — Needs attention"}
                  </span>
                  {detail && (
                    <button
                      onClick={() => setExpandedAdvice((prev) => ({ ...prev, [item.icon]: !isExpanded }))}
                      style={{
                        background: "none",
                        border: "none",
                        color: colors.accent,
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "0.65rem",
                        fontFamily: "inherit",
                        opacity: 0.7,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {isExpanded ? "Less" : "More"}
                    </button>
                  )}
                </div>
                {takeaway}
                {isExpanded && detail && (
                  <div style={{ marginTop: "0.4rem", color: "var(--bio-color)" }}>
                    {detail}
                  </div>
                )}
              </div>
            );
          })}
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
      </>
      )}

    </div>
  );
}
