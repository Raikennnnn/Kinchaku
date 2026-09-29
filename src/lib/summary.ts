import type { Category, Transaction } from "../db";

export type CategoryLook = Pick<Category, "name" | "icon" | "color">;

/** Shown for entries whose category was deleted. */
export const MISSING_CATEGORY: CategoryLook = {
  name: "Deleted category",
  icon: { kind: "preset", name: "tag" },
  color: "#8a8f99",
};

export type Slice = { id: string; amount: number; share: number; category: CategoryLook };

export function slicesOf(items: Transaction[], categoryOf: (id: string) => CategoryLook): Slice[] {
  const total = items.reduce((s, t) => s + t.amount, 0);
  const sums = new Map<string, number>();
  for (const t of items) sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
  return [...sums]
    .map(([id, amount]) => ({ id, amount, share: total ? amount / total : 0, category: categoryOf(id) }))
    .sort((a, b) => b.amount - a.amount);
}

/** Groups entries by day: newest day first, newest entry first within a day. */
export function groupByDay(transactions: Transaction[]): [string, Transaction[]][] {
  const days = new Map<string, Transaction[]>();
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  for (const t of sorted) days.set(t.date, [...(days.get(t.date) ?? []), t]);
  return [...days];
}

/**
 * A period at a glance: money in, money out, what's left, where it came from
 * and where it went. Entries marked "leave out of totals" still appear in the
 * list but don't count.
 */
export function summarize(transactions: Transaction[], categoryOf: (id: string) => CategoryLook) {
  const counted = transactions.filter((t) => !t.excluded);
  const incomeItems = counted.filter((t) => t.type === "income");
  const expenseItems = counted.filter((t) => t.type === "expense");
  const income = incomeItems.reduce((s, t) => s + t.amount, 0);
  const expense = expenseItems.reduce((s, t) => s + t.amount, 0);

  return {
    income,
    expense,
    balance: income - expense,
    expenseSlices: slicesOf(expenseItems, categoryOf),
    incomeSlices: slicesOf(incomeItems, categoryOf),
    /** Spending per category id, for budgets. */
    spentByCategory: new Map(slicesOf(expenseItems, categoryOf).map((s) => [s.id, s.amount])),
    days: groupByDay(transactions),
  };
}

/** Compact money for tight spots like calendar cells: "1.2K", "30K", "1.5M". */
export function compactMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount / 1000);
}
