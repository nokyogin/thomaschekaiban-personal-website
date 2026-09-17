import { sql } from "@vercel/postgres";
import { Debt, Payment, round2 } from "@/data/debts-data";

export async function ensureDebtsTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      initial_amount REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id SERIAL PRIMARY KEY,
      debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      amount REAL NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS debt_payments_debt_id_idx ON debt_payments (debt_id)`;
}

interface DebtRow {
  id: number;
  name: string;
  initial_amount: number;
  notes: string;
  created_at: Date;
}

interface PaymentRow {
  id: number;
  debt_id: number;
  date: Date;
  amount: number;
  note: string;
}

function toPayment(r: Record<string, unknown>): Payment {
  const row = r as unknown as PaymentRow;
  return {
    id: row.id,
    debtId: row.debt_id,
    date: new Date(row.date).toISOString().slice(0, 10),
    amount: row.amount,
    note: row.note ?? "",
  };
}

export async function getAllDebts(): Promise<Debt[]> {
  const [{ rows: debtRows }, { rows: paymentRows }] = await Promise.all([
    sql`
      SELECT id, name, initial_amount, notes, created_at
      FROM debts
      ORDER BY created_at ASC, id ASC
    `,
    sql`
      SELECT id, debt_id, date, amount, note
      FROM debt_payments
      ORDER BY date ASC, id ASC
    `,
  ]);

  const byDebt = new Map<number, Payment[]>();
  for (const r of paymentRows) {
    const p = toPayment(r);
    const list = byDebt.get(p.debtId);
    if (list) list.push(p);
    else byDebt.set(p.debtId, [p]);
  }

  return debtRows.map((r) => {
    const row = r as unknown as DebtRow;
    return {
      id: row.id,
      name: row.name,
      initialAmount: row.initial_amount,
      notes: row.notes ?? "",
      createdAt: new Date(row.created_at).toISOString(),
      payments: byDebt.get(row.id) ?? [],
    };
  });
}

export interface DebtInput {
  name: string;
  initialAmount: number;
  notes: string;
}

export async function insertDebt(input: DebtInput): Promise<Debt> {
  const { rows } = await sql`
    INSERT INTO debts (name, initial_amount, notes)
    VALUES (${input.name}, ${input.initialAmount}, ${input.notes})
    RETURNING id, name, initial_amount, notes, created_at
  `;
  const row = rows[0] as unknown as DebtRow;
  return {
    id: row.id,
    name: row.name,
    initialAmount: row.initial_amount,
    notes: row.notes ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    payments: [],
  };
}

export async function updateDebt(
  id: number,
  input: DebtInput
): Promise<Debt | null> {
  const { rows } = await sql`
    UPDATE debts
    SET name = ${input.name},
        initial_amount = ${input.initialAmount},
        notes = ${input.notes}
    WHERE id = ${id}
    RETURNING id, name, initial_amount, notes, created_at
  `;
  if (!rows[0]) return null;
  const row = rows[0] as unknown as DebtRow;

  const { rows: paymentRows } = await sql`
    SELECT id, debt_id, date, amount, note
    FROM debt_payments
    WHERE debt_id = ${id}
    ORDER BY date ASC, id ASC
  `;

  return {
    id: row.id,
    name: row.name,
    initialAmount: row.initial_amount,
    notes: row.notes ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    payments: paymentRows.map(toPayment),
  };
}

export async function deleteDebt(id: number): Promise<void> {
  await sql`DELETE FROM debts WHERE id = ${id}`;
}

export async function deleteAllDebts(): Promise<void> {
  await sql`DELETE FROM debts`;
}

export interface PaymentInput {
  debtId: number;
  date: string;
  amount: number;
  note: string;
}

export async function insertPayment(input: PaymentInput): Promise<Payment | null> {
  const { rows: exists } = await sql`SELECT id FROM debts WHERE id = ${input.debtId}`;
  if (!exists[0]) return null;

  const { rows } = await sql`
    INSERT INTO debt_payments (debt_id, date, amount, note)
    VALUES (${input.debtId}, ${input.date}, ${input.amount}, ${input.note})
    RETURNING id, debt_id, date, amount, note
  `;
  return toPayment(rows[0]);
}

export async function updatePayment(
  id: number,
  input: Omit<PaymentInput, "debtId">
): Promise<Payment | null> {
  const { rows } = await sql`
    UPDATE debt_payments
    SET date = ${input.date},
        amount = ${input.amount},
        note = ${input.note}
    WHERE id = ${id}
    RETURNING id, debt_id, date, amount, note
  `;
  return rows[0] ? toPayment(rows[0]) : null;
}

export async function deletePayment(id: number): Promise<void> {
  await sql`DELETE FROM debt_payments WHERE id = ${id}`;
}

/** The ledger as it stood at the last paper update, used once to prime an empty table. */
const SEED: { name: string; initialAmount: number; payments: [string, number][] }[] = [
  {
    name: "Carl",
    initialAmount: 125000,
    payments: [
      ["2023-12-01", 20000],
      ["2024-01-01", 60000],
      ["2024-01-01", 45000],
    ],
  },
  {
    name: "Jil",
    initialAmount: 305000,
    payments: [
      ["2024-07-01", 10000],
      ["2024-09-01", 4000],
      ["2024-10-01", 4000],
      ["2025-01-01", 6000],
      ["2025-03-01", 4000],
      ["2025-05-01", 3000],
      ["2025-08-01", 4000],
      ["2025-10-01", 3000],
      ["2025-12-01", 3000],
      ["2026-02-01", 3000],
      ["2026-04-01", 3000],
      ["2026-06-01", 4000],
      ["2026-09-01", 5000],
    ],
  },
  {
    name: "Elias",
    initialAmount: 100000,
    payments: [["2025-02-01", 100000]],
  },
  {
    name: "Khattar",
    initialAmount: 240000,
    payments: [
      ["2024-04-01", 10000],
      ["2024-05-01", 5000],
      ["2024-07-01", 5000],
      ["2024-10-01", 5000],
      ["2025-02-01", 5000],
      ["2025-05-01", 5000],
      ["2025-08-01", 10000],
      ["2025-12-01", 10000],
      ["2026-02-01", 15000],
    ],
  },
  {
    name: "Samir",
    initialAmount: -50000,
    payments: [
      ["2024-01-01", -10000],
      ["2024-04-01", -5000],
      ["2024-04-01", -3000],
      ["2024-06-01", -5000],
      ["2024-12-01", -5000],
    ],
  },
];

/** Inserts the known ledger, but only into a table that has never held anything. */
export async function seedDebtsIfEmpty(): Promise<boolean> {
  const { rows } = await sql`SELECT COUNT(*)::int AS count FROM debts`;
  if ((rows[0]?.count ?? 0) > 0) return false;

  for (const entry of SEED) {
    const debt = await insertDebt({
      name: entry.name,
      initialAmount: entry.initialAmount,
      notes: "",
    });
    for (const [date, amount] of entry.payments) {
      await sql`
        INSERT INTO debt_payments (debt_id, date, amount, note)
        VALUES (${debt.id}, ${date}, ${round2(amount)}, '')
      `;
    }
  }
  return true;
}
