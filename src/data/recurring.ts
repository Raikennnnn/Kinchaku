import { db, stamp, type Frequency, type Recurring } from "../db";
import { addDays, addMonthsKeepingDay, today, toDate } from "../lib/dates";
import type { TransactionInput } from "./transactions";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};

export const listRecurring = (ledgerId: string) =>
  db.recurring
    .where("ledgerId")
    .equals(ledgerId)
    .filter((r) => !r.deleted)
    .sortBy("nextDate");

/** The occurrence after `date`, keeping the rhythm of the start date (e.g. the 31st, clamped). */
export function nextOccurrence(rule: Pick<Recurring, "frequency" | "startDate">, date: string): string {
  const day = toDate(rule.startDate).getDate();
  switch (rule.frequency) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "monthly":
      return addMonthsKeepingDay(date, 1, day);
    case "yearly":
      return addMonthsKeepingDay(date, 12, day);
  }
}

/**
 * Starts repeating an entry the user just added on `input.date`: that first
 * entry is linked to the rule, and the rule waits for the next date.
 */
export async function startRecurring(ledgerId: string, input: TransactionInput, frequency: Frequency): Promise<string> {
  const rule: Recurring = {
    ...stamp(),
    ledgerId,
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    accountId: input.accountId,
    note: input.note,
    excluded: input.excluded,
    frequency,
    startDate: input.date,
    nextDate: nextOccurrence({ frequency, startDate: input.date }, input.date),
    active: true,
  };
  await db.recurring.add(rule);
  return rule.id;
}

export const setRecurringActive = (id: string, active: boolean) =>
  db.recurring.update(id, { active, updatedAt: Date.now() });

/** Stops the rule. Entries it already created stay. */
export const deleteRecurring = (id: string) => db.recurring.update(id, { deleted: true, updatedAt: Date.now() });

/**
 * Creates every entry that has come due since the app was last opened. Each
 * gets a fixed id from the rule and date, so two devices catching up offline
 * produce the same entries rather than duplicates.
 */
export async function runDueRecurring(): Promise<number> {
  const now = today();
  let created = 0;
  const rules = await db.recurring.filter((r) => !r.deleted && r.active && r.nextDate <= now).toArray();
  for (const rule of rules) {
    let date = rule.nextDate;
    // Cap the catch-up so a daily rule left for years can't freeze the app.
    for (let i = 0; date <= now && i < 400; i++) {
      await db.transactions.put({
        ...stamp(`rec-${rule.id}-${date}`),
        ledgerId: rule.ledgerId,
        type: rule.type,
        amount: rule.amount,
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        date,
        note: rule.note,
        excluded: rule.excluded,
        recurringId: rule.id,
      });
      created++;
      date = nextOccurrence(rule, date);
    }
    await db.recurring.update(rule.id, { nextDate: date, updatedAt: Date.now() });
  }
  return created;
}
