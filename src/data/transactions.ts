import { CARRY_CATEGORY_ID } from "../categories";
import { db, DEFAULT_LEDGER_ID, stamp, type Transaction } from "../db";
import { lastDayOf } from "../lib/dates";

export type TransactionInput = Pick<
  Transaction,
  "type" | "amount" | "categoryId" | "accountId" | "date" | "note" | "excluded"
>;

/** Entries between two dates (inclusive), excluding deleted ones. */
export const listTransactions = (ledgerId: string, start: string, end: string) =>
  db.transactions
    .where("[ledgerId+date]")
    .between([ledgerId, start], [ledgerId, end], true, true)
    .filter((t) => !t.deleted)
    .toArray();

export const listMonthTransactions = (ledgerId: string, month: string) =>
  listTransactions(ledgerId, `${month}-01`, lastDayOf(month));

/** Every entry of one category in a date range. */
export const listCategoryTransactions = async (ledgerId: string, categoryId: string, start: string, end: string) =>
  (await listTransactions(ledgerId, start, end)).filter((t) => t.categoryId === categoryId);

export async function addTransaction(ledgerId: string, input: TransactionInput, recurringId: string | null = null) {
  const record: Transaction = { ...input, ...stamp(), ledgerId, recurringId };
  await db.transactions.add(record);
  return record.id;
}

export const updateTransaction = (id: string, input: TransactionInput) =>
  db.transactions.update(id, { ...input, updatedAt: Date.now() });

export const deleteTransaction = (id: string) =>
  db.transactions.update(id, { deleted: true, updatedAt: Date.now() });

/** Brings back a deleted entry (the Undo after a swipe). */
export const restoreTransaction = (id: string) =>
  db.transactions.update(id, { deleted: false, updatedAt: Date.now() });

/* ---------- Carry-over ---------- */

// One carry-over entry per ledger and month with a fixed id, so carrying on two
// offline devices can't add the money twice. (Personal keeps the original ids.)
const carryId = (ledgerId: string, month: string) =>
  ledgerId === DEFAULT_LEDGER_ID ? `carry-${month}` : `carry-${ledgerId}-${month}`;
const carryDismissedKey = (ledgerId: string, month: string) =>
  ledgerId === DEFAULT_LEDGER_ID ? `carry-dismissed:${month}` : `carry-dismissed:${ledgerId}:${month}`;

/** Money in minus money out for a month (includes its own carry-over, so it rolls). */
export async function monthBalance(ledgerId: string, month: string) {
  let balance = 0;
  let entries = 0;
  for (const t of await listMonthTransactions(ledgerId, month)) {
    if (t.excluded) continue;
    balance += t.type === "income" ? t.amount : -t.amount;
    entries++;
  }
  return { balance, entries };
}

export type CarryState = { previousBalance: number; previousEntries: number; decided: boolean };

/** Whether `month` still needs a decision about last month's leftover (or shortfall). */
export async function carryState(ledgerId: string, month: string, previousMonth: string): Promise<CarryState> {
  const [{ balance, entries }, existing, dismissed] = await Promise.all([
    monthBalance(ledgerId, previousMonth),
    db.transactions.get(carryId(ledgerId, month)),
    db.settings.get(carryDismissedKey(ledgerId, month)),
  ]);
  // Once carried (even if later deleted) or dismissed, don't ask again.
  return { previousBalance: balance, previousEntries: entries, decided: !!existing || !!dismissed };
}

/** Carries last month's result into `month` on its 1st: leftover as money in, overspend as money out. */
export async function carryOver(ledgerId: string, month: string, signedAmount: number, fromLabel: string) {
  await db.transactions.put({
    ...stamp(carryId(ledgerId, month)),
    ledgerId,
    type: signedAmount >= 0 ? "income" : "expense",
    amount: Math.abs(signedAmount),
    categoryId: CARRY_CATEGORY_ID,
    // No account: this money is already sitting in an account, it's only moving
    // between months. With an account it would be counted twice.
    accountId: null,
    date: `${month}-01`,
    note: `From ${fromLabel}`,
    excluded: false,
    recurringId: null,
  });
}

export const dismissCarry = (ledgerId: string, month: string) =>
  db.settings.put({ key: carryDismissedKey(ledgerId, month), value: true, updatedAt: Date.now() });
