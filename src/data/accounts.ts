import { db, getSetting, LIABILITY_TYPES, setSetting, stamp, type Account, type Transfer } from "../db";

export const listAccounts = (ledgerId: string) =>
  db.accounts
    .where("ledgerId")
    .equals(ledgerId)
    .filter((a) => !a.deleted)
    .sortBy("order");

export const isLiability = (a: Pick<Account, "type">) => LIABILITY_TYPES.includes(a.type);

export type AccountInput = Pick<Account, "name" | "type" | "icon" | "color" | "opening">;

export async function addAccount(ledgerId: string, input: AccountInput): Promise<string> {
  const existing = await listAccounts(ledgerId);
  const record: Account = { ...input, ...stamp(), ledgerId, order: existing.length };
  await db.accounts.add(record);
  return record.id;
}

export const updateAccount = (id: string, input: AccountInput) =>
  db.accounts.update(id, { ...input, updatedAt: Date.now() });

/** Hides the account. Its entries keep pointing at it and show without an account. */
export const deleteAccount = (id: string) => db.accounts.update(id, { deleted: true, updatedAt: Date.now() });

/**
 * Current balance of every account in the ledger: opening balance, plus money
 * in, minus money out, plus transfers in, minus transfers out. Entries left
 * out of totals still count here, because the money really moved.
 */
export async function accountBalances(ledgerId: string): Promise<Map<string, number>> {
  const balances = new Map<string, number>();
  for (const a of await listAccounts(ledgerId)) balances.set(a.id, a.opening);
  const bump = (id: string | null, by: number) => {
    if (id && balances.has(id)) balances.set(id, balances.get(id)! + by);
  };
  await db.transactions
    .where("[ledgerId+date]")
    .between([ledgerId, ""], [ledgerId, "￿"])
    .filter((t) => !t.deleted)
    .each((t) => bump(t.accountId, t.type === "income" ? t.amount : -t.amount));
  await db.transfers
    .where("[ledgerId+date]")
    .between([ledgerId, ""], [ledgerId, "￿"])
    .filter((t) => !t.deleted)
    .each((t) => {
      bump(t.fromId, -t.amount);
      bump(t.toId, t.amount);
    });
  return balances;
}

/** Account preselected for new entries: the last one used, if it still exists. */
export async function preferredAccountId(ledgerId: string): Promise<string | null> {
  const accounts = await listAccounts(ledgerId);
  const last = await getSetting<string>(`lastAccount:${ledgerId}`);
  return accounts.find((a) => a.id === last)?.id ?? accounts[0]?.id ?? null;
}

export const rememberAccount = (ledgerId: string, accountId: string | null) =>
  accountId ? setSetting(`lastAccount:${ledgerId}`, accountId) : Promise.resolve();

/* ---------- Transfers ---------- */

export type TransferInput = Pick<Transfer, "fromId" | "toId" | "amount" | "date" | "note">;

export async function addTransfer(ledgerId: string, input: TransferInput) {
  await db.transfers.add({ ...input, ...stamp(), ledgerId });
}

export const updateTransfer = (id: string, input: TransferInput) =>
  db.transfers.update(id, { ...input, updatedAt: Date.now() });

export const deleteTransfer = (id: string) => db.transfers.update(id, { deleted: true, updatedAt: Date.now() });

export const listTransfers = (ledgerId: string, start: string, end: string) =>
  db.transfers
    .where("[ledgerId+date]")
    .between([ledgerId, start], [ledgerId, end], true, true)
    .filter((t) => !t.deleted)
    .reverse()
    .sortBy("date");
