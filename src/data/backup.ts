import type { Table } from "dexie";
import { CATEGORY_COLORS } from "../categories";
import { db, getSetting, setSetting, stamp } from "../db";
import { toCsv, parseCsv } from "../lib/csv";
import { ISO_DATE, today } from "../lib/dates";
import { amountToInput, currencyDigits, SCALE } from "../lib/money";
import { listAccounts } from "./accounts";
import { cleanRecord, isCurrency } from "./validate";

const TABLES = [
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

const BACKUP_FORMAT = "kinchaku-backup";

/* ---------- Full backup (JSON) ---------- */

export async function exportBackup(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const name of TABLES) tables[name] = await (db[name] as Table).toArray();
  await setSetting("lastBackup", today());
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      currency: await getSetting<string>("currency"),
      tables,
    },
    null,
    1,
  );
}

export type ImportResult = { added: number; updated: number; skipped: number; invalid: number };

/**
 * Merges a backup into this device. Records are matched by id; an incoming
 * record only replaces one here if it was changed more recently, the same
 * rule sync will use. Nothing is deleted outright.
 */
export async function importBackup(json: string): Promise<ImportResult> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("That file isn't a Kinchaku backup.");
  }
  const d = data as { format?: unknown; tables?: Record<string, unknown> };
  if (d?.format !== BACKUP_FORMAT || typeof d.tables !== "object" || d.tables === null) {
    throw new Error("That file isn't a Kinchaku backup.");
  }

  const result: ImportResult = { added: 0, updated: 0, skipped: 0, invalid: 0 };
  await db.transaction("rw", TABLES.map((t) => db[t] as Table), async () => {
    for (const name of TABLES) {
      const rows = d.tables![name];
      if (!Array.isArray(rows)) continue;
      const table = db[name] as Table<Record<string, unknown>, string>;
      for (const row of rows.slice(0, 200_000)) {
        // Checked and trimmed to known fields (see validate.ts).
        const clean = cleanRecord(name, row);
        if (!clean) {
          result.invalid++;
          continue;
        }
        const incoming = clean as Record<string, unknown> & { id: string; updatedAt: number };
        const existing = await table.get(incoming.id);
        if (existing && (existing.updatedAt as number) >= incoming.updatedAt) {
          result.skipped++;
          continue;
        }
        await table.put(incoming);
        if (existing) result.updated++;
        else result.added++;
      }
    }
  });
  if (isCurrency((d as { currency?: unknown }).currency) && !(await getSetting("currency"))) {
    await setSetting("currency", (d as { currency: string }).currency);
  }
  return result;
}

/* ---------- Spreadsheet (CSV) ---------- */

const CSV_HEADER = ["Date", "Type", "Category", "Amount", "Account", "Note", "Left out of totals"];

/** Every entry in a ledger as CSV, oldest first. */
export async function exportCsv(ledgerId: string, currency: string): Promise<string> {
  const [rows, categories, accounts] = await Promise.all([
    db.transactions
      .where("[ledgerId+date]")
      .between([ledgerId, ""], [ledgerId, "ï¿¿"])
      .filter((t) => !t.deleted)
      .toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
  ]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const digits = currencyDigits(currency);
  return toCsv(
    CSV_HEADER,
    rows.map((t) => [
      t.date,
      t.type === "income" ? "Money in" : "Expense",
      catName.get(t.categoryId) ?? "",
      amountToInput(t.amount, digits),
      t.accountId ? (accName.get(t.accountId) ?? "") : "",
      t.note,
      t.excluded ? "yes" : "",
    ]),
    [3],
  );
}

/** Reads amounts like "1234.5", "1,234.50", "1234,50" or "-45". */
function parseCsvAmount(raw: string): number | null {
  let s = raw.trim().replace(/[\s'Â ]/g, "").replace(/^[^\d\-.,]+/, "");
  const negative = s.startsWith("-");
  s = s.replace(/^-/, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  if (!/^\d{1,12}(\.\d{1,3})?$/.test(s)) return null;
  const [whole = "0", frac = ""] = s.split(".");
  const value = Number(whole) * SCALE + Number((frac + "000").slice(0, 3));
  return negative ? -value : value;
}

export type CsvImportResult = { added: number; invalid: number; newCategories: number; newAccounts: number };

/**
 * Imports entries from a CSV with at least Date, Category and Amount columns
 * (Type, Account and Note are optional). Without a Type column, negative
 * amounts are expenses and positive ones money in. Missing categories and
 * accounts are created. Dates must be YYYY-MM-DD.
 */
export async function importCsv(text: string, ledgerId: string): Promise<CsvImportResult> {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("That file has no rows to import.");
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iDate = col("date");
  const iType = col("type");
  const iCat = col("category");
  const iAmount = col("amount");
  const iAccount = col("account");
  const iNote = col("note", "notes", "description", "memo");
  if (iDate < 0 || iCat < 0 || iAmount < 0) throw new Error("The file needs Date, Category and Amount columns.");

  const result: CsvImportResult = { added: 0, invalid: 0, newCategories: 0, newAccounts: 0 };
  const categories = await db.categories.filter((c) => !c.deleted).toArray();
  const accounts = await listAccounts(ledgerId);
  let colorIndex = categories.length;

  for (const r of rows.slice(1, 100_001)) {
    const date = r[iDate]?.trim() ?? "";
    const amount = parseCsvAmount(r[iAmount] ?? "");
    const categoryName = (r[iCat] ?? "").trim().slice(0, 40);
    if (!ISO_DATE.test(date) || amount === null || amount === 0 || !categoryName) {
      result.invalid++;
      continue;
    }
    const typeRaw = iType >= 0 ? (r[iType] ?? "").trim().toLowerCase() : "";
    const type: "income" | "expense" = ["income", "money in", "in", "+"].includes(typeRaw)
      ? "income"
      : ["expense", "out", "-", "money out"].includes(typeRaw)
        ? "expense"
        : amount < 0
          ? "expense"
          : "income";

    let category = categories.find((c) => c.kind === type && c.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) {
      category = {
        ...stamp(),
        name: categoryName,
        kind: type,
        icon: { kind: "preset", name: "tag" },
        color: CATEGORY_COLORS[colorIndex++ % CATEGORY_COLORS.length]!,
        order: categories.length,
        builtIn: false,
        quickNotes: [],
      };
      await db.categories.add(category);
      categories.push(category);
      result.newCategories++;
    }

    let accountId: string | null = accounts[0]?.id ?? null;
    const accountName = iAccount >= 0 ? (r[iAccount] ?? "").trim().slice(0, 40) : "";
    if (accountName) {
      let account = accounts.find((a) => a.name.toLowerCase() === accountName.toLowerCase());
      if (!account) {
        account = {
          ...stamp(),
          ledgerId,
          name: accountName,
          type: "cash",
          icon: { kind: "preset", name: "wallet" },
          color: "#0ea5e9",
          opening: 0,
          order: accounts.length,
        };
        await db.accounts.add(account);
        accounts.push(account);
        result.newAccounts++;
      }
      accountId = account.id;
    }

    await db.transactions.add({
      ...stamp(),
      ledgerId,
      type,
      amount: Math.abs(amount),
      categoryId: category.id,
      accountId,
      date,
      note: iNote >= 0 ? (r[iNote] ?? "").trim().slice(0, 200) : "",
      excluded: false,
      recurringId: null,
    });
    result.added++;
  }
  return result;
}
