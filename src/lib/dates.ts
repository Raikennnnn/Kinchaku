// Dates are local calendar days as "YYYY-MM-DD" strings and months as
// "YYYY-MM". Strings sort correctly and never shift across time zones.

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => toISODate(new Date());

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function toDate(isoDate: string): Date {
  const [y = 1970, m = 1, d = 1] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(isoDate: string, days: number): string {
  const d = toDate(isoDate);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function shiftMonth(month: string, by: number): string {
  const d = toDate(`${month}-01`);
  d.setMonth(d.getMonth() + by);
  return monthOf(toISODate(d));
}

export function daysInMonth(month: string): number {
  const [y = 1970, m = 1] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export const lastDayOf = (month: string) => `${month}-${pad(daysInMonth(month))}`;

/** Monday of the week containing the date. */
export function startOfWeek(isoDate: string): string {
  const d = toDate(isoDate);
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(isoDate, -offset);
}

/**
 * The same day in a month `by` months later, clamped to that month's length
 * (Jan 31 + 1 month = Feb 28/29), keeping `dayOfMonth` as the target.
 */
export function addMonthsKeepingDay(isoDate: string, by: number, dayOfMonth: number): string {
  const month = shiftMonth(monthOf(isoDate), by);
  return `${month}-${pad(Math.min(dayOfMonth, daysInMonth(month)))}`;
}

const monthFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const monthNameFormat = new Intl.DateTimeFormat("en", { month: "long" });
const monthShortFormat = new Intl.DateTimeFormat("en", { month: "short" });
const dayFormat = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" });
const longDayFormat = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

/** "September 2026" */
export const monthLabel = (month: string) => monthFormat.format(toDate(`${month}-01`));

/** "September" */
export const monthName = (month: string) => monthNameFormat.format(toDate(`${month}-01`));

/** "Sep" */
export const monthShort = (month: string) => monthShortFormat.format(toDate(`${month}-01`));

/** "Sep 29" */
export const shortDateLabel = (isoDate: string) => shortDate.format(toDate(isoDate));

/** "Tuesday, September 29" */
export const longDayLabel = (isoDate: string) => longDayFormat.format(toDate(isoDate));

/** "Today", "Yesterday" or "Mon, Sep 28" */
export function dayLabel(isoDate: string): string {
  const now = new Date();
  if (isoDate === toISODate(now)) return "Today";
  now.setDate(now.getDate() - 1);
  if (isoDate === toISODate(now)) return "Yesterday";
  return dayFormat.format(toDate(isoDate));
}
