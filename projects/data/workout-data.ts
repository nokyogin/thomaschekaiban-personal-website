export type Unit = "reps" | "sec";

export interface Exercise {
  id: string;
  name: string;
  /** Short execution cue shown under the name / on the timer. */
  cue?: string;
  /** What it works, in plain French. */
  target?: string;
  unit: Unit;
}

export interface WorkoutPlan {
  slug: string;
  name: string;
  tagline?: string;
  /** Gear needed. */
  equipment?: string;
  /** Seconds of max-effort work per exercise. */
  work: number;
  /** Seconds of transition between exercises. */
  transition: number;
  /** Number of circuits. */
  rounds: number;
  /** Seconds of rest between circuits. */
  rest: number;
  warmup?: { duration: string; moves: string[] };
  cooldown?: string;
  exercises: Exercise[];
  notes?: string[];
  /** True for circuits created from the app rather than shipped in this file. */
  custom?: boolean;
}

/**
 * Order alternates push → legs → pull so no two consecutive exercises hit the
 * same muscles: each group recovers while the next two run. The two hardest
 * pushes are split (pompes early, dips mid-circuit) and the isometric hold
 * closes the round.
 */
const wholeBody: WorkoutPlan = {
  slug: "whole-body",
  name: "Whole Body",
  tagline: "Poids du corps + élastique — circuit complet",
  equipment: "1 élastique + une chaise pour les dips.",
  work: 45,
  transition: 15,
  rounds: 4,
  rest: 60,
  warmup: {
    duration: "4 min (hors séance)",
    moves: [
      "Jumping jacks",
      "Squats à vide",
      "Rotations épaules / hanches",
      "Montées de genoux",
    ],
  },
  cooldown: "Étirements 3 min après.",
  exercises: [
    {
      id: "pompes",
      name: "Pompes",
      cue: "Corps gainé, amplitude complète, coudes à ~45°.",
      target: "Pecs / épaules",
      unit: "reps",
    },
    {
      id: "squats",
      name: "Squats",
      cue: "Cuisses parallèles, talons au sol, dos neutre.",
      target: "Jambes",
      unit: "reps",
    },
    {
      id: "rows",
      name: "Rows élastique",
      cue: "Tirer vers le VENTRE, coudes serrés, serre les omoplates.",
      target: "Dos + biceps",
      unit: "reps",
    },
    {
      id: "dips",
      name: "Dips",
      cue: "Sur chaise ou barres. Descente contrôlée, épaules basses.",
      target: "Triceps / pecs",
      unit: "reps",
    },
    {
      id: "fentes",
      name: "Fentes alternées",
      cue: "Genou arrière proche du sol, buste droit. Alterner.",
      target: "Jambes / fessiers",
      unit: "reps",
    },
    {
      id: "face-pulls",
      name: "Face pulls élastique",
      cue: "Tirer vers le VISAGE, coudes hauts et écartés.",
      target: "Épaule arrière + haut du dos",
      unit: "reps",
    },
    {
      id: "planche",
      name: "Planche (tenue)",
      cue: "Bassin verrouillé, ligne épaules-hanches-talons. Tenir.",
      target: "Gainage",
      unit: "sec",
    },
  ],
  notes: [
    "Max reps PROPRES : amplitude complète, forme correcte. On arrête si la forme casse (dos rond, demi-amplitude), même s'il reste du temps.",
    "Tempo contrôlé : descente lente (~1-2 s), remontée tonique. Planche = tenir le plus longtemps.",
    "Noter les reps par exo → battre le score la fois suivante.",
    "Ordre alterné : jamais deux fois le même type d'exercice d'affilée, la planche ferme la série.",
  ],
};

/** Circuits shipped with the app. Others are created from the UI. */
export const builtInPlans: WorkoutPlan[] = [wholeBody];

/**
 * One circuit: every exercise's work interval, plus a transition *between*
 * exercises only — the last exercise of a round runs straight into the rest,
 * which is the transition. 7 x 45 s + 6 x 15 s = 6:45.
 */
export function roundDuration(plan: WorkoutPlan): number {
  const n = plan.exercises.length;
  return n * plan.work + Math.max(0, n - 1) * plan.transition;
}

/** Total session length: rounds x round length + the rests between rounds. */
export function planDuration(plan: WorkoutPlan): number {
  return plan.rounds * roundDuration(plan) + Math.max(0, plan.rounds - 1) * plan.rest;
}

export type StepKind = "work" | "transition" | "rest";

export interface Step {
  kind: StepKind;
  duration: number;
  /** 0-based circuit index. */
  round: number;
  /** 0-based exercise index — the exercise being done ("work") or just finished ("transition"). */
  exercise: number;
}

export function buildSteps(plan: WorkoutPlan): Step[] {
  const steps: Step[] = [];
  const last = plan.exercises.length - 1;
  for (let r = 0; r < plan.rounds; r++) {
    for (let e = 0; e < plan.exercises.length; e++) {
      steps.push({ kind: "work", duration: plan.work, round: r, exercise: e });
      // No transition after the last exercise: the rest between rounds is it.
      if (e < last) {
        steps.push({ kind: "transition", duration: plan.transition, round: r, exercise: e });
      }
    }
    if (r < plan.rounds - 1) {
      steps.push({ kind: "rest", duration: plan.rest, round: r, exercise: plan.exercises.length - 1 });
    }
  }
  return steps;
}

/**
 * A logged session. Scores are stored per exercise *name* rather than per
 * circuit, so the same movement is tracked across every circuit it appears in
 * — the history is one common record book, not one per workout.
 */
export interface SessionEntry {
  /** Normalised exercise name — the join key across circuits. */
  key: string;
  name: string;
  unit: Unit;
  values: (number | null)[];
}

export interface SessionLog {
  id: string;
  planSlug: string;
  planName: string;
  date: string;
  entries: SessionEntry[];
}

export function exerciseKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function entryTotal(entry: SessionEntry): number {
  return entry.values.reduce((sum: number, v) => sum + (v || 0), 0);
}

export function entryBest(entry: SessionEntry): number {
  return entry.values.reduce((best: number, v) => Math.max(best, v || 0), 0);
}

/** Reps only — holds are counted in seconds and would swamp the total. */
export function sessionGrandTotal(log: SessionLog): number {
  return log.entries.filter((e) => e.unit === "reps").reduce((sum, e) => sum + entryTotal(e), 0);
}

/** Older logs stored scores keyed by exercise id; re-key them by name. */
export function normalizeSession(raw: unknown, plans: WorkoutPlan[]): SessionLog | null {
  const log = raw as Partial<SessionLog> & { scores?: Record<string, (number | null)[]> };
  if (!log || typeof log.id !== "string") return null;
  if (Array.isArray(log.entries)) return log as SessionLog;
  if (!log.scores) return null;
  const plan = plans.find((p) => p.slug === log.planSlug);
  const entries: SessionEntry[] = Object.entries(log.scores).map(([id, values]) => {
    const ex = plan?.exercises.find((e) => e.id === id);
    const name = ex?.name || id;
    return { key: exerciseKey(name), name, unit: ex?.unit || "reps", values };
  });
  return {
    id: log.id,
    planSlug: log.planSlug || "",
    planName: log.planName || plan?.name || "Circuit",
    date: log.date || new Date(0).toISOString(),
    entries,
  };
}

// --- Circuit authoring ------------------------------------------------------

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function newExercise(): Exercise {
  return { id: uid("ex"), name: "", cue: "", unit: "reps" };
}

/** A blank circuit pre-filled with the timing that gives a round 30-min session. */
export function emptyPlan(): WorkoutPlan {
  return {
    slug: uid("circuit"),
    name: "",
    tagline: "",
    equipment: "",
    work: 45,
    transition: 15,
    rounds: 4,
    rest: 60,
    exercises: [newExercise()],
    custom: true,
  };
}

export function duplicatePlan(plan: WorkoutPlan): WorkoutPlan {
  return {
    ...plan,
    slug: uid("circuit"),
    name: `${plan.name} (copie)`,
    exercises: plan.exercises.map((e) => ({ ...e })),
    custom: true,
  };
}
