import { sql } from "@vercel/postgres";
import { Subscription, BillingCycle } from "@/data/subs-data";

export async function ensureSubsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      cycle TEXT NOT NULL DEFAULT 'monthly',
      category TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

interface SubRow {
  id: number;
  name: string;
  price: number;
  cycle: string;
  category: string;
  created_at: Date;
  notes: string;
}

function toSubscription(r: Record<string, unknown>): Subscription {
  const row = r as unknown as SubRow;
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    cycle: (row.cycle === "yearly" ? "yearly" : "monthly") as BillingCycle,
    category: row.category ?? "",
    notes: row.notes ?? "",
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const { rows } = await sql`
    SELECT id, name, price, cycle, category, notes, created_at
    FROM subscriptions
    ORDER BY created_at ASC
  `;
  return rows.map(toSubscription);
}

export interface SubscriptionInput {
  name: string;
  price: number;
  cycle: BillingCycle;
  category: string;
  notes: string;
}

export async function insertSubscription(
  input: SubscriptionInput
): Promise<Subscription> {
  const { rows } = await sql`
    INSERT INTO subscriptions (name, price, cycle, category, notes)
    VALUES (
      ${input.name},
      ${input.price},
      ${input.cycle},
      ${input.category},
      ${input.notes}
    )
    RETURNING id, name, price, cycle, category, notes, created_at
  `;
  return toSubscription(rows[0]);
}

export async function updateSubscription(
  id: number,
  input: SubscriptionInput
): Promise<Subscription | null> {
  const { rows } = await sql`
    UPDATE subscriptions
    SET name = ${input.name},
        price = ${input.price},
        cycle = ${input.cycle},
        category = ${input.category},
        notes = ${input.notes}
    WHERE id = ${id}
    RETURNING id, name, price, cycle, category, notes, created_at
  `;
  return rows[0] ? toSubscription(rows[0]) : null;
}

export async function deleteSubscription(id: number): Promise<void> {
  await sql`DELETE FROM subscriptions WHERE id = ${id}`;
}

export async function deleteAllSubscriptions(): Promise<void> {
  await sql`DELETE FROM subscriptions`;
}
