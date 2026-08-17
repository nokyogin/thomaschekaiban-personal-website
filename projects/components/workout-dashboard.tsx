"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  builtInPlans,
  buildSteps,
  planDuration,
  sessionTotal,
  sessionGrandTotal,
  emptyPlan,
  duplicatePlan,
  newExercise,
  GROUP_LABELS,
  GROUP_COLORS,
  Exercise,
  MuscleGroup,
  Unit,
  WorkoutPlan,
  SessionLog,
} from "@/data/workout-data";

const STORAGE_KEY = "workout_v1";

type View = "plan" | "run" | "summary" | "history" | "edit";

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

// --- Shared styles ----------------------------------------------------------

const CARD: React.CSSProperties = {
  background: "var(--bio-bg)",
  border: "1px solid var(--bio-border)",
  borderRadius: 14,
  overflow: "hidden",
};

const CARD_TITLE: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--bio-border)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--fg)",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg)",
  border: "1px solid var(--pill-border)",
  borderRadius: 8,
  color: "var(--fg)",
  fontFamily: "inherit",
  fontSize: "0.85rem",
  outline: "none",
};

function btn(accent?: string): React.CSSProperties {
  return {
    padding: "0.7rem 1.25rem",
    borderRadius: 10,
    border: `1px solid ${accent || "var(--pill-border)"}`,
    background: accent || "transparent",
    color: accent ? "#0a0a0a" : "var(--bio-color)",
    fontSize: "0.9rem",
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "opacity 0.15s, background 0.15s, color 0.15s",
  };
}

function ghost(color = "var(--muted)"): React.CSSProperties {
  return {
    padding: "0.4rem 0.8rem",
    borderRadius: 100,
    border: "1px solid var(--pill-border)",
    background: "transparent",
    color,
    fontSize: "0.78rem",
    fontWeight: 500,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  };
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
  unit: Unit;
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

function NumField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value, 10) || min))}
        style={{ ...INPUT, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
      />
    </label>
  );
}

/** Create / edit a circuit. Module scope so inputs keep focus between renders. */
function CircuitEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: WorkoutPlan;
  onSave: (plan: WorkoutPlan) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<WorkoutPlan>(initial);

  const set = (patch: Partial<WorkoutPlan>) => setDraft((d) => ({ ...d, ...patch }));
  const setEx = (i: number, patch: Partial<Exercise>) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  const moveEx = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const next = [...d.exercises];
      const j = i + dir;
      if (j < 0 || j >= next.length) return d;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, exercises: next };
    });
  const removeEx = (i: number) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, idx) => idx !== i) }));

  const named = draft.exercises.filter((e) => e.name.trim());
  const valid = draft.name.trim().length > 0 && named.length > 0;
  const duration = planDuration({ ...draft, exercises: named });

  const submit = () => {
    if (!valid) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      tagline: draft.tagline?.trim() || undefined,
      equipment: draft.equipment?.trim() || undefined,
      exercises: named.map((e) => ({ ...e, name: e.name.trim(), cue: e.cue?.trim() || undefined })),
      custom: true,
    });
  };

  return (
    <div style={{ opacity: 0, animation: "rise 0.5s ease-out forwards" }}>
      <div style={{ ...CARD, marginBottom: "1rem" }}>
        <div style={{ ...CARD_TITLE, display: "flex", justifyContent: "space-between" }}>
          <span>{initial.name ? "Modifier le circuit" : "Nouveau circuit"}</span>
          <span style={{ fontWeight: 500, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            {fmt(duration)} · {named.length} exos
          </span>
        </div>
        <div style={{ padding: "14px 16px", display: "grid", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Nom du circuit</span>
            <input
              value={draft.name}
              placeholder="Ex : Upper body, Jambes, Core…"
              onChange={(e) => set({ name: e.target.value })}
              style={INPUT}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Sous-titre (optionnel)</span>
            <input
              value={draft.tagline || ""}
              placeholder="Ex : Poids du corps + élastique"
              onChange={(e) => set({ tagline: e.target.value })}
              style={INPUT}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Matériel (optionnel)</span>
            <input
              value={draft.equipment || ""}
              placeholder="Ex : 1 élastique, une chaise"
              onChange={(e) => set({ equipment: e.target.value })}
              style={INPUT}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            <NumField label="Effort (s)" value={draft.work} min={5} onChange={(v) => set({ work: v })} />
            <NumField label="Transition (s)" value={draft.transition} min={0} onChange={(v) => set({ transition: v })} />
            <NumField label="Séries" value={draft.rounds} min={1} onChange={(v) => set({ rounds: v })} />
            <NumField label="Pause (s)" value={draft.rest} min={0} onChange={(v) => set({ rest: v })} />
          </div>
        </div>
      </div>

      <div style={{ ...CARD, marginBottom: "1rem" }}>
        <div style={CARD_TITLE}>Exercices — l&apos;ordre est celui du circuit</div>
        {draft.exercises.map((ex, i) => (
          <div
            key={ex.id}
            style={{
              padding: "12px 16px",
              borderBottom: i < draft.exercises.length - 1 ? "1px solid var(--bio-border)" : "none",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                }}
              >
                {i + 1}
              </span>
              <input
                value={ex.name}
                placeholder="Nom de l'exercice"
                onChange={(e) => setEx(i, { name: e.target.value })}
                style={INPUT}
              />
            </div>
            <input
              value={ex.cue || ""}
              placeholder="Consigne (optionnel)"
              onChange={(e) => setEx(i, { cue: e.target.value })}
              style={{ ...INPUT, fontSize: "0.8rem" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={ex.group}
                onChange={(e) => setEx(i, { group: e.target.value as MuscleGroup })}
                style={{ ...INPUT, width: "auto", cursor: "pointer" }}
              >
                {(Object.keys(GROUP_LABELS) as MuscleGroup[]).map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
              <select
                value={ex.unit}
                onChange={(e) => setEx(i, { unit: e.target.value as Unit })}
                style={{ ...INPUT, width: "auto", cursor: "pointer" }}
              >
                <option value="reps">Reps</option>
                <option value="sec">Tenue (sec)</option>
              </select>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => moveEx(i, -1)} disabled={i === 0} style={ghost()} aria-label="Monter">
                  ↑
                </button>
                <button
                  onClick={() => moveEx(i, 1)}
                  disabled={i === draft.exercises.length - 1}
                  style={ghost()}
                  aria-label="Descendre"
                >
                  ↓
                </button>
                <button onClick={() => removeEx(i)} style={ghost("#ef4444")} aria-label="Supprimer">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--bio-border)" }}>
          <button onClick={() => setDraft((d) => ({ ...d, exercises: [...d.exercises, newExercise()] }))} style={ghost("var(--fg)")}>
            ＋ Ajouter un exercice
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <button
          onClick={submit}
          disabled={!valid}
          style={{ ...btn(valid ? "#34d399" : undefined), width: "100%", opacity: valid ? 1 : 0.5 }}
        >
          Enregistrer le circuit
        </button>
        <button onClick={onCancel} style={{ ...btn(), width: "100%" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

export function WorkoutDashboard() {
  const [customPlans, setCustomPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const allPlans = useMemo(() => [...builtInPlans, ...customPlans], [customPlans]);

  const [planSlug, setPlanSlug] = useState(builtInPlans[0].slug);
  const plan = useMemo(
    () => allPlans.find((p) => p.slug === planSlug) || allPlans[0],
    [allPlans, planSlug]
  );

  const [view, setView] = useState<View>("plan");
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);

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
        if (Array.isArray(parsed?.circuits)) setCustomPlans(parsed.circuits);
      }
    } catch {}
  }, []);

  const persist = useCallback((nextSessions: SessionLog[], nextCircuits: WorkoutPlan[]) => {
    setSessions(nextSessions);
    setCustomPlans(nextCircuits);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sessions: nextSessions, circuits: nextCircuits })
      );
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

  const bumpScore = useCallback((exId: string, round: number, delta: number) => {
    setScores((prev) => {
      const arr = [...(prev[exId] || [])];
      arr[round] = Math.max(0, (arr[round] || 0) + delta);
      return { ...prev, [exId]: arr };
    });
  }, []);

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
    persist([log, ...sessions], customPlans);
    setView("plan");
  }, [plan.slug, scores, sessions, customPlans, persist]);

  const deleteSession = useCallback(
    (id: string) => persist(sessions.filter((s) => s.id !== id), customPlans),
    [sessions, customPlans, persist]
  );

  // --- Circuits ------------------------------------------------------------
  const saveCircuit = useCallback(
    (next: WorkoutPlan) => {
      const exists = customPlans.some((c) => c.slug === next.slug);
      persist(
        sessions,
        exists ? customPlans.map((c) => (c.slug === next.slug ? next : c)) : [...customPlans, next]
      );
      setPlanSlug(next.slug);
      setEditing(null);
      setView("plan");
    },
    [customPlans, sessions, persist]
  );

  const deleteCircuit = useCallback(() => {
    if (!plan.custom) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      setTimeout(() => setDeleteArmed(false), 2500);
      return;
    }
    setDeleteArmed(false);
    persist(sessions, customPlans.filter((c) => c.slug !== plan.slug));
    setPlanSlug(builtInPlans[0].slug);
  }, [plan, deleteArmed, sessions, customPlans, persist]);

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

  // --- Views ---------------------------------------------------------------
  function renderPlan() {
    return (
      <>
        {/* Circuit picker */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.03s forwards" }}>
          {allPlans.map((p) => {
            const active = p.slug === plan.slug;
            return (
              <button
                key={p.slug}
                onClick={() => setPlanSlug(p.slug)}
                style={{
                  ...ghost(active ? "var(--fg)" : "var(--muted)"),
                  border: `1px solid ${active ? "var(--fg)" : "var(--pill-border)"}`,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {p.name}
              </button>
            );
          })}
          <button
            onClick={() => {
              setEditing(emptyPlan());
              setView("edit");
            }}
            style={ghost("var(--bio-color)")}
          >
            ＋ Nouveau circuit
          </button>
        </div>

        {/* Session summary + start */}
        <div
          style={{
            ...CARD,
            padding: "1.25rem",
            marginBottom: "1rem",
            opacity: 0,
            animation: "rise 0.6s ease-out 0.05s forwards",
          }}
        >
          <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 4 }}>{plan.name}</div>
          {plan.tagline && (
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 4 }}>{plan.tagline}</div>
          )}
          {plan.equipment && (
            <div style={{ fontSize: "0.8rem", color: "var(--bio-color)" }}>Matériel : {plan.equipment}</div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 16px" }}>
            {[
              fmt(planDuration(plan)),
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

          {/* Primary action gets its own full-width row — nothing beside it on mobile */}
          <button
            onClick={startRun}
            style={{ ...btn("#34d399"), width: "100%", padding: "0.95rem 1rem", fontSize: "1rem" }}
          >
            Démarrer la séance
          </button>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button onClick={() => setView("history")} style={ghost()}>
              Historique ({planSessions.length})
            </button>
            <button
              onClick={() => {
                setEditing(duplicatePlan(plan));
                setView("edit");
              }}
              style={ghost()}
            >
              Dupliquer
            </button>
            {plan.custom && (
              <button
                onClick={() => {
                  setEditing(plan);
                  setView("edit");
                }}
                style={ghost()}
              >
                Modifier
              </button>
            )}
            {plan.custom && (
              <button onClick={deleteCircuit} style={ghost(deleteArmed ? "#ef4444" : "var(--muted)")}>
                {deleteArmed ? "Confirmer" : "Supprimer"}
              </button>
            )}
          </div>
        </div>

        {/* Warm-up */}
        {plan.warmup && (
          <div style={{ ...CARD, marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.1s forwards" }}>
            <div style={{ ...CARD_TITLE, display: "flex", justifyContent: "space-between" }}>
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
        )}

        {/* Exercises */}
        <div style={{ ...CARD, marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.12s forwards" }}>
          <div style={{ ...CARD_TITLE, display: "flex", justifyContent: "space-between" }}>
            <span>Circuit — ordre fixe</span>
            <span style={{ fontWeight: 500, color: "var(--muted)" }}>{plan.work} s chacun</span>
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
                    {ex.target && <span style={{ fontSize: 11, color: "var(--muted)" }}>{ex.target}</span>}
                  </div>
                  {ex.cue && (
                    <div style={{ fontSize: "0.8rem", color: "var(--bio-color)", marginTop: 3 }}>{ex.cue}</div>
                  )}
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
        {(plan.notes?.length || plan.cooldown) && (
          <div style={{ ...CARD, marginBottom: "1rem", opacity: 0, animation: "rise 0.6s ease-out 0.14s forwards" }}>
            <div style={CARD_TITLE}>Exécution</div>
            <ul style={{ padding: "12px 16px 14px 32px", margin: 0, color: "var(--bio-color)", fontSize: "0.85rem", lineHeight: 1.7 }}>
              {(plan.notes || []).map((n) => (
                <li key={n}>{n}</li>
              ))}
              {plan.cooldown && <li>{plan.cooldown}</li>}
            </ul>
          </div>
        )}
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
            ...CARD,
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
              {currentExercise.cue && (
                <div style={{ fontSize: "0.82rem", color: "var(--bio-color)", marginTop: 4, lineHeight: 1.5 }}>
                  {currentExercise.cue}
                </div>
              )}
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
          <div style={CARD}>
            <div style={CARD_TITLE}>Scores — série {step.round + 1}</div>
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
          <div style={CARD}>
            <div style={{ ...CARD_TITLE, display: "flex", justifyContent: "space-between" }}>
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
        <div style={{ ...CARD, padding: "1.25rem", marginBottom: "1rem", textAlign: "center" }}>
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

        <div style={{ ...CARD, marginBottom: "1rem" }}>
          <div style={CARD_TITLE}>Détail par exercice</div>
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

        <div style={{ display: "grid", gap: 10 }}>
          <button onClick={saveSession} style={{ ...btn("#34d399"), width: "100%" }}>
            Enregistrer
          </button>
          <button onClick={() => setView("plan")} style={{ ...btn(), width: "100%" }}>
            Jeter
          </button>
        </div>
      </div>
    );
  }

  function renderHistory() {
    return (
      <div style={{ opacity: 0, animation: "rise 0.5s ease-out forwards" }}>
        <button onClick={() => setView("plan")} style={{ ...ghost("var(--bio-color)"), marginBottom: "1rem" }}>
          ← Retour au plan
        </button>
        {planSessions.length === 0 ? (
          <div style={{ ...CARD, padding: "2rem 1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
            Aucune séance enregistrée pour l&apos;instant.
          </div>
        ) : (
          planSessions.map((s) => (
            <div key={s.id} style={{ ...CARD, marginBottom: "0.75rem" }}>
              <div style={{ ...CARD_TITLE, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          Circuits chronométrés · scores à battre
        </p>
      </div>

      {view === "run" ? (
        renderRun()
      ) : view === "summary" ? (
        renderSummary()
      ) : view === "history" ? (
        renderHistory()
      ) : view === "edit" && editing ? (
        <CircuitEditor
          initial={editing}
          onSave={saveCircuit}
          onCancel={() => {
            setEditing(null);
            setView("plan");
          }}
        />
      ) : (
        renderPlan()
      )}
    </div>
  );
}
