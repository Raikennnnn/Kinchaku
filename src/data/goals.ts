import { SAVINGS_CATEGORY_ID } from "../categories";
import { db, stamp, type Goal, type GoalDeposit } from "../db";

export const listGoals = (ledgerId: string) =>
  db.goals
    .where("ledgerId")
    .equals(ledgerId)
    .filter((g) => !g.deleted)
    .sortBy("order");

export type GoalInput = Pick<Goal, "name" | "target" | "icon" | "color" | "deadline">;

export async function addGoal(ledgerId: string, input: GoalInput): Promise<string> {
  const existing = await listGoals(ledgerId);
  const record: Goal = { ...input, ...stamp(), ledgerId, order: existing.length };
  await db.goals.add(record);
  return record.id;
}

export const updateGoal = (id: string, input: GoalInput) => db.goals.update(id, { ...input, updatedAt: Date.now() });

export const deleteGoal = (id: string) => db.goals.update(id, { deleted: true, updatedAt: Date.now() });

/** Saved so far in each goal of the ledger. */
export async function goalTotals(ledgerId: string): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  await db.goalDeposits
    .where("ledgerId")
    .equals(ledgerId)
    .filter((d) => !d.deleted)
    .each((d) => totals.set(d.goalId, (totals.get(d.goalId) ?? 0) + d.amount));
  return totals;
}

export const listDeposits = (goalId: string) =>
  db.goalDeposits
    .where("goalId")
    .equals(goalId)
    .filter((d) => !d.deleted)
    .reverse()
    .sortBy("date");

/**
 * Puts money into a goal (positive) or takes it out (negative). With
 * `fromMonth`, it's also recorded in the month: a deposit as a "To savings"
 * expense, a withdrawal as money back in, so what's left stays honest.
 */
export async function addDeposit(
  ledgerId: string,
  goal: Pick<Goal, "id" | "name">,
  amount: number,
  date: string,
  note: string,
  fromMonth: boolean,
) {
  const deposit: GoalDeposit = { ...stamp(), ledgerId, goalId: goal.id, amount, date, note, transactionId: null };
  await db.transaction("rw", db.goalDeposits, db.transactions, async () => {
    if (fromMonth) {
      const tx = {
        ...stamp(`goal-${deposit.id}`),
        ledgerId,
        type: amount > 0 ? ("expense" as const) : ("income" as const),
        amount: Math.abs(amount),
        categoryId: SAVINGS_CATEGORY_ID,
        accountId: null,
        date,
        note: amount > 0 ? `Saved for ${goal.name}` : `From ${goal.name} savings`,
        excluded: false,
        recurringId: null,
      };
      await db.transactions.add(tx);
      deposit.transactionId = tx.id;
    }
    await db.goalDeposits.add(deposit);
  });
}

/** Removes a deposit and the month entry recorded with it. */
export async function deleteDeposit(deposit: GoalDeposit) {
  const now = Date.now();
  await db.transaction("rw", db.goalDeposits, db.transactions, async () => {
    await db.goalDeposits.update(deposit.id, { deleted: true, updatedAt: now });
    if (deposit.transactionId) await db.transactions.update(deposit.transactionId, { deleted: true, updatedAt: now });
  });
}
