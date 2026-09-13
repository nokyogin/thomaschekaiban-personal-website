export type BillingCycle = "monthly" | "yearly";

export interface Subscription {
  id: number;
  name: string;
  price: number; // in euros, for one billing cycle
  cycle: BillingCycle;
  category: string;
  nextPayment: string | null; // ISO date (YYYY-MM-DD)
  notes: string;
  createdAt: string; // ISO datetime string
}

/** Price normalised to a monthly amount in euros. */
export function monthlyCost(sub: Subscription): number {
  return sub.cycle === "yearly" ? sub.price / 12 : sub.price;
}

/** Price normalised to a yearly amount in euros. */
export function yearlyCost(sub: Subscription): number {
  return sub.cycle === "yearly" ? sub.price : sub.price * 12;
}
