"use client";

import { useState, useCallback, useEffect } from "react";
import { RollEntry } from "@/data/roll-data";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RollDashboard() {
  const [rolls, setRolls] = useState<RollEntry[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/roll", { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.rolls) setRolls(res.rolls);
        setDbLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load rolls:", err);
        setDbLoaded(true);
      });
  }, []);

  const handleRoll = useCallback(async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/roll", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (data.entry) {
        setRolls((prev) => [data.entry, ...prev]);
      }
    } catch (err) {
      console.error("Failed to record roll:", err);
    }
    setAdding(false);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await fetch(`/api/roll?id=${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      setRolls((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete roll:", err);
    }
  }, []);

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 540 }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", opacity: 0, animation: "rise 0.6s ease-out forwards" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em" }}>
          Roule Thomas Roule
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

      {dbLoaded && (
        <>
          {/* Counter + Roll button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.5rem",
              background: "var(--bio-bg)",
              border: "1px solid var(--bio-border)",
              borderRadius: 14,
              marginBottom: "1rem",
              opacity: 0,
              animation: "rise 0.6s ease-out 0.05s forwards",
            }}
          >
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: "0.25rem" }}>
                Total rolls
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1 }}>
                {rolls.length}
              </div>
            </div>
            <button
              onClick={handleRoll}
              disabled={adding}
              style={{
                padding: "0.75rem 2rem",
                borderRadius: 10,
                border: "none",
                background: "#60a5fa",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: adding ? "wait" : "pointer",
                transition: "background 0.15s, transform 0.1s",
                opacity: adding ? 0.7 : 1,
              }}
            >
              {adding ? "..." : "Roll"}
            </button>
          </div>

          {/* History */}
          <div
            style={{
              background: "var(--bio-bg)",
              border: "1px solid var(--bio-border)",
              borderRadius: 14,
              opacity: 0,
              animation: "rise 0.6s ease-out 0.1s forwards",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bio-border)", fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
              History
            </div>
            {rolls.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
                No rolls yet. Hit that button.
              </div>
            ) : (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                {rolls.map((roll, i) => (
                  <div
                    key={roll.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      borderBottom: i < rolls.length - 1 ? "1px solid var(--bio-border)" : "none",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", fontVariantNumeric: "tabular-nums", minWidth: 28 }}>
                        #{rolls.length - i}
                      </span>
                      <span style={{ color: "var(--fg)" }}>
                        {formatDate(roll.rolledAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(roll.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "4px 6px",
                        borderRadius: 4,
                        transition: "color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#ef444415"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "transparent"; }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
