"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  workoutPlans,
  buildSteps,
  planDuration,
  sessionTotal,
  sessionGrandTotal,
  GROUP_LABELS,
  GROUP_COLORS,
  WorkoutPlan,
  SessionLog,
  Step,
} from "@/data/workout-data";

const STORAGE_KEY = "workout_v1";

type View = "plan" | "run" | "summary" | "history";

function fmt(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function emptyScores(plan: WorkoutPlan): Record<string, (number | null)[]> {
  const out: Record<string, (number | null)[]> = {};
  for (const ex of plan.exercises) out[ex.id] = Array(plan.rounds).fill(null);
  return out;
}

function hasAnyScore(scores: Record<string, (number | null)[]>) {
  return Object.values(scores).some((arr) => arr.some((v) => v !== null));
}

/**
 * Kept at module scope on purpose: the timer re-renders the dashboard every
 * second, and a component defined inside would remount and steal focus from
 * the input while you are typing your reps.
 */
function ScoreStepper({
  value,
  unit,
  compact,
  onChange,
  onBump,
}: {
  value: number | null | undefined;
  unit: "reps" | "sec";
  compact?: boolean;
  onChange: (v: number | null) => void;
  onBump: (delta: number) => void;
}) {
  const stepSize = unit === "sec" ? 5 : 1;
  const side: React.CSSProperties = {
    width: compact ? 30 : 42,
    height: compact ? 30 : 42,
    borderRadius: 8,
    border: "1px solid var(--pill-border)",
    background: "transparent",
    color: "var(--fg)",
    fontSize: compact ? 15 : 20,
    fontFamily: "inherit",
    cursor: "pointer",
    flexShrink: 0,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 10 }}>
      <button onClick={() => onBump(-stepSize)} aria-label="Moins" style={side}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value === null || value === undefined ? "" : value}
        placeholder="0"
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0))
        }
        style={{
          width: compact ? 56 : 84,
          padding: compact ? "4px 6px" : "8px 6px",
          textAlign: "center",
          background: "var(--bg)",
          border: "1px solid var(--pill-border)",
          borderRadius: 8,
          color: "var(--fg)",
          fontFamily: "inherit",
          fontSize: compact ? 15 : 22,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          outline: "none",
        }}
      />
      <button onClick={() => onBump(stepSize)} aria-label="Plus" style={side}>
        +
      </button>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{unit === "sec" ? "sec" : "reps"}</span>
    </div>
  );
}

export function WorkoutDashboard() {
  const [planSlug, setPlanSlug] = useState(workoutPlans[0].slug);
  const plan = useMemo(
    () => workoutPlans.find((p) => p.slug === planSlug) || workoutPlans[0],
    [planSlug]
  );

  const [view, setView] = useState<View>("plan");
  const [sessions, setSessions] = useState<SessionLog[]>([]);

  // --- Run state -----------------------------------------------------------
  const steps = useMemo(() => buildSteps(plan), [plan]);
  const [stepIdx, setStepIdx] = useState(0);
  const [display, setDisplay] = useState(plan.work);
  const [playing, setPlaying] = useState(false);
  const [scores, setScores] = useState<Record<string, (number | null)[]>>(() => emptyScores(plan));
  const [completed, setCompleted] = useState(false);
  const [quitArmed, setQuitArmed] = useState(false);

  const remainingRef = useRef(plan.work);
  const deadlineRef = useRef(0);
  const beepedRef = useRef(-1);
  const audioRef = useRef<AudioContext | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  // --- Persistence ---------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.sessions)) setSessions(parsed.sessions);
      }
    } catch {}
  }, []);

  const persist = useCallback((next: SessionLog[]) => {
    setSessions(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: next }));
    } catch {}
  }, []);

  // --- Sound + screen wake -------------------------------------------------
  const beep = useCallback((freq: number, duration: number) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {}
  }, []);

  const releaseWake = useCallback(() => {
    try {
      wakeRef.current?.release();
    } catch {}
    wakeRef.current = null;
  }, []);

  const requestWake = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: WakeLock };
      if (nav.wakeLock) wakeRef.current = await nav.wakeLock.request("screen");
    } catch {}
  }, []);

  useEffect(() => releaseWake, [releaseWake]);

  // --- Timer ---------------------------------------------------------------
  const goToStep = useCallback(
    (idx: number) => {
      if (idx >= steps.length) {
        setPlaying(false);
        setCompleted(true);
        setView("summary");
        releaseWake();
        beep(880, 0.25);
        setTimeout(() => beep(1174, 0.4), 260);
        return;
      }
      const step = steps[idx];
      remainingRef.current = step.duration;
      deadlineRef.current = Date.now() + step.duration * 1000;
      beepedRef.current = -1;
      setStepIdx(idx);
      setDisplay(step.duration);
      beep(step.kind === "work" ? 880 : 587, step.kind === "work" ? 0.22 : 0.14);
    },
    [steps, beep, releaseWake]
  );

  useEffect(() => {
    if (!playing || view !== "run") return;
    deadlineRef.current = Date.now() + remainingRef.current * 1000;
    const id = setInterval(() => {
      const left = (deadlineRef.current - Date.now()) / 1000;
      if (left <= 0) {
        remainingRef.current = 0;
        goToStep(stepIdx + 1);
        return;
      }
      remainingRef.current = left;
      const shown = Math.ceil(left);
      setDisplay(shown);
      if (shown <= 3 && shown !== beepedRef.current) {
        beepedRef.current = shown;
        beep(660, 0.09);
      }
    }, 100);
    return () => clearInterval(id);
  }, [playing, stepIdx, view, goToStep, beep]);

  const startRun = useCallback(() => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor && !audioRef.current) audioRef.current = new Ctor();
      audioRef.current?.resume();
    } catch {}
    setScores(emptyScores(plan));
    setCompleted(false);
    setStepIdx(0);
    setDisplay(steps[0].duration);
    remainingRef.current = steps[0].duration;
    beepedRef.current = -1;
    setView("run");
    setPlaying(true);
    requestWake();
  }, [plan, steps, requestWake]);

  const togglePlaying = useCallback(() => {
    setPlaying((p) => {
      if (p) releaseWake();
      else requestWake();
      return !p;
    });
  }, [releaseWake, requestWake]);

  const quitRun = useCallback(() => {
    if (!quitArmed) {
      setQuitArmed(true);
      setTimeout(() => setQuitArmed(false), 2500);
      return;
    }
    setQuitArmed(false);
    setPlaying(false);
    releaseWake();
    setCompleted(false);
    setView(hasAnyScore(scores) ? "summary" : "plan");
  }, [quitArmed, releaseWake, scores]);

  // --- Scores --------------------------------------------------------------
  const setScore = useCallback((exId: string, round: number, value: number | null) => {
    setScores((prev) => {
      const arr = [...(prev[exId] || [])];
      arr[round] = value === null ? null : Math.max(0, value);
      return { ...prev, [exId]: arr };
    });
  }, []);

  const bumpScore = useCallback(
    (exId: string, round: number, delta: number) => {
      setScores((prev) => {
        const arr = [...(prev[exId] || [])];
        arr[round] = Math.max(0, (arr[round] || 0) + delta);
        return { ...prev, [exId]: arr };
      });
    },
    []
  );

  const planSessions = useMemo(
    () => sessions.filter((s) => s.planSlug === plan.slug),
    [sessions, plan.slug]
  );
  const lastSession = planSessions[0];

  const personalBest = useCallback(
    (exId: string) => {
      let best = 0;
      for (const s of planSessions) {
        for (const v of s.scores[exId] || []) best = Math.max(best, v || 0);
      }
      return best;
    },
    [planSessions]
  );

  const saveSession = useCallback(() => {
    const log: SessionLog = {
      id: String(Date.now()),
      planSlug: plan.slug,
      date: new Date().toISOString(),
      scores,
    };
    persist([log, ...sessions]);
    setView("plan");
  }, [plan.slug, scores, sessions, persist]);

  const deleteSession = useCallback(
    (id: string) => persist(sessions.filter((s) => s.id !== id)),
    [sessions, persist]
  );

  // --- Derived run values --------------------------------------------------
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const currentExercise = plan.exercises[step.exercise];
  const nextWork = steps.slice(stepIdx + 1).find((s) => s.kind === "work");
  const nextExercise = nextWork ? plan.exercises[nextWork.exercise] : null;
  const elapsed = useMemo(
    () => steps.slice(0, stepIdx).reduce((sum, s) => sum + s.duration, 0),
    [steps, stepIdx]
  );
  const total = planDuration(plan);
  const sessionLeft = total - elapsed - (step.duration - display);
  const phaseColor =
    step.kind === "work"
      ? GROUP_COLORS[currentExercise.group]
      : step.kind === "rest"
      ? "#60a5fa"
      : "#888";
  const phaseLabel =
    step.kind === "work" ? "Max reps" : step.kind === "rest" ? "Pause" : "Transition";

  // --- Shared styles -------------------------------------------------------
  const card: React.CSSProperties = {
    background: "var(--bio-bg)",
    border: "1px solid var(--bio-border)",
    borderRadius: 14,
    overflow: "hidden",
  };
  const cardTitle: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid var(--bio-border)",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--fg)",
  };
  const btn = (accent?: string): React.CSSProperties => ({
    padding: "0.7rem 1.25rem",
    borderRadius: 10,
    border: accent ? "none" : "1px solid var(--pill-border)",
    background: accent || "transparent",
    color: accent ? "#0a0a0a" : "var(--bio-color)",
    fontSize: "0.9rem",
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "opacity 0.15s, background 0.15s, color 0.15s",
  });

  // --- Views ---------------------------------------------------------------
  function renderPlan() {
    return (
      <>
        {workoutPlans.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
            {workoutPlans.map((p) => (
              <button
                key={p.slug}
                onClick={() => setPlanSlug(p.slug)}
                style={{
                  ...btn(),
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8rem",
                  color: p.slug === plan.slug ? "var(--fg)" : "var(--muted)",
                  border: `1px solid ${p.slug === plan.slug ? "var(--fg)" : "var(--pill-border)"}`,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Session summary + start */}
        <div
          style={{
            ...card,
            padding: "1.25rem",
            marginBottom: "1rem",
            opacity: 0,
            animation: "rise 0.6s ease-out 0.05s forwards",
          }}
        >
          <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 4 }}>{plan.name}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 4 }}>
            {plan.tagline}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--bio-color)", marginBottom: 14 }}>
            Matériel : {plan.equipment}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {[
              `${Math.round(planDuration(plan) / 60)} min`,
              `${plan.exercises.length} exos`,
              `${plan.rounds} séries`,
              `${plan.work} s effort / ${plan.transition} s transition`,
              `${plan.rest} s de pause`,
            ].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--bio-color)",
                  background: "var(--bg)",
                  border: "1px solid var(--pill-border)",
                  borderRadius: 100,
                  padding: "3px 10px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={startRun} style={{ ...btn("#34d399"), flex: 1, minWidth: 160 }}>
              Démarrer la séance
            </button>
            <button onClick={() => setView("history")} style={btn()}>
              Historique ({planSessions.length})
            </button>
          </div>
        </div>

        {/* Context */}
        <div style={{ ...card, marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.08s forwards" }}>
          <div style={cardTitle}>Contexte</div>
          <ul style={{ padding: "12px 16px 14px 32px", margin: 0, color: "var(--bio-color)", fontSize: "0.85rem", lineHeight: 1.7 }}>
            {plan.context.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        {/* Warm-up */}
        <div style={{ ...card, marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.1s forwards" }}>
          <div style={{ ...cardTitle, display: "flex", justifyContent: "space-between" }}>
            <span>Échauffement</span>
            <span style={{ fontWeight: 500, color: "var(--muted)" }}>{plan.warmup.duration}</span>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {plan.warmup.moves.map((m) => (
              <span
                key={m}
                style={{
                  fontSize: 12,
                  color: "var(--bio-color)",
                  background: "var(--bg)",
                  border: "1px solid var(--pill-border)",
                  borderRadius: 8,
                  padding: "5px 10px",
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div style={{ ...card, marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.12s forwards" }}>
          <div style={{ ...cardTitle, display: "flex", justifyContent: "space-between" }}>
            <span>Circuit — ordre fixe</span>
            <span style={{ fontWeight: 500, color: "var(--muted)" }}>
              {plan.work} s chacun
            </span>
          </div>
          {plan.exercises.map((ex, i) => {
            const last = lastSession ? sessionTotal(lastSession, ex.id) : 0;
            return (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < plan.exercises.length - 1 ? "1px solid var(--bio-border)" : "none",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: GROUP_COLORS[ex.group],
                    background: `${GROUP_COLORS[ex.group]}18`,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{ex.name}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: GROUP_COLORS[ex.group],
                        border: `1px solid ${GROUP_COLORS[ex.group]}55`,
                        borderRadius: 100,
                        padding: "1px 7px",
                      }}
                    >
                      {GROUP_LABELS[ex.group]}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{ex.target}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--bio-color)", marginTop: 3 }}>{ex.cue}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: last ? "var(--fg)" : "var(--muted)" }}>
                    {last || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>
                    {ex.unit === "sec" ? "sec" : "reps"} · dernière
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Execution notes */}
        <div style={{ ...card, marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.14s forwards" }}>
          <div style={cardTitle}>Exécution</div>
          <ul style={{ padding: "12px 16px 14px 32px", margin: 0, color: "var(--bio-color)", fontSize: "0.85rem", lineHeight: 1.7 }}>
            {plan.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            <li>{plan.cooldown}</li>
          </ul>
        </div>
      </>
    );
  }

  function renderRun() {
    return (
      <div style={{ opacity: 0, animation: "rise 0.4s ease-out forwards" }}>
        {/* Status row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "var(--muted)",
            marginBottom: 10,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>
            Série <b style={{ color: "var(--fg)" }}>{step.round + 1}</b> / {plan.rounds}
            {step.kind !== "rest" && (
              <>
                {"  ·  "}Exo <b style={{ color: "var(--fg)" }}>{step.exercise + 1}</b> / {plan.exercises.length}
              </>
            )}
          </span>
          <span>Reste {fmt(sessionLeft)}</span>
        </div>

        {/* Timer */}
        <div
          style={{
            ...card,
            padding: "1.5rem 1.25rem",
            marginBottom: "1rem",
            textAlign: "center",
            border: `1px solid ${phaseColor}55`,
            background: `linear-gradient(180deg, ${phaseColor}12, var(--bio-bg))`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: phaseColor,
            }}
          >
            {phaseLabel}
          </div>
          <div
            style={{
              fontSize: "clamp(3.2rem, 17vw, 5rem)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              color: playing ? "var(--fg)" : "var(--muted)",
            }}
          >
            {fmt(display)}
          </div>

          {step.kind === "rest" ? (
            <div style={{ fontSize: "0.95rem", color: "var(--bio-color)" }}>
              Récupère. Série {step.round + 2} juste après.
            </div>
          ) : (
            <>
              <div style={{ fontSize: "1.15rem", fontWeight: 600, marginTop: 2 }}>
                {currentExercise.name}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--bio-color)", marginTop: 4, lineHeight: 1.5 }}>
                {currentExercise.cue}
              </div>
            </>
          )}

          {nextExercise && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
              Ensuite : {nextExercise.name}
            </div>
          )}

          {/* Session progress */}
          <div
            style={{
              height: 4,
              background: "var(--bg)",
              borderRadius: 100,
              marginTop: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, ((total - sessionLeft) / total) * 100)}%`,
                height: "100%",
                background: phaseColor,
                transition: "width 0.2s linear",
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
          <button onClick={togglePlaying} style={{ ...btn(playing ? "#f59e0b" : "#34d399"), flex: 1 }}>
            {playing ? "Pause" : "Reprendre"}
          </button>
          <button onClick={() => goToStep(stepIdx + 1)} style={btn()}>
            Passer
          </button>
          <button
            onClick={quitRun}
            style={{
              ...btn(),
              color: quitArmed ? "#ef4444" : "var(--muted)",
              border: `1px solid ${quitArmed ? "#ef4444" : "var(--pill-border)"}`,
            }}
          >
            {quitArmed ? "Confirmer" : "Arrêter"}
          </button>
        </div>

        {/* Score entry */}
        {step.kind === "rest" ? (
          <div style={card}>
            <div style={cardTitle}>Scores — série {step.round + 1}</div>
            {plan.exercises.map((ex, i) => (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 16px",
                  borderBottom: i < plan.exercises.length - 1 ? "1px solid var(--bio-border)" : "none",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--bio-color)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {i + 1}. {ex.name}
                </span>
                <ScoreStepper
                  value={scores[ex.id]?.[step.round]}
                  unit={ex.unit}
                  compact
                  onChange={(v) => setScore(ex.id, step.round, v)}
                  onBump={(d) => bumpScore(ex.id, step.round, d)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={card}>
            <div style={{ ...cardTitle, display: "flex", justifyContent: "space-between" }}>
              <span>Ton score — {currentExercise.name}</span>
              <span style={{ fontWeight: 500, color: "var(--muted)" }}>série {step.round + 1}</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <ScoreStepper
                value={scores[currentExercise.id]?.[step.round]}
                unit={currentExercise.unit}
                onChange={(v) => setScore(currentExercise.id, step.round, v)}
                onBump={(d) => bumpScore(currentExercise.id, step.round, d)}
              />
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
                {lastSession
                  ? `Dernière fois (série ${step.round + 1}) : ${
                      lastSession.scores[currentExercise.id]?.[step.round] ?? "—"
                    }`
                  : "Première séance — pose une base."}
                {personalBest(currentExercise.id) > 0 && `  ·  Record : ${personalBest(currentExercise.id)}`}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSummary() {
    const draft: SessionLog = { id: "draft", planSlug: plan.slug, date: new Date().toISOString(), scores };
    return (
      <div style={{ opacity: 0, animation: "rise 0.5s ease-out forwards" }}>
        <div style={{ ...card, padding: "1.25rem", marginBottom: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: completed ? "#34d399" : "var(--muted)" }}>
            {completed ? "Séance terminée" : "Séance interrompue"}
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {sessionGrandTotal(draft, plan)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            reps au total{lastSession ? ` · dernière séance : ${sessionGrandTotal(lastSession, plan)}` : ""}
          </div>
        </div>

        <div style={{ ...card, marginBottom: "1rem" }}>
          <div style={cardTitle}>Détail par exercice</div>
          {plan.exercises.map((ex, i) => {
            const now = sessionTotal(draft, ex.id);
            const before = lastSession ? sessionTotal(lastSession, ex.id) : 0;
            const delta = before ? now - before : null;
            return (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 16px",
                  borderBottom: i < plan.exercises.length - 1 ? "1px solid var(--bio-border)" : "none",
                  fontSize: "0.85rem",
                }}
              >
                <span style={{ color: "var(--bio-color)" }}>
                  {i + 1}. {ex.name}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {(scores[ex.id] || []).map((v) => (v === null ? "—" : v)).join(" · ")}
                  </span>
                  <b style={{ fontSize: "0.95rem" }}>
                    {now}
                    {ex.unit === "sec" && <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)" }}> s</span>}
                  </b>
                  {delta !== null && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: delta > 0 ? "#34d399" : delta < 0 ? "#ef4444" : "var(--muted)", minWidth: 30, textAlign: "right" }}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveSession} style={{ ...btn("#34d399"), flex: 1 }}>
            Enregistrer
          </button>
          <button onClick={() => setView("plan")} style={btn()}>
            Jeter
          </button>
        </div>
      </div>
    );
  }

  function renderHistory() {
    return (
      <div style={{ opacity: 0, animation: "rise 0.5s ease-out forwards" }}>
        <button onClick={() => setView("plan")} style={{ ...btn(), marginBottom: "1rem", padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>
          ← Retour au plan
        </button>
        {planSessions.length === 0 ? (
          <div style={{ ...card, padding: "2rem 1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
            Aucune séance enregistrée pour l&apos;instant.
          </div>
        ) : (
          planSessions.map((s) => (
            <div key={s.id} style={{ ...card, marginBottom: "0.75rem" }}>
              <div style={{ ...cardTitle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{fmtDate(s.date)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 500, color: "var(--muted)" }}>
                    {sessionGrandTotal(s, plan)} reps
                  </span>
                  <button
                    onClick={() => deleteSession(s.id)}
                    style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, padding: "2px 6px", borderRadius: 4 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    aria-label="Supprimer la séance"
                  >
                    ✕
                  </button>
                </span>
              </div>
              <div style={{ padding: "10px 16px", display: "grid", gap: 6 }}>
                {plan.exercises.map((ex) => (
                  <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--bio-color)" }}>
                    <span>{ex.name}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--muted)" }}>
                      {(s.scores[ex.id] || []).map((v) => (v === null ? "—" : v)).join(" · ")}
                      {"  →  "}
                      <b style={{ color: "var(--fg)" }}>
                        {sessionTotal(s, ex.id)}
                        {ex.unit === "sec" && " s"}
                      </b>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 620, width: "100%" }}>
      <div style={{ marginBottom: "1.25rem", opacity: 0, animation: "rise 0.6s ease-out forwards" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em" }}>
          High Intensity Interval Training
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 4 }}>
          Plans HIIT · circuit chronométré · scores à battre
        </p>
      </div>

      {view === "run" ? (
        renderRun()
      ) : view === "summary" ? (
        renderSummary()
      ) : view === "history" ? (
        renderHistory()
      ) : (
        renderPlan()
      )}
    </div>
  );
}
