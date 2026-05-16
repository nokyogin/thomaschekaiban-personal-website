import { sql } from "@vercel/postgres";
import { RollEntry } from "@/data/roll-data";

export async function ensureRollTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS roll_entries (
      id SERIAL PRIMARY KEY,
      rolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getAllRolls(): Promise<RollEntry[]> {
  const { rows } = await sql`
    SELECT id, rolled_at
    FROM roll_entries
    ORDER BY rolled_at DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    rolledAt: (r.rolled_at as Date).toISOString(),
  }));
}

export async function insertRoll(): Promise<RollEntry> {
  const { rows } = await sql`
    INSERT INTO roll_entries (rolled_at)
    VALUES (NOW())
    RETURNING id, rolled_at
  `;
  return {
    id: rows[0].id,
    rolledAt: (rows[0].rolled_at as Date).toISOString(),
  };
}

export async function deleteRoll(id: number): Promise<void> {
  await sql`DELETE FROM roll_entries WHERE id = ${id}`;
}

export async function deleteAllRolls(): Promise<void> {
  await sql`DELETE FROM roll_entries`;
}
