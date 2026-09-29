import type { AccountType, IconRef, SyncedTable } from "../db";
import { PRESET_ICONS } from "../icons";
import { ISO_DATE } from "../lib/dates";
import { ICON_DATA_URL } from "../lib/image";

// Checks for records that come from outside this device: a backup file (which
// may have been edited or come from anywhere) or the account (which any
// client holding the person's sign-in could have written to). A record that
// fails is skipped; one that passes keeps only the fields the app knows, so
// nothing extra rides along.

const ID = /^[A-Za-z0-9:_.\-]{1,160}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
/** Edit times may be at most a day ahead of this device's clock (a planted far-future time would win every merge). */
const maxTime = () => Date.now() + 86_400_000;

const isStr = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const isInt = (v: unknown, min = -1e15, max = 1e15): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isDate = (v: unknown): v is string => typeof v === "string" && ISO_DATE.test(v);
const isKind = (v: unknown) => v === "income" || v === "expense";
const isId = (v: unknown): v is string => typeof v === "string" && ID.test(v);
const isOptId = (v: unknown) => v === null || isId(v);
const isColor = (v: unknown) => typeof v === "string" && COLOR.test(v);

function isIcon(v: unknown): v is IconRef {
  if (typeof v !== "object" || v === null) return false;
  const i = v as Record<string, unknown>;
  if (i.kind === "preset") return typeof i.name === "string" && Object.hasOwn(PRESET_ICONS, i.name);
  if (i.kind === "custom") return isStr(i.dataUrl, 300_000) && ICON_DATA_URL.test(i.dataUrl as string);
  return false;
}
const cleanIcon = (i: IconRef): IconRef => (i.kind === "preset" ? { kind: "preset", name: i.name } : { kind: "custom", dataUrl: i.dataUrl });

const base = (r: Record<string, unknown>) =>
  isId(r.id) && isInt(r.createdAt, 0, maxTime()) && isInt(r.updatedAt, 0, maxTime()) && typeof r.deleted === "boolean";

const ACCOUNT_TYPES: AccountType[] = ["cash", "bank", "ewallet", "card", "savings", "loan"];
const BASE_FIELDS = ["id", "createdAt", "updatedAt", "deleted"];

type Rule = { valid: (r: Record<string, unknown>) => boolean; fields: string[] };

const RULES: Record<SyncedTable, Rule> = {
  ledgers: {
    valid: (r) => base(r) && isStr(r.name, 40) && typeof r.icon === "string" && Object.hasOwn(PRESET_ICONS, r.icon) && isColor(r.color) && isInt(r.order),
    fields: ["name", "icon", "color", "order"],
  },
  categories: {
    valid: (r) =>
      base(r) &&
      isStr(r.name, 40) &&
      isIcon(r.icon) &&
      isColor(r.color) &&
      isKind(r.kind) &&
      isInt(r.order) &&
      typeof r.builtIn === "boolean" &&
      (r.quickNotes === undefined || (Array.isArray(r.quickNotes) && r.quickNotes.length <= 20 && r.quickNotes.every((n) => isStr(n, 40)))) &&
      (r.system === undefined || typeof r.system === "boolean"),
    fields: ["name", "icon", "color", "kind", "order", "builtIn", "quickNotes", "system"],
  },
  accounts: {
    valid: (r) =>
      base(r) && isId(r.ledgerId) && isStr(r.name, 40) && ACCOUNT_TYPES.includes(r.type as AccountType) && isIcon(r.icon) && isColor(r.color) && isInt(r.opening) && isInt(r.order),
    fields: ["ledgerId", "name", "type", "icon", "color", "opening", "order"],
  },
  transactions: {
    valid: (r) =>
      base(r) &&
      isId(r.ledgerId) &&
      isKind(r.type) &&
      isInt(r.amount, 0) &&
      isId(r.categoryId) &&
      isOptId(r.accountId) &&
      isDate(r.date) &&
      isStr(r.note, 200) &&
      typeof r.excluded === "boolean" &&
      isOptId(r.recurringId),
    fields: ["ledgerId", "type", "amount", "categoryId", "accountId", "date", "note", "excluded", "recurringId"],
  },
  transfers: {
    valid: (r) => base(r) && isId(r.ledgerId) && isId(r.fromId) && isId(r.toId) && isInt(r.amount, 0) && isDate(r.date) && isStr(r.note, 200),
    fields: ["ledgerId", "fromId", "toId", "amount", "date", "note"],
  },
  budgets: {
    valid: (r) => base(r) && isId(r.ledgerId) && isId(r.categoryId) && isInt(r.amount, 0),
    fields: ["ledgerId", "categoryId", "amount"],
  },
  recurring: {
    valid: (r) =>
      base(r) &&
      isId(r.ledgerId) &&
      isKind(r.type) &&
      isInt(r.amount, 0) &&
      isId(r.categoryId) &&
      isOptId(r.accountId) &&
      isStr(r.note, 200) &&
      typeof r.excluded === "boolean" &&
      ["daily", "weekly", "monthly", "yearly"].includes(r.frequency as string) &&
      isDate(r.startDate) &&
      isDate(r.nextDate) &&
      typeof r.active === "boolean",
    fields: ["ledgerId", "type", "amount", "categoryId", "accountId", "note", "excluded", "frequency", "startDate", "nextDate", "active"],
  },
  goals: {
    valid: (r) =>
      base(r) && isId(r.ledgerId) && isStr(r.name, 40) && isInt(r.target, 0) && isIcon(r.icon) && isColor(r.color) && (r.deadline === null || isDate(r.deadline)) && isInt(r.order),
    fields: ["ledgerId", "name", "target", "icon", "color", "deadline", "order"],
  },
  goalDeposits: {
    valid: (r) => base(r) && isId(r.ledgerId) && isId(r.goalId) && isInt(r.amount) && isDate(r.date) && isStr(r.note, 200) && isOptId(r.transactionId),
    fields: ["ledgerId", "goalId", "amount", "date", "note", "transactionId"],
  },
};

/** A record from outside, checked and trimmed to its known fields, or null if it doesn't pass. */
export function cleanRecord(table: SyncedTable, row: unknown): Record<string, unknown> | null {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return null;
  const r = row as Record<string, unknown>;
  const rule = RULES[table];
  if (!rule.valid(r)) return null;
  const out: Record<string, unknown> = {};
  for (const f of [...BASE_FIELDS, ...rule.fields]) {
    if (!Object.hasOwn(r, f) || r[f] === undefined) continue;
    out[f] = f === "icon" && typeof r.icon === "object" ? cleanIcon(r.icon as IconRef) : f === "quickNotes" ? [...(r.quickNotes as string[])] : r[f];
  }
  return out;
}

/** An ISO 4217 code this browser can format money in. */
export function isCurrency(v: unknown): v is string {
  if (typeof v !== "string" || !/^[A-Z]{3}$/.test(v)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: v });
    return true;
  } catch {
    return false;
  }
}

const SETTING_VALUES: Record<string, (v: unknown) => boolean> = {
  currency: isCurrency,
  petName: (v) => isStr(v, 20),
  petLang: (v) => v === "auto" || v === "en" || v === "tl",
  petHidden: (v) => typeof v === "boolean",
};

/** A synced setting from the account, checked, or null. */
export function cleanSetting(row: unknown): { key: string; value: unknown; updatedAt: number } | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const check = typeof r.key === "string" && Object.hasOwn(SETTING_VALUES, r.key) ? SETTING_VALUES[r.key] : undefined;
  if (!check || !check(r.value) || !isInt(r.updatedAt, 0, maxTime())) return null;
  return { key: r.key as string, value: r.value, updatedAt: r.updatedAt as number };
}
