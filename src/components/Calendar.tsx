import type { ReactNode } from "react";
import { addDays, lastDayOf, startOfWeek } from "../lib/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Every day shown for a month: whole weeks, Monday first, including edge days of the months around it. */
export function calendarDays(month: string): string[] {
  const first = startOfWeek(`${month}-01`);
  const last = addDays(startOfWeek(lastDayOf(month)), 6);
  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  return days;
}

/** A month as a Monday-first grid; each day cell is drawn by `renderDay`. */
export function CalendarGrid({
  month,
  renderDay,
  label,
}: {
  month: string;
  renderDay: (date: string, inMonth: boolean) => ReactNode;
  label: string;
}) {
  const days = calendarDays(month);
  return (
    <div role="grid" aria-label={label}>
      <div role="row" className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((d) => (
          <span key={d} role="columnheader" className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d} role="gridcell">
            {renderDay(d, d.startsWith(month))}
          </div>
        ))}
      </div>
    </div>
  );
}
