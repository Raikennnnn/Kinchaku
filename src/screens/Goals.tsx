import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { PlusIcon } from "@phosphor-icons/react";
import { goalTotals, listGoals } from "../data/goals";
import type { Goal } from "../db";
import { dayLabel } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { useCurrency, useLedgerId } from "../state";
import { CategoryIcon } from "../components/CategoryIcon";
import { GoalDetailSheet, GoalSheet } from "../components/GoalSheets";
import { Stagger, staggerChild } from "../components/motion";
import { ProgressBar, Screen, ScreenHeader } from "../components/ui";

/** Things the user is saving up for, and how far along each is. */
export function Goals() {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const goals = useLiveQuery(() => listGoals(ledgerId), [ledgerId]);
  const totals = useLiveQuery(() => goalTotals(ledgerId), [ledgerId]);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [open, setOpen] = useState<Goal | null>(null);
  const fmt = (n: number) => formatMoney(n, currency);
  const saved = [...(totals?.values() ?? [])].reduce((s, v) => s + v, 0);

  return (
    <>
      <Screen>
        <ScreenHeader title="Savings goals">
          <button type="button" onClick={() => setEditing("new")} className="btn btn-primary btn-sm">
            <PlusIcon size={16} weight="bold" aria-hidden="true" />
            New goal
          </button>
        </ScreenHeader>
        <p className="mt-3 text-muted">
          {goals && goals.length > 0 ? `${fmt(saved)} saved across ${goals.length === 1 ? "1 goal" : `${goals.length} goals`}.` : "Save up for something, a little at a time."}
        </p>

        {goals && goals.length === 0 && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setEditing("new")}
            className="mt-6 w-full rounded-2xl border border-dashed border-line px-6 py-12 text-center transition hover:bg-surface"
          >
            <span className="font-display text-lg font-semibold">No goals yet</span>
            <span className="mt-1 block text-sm text-muted">A trip, a new phone, an emergency fund. Tap to start one.</span>
          </motion.button>
        )}

        <Stagger as="ul" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" stagger={0.06}>
          {(goals ?? []).map((g) => {
            const s = totals?.get(g.id) ?? 0;
            const done = s >= g.target;
            return (
              <motion.li key={g.id} variants={staggerChild}>
                <button
                  type="button"
                  onClick={() => setOpen(g)}
                  className="block w-full rounded-2xl bg-surface p-4 text-left shadow-[inset_0_0_0_1px_var(--line)] transition hover:bg-surface-2 active:scale-[0.99]"
                >
                  <span className="flex items-center gap-3">
                    <CategoryIcon icon={g.icon} color={g.color} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold wrap-break-word">{g.name}</span>
                      <span className="block text-sm text-muted">
                        {done ? "Reached" : `${fmt(g.target - s)} to go`}
                        {g.deadline && !done && ` · by ${dayLabel(g.deadline)}`}
                      </span>
                    </span>
                    <span className="text-right text-sm tabular-nums">
                      <span className="block font-semibold">{Math.min(100, Math.round((s / g.target) * 100))}%</span>
                    </span>
                  </span>
                  <ProgressBar className="mt-3" value={s} max={g.target} color={g.color} positive label={`${g.name} progress`} />
                  <span className="mt-2 block text-sm tabular-nums text-muted">
                    {fmt(s)} of {fmt(g.target)}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </Stagger>
      </Screen>

      <GoalSheet target={editing} onClose={() => setEditing(null)} />
      <GoalDetailSheet
        goal={open}
        onClose={() => setOpen(null)}
        onEdit={(g) => {
          setOpen(null);
          setEditing(g);
        }}
      />
    </>
  );
}
