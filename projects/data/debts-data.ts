export interface Payment {
  id: number;
  debtId: number;
  date: string; // ISO date string (YYYY-MM-DD)
  amount: number; // in euros, signed like the debt it belongs to
  note: string;
}

export interface Debt {
  id: number;
  name: string;
  initialAmount: number; // positive: they owe me. negative: I owe them.
  notes: string;
  createdAt: string; // ISO datetime string
  payments: Payment[];
}

/** Everything repaid so far, signed like the initial amount. */
export function paidTotal(debt: Debt): number {
  return debt.payments.reduce((a, p) => a + p.amount, 0);
}

/** What is still outstanding. Same sign convention as the initial amount. */
export function currentBalance(debt: Debt): number {
  return round2(debt.initialAmount - paidTotal(debt));
}

/** Share of the debt already repaid, 0–1. */
export function progress(debt: Debt): number {
  if (debt.initialAmount === 0) return 1;
  const ratio = paidTotal(debt) / debt.initialAmount;
  return Math.min(1, Math.max(0, ratio));
}

export function isSettled(debt: Debt): boolean {
  return Math.abs(currentBalance(debt)) < 0.005;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Parses an amount the way it gets written down: "125k", "-50K", "3 000",
 * "2,5k". Returns NaN when nothing usable is in there.
 */
export function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return NaN;
  const k = /k$/i.test(cleaned);
  const n = parseFloat(k ? cleaned.slice(0, -1) : cleaned);
  if (!isFinite(n)) return NaN;
  return round2(k ? n * 1000 : n);
}

const euros = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Compact euros the way the amounts are actually spoken: €125k, €2.5k, €800. */
export function formatK(amount: number): string {
  const abs = Math.abs(amount);
  if (abs < 1000) return euros.format(amount);
  const k = amount / 1000;
  const digits = Math.abs(k % 1) < 0.05 ? 0 : 1;
  return `${amount < 0 ? "-" : ""}€${Math.abs(k).toFixed(digits)}k`;
}

/** Exact euros, for the detail lines. */
export function formatExact(amount: number): string {
  return euros.format(amount);
}

/** "Sep 2026" from an ISO date, since entries are tracked month by month. */
export function formatMonth(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
