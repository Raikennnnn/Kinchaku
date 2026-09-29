import Dexie, { type EntityTable } from "dexie";
import { DEFAULT_CATEGORIES, type Kind } from "./categories";
import type { PresetIconName } from "./icons";

export type { Kind } from "./categories";

export type IconRef =
  | { kind: "preset"; name: PresetIconName }
  | { kind: "custom"; dataUrl: string };

/**
 * Fields every synced record carries. Ids are random strings so records made
 * on two offline devices never collide, updatedAt decides which edit wins,
 * and deletes are flags because a hard-deleted record would come back from a
 * device that was offline when it was removed.
 */
export type SyncFields = { id: string; createdAt: number; updatedAt: number; deleted: boolean };

/** A separate book of money, e.g. Personal and Business. Categories are shared. */
export type Ledger = SyncFields & { name: string; icon: PresetIconName; color: string; order: number };

export type Category = SyncFields & {
  name: string;
  icon: IconRef;
  /** Hex colour, #rrggbb */
  color: string;
  kind: Kind;
  order: number;
  builtIn: boolean;
  quickNotes?: string[];
  /** Used by the app itself (carry-over, savings); hidden from pickers and the category list. */
  system?: boolean;
};

export type AccountType = "cash" | "bank" | "ewallet" | "card" | "savings" | "loan";
/** Cards and loans hold money you owe; the rest hold money you have. */
export const LIABILITY_TYPES: AccountType[] = ["card", "loan"];

export type Account = SyncFields & {
  ledgerId: string;
  name: string;
  type: AccountType;
  icon: IconRef;
  color: string;
  /** Balance when added: positive for money held, negative for money owed. Thousandths. */
  opening: number;
  order: number;
};

/** Money in (type "income") or money out (type "expense"). */
export type Transaction = SyncFields & {
  ledgerId: string;
  type: Kind;
  /** Integer thousandths of the currency unit, always positive. See lib/money.ts */
  amount: number;
  categoryId: string;
  accountId: string | null;
  /** Local calendar day, YYYY-MM-DD */
  date: string;
  note: string;
  /** Left out of totals, budgets and stats (still moves the account balance). */
  excluded: boolean;
  /** The repeating rule that created it, if any. */
  recurringId: string | null;
};

/** Money moved between two accounts; not income or spending. */
export type Transfer = SyncFields & {
  ledgerId: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  note: string;
};

/** A monthly spending limit for one expense category, or the whole month (categoryId "total"). */
export type Budget = SyncFields & { ledgerId: string; categoryId: string; amount: number };

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

/** A repeating entry: creates a transaction on each due date. */
export type Recurring = SyncFields & {
  ledgerId: string;
  type: Kind;
  amount: number;
  categoryId: string;
  accountId: string | null;
  note: string;
  excluded: boolean;
  frequency: Frequency;
  /** First date; its day of month/week sets the rhythm. */
  startDate: string;
  /** Next date that hasn't been created yet. */
  nextDate: string;
  active: boolean;
};

export type Goal = SyncFields & {
  ledgerId: string;
  name: string;
  target: number;
  icon: IconRef;
  color: string;
  deadline: string | null;
  order: number;
};

/** Money put into (positive) or taken out of (negative) a savings goal. */
export type GoalDeposit = SyncFields & {
  ledgerId: string;
  goalId: string;
  amount: number;
  date: string;
  note: string;
  /** The "To savings" expense recorded with it, if the money came from the month. */
  transactionId: string | null;
};

type Setting = { key: string; value: unknown; updatedAt: number };

export const db = new Dexie("kinchaku") as Dexie & {
  ledgers: EntityTable<Ledger, "id">;
  categories: EntityTable<Category, "id">;
  accounts: EntityTable<Account, "id">;
  transactions: EntityTable<Transaction, "id">;
  transfers: EntityTable<Transfer, "id">;
  budgets: EntityTable<Budget, "id">;
  recurring: EntityTable<Recurring, "id">;
  goals: EntityTable<Goal, "id">;
  goalDeposits: EntityTable<GoalDeposit, "id">;
  settings: EntityTable<Setting, "key">;
};

export const DEFAULT_LEDGER_ID = "personal";
export const DEFAULT_ACCOUNT_ID = "cash-personal";

const QUICK_NOTES = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c.quickNotes]));

function defaultCategory(c: (typeof DEFAULT_CATEGORIES)[number], order: number, now: number): Category {
  return {
    ...c,
    icon: { kind: "preset", name: c.icon },
    order,
    builtIn: true,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
}

const defaultLedger = (now: number): Ledger => ({
  id: DEFAULT_LEDGER_ID,
  name: "Personal",
  icon: "wallet",
  color: "#6366f1",
  order: 0,
  createdAt: now,
  updatedAt: now,
  deleted: false,
});

const defaultAccount = (now: number): Account => ({
  id: DEFAULT_ACCOUNT_ID,
  ledgerId: DEFAULT_LEDGER_ID,
  name: "Cash",
  type: "cash",
  icon: { kind: "preset", name: "wallet" },
  color: "#22c55e",
  opening: 0,
  order: 0,
  createdAt: now,
  updatedAt: now,
  deleted: false,
});

db.version(1).stores({
  categories: "id, order",
  expenses: "id, date, categoryId",
  settings: "key",
});

// v2: expenses become transactions (money in and out); categories get a kind.
db.version(2)
  .stores({
    categories: "id, order",
    expenses: "id, date, categoryId",
    transactions: "id, date, categoryId",
    settings: "key",
  })
  .upgrade(async (tx) => {
    const now = Date.now();
    const old = await tx.table("expenses").toArray();
    await tx.table("transactions").bulkPut(old.map((e) => ({ ...e, type: "expense" })));
    await tx.table("categories").toCollection().modify((c: Category) => {
      c.kind ??= "expense";
    });
    const existing = new Set((await tx.table("categories").toCollection().primaryKeys()) as string[]);
    let order = existing.size;
    await tx.table("categories").bulkPut(
      DEFAULT_CATEGORIES.filter((c) => !existing.has(c.id)).map((c) => defaultCategory(c, order++, now)),
    );
  });

// v3: drop the old table now its rows live in transactions.
db.version(3).stores({ expenses: null });

// v4: ledgers, accounts, transfers, budgets, repeating entries and savings goals.
// Existing entries move into the Personal ledger and its Cash account.
db.version(4)
  .stores({
    ledgers: "id, order",
    categories: "id, order",
    accounts: "id, ledgerId, order",
    transactions: "id, [ledgerId+date], categoryId, accountId, recurringId",
    transfers: "id, [ledgerId+date], fromId, toId",
    budgets: "id, ledgerId",
    recurring: "id, ledgerId",
    goals: "id, ledgerId",
    goalDeposits: "id, goalId, ledgerId",
    settings: "key",
  })
  .upgrade(async (tx) => {
    const now = Date.now();
    await tx.table("ledgers").put(defaultLedger(now));
    await tx.table("accounts").put(defaultAccount(now));
    await tx.table("transactions").toCollection().modify((t: Transaction) => {
      t.ledgerId ??= DEFAULT_LEDGER_ID;
      t.accountId ??= DEFAULT_ACCOUNT_ID;
      t.excluded ??= false;
      t.recurringId ??= null;
    });
    await tx.table("categories").toCollection().modify((c: Category) => {
      c.quickNotes ??= QUICK_NOTES.get(c.id) ?? [];
    });
    const existing = new Set((await tx.table("categories").toCollection().primaryKeys()) as string[]);
    let order = existing.size;
    await tx.table("categories").bulkPut(
      DEFAULT_CATEGORIES.filter((c) => !existing.has(c.id)).map((c) => defaultCategory(c, order++, now)),
    );
  });

db.on("populate", (tx) => {
  const now = Date.now();
  tx.table("categories").bulkAdd(DEFAULT_CATEGORIES.map((c, i) => defaultCategory(c, i, now)));
  tx.table("ledgers").add(defaultLedger(now));
  tx.table("accounts").add(defaultAccount(now));
});

/** Fresh sync fields for a new record. */
export function stamp(id: string = crypto.randomUUID()) {
  const now = Date.now();
  return { id, createdAt: now, updatedAt: now, deleted: false };
}

/* ---------- Settings ---------- */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined;
}

export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value, updatedAt: Date.now() });

/** The chosen currency code, or null before the user has picked one. */
export async function getCurrency(): Promise<string | null> {
  const v = await getSetting<unknown>("currency");
  return typeof v === "string" ? v : null;
}

export const setCurrency = (code: string) => setSetting("currency", code);
