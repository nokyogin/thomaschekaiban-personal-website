import { sql } from "@vercel/postgres";
import { HealthRecord } from "@/data/health-data";

export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS health_records (
      id SERIAL PRIMARY KEY,
      time DATE NOT NULL UNIQUE,
      weight REAL NOT NULL DEFAULT 0,
      body_fat REAL NOT NULL DEFAULT 0,
      muscle_mass REAL NOT NULL DEFAULT 0,
      skeletal_muscle_mass REAL NOT NULL DEFAULT 0,
      bmr REAL NOT NULL DEFAULT 0,
      visceral_fat REAL NOT NULL DEFAULT 0,
      water REAL NOT NULL DEFAULT 0
    )
  `;
}

export async function getAllRecords(): Promise<HealthRecord[]> {
  const { rows } = await sql`
    SELECT time, weight, body_fat, muscle_mass, skeletal_muscle_mass, bmr, visceral_fat, water
    FROM health_records
    ORDER BY time ASC
  `;
  return rows.map((r) => ({
    time: (r.time as Date).toISOString().slice(0, 10),
    weight: r.weight,
    bodyFat: r.body_fat,
    muscleMass: r.muscle_mass,
    skeletalMuscleMass: r.skeletal_muscle_mass,
    bmr: r.bmr,
    visceralFat: r.visceral_fat,
    water: r.water,
  }));
}

export async function upsertRecords(records: HealthRecord[]): Promise<number> {
  let count = 0;
  for (const r of records) {
    await sql`
      INSERT INTO health_records (time, weight, body_fat, muscle_mass, skeletal_muscle_mass, bmr, visceral_fat, water)
      VALUES (${r.time}, ${r.weight}, ${r.bodyFat}, ${r.muscleMass}, ${r.skeletalMuscleMass}, ${r.bmr}, ${r.visceralFat}, ${r.water})
      ON CONFLICT (time) DO UPDATE SET
        weight = EXCLUDED.weight,
        body_fat = EXCLUDED.body_fat,
        muscle_mass = EXCLUDED.muscle_mass,
        skeletal_muscle_mass = EXCLUDED.skeletal_muscle_mass,
        bmr = EXCLUDED.bmr,
        visceral_fat = EXCLUDED.visceral_fat,
        water = EXCLUDED.water
    `;
    count++;
  }
  return count;
}

export async function deleteAllRecords(): Promise<void> {
  await sql`DELETE FROM health_records`;
}
