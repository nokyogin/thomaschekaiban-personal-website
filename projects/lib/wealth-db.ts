import { sql } from "@vercel/postgres";
import { WealthEntry } from "@/data/wealth-data";

export async function ensureWealthTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS wealth_entries (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getAllWealthEntries(): Promise<WealthEntry[]> {
  const { rows } = await sql`
    SELECT id, category, amount, recorded_at
    FROM wealth_entries
    ORDER BY recorded_at ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    amount: r.amount,
    recordedAt: (r.recorded_at as Date).toISOString(),
  }));
}

export async function insertWealthEntry(
  category: string,
  amount: number
): Promise<WealthEntry> {
  const { rows } = await sql`
    INSERT INTO wealth_entries (category, amount)
    VALUES (${category}, ${amount})
    RETURNING id, category, amount, recorded_at
  `;
  const r = rows[0];
  return {
    id: r.id,
    category: r.category,
    amount: r.amount,
    recordedAt: (r.recorded_at as Date).toISOString(),
  };
}

export async function deleteAllWealthEntries(): Promise<void> {
  await sql`DELETE FROM wealth_entries`;
}

export async function deleteWealthEntry(id: number): Promise<void> {
  await sql`DELETE FROM wealth_entries WHERE id = ${id}`;
}

export async function renameWealthCategory(
  oldName: string,
  newName: string
): Promise<void> {
  await sql`
    UPDATE wealth_entries
    SET category = ${newName}
    WHERE category = ${oldName}
  `;
}
