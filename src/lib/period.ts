import {
  addDays,
  dayLabel,
  lastDayOf,
  monthLabel,
  monthOf,
  shiftMonth,
  shortDateLabel,
  startOfWeek,
  today,
} from "./dates";

export type PeriodKind = "day" | "week" | "month" | "year";

/** A span of time to look at: the kind, and any date inside it. */
export type Period = { kind: PeriodKind; anchor: string };

export const thisPeriod = (kind: PeriodKind = "month"): Period => ({ kind, anchor: today() });

/** First and last day (inclusive, YYYY-MM-DD). */
export function periodRange({ kind, anchor }: Period): { start: string; end: string } {
  switch (kind) {
    case "day":
      return { start: anchor, end: anchor };
    case "week": {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 6) };
    }
    case "month": {
      const m = monthOf(anchor);
      return { start: `${m}-01`, end: lastDayOf(m) };
    }
    case "year": {
      const y = anchor.slice(0, 4);
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
  }
}

export function shiftPeriod(p: Period, by: number): Period {
  switch (p.kind) {
    case "day":
      return { ...p, anchor: addDays(p.anchor, by) };
    case "week":
      return { ...p, anchor: addDays(startOfWeek(p.anchor), by * 7) };
    case "month":
      return { ...p, anchor: `${shiftMonth(monthOf(p.anchor), by)}-01` };
    case "year":
      return { ...p, anchor: `${Number(p.anchor.slice(0, 4)) + by}-01-01` };
  }
}

export function isCurrentPeriod(p: Period): boolean {
  const { start, end } = periodRange(p);
  const now = today();
  return start <= now && now <= end;
}

/** "September 2026", "Sep 21 - 27", "Today", "2026" */
export function periodLabel(p: Period): string {
  switch (p.kind) {
    case "day":
      return dayLabel(p.anchor);
    case "week": {
      const { start, end } = periodRange(p);
      return `${shortDateLabel(start)} - ${shortDateLabel(end)}`;
    }
    case "month":
      return monthLabel(monthOf(p.anchor));
    case "year":
      return p.anchor.slice(0, 4);
  }
}

/** Short name for "in September", "this week", "on Sep 29", "in 2026". */
export function periodPhrase(p: Period): string {
  const current = isCurrentPeriod(p);
  switch (p.kind) {
    case "day":
      return current ? "today" : `on ${shortDateLabel(p.anchor)}`;
    case "week":
      return current ? "this week" : "that week";
    case "month":
      return `in ${monthLabel(monthOf(p.anchor)).split(" ")[0]}`;
    case "year":
      return `in ${p.anchor.slice(0, 4)}`;
  }
}

/** How many days of the period have happened (for per-day averages). */
export function elapsedDays(p: Period): number {
  const { start, end } = periodRange(p);
  const now = today();
  if (now < start) return 0;
  const last = now < end ? now : end;
  let n = 0;
  for (let d = start; d <= last; d = addDays(d, 1)) n++;
  return n;
}

/** Date for a new entry while looking at a period: today if it's inside, else the first day. */
export function defaultEntryDate(p: Period): string {
  return isCurrentPeriod(p) ? today() : periodRange(p).start;
}