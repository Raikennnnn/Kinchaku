import { AnimatePresence, motion } from "motion/react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import type { Transaction } from "../db";
import { dayLabel } from "../lib/dates";
import { formatMoney } from "../lib/money";
import type { CategoryLook } from "../lib/summary";
import { CategoryIcon } from "./CategoryIcon";
import { EASE_OUT } from "./motion";

type Props = {
  days: [string, Transaction[]][];
  currency: string;
  categoryOf: (id: string) => CategoryLook;
  /** Account name for an entry, shown next to its note. */
  accountName?: (id: string | null) => string | null;
  onSelect?: (transaction: Transaction) => void;
};

/**
 * Entries grouped by day. Money in shows in green with a plus; each day shows
 * what came in and what went out. Entries left out of totals are dimmed.
 * New rows slide open and deleted rows fold away, so the list never jumps.
 */
export function TransactionList({ days, currency, categoryOf, accountName, onSelect }: Props) {
  const fmt = (n: number) => formatMoney(n, currency);
  return (
    <div className="space-y-6">
      <AnimatePresence initial={false}>
        {days.map(([date, items]) => {
          const counted = items.filter((t) => !t.excluded);
          const dayIn = counted.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
          const dayOut = counted.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
          return (
            <motion.section
              key={date}
              layout="position"
              aria-label={dayLabel(date)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <header className="flex items-baseline justify-between gap-3 border-b border-line px-2 pb-2">
                <h3 className="text-sm font-semibold">{dayLabel(date)}</h3>
                <span className="flex gap-3 text-sm tabular-nums">
                  {dayIn > 0 && <span className="text-positive">+{fmt(dayIn)}</span>}
                  {dayOut > 0 && <span className="text-muted">−{fmt(dayOut)}</span>}
                </span>
              </header>
              <ul className="mt-1">
                <AnimatePresence initial={false}>
                  {items.map((t) => {
                    const c = categoryOf(t.categoryId);
                    const income = t.type === "income";
                    const account = accountName?.(t.accountId);
                    const detail = [t.note, account].filter(Boolean).join(" · ");
                    return (
                      <motion.li
                        key={t.id}
                        layout="position"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                        className="overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => onSelect?.(t)}
                          className={`flex w-full items-center gap-3.5 rounded-xl px-2 py-2.5 text-left transition hover:bg-surface-2 active:scale-[0.99] ${
                            t.excluded ? "opacity-60" : ""
                          }`}
                        >
                          <CategoryIcon icon={c.icon} color={c.color} size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{c.name}</span>
                              {t.recurringId && (
                                <ArrowsClockwiseIcon size={13} weight="bold" className="shrink-0 text-muted" aria-label="Repeats" />
                              )}
                              {t.excluded && (
                                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                                  Not counted
                                </span>
                              )}
                            </span>
                            {detail && <span className="block truncate text-sm text-muted">{detail}</span>}
                          </span>
                          <span className={`font-semibold tabular-nums ${income ? "text-positive" : ""}`}>
                            {income ? "+" : "−"}
                            {fmt(t.amount)}
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
