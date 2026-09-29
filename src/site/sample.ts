// Example data for the previews on the website. Not real spending.
import { DEFAULT_CATEGORIES, type Kind } from "../categories";
import type { Transaction } from "../db";
import { toISODate } from "../lib/dates";
import { MISSING_CATEGORY, type CategoryLook } from "../lib/summary";

export const SAMPLE_CURRENCY = "EUR";

const looks = new Map<string, CategoryLook>(
  DEFAULT_CATEGORIES.map((c) => [c.id, { name: c.name, color: c.color, icon: { kind: "preset", name: c.icon } }]),
);
export const sampleCategory = (id: string) => looks.get(id) ?? MISSING_CATEGORY;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

const entry = (id: string, type: Kind, amount: number, categoryId: string, ago: number, note = "", order = 0): Transaction => ({
  id,
  ledgerId: "personal",
  type,
  amount: amount * 1000,
  categoryId,
  date: daysAgo(ago),
  note,
  accountId: null,
  excluded: false,
  recurringId: null,
  createdAt: order,
  updatedAt: order,
  deleted: false,
});

// Matches the example: 1,000 allowance + 400 paid back, then some spending.
export const SAMPLE_TRANSACTIONS: Transaction[] = [
  entry("s1", "expense", 12.5, "food-drink", 0, "Ramen lunch", 3),
  entry("s2", "income", 400, "paid-loans", 0, "Mika paid me back", 2),
  entry("s3", "expense", 45, "gas", 0, "", 1),
  entry("s4", "expense", 64.9, "shopping", 1, "Running shoes"),
  entry("s5", "expense", 22, "self-care", 1, "Haircut"),
  entry("s6", "expense", 38.4, "food-drink", 2, "Groceries"),
  entry("s7", "income", 1000, "allowance", 6, "Monthly allowance"),
];

/** Numbers for the carry-over preview: money in minus spent is what moves on. */
export const SAMPLE_MONTH = { income: 1_400_000, expense: 300_000 };
