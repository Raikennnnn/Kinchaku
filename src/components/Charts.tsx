import { useState } from "react";
import { motion } from "motion/react";
import { formatMoney } from "../lib/money";
import { compactMoney, type Slice } from "../lib/summary";
import { EASE_OUT } from "./motion";

/**
 * Small, dependency-free SVG charts. One axis each, thin marks with rounded
 * data ends on the baseline, a recessive grid, a hover/focus tooltip on every
 * mark, and a hidden table for screen readers.
 */

type Tip = { x: number; y: number; title: string; lines: string[] } | null;

type Align = "start" | "center" | "end";
const ALIGN: Record<Align, string> = { start: "-translate-x-3", center: "-translate-x-1/2", end: "-translate-x-[calc(100%-0.75rem)]" };

function Tooltip({ tip, align = "center" }: { tip: Tip; align?: Align }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className={`pointer-events-none absolute z-10 ${ALIGN[align]} -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs whitespace-nowrap text-bg shadow-lg`}
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="font-semibold">{tip.title}</p>
      {tip.lines.map((l) => (
        <p key={l} className="tabular-nums opacity-80">
          {l}
        </p>
      ))}
    </div>
  );
}

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
  const [tip, setTip] = useState<Tip>(null);
  const W = 640;
  const H = 180;
  const pad = { top: 12, bottom: 22, left: 0, right: 0 };
  const max = niceMax(Math.max(...days.map((d) => d.amount), 0));
  const slot = (W - pad.left - pad.right) / days.length;
  const bw = Math.max(2, slot - 2); // 2px gap between bars
  const plotH = H - pad.top - pad.bottom;

  return (
    <figure className="relative">
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
                animate={{ opacity: 1, scaleY: 1 }}
                style={{ originY: 1, transformBox: "fill-box" }}
                transition={{ duration: 0.5, delay: i * 0.012, ease: EASE_OUT }}
              />
              {/* Hit target: the whole column, bigger than the bar. */}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d.label}: ${formatMoney(d.amount, currency)}`}
                onMouseEnter={() => setTip({ x: ((x + bw / 2) / W) * 100, y: y, title: d.label, lines: [`Spent ${formatMoney(d.amount, currency)}`] })}
                onFocus={() => setTip({ x: ((x + bw / 2) / W) * 100, y: y, title: d.label, lines: [`Spent ${formatMoney(d.amount, currency)}`] })}
                onMouseLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
                className="outline-none"
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
      {tip && <PercentTooltip tip={tip} height={H} />}
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

/**
 * Positions a tooltip given x as a percentage of width and y in viewBox units.
 * Near either edge it opens towards the middle, so it never runs off a phone screen.
 */
function PercentTooltip({ tip, height }: { tip: NonNullable<Tip>; height: number }) {
  const align: Align = tip.x < 30 ? "start" : tip.x > 70 ? "end" : "center";
  return (
    <div className="pointer-events-none absolute" style={{ left: `${tip.x}%`, top: `${(tip.y / height) * 100}%` }}>
      <Tooltip tip={{ ...tip, x: 0, y: 0 }} align={align} />
    </div>
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
  const [tip, setTip] = useState<Tip>(null);
  const W = 640;
  const H = 200;
  const pad = { top: 14, bottom: 24 };
  const plotH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...months.flatMap((m) => [m.income, m.expense]), 0));
  const slot = W / months.length;
  const bw = Math.min(28, (slot - 16) / 2);

  return (
    <figure className="relative">
      <div className="mb-3 flex gap-4 text-sm" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-chart-in" />
          Money in
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-chart-out" />
          Spent
        </span>
      </div>
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
          const top = pad.top + plotH - Math.max(hIn, hOut);
          const show = () => setTip({ x: (cx / W) * 100, y: top, title: m.label, lines });
          return (
            <g key={m.month}>
              <motion.path
                d={barPath(cx - bw - 1, pad.top + plotH - hIn, bw, hIn)}
                className="fill-chart-in"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ originY: 1, transformBox: "fill-box" }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: EASE_OUT }}
              />
              <motion.path
                d={barPath(cx + 1, pad.top + plotH - hOut, bw, hOut)}
                className="fill-chart-out"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ originY: 1, transformBox: "fill-box" }}
                transition={{ duration: 0.6, delay: i * 0.05 + 0.05, ease: EASE_OUT }}
              />
              <rect
                x={i * slot}
                y={pad.top}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${m.label}: ${lines.join(", ")}`}
                onMouseEnter={show}
                onFocus={show}
                onMouseLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
                className="outline-none"
              />
              <text x={cx} y={H - 6} textAnchor="middle" className="fill-muted text-[12px]">
                {m.label}
              </text>
            </g>
          );
        })}
        <text x={W} y={pad.top - 3} textAnchor="end" className="fill-muted text-[11px]">
          {compactMoney(max, currency)}
        </text>
      </svg>
      {tip && <PercentTooltip tip={tip} height={H} />}
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
