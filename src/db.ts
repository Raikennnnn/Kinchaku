import Dexie, { type EntityTable } from "dexie";
import { DEFAULT_CATEGORIES, type Kind } from "./categories";
import type { PresetIconName } from "./icons";
import { isCurrency } from "./data/validate";

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
export type SyncFields = {
  id: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
  /** 1 while this device has a change the account hasn't received yet (see sync/). */
  _dirty?: 0 | 1;
};

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

type Setting = { key: string; value: unknown; updatedAt: number; _dirty?: 0 | 1 };

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

/** Tables whose records sync with the account. */
export const SYNCED_TABLES = [
  "ledgers",
  "categories",
  "accounts",
  "transactions",
  "transfers",
  "budgets",
  "recurring",
  "goals",
  "goalDeposits",
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

/** Settings that follow the account; the rest (active ledger, reminders dismissed…) stay per device. */
export const SYNCED_SETTINGS = ["currency", "petName", "petLang", "petHidden"];

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
    updatedAt: 0,
    deleted: false,
    _dirty: 1,
  };
}

const defaultLedger = (now: number): Ledger => ({
  id: DEFAULT_LEDGER_ID,
  name: "Personal",
  icon: "wallet",
  color: "#6366f1",
  order: 0,
  createdAt: now,
  updatedAt: 0,
  deleted: false,
  _dirty: 1,
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
  updatedAt: 0,
  deleted: false,
  _dirty: 1,
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

// v5: sync with an account. Each record notes whether it has a change the
// account hasn't received yet. Built-in records nobody has edited count as
// never edited (updatedAt 0), so a new device's defaults never overwrite
// edits made on another one.
db.version(5)
  .stores({
    ledgers: "id, order, _dirty",
    categories: "id, order, _dirty",
    accounts: "id, ledgerId, order, _dirty",
    transactions: "id, [ledgerId+date], categoryId, accountId, recurringId, _dirty",
    transfers: "id, [ledgerId+date], fromId, toId, _dirty",
    budgets: "id, ledgerId, _dirty",
    recurring: "id, ledgerId, _dirty",
    goals: "id, ledgerId, _dirty",
    goalDeposits: "id, goalId, ledgerId, _dirty",
    settings: "key, _dirty",
  })
  .upgrade(async (tx) => {
    for (const name of SYNCED_TABLES) {
      await tx.table(name).toCollection().modify((r: SyncFields & { builtIn?: boolean }) => {
        const isDefault = r.builtIn || r.id === DEFAULT_LEDGER_ID || r.id === DEFAULT_ACCOUNT_ID;
        if (isDefault && r.createdAt === r.updatedAt) r.updatedAt = 0;
        r._dirty = 1;
      });
    }
    await tx.table("settings").toCollection().modify((s: Setting) => {
      if (SYNCED_SETTINGS.includes(s.key)) s._dirty = 1;
    });
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
  // A code the browser can't format money in would break every screen: ask again instead.
  return isCurrency(v) ? v : null;
}

export const setCurrency = (code: string) => setSetting("currency", code);

/* ---------- Change tracking for sync ---------- */

// Writes made by the sync itself run in a transaction carrying this mark, so
// changes that came from the account aren't sent straight back to it.
const FROM_SYNC = Symbol("fromSync");

/** Runs `fn` in a read-write transaction whose writes don't count as local changes. */
export function syncTransaction<T>(tables: string[], fn: () => Promise<T>): Promise<T> {
  return db.transaction("rw", tables, (tx) => {
    (tx as unknown as Record<symbol, boolean>)[FROM_SYNC] = true;
    return fn();
  });
}

// Upgrades and first-run setup aren't user edits either; they set their own marks.
const fromSync = (tx: unknown) => {
  const t = tx as { mode?: string; idbtrans?: IDBTransaction } | undefined;
  if (t?.mode === "versionchange" || t?.idbtrans?.mode === "versionchange") return true;
  for (let t = tx as { parent?: unknown } | undefined; t; t = t.parent as typeof t) {
    if ((t as unknown as Record<symbol, boolean>)[FROM_SYNC]) return true;
  }
  return false;
};

// Every local write marks its record as unsynced and, if the caller didn't,
// stamps updatedAt: the newer edit wins when devices meet.
for (const name of SYNCED_TABLES) {
  const table = db.table<SyncFields, string>(name);
  table.hook("creating", (_key, obj, tx) => {
    if (fromSync(tx)) return;
    obj._dirty = 1;
    obj.updatedAt ??= Date.now();
  });
  table.hook("updating", (mods, _key, _obj, tx) => {
    if (fromSync(tx)) return undefined;
    return "updatedAt" in mods ? { _dirty: 1 } : { _dirty: 1, updatedAt: Date.now() };
  });
}
db.settings.hook("creating", (_key, obj, tx) => {
  if (!fromSync(tx) && SYNCED_SETTINGS.includes(obj.key)) obj._dirty = 1;
});
db.settings.hook("updating", (_mods, _key, obj, tx) => {
  if (!fromSync(tx) && SYNCED_SETTINGS.includes(obj.key)) return { _dirty: 1 };
  return undefined;
});
