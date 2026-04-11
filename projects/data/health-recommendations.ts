import { HealthRecord, UserProfile, getUserAge } from "./health-data";

type MetricKey = keyof Omit<HealthRecord, "time">;

// ---------------------------------------------------------------------------
// Unified advice: 3 pillars — Activity, Diet, Recovery
// ---------------------------------------------------------------------------

export interface Advice {
  icon: string;   // emoji-free label: "activity" | "diet" | "recovery"
  label: string;
  text: string;
  urgency: number; // 0 = info, 1 = moderate, 2 = high
}

export interface HealthAdvice {
  activity: Advice;
  diet: Advice;
  recovery: Advice;
}

// ---------------------------------------------------------------------------
// Internal analysis types
// ---------------------------------------------------------------------------

interface Snapshot {
  latest: HealthRecord;
  first: HealthRecord;
  data: HealthRecord[];
  profile: UserProfile;
  age: number;
  // Derived
  bmi: number;
  bodyFatPct: number;
  muscleRatio: number;      // muscleMass / weight * 100
  smRatio: number;           // skeletalMuscleMass / weight * 100
  bodyFatTrend: number;      // change from first to latest
  muscleTrend: number;       // change from first to latest
  weightTrend: number;       // slope of recent 10 data points
  waterPct: number;
  visceralFat: number;
  bmr: number;
  expectedBmr: number;       // Mifflin-St Jeor
  hasKneeInjury: boolean;
  isAthletic: boolean;
}

function buildSnapshot(data: HealthRecord[], profile: UserProfile): Snapshot | null {
  if (data.length === 0) return null;

  const latest = data[data.length - 1];
  const first = data[0];
  const age = getUserAge();
  const heightM = profile.heightCm / 100;

  const recent = data.slice(-10);
  const weightSlope = recent.length >= 3
    ? (recent[recent.length - 1].weight - recent[0].weight) / (recent.length - 1)
    : 0;

  return {
    latest,
    first,
    data,
    profile,
    age,
    bmi: latest.weight / (heightM * heightM),
    bodyFatPct: latest.bodyFat,
    muscleRatio: (latest.muscleMass / latest.weight) * 100,
    smRatio: (latest.skeletalMuscleMass / latest.weight) * 100,
    bodyFatTrend: latest.bodyFat - first.bodyFat,
    muscleTrend: latest.muscleMass - first.muscleMass,
    weightTrend: weightSlope,
    waterPct: latest.water,
    visceralFat: latest.visceralFat,
    bmr: latest.bmr,
    expectedBmr: 10 * latest.weight + 6.25 * profile.heightCm - 5 * age - 5,
    hasKneeInjury: profile.injuries.includes("meniscus-lesion"),
    isAthletic: profile.goal === "athletic",
  };
}

// ---------------------------------------------------------------------------
// Activity advice repository — keyed to data ranges
// ---------------------------------------------------------------------------

function getActivityAdvice(s: Snapshot): Advice {
  const parts: string[] = [];
  let urgency = 0;

  // Knee injury always shapes the program
  if (s.hasKneeInjury) {
    parts.push("Protect the knee: avoid deep squats, high-impact jumps, and sudden direction changes.");
  }

  // Body fat analysis
  if (s.bodyFatPct > 20) {
    parts.push(`Body fat is at ${s.bodyFatPct}% — prioritize 3-4 zone-2 cardio sessions/week (cycling, swimming, or incline walking are knee-friendly). Keep sessions 30-45 min.`);
    urgency = Math.max(urgency, 1);
  } else if (s.bodyFatPct > 17) {
    parts.push(`Body fat at ${s.bodyFatPct}% — add 2-3 moderate cardio sessions/week. Rowing and cycling are solid choices that spare the knee.`);
  } else if (s.bodyFatPct <= 12) {
    parts.push(`Body fat is low at ${s.bodyFatPct}% — reduce cardio volume to maintain muscle. 1-2 light sessions/week is enough.`);
  } else {
    parts.push("Body fat is in a good athletic range. Maintain your current cardio frequency.");
  }

  // Muscle/strength analysis
  if (s.muscleTrend < -0.5) {
    parts.push(`Muscle mass is declining (${s.muscleTrend.toFixed(1)} kg since first record). Increase resistance training to 3-4x/week with progressive overload on compound movements.`);
    urgency = Math.max(urgency, 2);
  } else if (s.smRatio < 40) {
    parts.push(`Skeletal muscle ratio is at ${s.smRatio.toFixed(1)}% — focus on compound lifts (bench, rows, leg press) 3-4x/week to build towards 40%+.`);
    urgency = Math.max(urgency, 1);
  } else if (s.muscleRatio < 75) {
    parts.push("Muscle-to-weight ratio has room to grow. Add a 4th strength day or increase volume on existing sessions.");
  } else {
    parts.push("Muscle mass is solid. Focus on progressive overload and periodization to keep advancing.");
  }

  // Knee-specific strength work
  if (s.hasKneeInjury) {
    parts.push("For the knee: prioritize VMO strengthening (terminal knee extensions, wall sits, step-ups). Use leg press instead of barbell squats. Warm up with 5 min cycling before every session.");
  }

  // Weight trend
  if (s.weightTrend > 0.15 && s.age >= 30) {
    parts.push(`Weight is trending up at age ${s.age}. Metabolism slows ~1-2% per decade after 30 — add an extra cardio session or extend existing ones by 10 min.`);
  }

  return {
    icon: "activity",
    label: "Activity",
    text: parts.join(" "),
    urgency,
  };
}

// ---------------------------------------------------------------------------
// Diet advice repository — keyed to data ranges
// ---------------------------------------------------------------------------

function getDietAdvice(s: Snapshot): Advice {
  const parts: string[] = [];
  let urgency = 0;

  const proteinTarget = Math.round(s.latest.weight * 2);
  const proteinMin = Math.round(s.latest.weight * 1.8);

  // Body fat driven
  if (s.bodyFatPct > 20) {
    parts.push(`At ${s.bodyFatPct}% body fat, create a mild deficit of ~300 kcal/day. Aim for ${proteinTarget}g protein/day to preserve muscle while cutting.`);
    urgency = Math.max(urgency, 1);
  } else if (s.bodyFatPct > 17) {
    parts.push(`Body fat at ${s.bodyFatPct}% — eat at a small deficit (~200 kcal). Keep protein at ${proteinMin}-${proteinTarget}g/day. Cut processed carbs and sugary drinks first.`);
  } else if (s.bodyFatPct < 6) {
    parts.push(`Body fat is dangerously low at ${s.bodyFatPct}%. Increase healthy fats to 25-30% of calories (avocado, nuts, olive oil). Eat at maintenance or slight surplus.`);
    urgency = Math.max(urgency, 2);
  } else if (s.isAthletic && s.bodyFatPct <= 12) {
    parts.push(`Body fat is lean at ${s.bodyFatPct}%. Eat at maintenance with ${proteinTarget}g protein/day. Include strategic refeeds 1-2x/week to support training intensity.`);
  } else {
    parts.push(`Protein target: ${proteinMin}-${proteinTarget}g/day. Eat at maintenance to support both strength and cardio demands.`);
  }

  // Muscle trend driven
  if (s.muscleTrend < -0.5) {
    parts.push(`Muscle is declining — you may be in too steep a deficit. Increase protein to ${proteinTarget}g/day and add a post-workout meal within 2 hours of training.`);
    urgency = Math.max(urgency, 1);
  }

  // BMR check
  const bmrDiff = s.expectedBmr - s.bmr;
  if (bmrDiff > 50) {
    parts.push(`BMR is ${Math.round(bmrDiff)} kcal below expected for your size. If you've been cutting for 8+ weeks, take a 1-2 week diet break at maintenance to reset metabolic adaptation.`);
  }

  // Visceral fat driven
  if (s.visceralFat > 9) {
    parts.push(`Visceral fat is elevated (level ${s.visceralFat}). Cut refined carbs and alcohol. Increase fiber intake — aim for 30g+ daily from vegetables, legumes, and whole grains.`);
    urgency = Math.max(urgency, 1);
  }

  // Hydration
  if (s.waterPct < 55) {
    const waterMl = Math.round(s.latest.weight * 0.038 * 1000);
    parts.push(`Hydration is low at ${s.waterPct}%. Drink at least ${waterMl}ml daily. Add 500ml per hour of training. Include electrolytes during intense sessions.`);
  }

  // Body fat rising
  if (s.bodyFatTrend > 2) {
    parts.push("Body fat is trending up over time. Track calories for 1 week to identify actual intake vs. target. Small adjustments compound.");
  }

  return {
    icon: "diet",
    label: "Diet",
    text: parts.join(" "),
    urgency,
  };
}

// ---------------------------------------------------------------------------
// Recovery advice repository — sleep, stress, injury management
// ---------------------------------------------------------------------------

function getRecoveryAdvice(s: Snapshot): Advice {
  const parts: string[] = [];
  let urgency = 0;

  // Base recovery for athletic goal
  if (s.isAthletic) {
    parts.push("Target 7-9 hours of sleep. Keep a consistent wake time. Avoid screens 1 hour before bed.");
  }

  // Knee injury management
  if (s.hasKneeInjury) {
    parts.push("Meniscus: ice the knee for 15 min after heavy leg sessions. Consider compression sleeves during training. If pain or swelling increases, reduce volume immediately.");
    urgency = Math.max(urgency, 1);
  }

  // Visceral fat → stress signal
  if (s.visceralFat > 9 || (s.visceralFat > s.first.visceralFat + 1)) {
    parts.push("Rising visceral fat can signal high cortisol. Audit stress: work hours, sleep debt, overtraining. Consider adding 10-15 min daily meditation or walks.");
    urgency = Math.max(urgency, 1);
  }

  // Hydration stability
  const waterVals = s.data.map((d) => d.water);
  const waterAvg = waterVals.reduce((a, b) => a + b, 0) / waterVals.length;
  const waterStd = Math.sqrt(waterVals.reduce((sum, v) => sum + Math.pow(v - waterAvg, 2), 0) / waterVals.length);
  if (waterStd > 1.5) {
    parts.push("Hydration is fluctuating significantly. Drink consistently throughout the day rather than in large bursts. Reduce caffeine and alcohol which act as diuretics.");
  }

  // Weight variance → recovery signal
  const weightVals = s.data.map((d) => d.weight);
  const weightAvg = weightVals.reduce((a, b) => a + b, 0) / weightVals.length;
  const weightStd = Math.sqrt(weightVals.reduce((sum, v) => sum + Math.pow(v - weightAvg, 2), 0) / weightVals.length);
  if (weightStd > 2) {
    parts.push(`Weight variance is high (${weightStd.toFixed(1)} kg). This usually means inconsistent sleep, hydration, or sodium intake. Weigh yourself at the same time daily and track weekly averages.`);
  }

  // BMR declining → overtraining or undereating signal
  const bmrChange = s.latest.bmr - s.first.bmr;
  if (bmrChange < -20) {
    parts.push("Declining BMR can indicate overtraining or chronic undereating. Consider a deload week every 4-6 weeks and ensure you're not in a deficit for more than 12 consecutive weeks.");
  }

  // Age-related
  if (s.age >= 30) {
    parts.push("After 30, recovery takes longer. Prioritize sleep quality over quantity. Consider magnesium and zinc supplementation to support recovery and hormone levels.");
  }

  if (parts.length <= 1) {
    parts.push("Recovery markers look stable. Keep current sleep and stress management habits.");
  }

  return {
    icon: "recovery",
    label: "Recovery",
    text: parts.join(" "),
    urgency,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate unified health advice based on all metrics.
 * Returns exactly 3 advice items: Activity, Diet, Recovery.
 * All logic is self-contained — no external lookups.
 * Advice adapts automatically when new data is uploaded.
 */
export function generateAdvice(
  data: HealthRecord[],
  profile: UserProfile
): HealthAdvice | null {
  const snap = buildSnapshot(data, profile);
  if (!snap) return null;

  return {
    activity: getActivityAdvice(snap),
    diet: getDietAdvice(snap),
    recovery: getRecoveryAdvice(snap),
  };
}

// ---------------------------------------------------------------------------
// Metric health status — every metric gets a status dot
// ---------------------------------------------------------------------------

export type MetricStatus = "green" | "orange" | "red";

export interface MetricHealth {
  status: MetricStatus;
}

/**
 * Evaluate health status for every metric.
 * Returns a map: metricKey → status (green/orange/red).
 * Every metric always has a status.
 */
export function evaluateMetricHealth(
  data: HealthRecord[],
  profile: UserProfile,
): Record<string, MetricHealth> {
  const result: Record<string, MetricHealth> = {
    weight: { status: "green" },
    bodyFat: { status: "green" },
    muscleMass: { status: "green" },
    skeletalMuscleMass: { status: "green" },
    bmr: { status: "green" },
    visceralFat: { status: "green" },
    water: { status: "green" },
  };

  if (data.length === 0) return result;

  const latest = data[data.length - 1];
  const first = data[0];
  const age = getUserAge();

  // Weight
  const weightVals = data.map((d) => d.weight);
  const weightAvg = weightVals.reduce((a, b) => a + b, 0) / weightVals.length;
  const weightStd = Math.sqrt(weightVals.reduce((sum, v) => sum + Math.pow(v - weightAvg, 2), 0) / weightVals.length);
  if (weightStd > 3) result.weight = { status: "red" };
  else if (weightStd > 2) result.weight = { status: "orange" };

  // Body fat
  if (latest.bodyFat > 20 || latest.bodyFat < 6) result.bodyFat = { status: "red" };
  else if (latest.bodyFat > 17 || latest.bodyFat < 8) result.bodyFat = { status: "orange" };

  // Muscle mass
  const muscleChange = latest.muscleMass - first.muscleMass;
  const muscleRatio = (latest.muscleMass / latest.weight) * 100;
  if (muscleChange < -1 || muscleRatio < 70) result.muscleMass = { status: "red" };
  else if (muscleChange < -0.5 || muscleRatio < 75) result.muscleMass = { status: "orange" };

  // Skeletal muscle mass
  const smRatio = (latest.skeletalMuscleMass / latest.weight) * 100;
  const smChange = latest.skeletalMuscleMass - first.skeletalMuscleMass;
  if (smRatio < 35 || smChange < -0.5) result.skeletalMuscleMass = { status: "red" };
  else if (smRatio < 40 || smChange < -0.3) result.skeletalMuscleMass = { status: "orange" };

  // BMR
  const expectedBmr = 10 * latest.weight + 6.25 * profile.heightCm - 5 * age - 5;
  const bmrDiff = expectedBmr - latest.bmr;
  const bmrChange = latest.bmr - first.bmr;
  if (bmrDiff > 80 || bmrChange < -40) result.bmr = { status: "red" };
  else if (bmrDiff > 50 || bmrChange < -20) result.bmr = { status: "orange" };

  // Visceral fat
  if (latest.visceralFat > 12) result.visceralFat = { status: "red" };
  else if (latest.visceralFat > 9) result.visceralFat = { status: "orange" };

  // Water
  if (latest.water < 50) result.water = { status: "red" };
  else if (latest.water < 55) result.water = { status: "orange" };

  return result;
}
