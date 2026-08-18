"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  builtInPlans,
  buildSteps,
  planDuration,
  roundDuration,
  sessionGrandTotal,
  exerciseKey,
  entryTotal,
  entryBest,
  normalizeSession,
  emptyPlan,
  duplicatePlan,
  newExercise,
  Exercise,
  Unit,
  WorkoutPlan,
  SessionLog,
  SessionEntry,
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

/** Compact editable grid — used to correct a session's scores after the fact. */
function ScoreGrid({
  rows,
  rounds,
  get,
  onChange,
}: {
  rows: { id: string; name: string }[];
  rounds: number;
  get: (id: string, round: number) => number | null | undefined;
  onChange: (id: string, round: number, value: number | null) => void;
}) {
  const cell: React.CSSProperties = {
    width: 44,
    padding: "5px 2px",
    textAlign: "center",
    background: "var(--bg)",
    border: "1px solid var(--pill-border)",
    borderRadius: 6,
    color: "var(--fg)",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    outline: "none",
  };
  const cols = `minmax(72px, 1fr) repeat(${rounds}, 44px)`;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 72 + rounds * 49, display: "grid", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Exercice
          </span>
          {Array.from({ length: rounds }, (_, r) => (
            <span key={r} style={{ fontSize: 10, color: "var(--muted)", textAlign: "center" }}>
              S{r + 1}
            </span>
          ))}
        </div>
        {rows.map((ex) => (
          <div key={ex.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 5, alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--bio-color)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={ex.name}
            >
              {ex.name}
            </span>
            {Array.from({ length: rounds }, (_, r) => {
              const v = get(ex.id, r);
              return (
                <input
                  key={r}
                  type="number"
                  inputMode="numeric"
                  aria-label={`${ex.name} série ${r + 1}`}
                  value={v === null || v === undefined ? "" : v}
                  placeholder="—"
                  onChange={(e) =>
                    onChange(
                      ex.id,
                      r,
                      e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  style={cell}
                />
              );
            })}
          </div>
        ))}
      </div>
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
            <NumField label="Exos (s)" value={draft.work} min={5} onChange={(v) => set({ work: v })} />
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
                  color: "var(--muted)",
                  background: "var(--bg)",
                  border: "1px solid var(--pill-border)",
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
  // An edited built-in circuit is stored as an override sharing its slug, so
  // the session history recorded against that slug follows the edit.
  const allPlans = useMemo(() => {
    const base = builtInPlans.map((p) => customPlans.find((c) => c.slug === p.slug) || p);
    const extras = customPlans.filter((c) => !builtInPlans.some((p) => p.slug === c.slug));
    return [...base, ...extras];
  }, [customPlans]);

  const [planSlug, setPlanSlug] = useState(builtInPlans[0].slug);
  const plan = useMemo(
    () => allPlans.find((p) => p.slug === planSlug) || allPlans[0],
    [allPlans, planSlug]
  );

  const [view, setView] = useState<View>("plan");
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);
  const [sessionDraft, setSessionDraft] = useState<SessionLog | null>(null);

  const isBuiltIn = builtInPlans.some((p) => p.slug === planSlug);
  const isOverridden = isBuiltIn && customPlans.some((c) => c.slug === planSlug);

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
        const circuits: WorkoutPlan[] = Array.isArray(parsed?.circuits) ? parsed.circuits : [];
        if (circuits.length) setCustomPlans(circuits);
        if (Array.isArray(parsed?.sessions)) {
          const known = [...builtInPlans, ...circuits];
          setSessions(
            parsed.sessions
              .map((raw: unknown) => normalizeSession(raw, known))
              .filter(Boolean) as SessionLog[]
          );
        }
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
    setFixOpen(false);
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

  // --- Cross-circuit exercise history --------------------------------------
  // Every lookup goes through the exercise name, so a movement keeps one
  // history whichever circuit it was done in.
  const historyByExercise = useMemo(() => {
    const map = new Map<string, { entry: SessionEntry; date: string; planName: string }[]>();
    for (const s of sessions) {
      for (const entry of s.entries) {
        const list = map.get(entry.key) || [];
        list.push({ entry, date: s.date, planName: s.planName });
        map.set(entry.key, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => (a.date < b.date ? 1 : -1));
    return map;
  }, [sessions]);

  const lastFor = useCallback(
    (name: string) => historyByExercise.get(exerciseKey(name))?.[0],
    [historyByExercise]
  );

  const personalBest = useCallback(
    (name: string) =>
      (historyByExercise.get(exerciseKey(name)) || []).reduce(
        (best, h) => Math.max(best, entryBest(h.entry)),
        0
      ),
    [historyByExercise]
  );

  const saveSession = useCallback(() => {
    const log: SessionLog = {
      id: String(Date.now()),
      planSlug: plan.slug,
      planName: plan.name,
      date: new Date().toISOString(),
      entries: plan.exercises.map((ex) => ({
        key: exerciseKey(ex.name),
        name: ex.name,
        unit: ex.unit,
        values: scores[ex.id] || [],
      })),
    };
    persist([log, ...sessions], customPlans);
    setView("plan");
  }, [plan, scores, sessions, customPlans, persist]);

  const deleteSession = useCallback(
    (id: string) => persist(sessions.filter((s) => s.id !== id), customPlans),
    [sessions, customPlans, persist]
  );

  const saveSessionDraft = useCallback(() => {
    if (!sessionDraft) return;
    persist(
      sessions.map((s) => (s.id === sessionDraft.id ? sessionDraft : s)),
      customPlans
    );
    setSessionDraft(null);
  }, [sessionDraft, sessions, customPlans, persist]);

  const editDraftScore = useCallback((key: string, round: number, value: number | null) => {
    setSessionDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        entries: d.entries.map((e) => {
          if (e.key !== key) return e;
          const values = [...e.values];
          values[round] = value;
          return { ...e, values };
        }),
      };
    });
  }, []);

  // --- Circuits ------------------------------------------------------------
  const upsertCircuit = useCallback(
    (next: WorkoutPlan) => {
      const exists = customPlans.some((c) => c.slug === next.slug);
      persist(
        sessions,
        exists ? customPlans.map((c) => (c.slug === next.slug ? next : c)) : [...customPlans, next]
      );
    },
    [customPlans, sessions, persist]
  );

  const saveCircuit = useCallback(
    (next: WorkoutPlan) => {
      upsertCircuit(next);
      setPlanSlug(next.slug);
      setEditing(null);
      setView("plan");
    },
    [upsertCircuit]
  );

  /** Timing tweaked straight from the plan card, without opening the editor. */
  const setTiming = useCallback(
    (patch: Partial<Pick<WorkoutPlan, "work" | "transition" | "rounds" | "rest">>) => {
      upsertCircuit({ ...plan, ...patch, custom: true });
    },
    [plan, upsertCircuit]
  );

  const resetCircuit = useCallback(() => {
    if (!isOverridden) return;
    if (!resetArmed) {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 2500);
      return;
    }
    setResetArmed(false);
    persist(sessions, customPlans.filter((c) => c.slug !== plan.slug));
  }, [isOverridden, resetArmed, sessions, customPlans, persist, plan.slug]);

  const deleteCircuit = useCallback(() => {
    if (isBuiltIn) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      setTimeout(() => setDeleteArmed(false), 2500);
      return;
    }
    setDeleteArmed(false);
    persist(sessions, customPlans.filter((c) => c.slug !== plan.slug));
    setPlanSlug(builtInPlans[0].slug);
  }, [isBuiltIn, plan.slug, deleteArmed, sessions, customPlans, persist]);

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
    step.kind === "work" ? "#34d399" : step.kind === "rest" ? "#60a5fa" : "#888";
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
          <div style={{ margin: "14px 0 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              <NumField label="Exos (s)" value={plan.work} min={5} onChange={(v) => setTiming({ work: v })} />
              <NumField label="Entre exos (s)" value={plan.transition} min={0} onChange={(v) => setTiming({ transition: v })} />
              <NumField label="Séries" value={plan.rounds} min={1} onChange={(v) => setTiming({ rounds: v })} />
              <NumField label="Entre séries (s)" value={plan.rest} min={0} onChange={(v) => setTiming({ rest: v })} />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              Total <b style={{ color: "var(--fg)" }}>{fmt(planDuration(plan))}</b>
              {"  ·  "}
              {plan.exercises.length} exos
              {"  ·  "}
              séries de {fmt(roundDuration(plan))}
            </div>
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
              Historique ({sessions.length})
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
            <button
              onClick={() => {
                setEditing({ ...plan, custom: true });
                setView("edit");
              }}
              style={ghost()}
            >
              Modifier
            </button>
            {isOverridden && (
              <button onClick={resetCircuit} style={ghost(resetArmed ? "#f59e0b" : "var(--muted)")}>
                {resetArmed ? "Confirmer" : "Réinitialiser"}
              </button>
            )}
            {!isBuiltIn && (
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
            const previous = lastFor(ex.name);
            const last = previous ? entryTotal(previous.entry) : 0;
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
                    color: "var(--muted)",
                    background: "var(--bg)",
                    border: "1px solid var(--pill-border)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{ex.name}</span>
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
                {lastFor(currentExercise.name)
                  ? `Dernière fois (série ${step.round + 1}) : ${
                      lastFor(currentExercise.name)?.entry.values[step.round] ?? "—"
                    }`
                  : "Premier passage sur cet exo — pose une base."}
                {personalBest(currentExercise.name) > 0 &&
                  `  ·  Record : ${personalBest(currentExercise.name)}`}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSummary() {
    const draft: SessionLog = {
      id: "draft",
      planSlug: plan.slug,
      planName: plan.name,
      date: new Date().toISOString(),
      entries: plan.exercises.map((ex) => ({
        key: exerciseKey(ex.name),
        name: ex.name,
        unit: ex.unit,
        values: scores[ex.id] || [],
      })),
    };
    return (
      <div style={{ opacity: 0, animation: "rise 0.5s ease-out forwards" }}>
        <div style={{ ...CARD, padding: "1.25rem", marginBottom: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: completed ? "#34d399" : "var(--muted)" }}>
            {completed ? "Séance terminée" : "Séance interrompue"}
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {sessionGrandTotal(draft)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            reps au total{sessions[0] ? ` · séance précédente : ${sessionGrandTotal(sessions[0])}` : ""}
          </div>
        </div>

        <div style={{ ...CARD, marginBottom: "1rem" }}>
          <div style={CARD_TITLE}>Détail par exercice</div>
          {plan.exercises.map((ex, i) => {
            const now = (scores[ex.id] || []).reduce((sum: number, v) => sum + (v || 0), 0);
            const previous = lastFor(ex.name);
            const before = previous ? entryTotal(previous.entry) : 0;
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

        <div style={{ ...CARD, marginBottom: "1rem" }}>
          <button
            onClick={() => setFixOpen((o) => !o)}
            style={{ ...CARD_TITLE, width: "100%", textAlign: "left", background: "transparent", cursor: "pointer", borderBottom: fixOpen ? "1px solid var(--bio-border)" : "none", fontFamily: "inherit" }}
          >
            {fixOpen ? "▾" : "▸"} Corriger les scores
          </button>
          {fixOpen && (
            <div style={{ padding: "12px 16px" }}>
              <ScoreGrid
                rows={plan.exercises}
                rounds={plan.rounds}
                get={(id, r) => scores[id]?.[r]}
                onChange={setScore}
              />
            </div>
          )}
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
    const keys = Array.from(historyByExercise.keys());
    return (
      <div style={{ opacity: 0, animation: "rise 0.5s ease-out forwards" }}>
        <button onClick={() => setView("plan")} style={{ ...ghost("var(--bio-color)"), marginBottom: "1rem" }}>
          ← Retour au plan
        </button>

        {sessions.length === 0 ? (
          <div style={{ ...CARD, padding: "2rem 1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
            Aucune séance enregistrée pour l&apos;instant.
          </div>
        ) : (
          <>
            {/* One record book across every circuit */}
            <div style={{ ...CARD, marginBottom: "1rem" }}>
              <div style={{ ...CARD_TITLE, display: "flex", justifyContent: "space-between" }}>
                <span>Records par exercice</span>
                <span style={{ fontWeight: 500, color: "var(--muted)" }}>tous circuits</span>
              </div>
              {keys.map((key, i) => {
                const list = historyByExercise.get(key) || [];
                const best = list.reduce((b, h) => Math.max(b, entryBest(h.entry)), 0);
                const latest = list[0];
                const unit = latest.entry.unit === "sec" ? " s" : "";
                return (
                  <div
                    key={key}
                    style={{
                      padding: "10px 16px",
                      borderBottom: i < keys.length - 1 ? "1px solid var(--bio-border)" : "none",
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--fg)" }}>
                      {latest.entry.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                      meilleure série{" "}
                      <b style={{ color: "var(--fg)" }}>
                        {best}
                        {unit}
                      </b>
                      {"  ·  "}dernière séance{" "}
                      <b style={{ color: "var(--fg)" }}>
                        {entryTotal(latest.entry)}
                        {unit}
                      </b>
                      {"  ·  "}
                      {list.length} séance{list.length > 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Every session, whichever circuit it came from */}
            {sessions.map((s) => (
              <div key={s.id} style={{ ...CARD, marginBottom: "0.75rem" }}>
                <div style={{ ...CARD_TITLE, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ minWidth: 0 }}>
                    {fmtDate(s.date)}
                    <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11 }}>
                      {"  ·  "}
                      {s.planName}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontWeight: 500, color: "var(--muted)" }}>{sessionGrandTotal(s)} reps</span>
                    <button
                      onClick={() =>
                        setSessionDraft((d) =>
                          d?.id === s.id ? null : { ...s, entries: s.entries.map((e) => ({ ...e, values: [...e.values] })) }
                        )
                      }
                      style={{ ...ghost(sessionDraft?.id === s.id ? "var(--fg)" : "var(--muted)"), padding: "0.2rem 0.6rem", fontSize: "0.72rem" }}
                    >
                      {sessionDraft?.id === s.id ? "Fermer" : "Modifier"}
                    </button>
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
                {sessionDraft?.id === s.id ? (
                  <div style={{ padding: "12px 16px", display: "grid", gap: 12 }}>
                    <ScoreGrid
                      rows={sessionDraft.entries.map((e) => ({ id: e.key, name: e.name }))}
                      rounds={sessionDraft.entries.reduce((n, e) => Math.max(n, e.values.length), 0)}
                      get={(key, r) => sessionDraft.entries.find((e) => e.key === key)?.values[r]}
                      onChange={editDraftScore}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveSessionDraft} style={{ ...btn("#34d399"), flex: 1, padding: "0.55rem 1rem", fontSize: "0.85rem" }}>
                        Enregistrer
                      </button>
                      <button onClick={() => setSessionDraft(null)} style={{ ...btn(), padding: "0.55rem 1rem", fontSize: "0.85rem" }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "10px 16px", display: "grid", gap: 6 }}>
                    {s.entries.map((e) => (
                      <div key={e.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.8rem", color: "var(--bio-color)" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--muted)", flexShrink: 0 }}>
                          {e.values.map((v) => (v === null ? "—" : v)).join(" · ")}
                          {"  →  "}
                          <b style={{ color: "var(--fg)" }}>
                            {entryTotal(e)}
                            {e.unit === "sec" && " s"}
                          </b>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
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
