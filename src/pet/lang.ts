import { SCALE } from "../lib/money";
import { addDays, toDate } from "../lib/dates";

export type Lang = "en" | "tl";

/** Pick the English or Tagalog version of a line. */
export const say = (lang: Lang, en: string, tl: string) => (lang === "tl" ? tl : en);

// Common Filipino words; two or more (or one with no English cue) means the message is Tagalog/Taglish.
const TL_WORDS = new Set(
  "ba ko ako mo ka ng na pa po sa ang mga yung iyong ito iyan yan dito ano sino saan kailan paano bakit magkano ilan pwede puwede pede kaya sapat natitira natira napunta pera gastos gumastos nagastos ginastos gastusin bili bumili bibili bilhin binili kumain kain ngayong ngayon buwan linggo araw kahapon bukas nakaraang susunod kada bawat tipid makatipid ipon mag-ipon ipunin salamat kumusta kamusta musta lagay ayos lang naman talaga sobra marami konti kulang utang sahod baon badyet bayarin babayaran pumasok lampas magandang umaga hapon gabi tulong alam kong ko'ng niya natin namin sila siya wala meron mayroon".split(" "),
);
const EN_WORDS = new Set(
  "the i my can how much what where when is are do does did should could would afford buy spend spent left money budget day month week today tips save saving thanks thank hello hi hey help you your much more less compare".split(" "),
);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const words = (text: string) => normalize(text).split(/[^a-z0-9'\-]+/).filter(Boolean);

/** Which language a message is in, or null if it can't tell (e.g. just a number). */
export function detectLang(text: string): Lang | null {
  const ws = words(text);
  let tl = 0;
  let en = 0;
  for (const w of ws) {
    if (TL_WORDS.has(w)) tl++;
    if (EN_WORDS.has(w)) en++;
  }
  if (tl >= 2 || (tl >= 1 && tl >= en)) return "tl";
  if (en >= 1) return "en";
  return null;
}

/** Levenshtein distance, capped: good enough to forgive one typo. */
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/**
 * Whether the message contains any of the keywords. Multi-word keywords are
 * matched as phrases; single words also match with one typo when they're
 * long enough ("aford" finds "afford").
 */
export function hasAny(text: string, keywords: string[]): boolean {
  const norm = ` ${normalize(text).replace(/[^a-z0-9'\- ]+/g, " ")} `;
  const ws = words(text);
  return keywords.some((k) => {
    if (k.includes(" ")) return norm.includes(` ${k} `) || norm.includes(k);
    if (ws.includes(k)) return true;
    return k.length >= 5 && ws.some((w) => w.length >= 4 && distance(w, k) <= 1);
  });
}

// Words right before a number that mark it as a price ("for 500", "sapatos na 2500").
const PRICE_CUES = new Set("for at worth cost costs costing price priced around about only just is na halaga nagkakahalaga presyo mga lang ng".split(" "));
// Words right before a number that mark it as a date or time, not a price ("in 2027", "sa 15").
const TIME_CUES = new Set("in by until till before after since on sa hanggang bago noong ika".split(" "));
const UNITS: Record<string, number> = { k: 1e3, thousand: 1e3, libo: 1e3, m: 1e6, million: 1e6, milyon: 1e6 };
const CURRENCY_WORDS = /^(pesos?|piso|php|dollars?|usd|euros?|eur|yen|jpy|pounds?|gbp)$/;

/**
 * The price in a message, in stored units: "2500", "2,500", "₱2,500.50",
 * "2.5k", "3 libo", "for 800". A number only counts when it looks like money:
 * a currency sign or word, a unit, a price word before it, or a size of at
 * least 100. So the "2" in "Jordan Air 2", the "15" in "iPhone 15" and the
 * "5" in "PS5" are skipped. With `anyNumber` (the cat just asked "how
 * much?"), any number is taken. Returns null when there's no price.
 */
export function parseMoney(text: string, anyNumber = false): number | null {
  const norm = text.toLowerCase().replace(/(\d)[,\s](?=\d{3}(?!\d))/g, "$1");
  const re = /([$₱€£¥]\s*)?(?<![\w.])(\d+(?:\.\d+)?)(?:\s*(k|thousand|libo|million|milyon|m)\b|(?![\w.]))/g;
  let cued: number | null = null;
  let bare: number | null = null;
  for (let m; (m = re.exec(norm)); ) {
    let value = Number(m[2]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const unit = m[3];
    if (unit) value *= UNITS[unit]!;
    if (value > 1e12) continue;
    const before = norm.slice(0, m.index).trim().split(/\s+/).pop()?.replace(/[^a-z]/g, "") ?? "";
    const after = norm.slice(re.lastIndex).trim().split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";
    const isPrice = !!m[1] || !!unit || CURRENCY_WORDS.test(after) || CURRENCY_WORDS.test(before) || PRICE_CUES.has(before);
    if (isPrice) {
      cued ??= value;
    } else if (!TIME_CUES.has(before) && (anyNumber || value >= 100)) {
      bare = Math.max(bare ?? 0, value);
    }
  }
  const value = cued ?? bare;
  return value === null ? null : Math.round(value * SCALE);
}

const monthFmt = {
  en: new Intl.DateTimeFormat("en", { month: "long" }),
  tl: safeFormat("fil", { month: "long" }),
};
const shortFmt = {
  en: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }),
  tl: safeFormat("fil", { month: "short", day: "numeric" }),
};

function safeFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat("en", options);
  }
}

export const monthIn = (lang: Lang, month: string) => monthFmt[lang].format(toDate(`${month}-01`));

/** "today", "tomorrow", "on Sep 30" / "ngayon", "bukas", "sa Set 30" */
export function whenIn(lang: Lang, date: string, now: string): string {
  if (date <= now) return say(lang, "today", "ngayon");
  if (date === addDays(now, 1)) return say(lang, "tomorrow", "bukas");
  const label = shortFmt[lang].format(toDate(date));
  return say(lang, `on ${label}`, `sa ${label}`);
}

/** "the 24th" / "ika-24" */
export function dayOfMonthIn(lang: Lang, day: number): string {
  if (lang === "tl") return `ika-${day}`;
  const s = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `the ${day}${s}`;
}
