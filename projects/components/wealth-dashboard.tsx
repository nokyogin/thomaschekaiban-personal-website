"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { WealthEntry } from "@/data/wealth-data";

const COLORS = [
  "#60a5fa", "#34d399", "#f97316", "#a78bfa",
  "#fb7185", "#38bdf8", "#facc15", "#2dd4bf",
];

const timeRanges = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 0 },
];

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fmtFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ChartPoint {
  date: string;
  value: number;
}

function WealthChart({
  points,
  color,
  hoveredIndex,
  onHover,
  hidden = false,
}: {
  points: ChartPoint[];
  color: string;
  hoveredIndex: number | null;
  onHover: (i: number | null) => void;
  hidden?: boolean;
}) {
  const width = 800;
  const height = 300;
  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 50;

  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#666" fontSize="13" fontFamily="Inter, sans-serif">
          Not enough data to chart.
        </text>
      </svg>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const niceMin = min - range * 0.1;
  const niceMax = max + range * 0.1;
  const niceRange = niceMax - niceMin;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const getX = (i: number) => padL + (i / (values.length - 1)) * chartW;
  const getY = (v: number) => padT + chartH - ((v - niceMin) / niceRange) * chartH;

  const polyPoints = values.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");
  const fillPoints = `${padL},${padT + chartH} ${polyPoints} ${padL + chartW},${padT + chartH}`;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    return niceMin + (i / (yTicks - 1)) * niceRange;
  });

  const labelCount = Math.min(6, points.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (points.length - 1))
  );

  const tooltipText = hoveredIndex !== null ? (hidden ? "••••••" : fmt.format(values[hoveredIndex])) : "";
  const tooltipWidth = tooltipText.length * 7.5 + 16;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="wealth-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTickValues.map((v, i) => (
        <line key={i} x1={padL} y1={getY(v)} x2={padL + chartW} y2={getY(v)} stroke="#1e1e1e" strokeWidth="1" />
      ))}
      {yTickValues.map((v, i) => (
        <text key={i} x={padL - 10} y={getY(v) + 4} textAnchor="end" fill="#666" fontSize="11" fontFamily="Inter, sans-serif">
          {hidden ? "••••" : fmt.format(Math.round(v))}
        </text>
      ))}
      {labelIndices.map((idx) => (
        <text key={idx} x={getX(idx)} y={height - 10} textAnchor="middle" fill="#666" fontSize="11" fontFamily="Inter, sans-serif">
          {formatDate(points[idx].date)}
        </text>
      ))}

      <polygon points={fillPoints} fill="url(#wealth-grad)" />
      <polyline points={polyPoints} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {values.map((v, i) => (
        <circle key={i} cx={getX(i)} cy={getY(v)} r={3} fill={hoveredIndex === i ? color : "#0a0a0a"} stroke={color} strokeWidth="2" style={{ cursor: "pointer" }} />
      ))}
      {values.map((_, i) => (
        <rect key={`h-${i}`} x={getX(i) - chartW / values.length / 2} y={padT} width={chartW / values.length} height={chartH} fill="transparent" onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} />
      ))}

      {hoveredIndex !== null && (
        <g>
          <rect x={getX(hoveredIndex) - tooltipWidth / 2} y={getY(values[hoveredIndex]) - 32} width={tooltipWidth} height="22" rx="6" fill="#222" stroke="#333" strokeWidth="1" />
          <text x={getX(hoveredIndex)} y={getY(values[hoveredIndex]) - 17} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
            {tooltipText}
          </text>
          <text x={getX(hoveredIndex)} y={padT + chartH + 16} textAnchor="middle" fill="#888" fontSize="10" fontFamily="Inter, sans-serif">
            {formatDate(points[hoveredIndex].date)}
          </text>
        </g>
      )}
    </svg>
  );
}

function AddEntryForm({
  categories,
  onAdd,
}: {
  categories: string[];
  onAdd: (category: string, amount: number) => void;
}) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = isCreatingNew ? newCatName.trim() : selectedCat;
    const num = parseFloat(amount);
    if (!cat || isNaN(num)) return;
    onAdd(cat, num);
    setAmount("");
    setSelectedCat(null);
    setNewCatName("");
    setIsCreatingNew(false);
  };

  const handleCancel = () => {
    setSelectedCat(null);
    setIsCreatingNew(false);
    setAmount("");
    setNewCatName("");
  };

  const activeCat = isCreatingNew ? newCatName.trim() : selectedCat;
  const showAmountInput = selectedCat !== null || isCreatingNew;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Category chips + New button */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", flex: 1 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setNewCatName("");
                setSelectedCat(selectedCat === cat ? null : cat);
                setAmount("");
              }}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: 100,
                border: `1px solid ${selectedCat === cat ? "#60a5fa" : "#333"}`,
                background: selectedCat === cat ? "#60a5fa20" : "transparent",
                color: selectedCat === cat ? "#60a5fa" : "#999",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedCat(null);
            setIsCreatingNew(!isCreatingNew);
            setAmount("");
            setNewCatName("");
          }}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: 8,
            border: `1px solid ${isCreatingNew ? "#34d399" : "#333"}`,
            background: isCreatingNew ? "#34d39920" : "transparent",
            color: isCreatingNew ? "#34d399" : "#999",
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
        </button>
      </div>

      {/* New category name input */}
      {isCreatingNew && (
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Category name (e.g. Cash)"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
          }}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: 8,
            border: "1px solid #34d39960",
            background: "#0a0a0a",
            color: "var(--fg)",
            fontSize: "0.85rem",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      )}

      {/* Amount input row */}
      {showAmountInput && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            input[type=number]::-webkit-inner-spin-button,
            input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            input[type=number] { -moz-appearance: textfield; }
          ` }} />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`New amount for ${activeCat || "..."}`}
            step="any"
            autoFocus={!isCreatingNew}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#0a0a0a",
              color: "var(--fg)",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!activeCat || !amount}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid #60a5fa60",
              background: "#60a5fa20",
              color: "#60a5fa",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: activeCat && amount ? "pointer" : "default",
              fontFamily: "inherit",
              transition: "all 0.15s",
              opacity: activeCat && amount ? 1 : 0.4,
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: "0.5rem",
              borderRadius: 8,
              border: "1px solid #333",
              background: "transparent",
              color: "#888",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}

export function WealthDashboard() {
  const [entries, setEntries] = useState<WealthEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [resetPhrase, setResetPhrase] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [amountsHidden, setAmountsHidden] = useState(true);
  const [showUnhideConfirm, setShowUnhideConfirm] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [draggedCat, setDraggedCat] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wealth", { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.entries && res.entries.length > 0) {
          setEntries(res.entries);
        }
        setDbLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load wealth data:", err);
        setDbLoaded(true);
      });
  }, []);

  const categoriesRaw = useMemo(() => {
    const set = new Set(entries.map((e) => e.category));
    return Array.from(set).sort();
  }, [entries]);

  // Sync categoryOrder when new categories appear
  useEffect(() => {
    setCategoryOrder((prev) => {
      const existing = prev.filter((c) => categoriesRaw.includes(c));
      const newCats = categoriesRaw.filter((c) => !prev.includes(c));
      return [...existing, ...newCats];
    });
  }, [categoriesRaw]);

  const categories = categoryOrder;

  const categoryColors = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c, i) => {
      map[c] = COLORS[i % COLORS.length];
    });
    return map;
  }, [categories]);

  // Latest value per category
  const latestByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.category] = e.amount;
    }
    return map;
  }, [entries]);

  const totalWealth = useMemo(() => {
    return Object.values(latestByCategory).reduce((a, b) => a + b, 0);
  }, [latestByCategory]);

  // Build chart data: carry-forward time series
  const chartPoints = useMemo(() => {
    if (entries.length === 0) return [];

    const sorted = [...entries].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    // Build running state per date
    const state: Record<string, number> = {};
    const dateValues: { date: string; values: Record<string, number> }[] = [];
    let lastDate = "";

    for (const e of sorted) {
      const date = e.recordedAt.slice(0, 10);
      state[e.category] = e.amount;

      if (date !== lastDate) {
        dateValues.push({ date, values: { ...state } });
        lastDate = date;
      } else {
        // Update the last entry for this date
        dateValues[dateValues.length - 1].values = { ...state };
      }
    }

    // Filter by selected category or total
    if (selectedCategory) {
      return dateValues
        .filter((d) => d.values[selectedCategory] !== undefined)
        .map((d) => ({
          date: d.date,
          value: d.values[selectedCategory],
        }));
    }

    return dateValues.map((d) => ({
      date: d.date,
      value: Object.values(d.values).reduce((a, b) => a + b, 0),
    }));
  }, [entries, selectedCategory]);

  const filteredPoints = useMemo(() => {
    if (timeRange === 0) return chartPoints;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - timeRange);
    return chartPoints.filter((p) => new Date(p.date) >= cutoff);
  }, [timeRange, chartPoints]);

  const hasData = entries.length > 0;

  const handleAdd = useCallback(
    (category: string, amount: number) => {
      fetch("/api/wealth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ category, amount }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.entry) {
            setEntries((prev) => [...prev, res.entry]);
          }
        })
        .catch((err) => console.error("Failed to add wealth entry:", err));
    },
    []
  );

  const handleReset = useCallback(() => {
    setShowResetModal(true);
    setResetStep(1);
    setResetPhrase("");
  }, []);

  const handleResetConfirm = useCallback(() => {
    if (resetStep === 1) {
      setResetStep(2);
      return;
    }
    if (resetStep === 2) {
      setResetStep(3);
      return;
    }
    if (resetStep === 3 && resetPhrase === "Zidane validates this data reset") {
      setEntries([]);
      setSelectedCategory(null);
      setResetStep(0);
      setShowResetModal(false);
      setResetPhrase("");
      fetch("/api/wealth", { method: "DELETE", credentials: "same-origin" }).catch(console.error);
    }
  }, [resetStep, resetPhrase]);

  const handleResetCancel = useCallback(() => {
    setShowResetModal(false);
    setResetStep(0);
    setResetPhrase("");
  }, []);

  // Listen for sidebar events
  useEffect(() => {
    const handleToggle = () => {
      if (amountsHidden) {
        setShowUnhideConfirm(true);
      } else {
        setAmountsHidden(true);
      }
    };
    window.addEventListener("sidebar:toggle-amounts", handleToggle);
    window.addEventListener("sidebar:reset", handleReset);
    return () => {
      window.removeEventListener("sidebar:toggle-amounts", handleToggle);
      window.removeEventListener("sidebar:reset", handleReset);
    };
  }, [amountsHidden, handleReset]);

  const handleReorder = useCallback((fromCat: string, toCat: string) => {
    setCategoryOrder((prev) => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(fromCat);
      const toIdx = arr.indexOf(toCat);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, fromCat);
      return arr;
    });
  }, []);

  const maskAmount = (value: number) => amountsHidden ? "••••••" : fmt.format(value);
  const maskAmountFull = (value: number) => amountsHidden ? "••••••" : fmtFull.format(value);

  const currentColor = selectedCategory ? categoryColors[selectedCategory] : "#60a5fa";
  const currentValue = selectedCategory
    ? latestByCategory[selectedCategory] ?? 0
    : totalWealth;

  // Change calculation
  const firstPoint = filteredPoints.length > 0 ? filteredPoints[0].value : currentValue;
  const change = currentValue - firstPoint;
  const changePercent = firstPoint !== 0 ? ((change / firstPoint) * 100).toFixed(1) : "0.0";

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
          Wealth Dashboard
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

      {/* Category tabs */}
      {hasData && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            opacity: 0,
            animation: "rise 0.6s ease-out 0.05s forwards",
            overflowX: "auto",
            alignItems: "stretch",
          }}
        >
          {/* Net Worth tab — non-draggable, inverted colors to stand out */}
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              background: selectedCategory === null
                ? "#e8e8e8"
                : "#e8e8e810",
              border: `1.5px solid ${selectedCategory === null ? "#e8e8e8" : "#e8e8e825"}`,
              borderRadius: 10,
              padding: "0.75rem 1rem",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
              flexShrink: 0,
              minWidth: 150,
              flex: 1.3,
              boxShadow: selectedCategory === null
                ? "none"
                : "none",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                color: selectedCategory === null ? "#111" : "#e8e8e860",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                transition: "color 0.2s ease",
              }}
            >
              Net Worth
            </span>
            <span
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: selectedCategory === null ? "#111" : "var(--fg)",
                transition: "color 0.2s ease",
                letterSpacing: "-0.01em",
              }}
            >
              {maskAmount(totalWealth)}
            </span>
          </button>

          {/* Per-category tabs — draggable */}
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const color = categoryColors[cat];
            const isDragging = draggedCat === cat;
            const isDragOver = dragOverCat === cat;
            return (
              <button
                key={cat}
                draggable
                onDragStart={() => setDraggedCat(cat)}
                onDragEnd={() => { setDraggedCat(null); setDragOverCat(null); }}
                onDragOver={(e) => { e.preventDefault(); setDragOverCat(cat); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedCat && draggedCat !== cat) handleReorder(draggedCat, cat);
                  setDraggedCat(null);
                  setDragOverCat(null);
                }}
                onClick={() => setSelectedCategory(isActive ? null : cat)}
                style={{
                  background: isActive ? color + "15" : "var(--bio-bg)",
                  border: `1.5px solid ${isActive ? color + "60" : isDragOver ? color + "80" : "var(--bio-border)"}`,
                  borderRadius: 10,
                  padding: "0.65rem 0.75rem",
                  cursor: isDragging ? "grabbing" : "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                  opacity: isDragging ? 0.5 : 1,
                  flexShrink: 0,
                  minWidth: 130,
                  flex: 1,
                  boxShadow: isActive ? `inset 3px 0 0 ${color}` : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: isActive ? color : "var(--muted)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    transition: "color 0.2s ease",
                  }}
                >
                  {cat}
                </span>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: isActive ? "#e8e8e8" : "var(--fg)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {maskAmount(latestByCategory[cat] ?? 0)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Update Amounts — category-first flow */}
      {hasData && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: "#111",
            border: "1px solid #222",
            borderRadius: 12,
            opacity: 0,
            animation: "rise 0.4s ease-out 0.1s forwards",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>
            Update Amounts
          </div>
          <AddEntryForm categories={categories} onAdd={handleAdd} />
        </div>
      )}

      {/* Empty state with inline add form */}
      {!hasData && dbLoaded && (
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 14,
            padding: "2rem",
            marginBottom: "1.5rem",
            opacity: 0,
            animation: "rise 0.6s ease-out 0.1s forwards",
          }}
        >
          <div style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "0.75rem" }}>
            Add your first entry
          </div>
          <AddEntryForm categories={[]} onAdd={handleAdd} />
        </div>
      )}

      {/* Unhide confirmation modal */}
      {showUnhideConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowUnhideConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a",
              border: "1px solid var(--bio-border)",
              borderRadius: 14,
              padding: "1.5rem",
              maxWidth: 360,
              width: "100%",
              opacity: 0,
              animation: "rise 0.3s ease-out forwards",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Show amounts?
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              This will reveal all financial amounts on the dashboard. Make sure no one is looking over your shoulder.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowUnhideConfirm(false)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--bio-border)",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setAmountsHidden(false);
                  setShowUnhideConfirm(false);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid #60a5fa60",
                  background: "#60a5fa20",
                  color: "#60a5fa",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Show amounts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset data modal */}
      {showResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={handleResetCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a",
              border: "1px solid var(--bio-border)",
              borderRadius: 14,
              padding: "1.5rem",
              maxWidth: 400,
              width: "100%",
              opacity: 0,
              animation: "rise 0.3s ease-out forwards",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem", color: "#ef4444" }}>
              {resetStep === 1 && "Reset data?"}
              {resetStep === 2 && "Are you sure?"}
              {resetStep === 3 && "Final confirmation"}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {resetStep === 1 && "This will permanently delete all wealth data. This action cannot be undone."}
              {resetStep === 2 && "All categories, entries, and history will be permanently erased. There is no recovery."}
              {resetStep === 3 && (
                <>Type <span style={{ color: "var(--fg)", fontWeight: 600 }}>Zidane validates this data reset</span> to confirm.</>
              )}
            </p>
            {resetStep === 3 && (
              <input
                type="text"
                value={resetPhrase}
                onChange={(e) => setResetPhrase(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder="Type the phrase above"
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid #ef444440",
                  background: "var(--bio-bg)",
                  color: "var(--fg)",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  outline: "none",
                  marginBottom: "1rem",
                }}
              />
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={handleResetCancel}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--bio-border)",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetStep === 3 && resetPhrase !== "Zidane validates this data reset"}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid #ef4444",
                  background: "#ef444420",
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: resetStep === 3 && resetPhrase !== "Zidane validates this data reset" ? "default" : "pointer",
                  fontFamily: "inherit",
                  opacity: resetStep === 3 && resetPhrase !== "Zidane validates this data reset" ? 0.4 : 1,
                }}
              >
                {resetStep === 3 ? "Delete everything" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {hasData && (
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
                {selectedCategory ?? "Net Worth"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.75rem", fontWeight: 600 }}>
                  {maskAmountFull(currentValue)}
                </span>
                {!amountsHidden && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: currentColor,
                    }}
                  >
                    {change > 0 ? "+" : ""}
                    {fmt.format(change)} ({change > 0 ? "+" : ""}
                    {changePercent}%)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.25rem" }}>
              {timeRanges.map((tr) => (
                <button
                  key={tr.label}
                  onClick={() => setTimeRange(tr.months)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: timeRange === tr.months ? currentColor : "var(--pill-border)",
                    background: timeRange === tr.months ? currentColor + "20" : "transparent",
                    color: timeRange === tr.months ? currentColor : "var(--muted)",
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

          {filteredPoints.length > 1 ? (
            <WealthChart
              points={filteredPoints}
              color={currentColor}
              hoveredIndex={hoveredIndex}
              onHover={setHoveredIndex}
              hidden={amountsHidden}
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
      )}
    </div>
  );
}
