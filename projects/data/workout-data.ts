export type MuscleGroup = "push" | "pull" | "legs" | "core";

export type Unit = "reps" | "sec";

export interface Exercise {
  id: string;
  name: string;
  /** Short execution cue shown under the name / on the timer. */
  cue: string;
  /** What it works, in plain French. */
  target: string;
  group: MuscleGroup;
  unit: Unit;
}

export interface WorkoutPlan {
  slug: string;
  name: string;
  tagline: string;
  /** Gear needed. */
  equipment: string;
  /** Why this session exists — goal, constraints. */
  context: string[];
  /** Seconds of max-effort work per exercise. */
  work: number;
  /** Seconds of transition between exercises. */
  transition: number;
  /** Number of circuits. */
  rounds: number;
  /** Seconds of rest between circuits. */
  rest: number;
  warmup: { duration: string; moves: string[] };
  cooldown: string;
  exercises: Exercise[];
  notes: string[];
}

export const GROUP_LABELS: Record<MuscleGroup, string> = {
  push: "Poussée",
  pull: "Tirage",
  legs: "Jambes",
  core: "Tronc",
};

export const GROUP_COLORS: Record<MuscleGroup, string> = {
  push: "#f59e0b",
  pull: "#60a5fa",
  legs: "#34d399",
  core: "#a78bfa",
};

const crossfitStrength: WorkoutPlan = {
  slug: "crossfit-strength",
  name: "Strength training style CrossFit",
  tagline: "Poids du corps + élastique",
  equipment: "1 élastique + une chaise pour les dips.",
  context: [
    "Cycliste 61 kg, veut rester léger (pas d'hypertrophie lourde).",
    "Objectif : endurance musculaire + équilibre haut du corps, complément vélo.",
    "Circuit, chaque exo au MAX de reps propres, timer.",
  ],
  work: 45,
  transition: 15,
  rounds: 4,
  rest: 60,
  warmup: {
    duration: "4 min (hors des 35)",
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
      id: "dips",
      name: "Dips",
      cue: "Sur chaise ou barres. Descente contrôlée, épaules basses.",
      target: "Triceps / pecs",
      group: "push",
      unit: "reps",
    },
    {
      id: "pompes",
      name: "Pompes",
      cue: "Corps gainé, amplitude complète, coudes à ~45°.",
      target: "Pecs / épaules",
      group: "push",
      unit: "reps",
    },
    {
      id: "squats",
      name: "Squats",
      cue: "Cuisses parallèles, talons au sol, dos neutre.",
      target: "Jambes",
      group: "legs",
      unit: "reps",
    },
    {
      id: "fentes",
      name: "Fentes alternées",
      cue: "Genou arrière proche du sol, buste droit. Alterner.",
      target: "Jambes / fessiers",
      group: "legs",
      unit: "reps",
    },
    {
      id: "rows",
      name: "Rows élastique",
      cue: "Tirer vers le VENTRE, coudes serrés, serre les omoplates.",
      target: "Dos + biceps",
      group: "pull",
      unit: "reps",
    },
    {
      id: "face-pulls",
      name: "Face pulls élastique",
      cue: "Tirer vers le VISAGE, coudes hauts et écartés.",
      target: "Épaule arrière + haut du dos",
      group: "pull",
      unit: "reps",
    },
    {
      id: "v-ups",
      name: "Planche V (V-ups)",
      cue: "Tuck-ups si trop dur. Sans élan, abdos qui travaillent.",
      target: "Abdos",
      group: "core",
      unit: "reps",
    },
    {
      id: "planche",
      name: "Planche (tenue)",
      cue: "Bassin verrouillé, ligne épaules-hanches-talons. Tenir.",
      target: "Gainage",
      group: "core",
      unit: "sec",
    },
  ],
  notes: [
    "Max reps PROPRES : amplitude complète, forme correcte. On arrête si la forme casse (dos rond, demi-amplitude), même s'il reste du temps.",
    "Tempo contrôlé : descente lente (~1-2 s), remontée tonique. Abdos sans élan. Planches = tenir le plus longtemps.",
    "Noter les reps par exo → battre le score la fois suivante.",
    "Équilibre du circuit : poussée x2, tirage x2, jambes x2, tronc x2.",
  ],
};

export const workoutPlans: WorkoutPlan[] = [crossfitStrength];

/** Total session length in seconds: rounds x (exercises x (work + transition)) + rests. */
export function planDuration(plan: WorkoutPlan): number {
  const roundLength = plan.exercises.length * (plan.work + plan.transition);
  return plan.rounds * roundLength + (plan.rounds - 1) * plan.rest;
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
  for (let r = 0; r < plan.rounds; r++) {
    for (let e = 0; e < plan.exercises.length; e++) {
      steps.push({ kind: "work", duration: plan.work, round: r, exercise: e });
      steps.push({ kind: "transition", duration: plan.transition, round: r, exercise: e });
    }
    if (r < plan.rounds - 1) {
      steps.push({ kind: "rest", duration: plan.rest, round: r, exercise: plan.exercises.length - 1 });
    }
  }
  return steps;
}

/** One logged session: scores[exerciseId][roundIndex] = reps (or seconds held). */
export interface SessionLog {
  id: string;
  planSlug: string;
  date: string;
  scores: Record<string, (number | null)[]>;
}

export function sessionTotal(log: SessionLog, exerciseId: string): number {
  const arr = log.scores[exerciseId] || [];
  return arr.reduce((sum: number, v) => sum + (v || 0), 0);
}

export function sessionGrandTotal(log: SessionLog, plan: WorkoutPlan): number {
  return plan.exercises
    .filter((e) => e.unit === "reps")
    .reduce((sum, e) => sum + sessionTotal(log, e.id), 0);
}
