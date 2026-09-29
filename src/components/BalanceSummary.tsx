import { motion, useReducedMotion } from "motion/react";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import type { Slice } from "../lib/summary";
import { AnimatedMoney, EASE_OUT } from "./motion";

type Props = {
  /** e.g. "in September", "this week", "today" */
  phrase: string;
  income: number;
  expense: number;
  slices: Slice[];
  currency: string;
  /** Wait until the panel scrolls into view before counting (used on the website). */
  onView?: boolean;
};

/**
 * The indigo "purse" panel: what's left this month (money in minus money
 * out), with a bar showing how much of the pot each category has used.
 */
export function BalanceSummary({ phrase, income, expense, slices, currency, onView = false }: Props) {
  const balance = income - expense;
  const over = balance < 0;
  return (
    <section
      aria-label="Monthly balance"
      className="relative overflow-hidden rounded-2xl bg-brand p-5 text-brand-ink shadow-[0_18px_40px_-24px_rgb(20_28_60/0.7)] lg:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(255_255_255/0.09),transparent_55%)]"
      />
      <p className="relative text-sm text-brand-muted">
        {over ? `Over ${phrase}` : `Left ${phrase}`}
      </p>
      <AnimatedMoney
        value={balance}
        currency={currency}
        onView={onView}
        className={`relative mt-1.5 block text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums ${
          over ? "text-[#ff9b87]" : ""
        }`}
      />

      <PotBar income={income} expense={expense} slices={slices} onView={onView} className="relative mt-5" />

      <dl className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-white/10 text-[#86efac]" aria-hidden="true">
            <ArrowDownLeftIcon size={16} weight="bold" />
          </span>
          <div>
            <dt className="text-brand-muted">Money in</dt>
            <dd className="font-semibold tabular-nums">
              <AnimatedMoney value={income} currency={currency} onView={onView} />
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-white/10 text-[#fda4af]" aria-hidden="true">
            <ArrowUpRightIcon size={16} weight="bold" />
          </span>
          <div>
            <dt className="text-brand-muted">Spent</dt>
            <dd className="font-semibold tabular-nums">
              <AnimatedMoney value={expense} currency={currency} onView={onView} />
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}

/**
 * The month's pot as a bar. Its full width is the money that came in; each
 * spending category takes its share, and the faint remainder is what's left.
 * With no money in yet, it just splits the spending by category.
 */
function PotBar({
  income,
  expense,
  slices,
  className = "",
  onView,
}: {
  income: number;
  expense: number;
  slices: Slice[];
  className?: string;
  onView: boolean;
}) {
  const reduce = useReducedMotion();
  const pot = Math.max(income, expense);
  if (pot === 0) return <div className={`h-2.5 rounded-full bg-white/10 ${className}`} aria-hidden="true" />;

  const used = Math.round((expense / pot) * 100);
  const label = income > 0 ? `${Math.min(used, 999)}% of the money in is spent` : "Spending by category";
  const trigger = onView ? { whileInView: "show", viewport: { once: true, amount: 0.8 } } : { animate: "show" };

  return (
    <motion.div
      role="img"
      aria-label={label}
      className={`flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-white/10 ${className}`}
      initial={reduce ? false : "hidden"}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}
      {...trigger}
    >
      {slices.map((s) => (
        <motion.span
          key={s.id}
          layout
          variants={{ hidden: { scaleX: 0, opacity: 0 }, show: { scaleX: 1, opacity: 1 } }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="h-full min-w-1.5 origin-left rounded-full"
          style={{ width: `${(s.amount / pot) * 100}%`, backgroundColor: s.category.color }}
        />
      ))}
    </motion.div>
  );
}
