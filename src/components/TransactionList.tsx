import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ArrowsClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import type { Transaction } from "../db";
import { deleteTransaction, restoreTransaction } from "../data/transactions";
import { dayLabel } from "../lib/dates";
import { formatMoney } from "../lib/money";
import type { CategoryLook } from "../lib/summary";
import { CategoryIcon } from "./CategoryIcon";
import { EASE_OUT } from "./motion";
import { showToast } from "./Toast";

type Props = {
  days: [string, Transaction[]][];
  currency: string;
  categoryOf: (id: string) => CategoryLook;
  /** Account name for an entry, shown next to its note. */
  accountName?: (id: string | null) => string | null;
  onSelect?: (transaction: Transaction) => void;
  /** Rows can be swiped left to reveal a Delete button (with Undo afterwards). */
  deletable?: boolean;
};

/**
 * Entries grouped by day. Money in shows in green with a plus; each day shows
 * what came in and what went out. Entries left out of totals are dimmed.
 * New rows slide open and deleted rows fold away, so the list never jumps.
 */
export function TransactionList({ days, currency, categoryOf, accountName, onSelect, deletable = false }: Props) {
  const fmt = (n: number) => formatMoney(n, currency);
  // One row open at a time: opening another closes the last.
  const [openId, setOpenId] = useState<string | null>(null);

  async function remove(t: Transaction) {
    setOpenId(null);
    await deleteTransaction(t.id);
    showToast("Entry deleted", { label: "Undo", run: () => void restoreTransaction(t.id) });
  }

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
                        <SwipeToDelete
                          enabled={deletable}
                          open={openId === t.id}
                          onOpenChange={(o) => setOpenId(o ? t.id : null)}
                          onDelete={() => void remove(t)}
                          label={`Delete ${c.name} entry`}
                        >
                        <button
                          type="button"
                          onClick={() => onSelect?.(t)}
                          className={`flex w-full items-center gap-3.5 rounded-xl bg-bg px-2 py-2.5 text-left transition hover:bg-surface-2 active:scale-[0.99] ${
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
                        </SwipeToDelete>
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

const REVEAL = 92; // width of the Delete button a swipe uncovers

/**
 * Swipe a row left to uncover a Delete button; a short or slow swipe springs
 * back. Tapping an open row closes it rather than opening the entry. Vertical
 * swipes still scroll the page (the drag locks to whichever way you move first).
 */
function SwipeToDelete({
  enabled,
  open,
  onOpenChange,
  onDelete,
  label,
  children,
}: {
  enabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  label: string;
  children: ReactNode;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const dragged = useRef(false);
  const x = useMotionValue(0);
  // Hidden until the row starts moving, so no sliver of it shows at the row's edge.
  const buttonOpacity = useTransform(x, [-24, -4], [1, 0]);

  useEffect(() => {
    void controls.start({ x: open ? -REVEAL : 0, transition: reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 } });
  }, [open, controls, reduce]);

  if (!enabled) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.button
        type="button"
        onClick={onDelete}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label={label}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 rounded-xl bg-accent text-sm font-semibold text-white"
        style={{ width: REVEAL, opacity: buttonOpacity }}
      >
        <TrashIcon size={18} weight="bold" aria-hidden="true" />
        Delete
      </motion.button>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={{ left: 0.25, right: 0.04 }}
        dragMomentum={false}
        animate={controls}
        style={{ x, touchAction: "pan-y" }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          const reveal = info.offset.x < -REVEAL / 2 || info.velocity.x < -450;
          const keep = open && info.offset.x < REVEAL / 3;
          onOpenChange(reveal || keep);
          void controls.start({ x: reveal || keep ? -REVEAL : 0 });
          // The click that ends a drag shouldn't open the entry.
          setTimeout(() => (dragged.current = false), 0);
        }}
        onClickCapture={(e) => {
          if (dragged.current || open) {
            e.stopPropagation();
            e.preventDefault();
            if (open && !dragged.current) onOpenChange(false);
          }
        }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
