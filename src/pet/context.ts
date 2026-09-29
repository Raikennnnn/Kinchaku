import { listBudgets, TOTAL_BUDGET } from "../data/budgets";
import { listCategories } from "../data/categories";
import { goalTotals, listGoals } from "../data/goals";
import { listRecurring } from "../data/recurring";
import { carryState, listTransactions } from "../data/transactions";
import { getSetting, type Category, type Transaction } from "../db";
import { addDays, daysInMonth, lastDayOf, monthOf, shiftMonth, startOfWeek, today } from "../lib/dates";

/** Everything the cat knows about the user's money, computed once per look. */
export type PetContext = {
  today: string;
  month: string;
  day: number;
  daysInMonth: number;
  /** Days left in the month, including today. */
  daysLeft: number;
  hour: number;

  /** Entries (not left out of totals) from the start of last month to the end of this one. */
  entries: Transaction[];
  categories: Category[];
  income: number;
  expense: number;
  balance: number;
  todaySpent: number;
  weekStart: string;
  /** This month so far, by category. */
  spentByCategory: Map<string, number>;
  /** Last month, up to the same day of the month, by category and in total. */
  lastSamePeriodByCategory: Map<string, number>;
  lastSamePeriod: number;
  lastMonthExpense: number;
  lastMonthIncome: number;
  /** Usual spending per day, for comparisons. */
  typicalDaily: number;

  budgets: Map<string, number>;
  totalBudget: number | null;
  upcoming: { id: string; name: string; type: "income" | "expense"; amount: number; date: string }[];
  goals: { id: string; name: string; target: number; saved: number; deadline: string | null }[];
  lastBackup: string | null;
  carry: { amount: number } | null;
  entriesThisMonth: number;
  /** Repeating expenses, as a monthly total. */
  recurringMonthly: number;
};

export async function loadPetContext(ledgerId: string): Promise<PetContext> {
  const now = today();
  const month = monthOf(now);
  const prev = shiftMonth(month, -1);
  const day = Number(now.slice(8));
  const dim = daysInMonth(month);

  const [all, categories, budgets, rules, goals, totals, lastBackup, carry] = await Promise.all([
    listTransactions(ledgerId, `${prev}-01`, lastDayOf(month)),
    listCategories(),
    listBudgets(ledgerId),
    listRecurring(ledgerId),
    listGoals(ledgerId),
    goalTotals(ledgerId),
    getSetting<string>("lastBackup"),
    carryState(ledgerId, month, prev),
  ]);

  const entries = all.filter((t) => !t.excluded);
  const thisMonth = entries.filter((t) => t.date.startsWith(month) && t.date <= now);
  const lastMonth = entries.filter((t) => t.date.startsWith(prev));
  const sum = (xs: Transaction[]) => xs.reduce((s, t) => s + t.amount, 0);
  const out = (xs: Transaction[]) => xs.filter((t) => t.type === "expense");
  const byCategory = (xs: Transaction[]) => {
    const m = new Map<string, number>();
    for (const t of out(xs)) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    return m;
  };

  const income = sum(thisMonth.filter((t) => t.type === "income"));
  const expense = sum(out(thisMonth));
  const lastSame = lastMonth.filter((t) => Number(t.date.slice(8)) <= day);
  const lastMonthExpense = sum(out(lastMonth));
  const lastDays = daysInMonth(prev);
  // Usual daily spending: this month once there's a week of data, else last month.
  const typicalDaily =
    day >= 7 || lastMonthExpense === 0 ? Math.round(expense / Math.max(day, 1)) : Math.round(lastMonthExpense / lastDays);

  const soon = addDays(now, 7);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return {
    today: now,
    month,
    day,
    daysInMonth: dim,
    daysLeft: dim - day + 1,
    hour: new Date().getHours(),
    entries,
    categories,
    income,
    expense,
    balance: income - expense,
    todaySpent: sum(out(thisMonth.filter((t) => t.date === now))),
    weekStart: startOfWeek(now),
    spentByCategory: byCategory(thisMonth),
    lastSamePeriodByCategory: byCategory(lastSame),
    lastSamePeriod: sum(out(lastSame)),
    lastMonthExpense,
    lastMonthIncome: sum(lastMonth.filter((t) => t.type === "income")),
    typicalDaily,
    budgets: new Map([...budgets].filter(([id]) => id !== TOTAL_BUDGET).map(([id, b]) => [id, b.amount])),
    totalBudget: budgets.get(TOTAL_BUDGET)?.amount ?? null,
    upcoming: rules
      .filter((r) => r.active && r.nextDate <= soon)
      .map((r) => ({ id: r.id, name: catName.get(r.categoryId) ?? "Entry", type: r.type, amount: r.amount, date: r.nextDate })),
    goals: goals.map((g) => ({ id: g.id, name: g.name, target: g.target, saved: totals.get(g.id) ?? 0, deadline: g.deadline })),
    lastBackup: lastBackup ?? null,
    carry: !carry.decided && carry.previousEntries > 0 && carry.previousBalance > 0 ? { amount: carry.previousBalance } : null,
    entriesThisMonth: thisMonth.length,
    recurringMonthly: Math.round(
      rules
        .filter((r) => r.active && r.type === "expense")
        .reduce((s, r) => s + r.amount * { daily: 30.4, weekly: 4.35, monthly: 1, yearly: 1 / 12 }[r.frequency], 0),
    ),
  };
}
