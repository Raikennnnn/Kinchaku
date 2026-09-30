import { useState } from "react";
import { motion } from "motion/react";
import { formatMoney } from "../lib/money";
import { compactMoney, type Slice } from "../lib/summary";
import { EASE_OUT } from "./motion";

/**
 * Small, dependency-free SVG charts. One axis each, thin marks with rounded
 * data ends on the baseline, a recessive grid, and a hidden table for screen
 * readers. Tapping (or hovering) a bar shows its numbers in a readout line
 * above the chart and dims the other bars. A floating tooltip would cover the
 * bars and run off a phone's edge; the readout never moves.
 */

/** Tap a bar to pin it (tap again to let go); a mouse hovering previews another. */
function useSelection() {
  const [pinned, setPinned] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const bind = (i: number) => ({
    onClick: () => setPinned((p) => (p === i ? null : i)),
    onFocus: () => setPinned(i),
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setHovered(i),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setHovered(null),
    onKeyDown: (e: React.KeyboardEvent) => e.key === "Escape" && setPinned(null),
  });
  return { selected: hovered ?? pinned, bind };
}

/** The line above a chart: what's selected, or the chart's total and a hint. */
function Readout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="mb-3 flex min-h-[2.75rem] flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <p className="text-sm text-muted">{title}</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm font-semibold tabular-nums">{children}</div>
    </div>
  );
}

const dim = (selected: number | null, i: number) => (selected === null || selected === i ? 1 : 0.3);

/** Rounded top, square bottom: the data end is soft, the baseline is solid. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

/* ---------- Spending per day across a month ---------- */

export function DailyBars({
  days,
  currency,
}: {
  /** One entry per day of the month, in order. */
  days: { date: string; label: string; amount: number }[];
  currency: string;
}) {
  const { selected, bind } = useSelection();
  const W = 640;
  const H = 180;
  const pad = { top: 12, bottom: 22, left: 0, right: 0 };
  const max = niceMax(Math.max(...days.map((d) => d.amount), 0));
  const slot = (W - pad.left - pad.right) / days.length;
  const bw = Math.max(2, slot - 2); // 2px gap between bars
  const plotH = H - pad.top - pad.bottom;
  const total = days.reduce((s, d) => s + d.amount, 0);
  const pick = selected === null ? null : days[selected];

  return (
    <figure className="relative">
      <Readout title={pick ? pick.label : "Tap a day to see it"}>
        {pick ? <span>Spent {formatMoney(pick.amount, currency)}</span> : <span>{formatMoney(total, currency)} in all</span>}
      </Readout>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label="Spending per day">
        {[0.5, 1].map((g) => (
          <line
            key={g}
            x1={0}
            x2={W}
            y1={pad.top + plotH * (1 - g)}
            y2={pad.top + plotH * (1 - g)}
            className="stroke-line"
            strokeDasharray="3 4"
          />
        ))}
        <line x1={0} x2={W} y1={pad.top + plotH} y2={pad.top + plotH} className="stroke-line" />
        {days.map((d, i) => {
          const h = (d.amount / max) * plotH;
          const x = pad.left + i * slot + 1;
          const y = pad.top + plotH - h;
          const show = i === 0 || (i + 1) % 5 === 0;
          return (
            <g key={d.date}>
              <motion.path
                d={barPath(x, y, bw, h)}
                className="fill-chart-out"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: dim(selected, i), scaleY: 1 }}
                style={{ originY: 1, transformBox: "fill-box" }}
                transition={{ scaleY: { duration: 0.5, delay: i * 0.012, ease: EASE_OUT }, opacity: { duration: 0.2 } }}
              />
              {selected === i && (
                <rect x={x} y={pad.top + plotH + 2} width={bw} height={2.5} rx={1.25} className="fill-ink" />
              )}
              {/* Hit target: the whole column, bigger than the bar. */}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d.label}: ${formatMoney(d.amount, currency)}`}
                aria-pressed={selected === i}
                {...bind(i)}
                className="cursor-pointer outline-none"
              />
              {show && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="fill-muted text-[11px]">
                  {Number(d.date.slice(8))}
                </text>
              )}
            </g>
          );
        })}
        <text x={W} y={pad.top - 2} textAnchor="end" className="fill-muted text-[11px]">
          {compactMoney(max, currency)}
        </text>
      </svg>
      <table className="sr-only">
        <caption>Spending per day</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.label}</th>
              <td>{formatMoney(d.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ---------- Money in vs spent, month by month ---------- */

export function MonthTrend({
  months,
  currency,
}: {
  months: { month: string; label: string; income: number; expense: number }[];
  currency: string;
}) {
  const { selected, bind } = useSelection();
  const W = 640;
  const H = 200;
  const pad = { top: 14, bottom: 24 };
  const plotH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...months.flatMap((m) => [m.income, m.expense]), 0));
  const slot = W / months.length;
  const bw = Math.min(28, (slot - 16) / 2);
  const pick = selected === null ? null : months[selected];
  const totalIn = months.reduce((s, m) => s + m.income, 0);
  const totalOut = months.reduce((s, m) => s + m.expense, 0);
  const shown = pick ?? { income: totalIn, expense: totalOut };

  return (
    <figure className="relative">
      <Readout title={pick ? pick.label : "Six months · tap one"}>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-in" aria-hidden="true" />
          <span className="font-normal text-muted">In</span>
          {formatMoney(shown.income, currency)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-out" aria-hidden="true" />
          <span className="font-normal text-muted">Spent</span>
          {formatMoney(shown.expense, currency)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-normal text-muted">Left</span>
          {formatMoney(shown.income - shown.expense, currency)}
        </span>
      </Readout>
      <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label="Money in and spent per month">
        {[0.5, 1].map((g) => (
          <line key={g} x1={0} x2={W} y1={pad.top + plotH * (1 - g)} y2={pad.top + plotH * (1 - g)} className="stroke-line" strokeDasharray="3 4" />
        ))}
        <line x1={0} x2={W} y1={pad.top + plotH} y2={pad.top + plotH} className="stroke-line" />
        {months.map((m, i) => {
          const cx = i * slot + slot / 2;
          const hIn = (m.income / max) * plotH;
          const hOut = (m.expense / max) * plotH;
          const lines = [`In ${formatMoney(m.income, currency)}`, `Spent ${formatMoney(m.expense, currency)}`, `Left ${formatMoney(m.income - m.expense, currency)}`];
          return (
            <g key={m.month}>
              <motion.path
                d={barPath(cx - bw - 1, pad.top + plotH - hIn, bw, hIn)}
                className="fill-chart-in"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1, opacity: dim(selected, i) }}
                style={{ originY: 1, transformBox: "fill-box" }}
                transition={{ scaleY: { duration: 0.6, delay: i * 0.05, ease: EASE_OUT }, opacity: { duration: 0.2 } }}
              />
              <motion.path
                d={barPath(cx + 1, pad.top + plotH - hOut, bw, hOut)}
                className="fill-chart-out"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1, opacity: dim(selected, i) }}
                style={{ originY: 1, transformBox: "fill-box" }}
                transition={{ scaleY: { duration: 0.6, delay: i * 0.05 + 0.05, ease: EASE_OUT }, opacity: { duration: 0.2 } }}
              />
              <rect
                x={i * slot}
                y={pad.top}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${m.label}: ${lines.join(", ")}`}
                aria-pressed={selected === i}
                {...bind(i)}
                className="cursor-pointer outline-none"
              />
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                className={`text-[12px] ${selected === i ? "fill-ink font-semibold" : "fill-muted"}`}
              >
                {m.label}
              </text>
            </g>
          );
        })}
        <text x={W} y={pad.top - 3} textAnchor="end" className="fill-muted text-[11px]">
          {compactMoney(max, currency)}
        </text>
      </svg>
      </div>
      <table className="sr-only">
        <caption>Money in and spent per month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Money in</th>
            <th>Spent</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.label}</th>
              <td>{formatMoney(m.income, currency)}</td>
              <td>{formatMoney(m.expense, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ---------- Spending by category ---------- */

export function CategoryBars({ slices, currency, onSelect }: { slices: Slice[]; currency: string; onSelect?: (id: string) => void }) {
  const max = Math.max(...slices.map((s) => s.amount), 1);
  return (
    <ul className="space-y-3" aria-label="Spending by category">
      {slices.map((s, i) => (
        <li key={s.id}>
          <button type="button" onClick={() => onSelect?.(s.id)} className="block w-full rounded-lg text-left transition hover:bg-surface-2/60">
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{s.category.name}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{formatMoney(s.amount, currency)}</span>
                <span className="ml-1.5 text-muted">{Math.round(s.share * 100)}%</span>
              </span>
            </span>
            {/* No background track: the bar length alone carries the value. */}
            <motion.span
              className="mt-1.5 block h-2 origin-left rounded-full"
              style={{ width: `${(s.amount / max) * 100}%`, backgroundColor: s.category.color }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: EASE_OUT }}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
