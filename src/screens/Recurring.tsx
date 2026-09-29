import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { PauseIcon, PlayIcon, TrashIcon } from "@phosphor-icons/react";
import { listCategories } from "../data/categories";
import { deleteRecurring, FREQUENCY_LABEL, listRecurring, setRecurringActive } from "../data/recurring";
import { dayLabel } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { MISSING_CATEGORY } from "../lib/summary";
import { useCurrency, useLedgerId } from "../state";
import { CategoryIcon } from "../components/CategoryIcon";
import { Stagger, staggerChild } from "../components/motion";
import { Screen, ScreenHeader } from "../components/ui";

/** Repeating entries: bills, subscriptions, salary. Pause or stop them here. */
export function Recurring() {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const rules = useLiveQuery(() => listRecurring(ledgerId), [ledgerId]);
  const categories = useLiveQuery(() => listCategories(), []);
  const categoryOf = useMemo(() => {
    const byId = new Map((categories ?? []).map((c) => [c.id, c]));
    return (id: string) => byId.get(id) ?? MISSING_CATEGORY;
  }, [categories]);

  return (
    <Screen>
      <ScreenHeader title="Repeating" />
      <p className="mt-3 max-w-[52ch] text-muted">
        Entries added on a schedule, like rent, subscriptions or salary. Start one by choosing Repeat when you add an
        entry. They're added automatically when due, even if you open the app later.
      </p>

      {rules && rules.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          Nothing repeating yet.
        </p>
      )}

      <Stagger as="ul" className="mt-6 space-y-2" stagger={0.05}>
        {(rules ?? []).map((r) => {
          const c = categoryOf(r.categoryId);
          return (
            <motion.li
              key={r.id}
              variants={staggerChild}
              className={`flex items-center gap-3.5 rounded-2xl bg-surface p-3.5 shadow-[inset_0_0_0_1px_var(--line)] ${r.active ? "" : "opacity-60"}`}
            >
              <CategoryIcon icon={c.icon} color={c.color} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {c.name}
                  {r.note && <span className="font-normal text-muted"> · {r.note}</span>}
                </span>
                <span className="block text-sm text-muted">
                  {FREQUENCY_LABEL[r.frequency]} · {r.active ? `next ${dayLabel(r.nextDate)}` : "paused"}
                </span>
              </span>
              <span className={`font-semibold tabular-nums ${r.type === "income" ? "text-positive" : ""}`}>
                {r.type === "income" ? "+" : "−"}
                {formatMoney(r.amount, currency)}
              </span>
              <button
                type="button"
                onClick={() => void setRecurringActive(r.id, !r.active)}
                aria-label={r.active ? "Pause" : "Resume"}
                className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
              >
                {r.active ? <PauseIcon size={16} weight="fill" /> : <PlayIcon size={16} weight="fill" />}
              </button>
              <button
                type="button"
                onClick={() => void deleteRecurring(r.id)}
                aria-label="Stop repeating"
                className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-accent-text"
              >
                <TrashIcon size={16} weight="bold" />
              </button>
            </motion.li>
          );
        })}
      </Stagger>
      {rules && rules.length > 0 && (
        <p className="mt-4 text-xs text-muted">Stopping a repeat keeps the entries it already added.</p>
      )}
    </Screen>
  );
}
