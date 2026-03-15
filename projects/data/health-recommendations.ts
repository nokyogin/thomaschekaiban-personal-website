import { HealthRecord, UserProfile, getUserAge } from "./health-data";

type MetricKey = keyof Omit<HealthRecord, "time">;

export interface Problem {
  metricKey: MetricKey;
  metricLabel: string;
  metricColor: string;
  severity: number;
  title: string;
  action: string;
}

interface RecommendationContext {
  latest: HealthRecord;
  first: HealthRecord;
  data: HealthRecord[];
  profile: UserProfile;
  age: number;
}

function stdDev(data: HealthRecord[], key: MetricKey): number {
  const vals = data.map((d) => d[key] as number);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / vals.length);
}

// Each rule is a function that evaluates the current data and returns a Problem or null.
// To add new recommendations: add a new function to this array.
// Rules are evaluated every time data changes — recommendations are always up to date.
const rules: Array<(ctx: RecommendationContext) => Problem | null> = [

  // --- WEIGHT ---
  (ctx) => {
    const sd = stdDev(ctx.data, "weight");
    if (sd <= 2) return null;
    return {
      metricKey: "weight",
      metricLabel: "Weight",
      metricColor: "#60a5fa",
      severity: sd,
      title: `High weight variance (${sd.toFixed(1)} kg)`,
      action: "Weigh yourself at the same time daily (morning, fasted). Track weekly averages. Log meals on high/low weeks — sodium and carb-heavy days cause the biggest swings.",
    };
  },

  // --- BODY FAT: too high ---
  (ctx) => {
    const bf = ctx.latest.bodyFat;
    if (bf <= 17) return null;
    return {
      metricKey: "bodyFat",
      metricLabel: "Body Fat",
      metricColor: "#f97316",
      severity: (bf - 17) * 2,
      title: `Body fat above athletic range (${bf}%)`,
      action: `Create a mild deficit (~300 kcal/day). At ${ctx.latest.weight} kg, aim for ${Math.round(ctx.latest.weight * 2)}g protein/day. Add 2-3 zone-2 cardio sessions/week. Cut sugary drinks and processed snacks first.`,
    };
  },

  // --- BODY FAT: too low ---
  (ctx) => {
    const bf = ctx.latest.bodyFat;
    if (bf >= 6) return null;
    return {
      metricKey: "bodyFat",
      metricLabel: "Body Fat",
      metricColor: "#f97316",
      severity: (6 - bf) * 3,
      title: `Body fat dangerously low (${bf}%)`,
      action: "Increase healthy fats (avocado, nuts, olive oil) to 25-30% of calories. Reduce training volume temporarily. Monitor hormone and energy levels.",
    };
  },

  // --- BODY FAT: rising trend ---
  (ctx) => {
    const change = ctx.latest.bodyFat - ctx.first.bodyFat;
    if (change <= 2) return null;
    return {
      metricKey: "bodyFat",
      metricLabel: "Body Fat",
      metricColor: "#f97316",
      severity: change * 1.5,
      title: `Body fat rising (+${change.toFixed(1)}% since first measurement)`,
      action: "Track calories for 1 week to find actual intake. Reduce ~200 kcal/day or add 2 LISS cardio sessions/week. Prioritize protein and reduce processed carbs.",
    };
  },

  // --- MUSCLE MASS: declining ---
  (ctx) => {
    const change = ctx.latest.muscleMass - ctx.first.muscleMass;
    if (change >= -0.5) return null;
    return {
      metricKey: "muscleMass",
      metricLabel: "Muscle Mass",
      metricColor: "#34d399",
      severity: Math.abs(change) * 2,
      title: `Losing muscle mass (${change.toFixed(1)} kg)`,
      action: `Increase protein to ${Math.round(ctx.latest.weight * 2)}g/day. Prioritize compound lifts (squat, deadlift, press) 3-4x/week. Sleep 7-9 hours. Avoid caloric deficits steeper than 300 kcal.`,
    };
  },

  // --- MUSCLE MASS: low ratio to weight ---
  (ctx) => {
    const ratio = (ctx.latest.muscleMass / ctx.latest.weight) * 100;
    if (ratio >= 75) return null;
    return {
      metricKey: "muscleMass",
      metricLabel: "Muscle Mass",
      metricColor: "#34d399",
      severity: (75 - ratio) * 0.5,
      title: `Low muscle-to-weight ratio (${ratio.toFixed(1)}%)`,
      action: "Eat at maintenance calories with high protein. Train 4x/week with progressive overload to build muscle while losing fat (body recomposition).",
    };
  },

  // --- SKELETAL MUSCLE: low ratio ---
  (ctx) => {
    const smRatio = (ctx.latest.skeletalMuscleMass / ctx.latest.weight) * 100;
    if (smRatio >= 40) return null;
    return {
      metricKey: "skeletalMuscleMass",
      metricLabel: "Skeletal Muscle",
      metricColor: "#2dd4bf",
      severity: (40 - smRatio) * 0.8,
      title: `Skeletal muscle ratio below 40% (${smRatio.toFixed(1)}%)`,
      action: `Focus on compound movements 3-4x/week with progressive overload. Eat ${Math.round(ctx.latest.weight * 1.8)}-${Math.round(ctx.latest.weight * 2.2)}g protein/day. Consider creatine monohydrate (5g/day).`,
    };
  },

  // --- SKELETAL MUSCLE: declining ---
  (ctx) => {
    const change = ctx.latest.skeletalMuscleMass - ctx.first.skeletalMuscleMass;
    if (change >= -0.3) return null;
    return {
      metricKey: "skeletalMuscleMass",
      metricLabel: "Skeletal Muscle",
      metricColor: "#2dd4bf",
      severity: Math.abs(change) * 1.5,
      title: `Skeletal muscle declining (${change.toFixed(1)} kg)`,
      action: "Prioritize resistance training over cardio. Ensure you're not in too steep a caloric deficit. Add a deload week every 4-6 weeks.",
    };
  },

  // --- BMR: declining ---
  (ctx) => {
    const change = ctx.latest.bmr - ctx.first.bmr;
    if (change >= -20) return null;
    return {
      metricKey: "bmr",
      metricLabel: "BMR",
      metricColor: "#fb923c",
      severity: Math.abs(change) * 0.1,
      title: `BMR declining (${change} kcal)`,
      action: "Increase resistance training frequency. Eat more protein. Take a diet break if you've been cutting for >12 weeks. BMR drops signal muscle loss.",
    };
  },

  // --- BMR: low for weight/height/age ---
  (ctx) => {
    // Mifflin-St Jeor expected BMR for male
    const expected = 10 * ctx.latest.weight + 6.25 * ctx.profile.heightCm - 5 * ctx.age - 5;
    const diff = expected - ctx.latest.bmr;
    if (diff <= 50) return null;
    return {
      metricKey: "bmr",
      metricLabel: "BMR",
      metricColor: "#fb923c",
      severity: diff * 0.05,
      title: `BMR ${diff.toFixed(0)} kcal below expected (${Math.round(expected)} kcal)`,
      action: "Your metabolic rate is lower than predicted for your size and age. Build lean mass through resistance training and ensure adequate caloric intake to avoid metabolic adaptation.",
    };
  },

  // --- VISCERAL FAT: elevated ---
  (ctx) => {
    const vf = ctx.latest.visceralFat;
    if (vf <= 9) return null;
    return {
      metricKey: "visceralFat",
      metricLabel: "Visceral Fat",
      metricColor: "#fb7185",
      severity: (vf - 9) * 3,
      title: `Visceral fat elevated (level ${vf})`,
      action: "Add 30 min zone-2 cardio 3-4x/week. Cut refined carbs and alcohol. Manage stress and sleep (cortisol drives visceral fat). Add fiber-rich foods.",
    };
  },

  // --- VISCERAL FAT: rising ---
  (ctx) => {
    const change = ctx.latest.visceralFat - ctx.first.visceralFat;
    if (change <= 1) return null;
    return {
      metricKey: "visceralFat",
      metricLabel: "Visceral Fat",
      metricColor: "#fb7185",
      severity: change * 2,
      title: `Visceral fat rising (+${change} levels)`,
      action: "Check stress levels and sleep quality. Reduce alcohol. Add more fiber-rich foods (vegetables, legumes). Consistent LISS cardio is more effective than HIIT for visceral fat.",
    };
  },

  // --- WATER: low ---
  (ctx) => {
    const water = ctx.latest.water;
    if (water >= 55) return null;
    return {
      metricKey: "water",
      metricLabel: "Water",
      metricColor: "#38bdf8",
      severity: (55 - water) * 1.5,
      title: `Low hydration (${water}%)`,
      action: `Drink ${Math.round(ctx.latest.weight * 0.037 * 1000)}–${Math.round(ctx.latest.weight * 0.04 * 1000)}ml daily. Add 500ml per hour of training. Include electrolytes (sodium, potassium, magnesium) during intense sessions.`,
    };
  },

  // --- WATER: unstable ---
  (ctx) => {
    const sd = stdDev(ctx.data, "water");
    if (sd <= 1.5) return null;
    return {
      metricKey: "water",
      metricLabel: "Water",
      metricColor: "#38bdf8",
      severity: sd,
      title: `Fluctuating hydration (${sd.toFixed(1)}% variance)`,
      action: "Set a daily water target and track it. Drink consistently throughout the day, not in large bursts. Reduce caffeine and alcohol which are diuretics.",
    };
  },

  // --- WEIGHT: age-related check (over 30 metabolism slows) ---
  (ctx) => {
    if (ctx.age < 30) return null;
    const recentData = ctx.data.slice(-10);
    if (recentData.length < 5) return null;
    const recentWeights = recentData.map((d) => d.weight);
    const slope = (recentWeights[recentWeights.length - 1] - recentWeights[0]) / (recentWeights.length - 1);
    if (slope <= 0.15) return null;
    return {
      metricKey: "weight",
      metricLabel: "Weight",
      metricColor: "#60a5fa",
      severity: slope * 3,
      title: `Weight creeping up at age ${ctx.age}`,
      action: `After 30, metabolism slows ~1-2%/decade. At ${ctx.age}, maintain resistance training to preserve lean mass. Consider reducing daily intake by 100-150 kcal or adding an extra cardio session.`,
    };
  },
];

/**
 * Evaluate all recommendation rules against the current data.
 * Returns all problems sorted by severity (highest first), or top N if specified.
 * This function is fully dynamic — add new rules to the `rules` array
 * and they will automatically be evaluated when data changes.
 */
export function evaluateProblems(
  data: HealthRecord[],
  profile: UserProfile,
  topN?: number
): Problem[] {
  if (data.length === 0) return [];

  const ctx: RecommendationContext = {
    latest: data[data.length - 1],
    first: data[0],
    data,
    profile,
    age: getUserAge(),
  };

  const problems: Problem[] = [];
  for (const rule of rules) {
    const result = rule(ctx);
    if (result) problems.push(result);
  }

  // Deduplicate by metricKey — keep highest severity per metric
  const byMetric = new Map<MetricKey, Problem>();
  for (const p of problems) {
    const existing = byMetric.get(p.metricKey);
    if (!existing || p.severity > existing.severity) {
      byMetric.set(p.metricKey, p);
    }
  }

  const deduped = Array.from(byMetric.values());
  deduped.sort((a, b) => b.severity - a.severity);
  return topN ? deduped.slice(0, topN) : deduped;
}
