import { db, stamp, type Budget } from "../db";

/** The whole-month budget uses this in place of a category id. */
export const TOTAL_BUDGET = "total";

const budgetId = (ledgerId: string, categoryId: string) => `${ledgerId}:${categoryId}`;

/** Monthly limits in a ledger, keyed by category id (and TOTAL_BUDGET). */
export async function listBudgets(ledgerId: string): Promise<Map<string, Budget>> {
  const rows = await db.budgets
    .where("ledgerId")
    .equals(ledgerId)
    .filter((b) => !b.deleted)
    .toArray();
  return new Map(rows.map((b) => [b.categoryId, b]));
}

/** Sets a monthly limit, or removes it with null. One per category, so the id is fixed. */
export async function setBudget(ledgerId: string, categoryId: string, amount: number | null) {
  const id = budgetId(ledgerId, categoryId);
  if (amount === null) {
    await db.budgets.update(id, { deleted: true, updatedAt: Date.now() });
    return;
  }
  const existing = await db.budgets.get(id);
  await db.budgets.put({
    ...(existing ?? stamp(id)),
    ledgerId,
    categoryId,
    amount,
    deleted: false,
    updatedAt: Date.now(),
  });
}

/** How close spending is to a limit: "ok", "near" (80%+) or "over". */
export function budgetStatus(spent: number, limit: number): "ok" | "near" | "over" {
  if (spent > limit) return "over";
  if (spent >= limit * 0.8) return "near";
  return "ok";
}
