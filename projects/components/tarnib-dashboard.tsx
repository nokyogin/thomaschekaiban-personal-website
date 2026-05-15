"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

const STORAGE_KEY = "tarnib_v1";

interface Round {
  bidder: 1 | 2;
  bid: number;
  bidderTricks: number;
  t1: number;
  t2: number;
  made: boolean;
}

interface GameState {
  target: 31 | 61;
  t1Name: string;
  t2Name: string;
  rounds: Round[];
  baseline: { t1: number; t2: number };
}

function scoreRound(bidder: 1 | 2, bid: number, tricks: number) {
  const made = tricks >= bid;
  const bidderScore = made ? tricks : -bid;
  const opponentScore = made ? 0 : 13 - tricks;
  return bidder === 1
    ? { t1: bidderScore, t2: opponentScore, made }
    : { t1: opponentScore, t2: bidderScore, made };
}

export function TarnibDashboard() {
  const [game, setGame] = useState<GameState>({
    target: 31,
    t1Name: "Team 1",
    t2Name: "Team 2",
    rounds: [],
    baseline: { t1: 0, t2: 0 },
  });

  const [step, setStep] = useState(1);
  const [bidder, setBidder] = useState<1 | 2 | null>(null);
  const [bid, setBid] = useState<number | null>(null);
  const [tricks, setTricks] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [armed, setArmed] = useState<{ undo: boolean; reset: boolean }>({ undo: false, reset: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setGame((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const save = useCallback((g: GameState) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch {}
  }, []);

  const updateGame = useCallback((fn: (prev: GameState) => GameState) => {
    setGame((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, [save]);

  const totals = useMemo(() => {
    const sum = game.rounds.reduce(
      (a, r) => ({ t1: a.t1 + r.t1, t2: a.t2 + r.t2 }),
      { t1: 0, t2: 0 }
    );
    return { t1: sum.t1 + game.baseline.t1, t2: sum.t2 + game.baseline.t2 };
  }, [game.rounds, game.baseline]);

  const winner = useMemo(() => {
    if (totals.t1 >= game.target && totals.t2 >= game.target) {
      const last = game.rounds[game.rounds.length - 1];
      return last ? last.bidder : totals.t1 > totals.t2 ? 1 : totals.t2 > totals.t1 ? 2 : null;
    }
    if (totals.t1 >= game.target) return 1;
    if (totals.t2 >= game.target) return 2;
    return null;
  }, [totals, game.target, game.rounds]);

  const outcome = useMemo(() => {
    if (!bid || tricks === null || !bidder) return null;
    return scoreRound(bidder, bid, tricks);
  }, [bidder, bid, tricks]);

  const handleRecord = useCallback(() => {
    if (!bidder || !bid || tricks === null) return;
    const r = scoreRound(bidder, bid, tricks);
    updateGame((prev) => ({
      ...prev,
      rounds: [...prev.rounds, { bidder, bid, bidderTricks: tricks, t1: r.t1, t2: r.t2, made: r.made }],
    }));
    setStep(1);
    setBidder(null);
    setBid(null);
    setTricks(null);
  }, [bidder, bid, tricks, updateGame]);

  const handleTeamClick = useCallback((team: 1 | 2) => {
    if (step !== 1) return;
    setBidder(team);
    setStep(2);
  }, [step]);

  const handleBidClick = useCallback((b: number) => {
    if (step !== 2) return;
    setBid(b);
    setTricks(b);
    setStep(3);
  }, [step]);

  const handleBack = useCallback((toStep: number) => {
    setStep(toStep);
    if (toStep <= 2) { setBid(null); setTricks(null); }
    if (toStep <= 1) { setBidder(null); }
  }, []);

  const handleUndo = useCallback(() => {
    if (game.rounds.length === 0) return;
    if (armed.undo) {
      updateGame((prev) => ({ ...prev, rounds: prev.rounds.slice(0, -1) }));
      setArmed((a) => ({ ...a, undo: false }));
    } else {
      setArmed((a) => ({ ...a, undo: true }));
      setTimeout(() => setArmed((a) => ({ ...a, undo: false })), 2500);
    }
  }, [armed.undo, game.rounds.length, updateGame]);

  const handleReset = useCallback(() => {
    if (armed.reset) {
      updateGame((prev) => ({ ...prev, rounds: [], baseline: { t1: 0, t2: 0 } }));
      setStep(1); setBidder(null); setBid(null); setTricks(null);
      setArmed((a) => ({ ...a, reset: false }));
    } else {
      setArmed((a) => ({ ...a, reset: true }));
      setTimeout(() => setArmed((a) => ({ ...a, reset: false })), 2500);
    }
  }, [armed.reset, updateGame]);

  const handleDeleteRound = useCallback((idx: number, el: HTMLButtonElement) => {
    if (el.dataset.armed === "1") {
      updateGame((prev) => ({ ...prev, rounds: prev.rounds.filter((_, i) => i !== idx) }));
    } else {
      el.dataset.armed = "1";
      el.style.background = "var(--danger-soft, #fee2e2)";
      el.style.color = "var(--danger, #ef4444)";
      el.textContent = "✓";
      setTimeout(() => {
        el.dataset.armed = "0";
        el.style.background = "";
        el.style.color = "";
        el.textContent = "✕";
      }, 2000);
    }
  }, [updateGame]);

  const bidderName = bidder === 1 ? game.t1Name : bidder === 2 ? game.t2Name : "";

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 460, margin: "0 auto" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .tarnib-vars {
          --surface: #141414;
          --surface-2: #1a1a1a;
          --border: #2a2a2a;
          --border-strong: #3a3a3a;
          --text: #e8e8e8;
          --text-2: #888;
          --text-3: #555;
          --primary: #6366f1;
          --primary-hover: #5558e6;
          --primary-soft: #6366f115;
          --success: #34d399;
          --success-soft: #34d39915;
          --danger: #ef4444;
          --danger-soft: #ef444415;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
          --radius: 10px;
          --radius-sm: 8px;
        }
      ` }} />

      <div className="tarnib-vars">
        {/* Header */}
        <div style={{ marginBottom: "1.5rem", opacity: 0, animation: "rise 0.6s ease-out forwards" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Tarnib Score Keeper
          </h1>
        </div>

        {/* Goal selector */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.03s forwards" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 10px" }}>
            <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>Goal</span>
            <select
              value={game.target}
              onChange={(e) => updateGame((g) => ({ ...g, target: parseInt(e.target.value) as 31 | 61 }))}
              style={{ background: "transparent", border: "none", color: "var(--text)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, outline: "none", cursor: "pointer" }}
            >
              <option value={31}>31</option>
              <option value={61}>61</option>
            </select>
          </div>
        </div>

        {/* Scoreboard */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.25rem", opacity: 0, animation: "rise 0.6s ease-out 0.05s forwards" }}>
          {([1, 2] as const).map((team) => {
            const isWinner = winner === team;
            const isBidder = bidder === team && !isWinner;
            const score = team === 1 ? totals.t1 : totals.t2;
            const name = team === 1 ? game.t1Name : game.t2Name;
            return (
              <button
                key={team}
                onClick={() => handleTeamClick(team)}
                style={{
                  background: isWinner ? "var(--success-soft)" : isBidder ? "var(--primary-soft)" : "var(--surface)",
                  border: `1.5px solid ${isWinner ? "var(--success)" : isBidder ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  padding: "14px",
                  cursor: step === 1 ? "pointer" : "default",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <input
                    type="text"
                    value={name}
                    maxLength={16}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateGame((g) => ({ ...g, [team === 1 ? "t1Name" : "t2Name"]: e.target.value || `Team ${team}` }))}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px dashed var(--border-strong)",
                      color: isBidder ? "var(--primary)" : "var(--text-2)",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      width: "70%",
                      padding: "0 0 2px 0",
                      outline: "none",
                    }}
                  />
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                    padding: "2px 6px", borderRadius: 4,
                    background: isWinner ? "var(--success)" : "var(--primary)",
                    color: "white",
                    opacity: isWinner || isBidder ? 1 : 0,
                    transition: "opacity 0.15s",
                  }}>
                    {isWinner ? "Winner" : "Bidder"}
                  </span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", color: score < 0 ? "var(--danger)" : "var(--text)" }}>
                  {score}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                  {score} / {game.target}
                </div>
              </button>
            );
          })}
        </div>

        {/* New Round Card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: 14, opacity: 0, animation: "rise 0.6s ease-out 0.1s forwards" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>New round</span>
            <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 500, background: "var(--surface-2)", padding: "2px 8px", borderRadius: 10 }}>Step {step} of 3</span>
          </div>
          <div style={{ padding: 16 }}>

            {/* Step 1: Pick bidder */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Who is bidding?</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>Tap a team card above to select the bidder</div>
              </div>
            )}

            {/* Step 2: Pick bid */}
            {step === 2 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "var(--text-2)" }}>
                  <span><b style={{ color: "var(--text)", fontWeight: 600 }}>{bidderName}</b> is bidding</span>
                  <button onClick={() => handleBack(1)} style={{ background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 4 }}>Change</button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Pick the bid</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                  {[7, 8, 9, 10, 11, 12, 13].map((b) => (
                    <button
                      key={b}
                      onClick={() => handleBidClick(b)}
                      style={{
                        background: bid === b ? "var(--primary)" : "var(--surface)",
                        border: `1px solid ${bid === b ? "var(--primary)" : "var(--border)"}`,
                        color: bid === b ? "white" : "var(--text)",
                        fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                        padding: "9px 0", borderRadius: "var(--radius-sm)", cursor: "pointer",
                        transition: "all 0.1s",
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Tricks + record */}
            {step === 3 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "var(--text-2)" }}>
                  <span><b style={{ color: "var(--text)", fontWeight: 600 }}>{bidderName}</b> bid <b style={{ color: "var(--primary)", fontWeight: 600 }}>{bid}</b></span>
                  <button onClick={() => handleBack(2)} style={{ background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 4 }}>Change</button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>How many tricks did the bidder win?</div>

                {/* Stepper */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{bidderName}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>out of 13 total</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      disabled={tricks === null || tricks <= 0}
                      onClick={() => setTricks((t) => (t !== null && t > 0 ? t - 1 : t))}
                      style={{ width: 28, height: 28, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: "pointer", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: tricks === null || tricks <= 0 ? 0.4 : 1 }}
                    >−</button>
                    <span style={{ fontSize: 18, fontWeight: 700, minWidth: 28, textAlign: "center", fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{tricks ?? "—"}</span>
                    <button
                      disabled={tricks !== null && tricks >= 13}
                      onClick={() => setTricks((t) => t !== null && t < 13 ? t + 1 : t)}
                      style={{ width: 28, height: 28, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 16, cursor: "pointer", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: tricks !== null && tricks >= 13 ? 0.4 : 1 }}
                    >+</button>
                  </div>
                </div>

                {/* Outcome preview */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", marginBottom: 14, fontSize: 13, color: "var(--text-2)", minHeight: 40 }}>
                  {outcome ? (
                    <>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4,
                        fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em",
                        background: outcome.made ? "var(--success-soft)" : "var(--danger-soft)",
                        color: outcome.made ? "var(--success)" : "var(--danger)",
                      }}>
                        {outcome.made ? "Success" : "Fail"}
                      </span>
                      <span>
                        {outcome.made ? (
                          <><b style={{ color: "var(--text)", fontWeight: 600 }}>{bidderName}</b> +{bidder === 1 ? outcome.t1 : outcome.t2} pts</>
                        ) : (
                          <><b style={{ color: "var(--text)", fontWeight: 600 }}>{bidderName}</b> {bidder === 1 ? outcome.t1 : outcome.t2} · <b style={{ color: "var(--text)", fontWeight: 600 }}>{bidder === 1 ? game.t2Name : game.t1Name}</b> +{bidder === 1 ? outcome.t2 : outcome.t1}</>
                        )}
                      </span>
                    </>
                  ) : (
                    <span>Set the tricks to preview the outcome</span>
                  )}
                </div>

                <button
                  onClick={handleRecord}
                  disabled={!bid || tricks === null}
                  style={{
                    width: "100%", background: !bid || tricks === null ? "var(--border)" : "var(--primary)",
                    color: !bid || tricks === null ? "var(--text-3)" : "white",
                    border: "none", padding: 11, fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                    borderRadius: "var(--radius-sm)", cursor: !bid || tricks === null ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  Record round
                </button>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", opacity: 0, animation: "rise 0.6s ease-out 0.15s forwards" }}>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={{ width: "100%", background: "transparent", border: "none", padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              Round history
              <span style={{ background: "var(--surface-2)", color: "var(--text-2)", fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 10 }}>{game.rounds.length}</span>
            </span>
            <span style={{ color: "var(--text-3)", transition: "transform 0.2s", transform: historyOpen ? "rotate(180deg)" : "none", fontSize: 12 }}>▾</span>
          </button>

          {historyOpen && (
            <div style={{ borderTop: "1px solid var(--border)", maxHeight: "60vh", overflowY: "auto" }}>
              {game.rounds.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>No rounds recorded yet</div>
              ) : (
                game.rounds.map((r, i) => {
                  const name = r.bidder === 1 ? game.t1Name : game.t2Name;
                  const delta = r.bidder === 1 ? r.t1 : r.t2;
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto auto", gap: 10, alignItems: "center", padding: "12px 16px", borderBottom: i < game.rounds.length - 1 ? "1px solid var(--border)" : "none", fontSize: 13 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>#{i + 1}</div>
                      <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.4 }}>
                        <b style={{ color: "var(--text)", fontWeight: 600 }}>{name}</b> bid <b style={{ color: "var(--text)", fontWeight: 600 }}>{r.bid}</b>, won <b style={{ color: "var(--text)", fontWeight: 600 }}>{r.bidderTricks}</b>
                        {" "}
                        <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", background: r.made ? "var(--success-soft)" : "var(--danger-soft)", color: r.made ? "var(--success)" : "var(--danger)" }}>
                          {r.made ? "success" : "fail"}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums", color: delta > 0 ? "var(--success)" : delta < 0 ? "var(--danger)" : "var(--text-3)" }}>
                        {delta > 0 ? "+" : ""}{delta}
                      </div>
                      <button
                        onClick={(e) => handleDeleteRound(i, e.currentTarget)}
                        style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                <button
                  onClick={handleUndo}
                  style={{
                    flex: 1, background: armed.undo ? "var(--danger-soft)" : "var(--surface)",
                    border: `1px solid ${armed.undo ? "var(--danger)" : "var(--border)"}`,
                    color: armed.undo ? "var(--danger)" : "var(--text)",
                    padding: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 500, borderRadius: "var(--radius-sm)", cursor: "pointer",
                  }}
                >
                  {armed.undo ? "Tap to confirm" : "Undo last"}
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1, background: armed.reset ? "var(--danger-soft)" : "var(--surface)",
                    border: `1px solid ${armed.reset ? "var(--danger)" : "var(--border)"}`,
                    color: armed.reset ? "var(--danger)" : "var(--text)",
                    padding: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 500, borderRadius: "var(--radius-sm)", cursor: "pointer",
                  }}
                >
                  {armed.reset ? "Tap to confirm" : "Reset game"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
