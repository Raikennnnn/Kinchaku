import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CaretLeftIcon, CaretRightIcon, TargetIcon } from "@phosphor-icons/react";
import { listAccounts } from "../data/accounts";
import { budgetStatus, listBudgets, TOTAL_BUDGET } from "../data/budgets";
import { listCategories } from "../data/categories";
import { listMonthTransactions } from "../data/transactions";
import type { Category } from "../db";
import { monthLabel, monthOf, shiftMonth, today } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { MISSING_CATEGORY, summarize } from "../lib/summary";
import { useCurrency, useLedgerId } from "../state";
import { BudgetSheet, type BudgetTarget } from "../components/BudgetSheet";
import { CategoryDetailSheet } from "../components/CategoryDetailSheet";
import { CategoryIcon } from "../components/CategoryIcon";
import { FitText, Stagger, staggerChild } from "../components/motion";
import { ProgressBar, Screen, ScreenHeader } from "../components/ui";
import { motion } from "motion/react";

/** Monthly limits: one for the whole month and one per spending category. */
export function Budgets() {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const [month, setMonth] = useState(monthOf(today()));
  const [target, setTarget] = useState<BudgetTarget | null>(null);
  const [detail, setDetail] = useState<Category | null>(null);

  const categories = useLiveQuery(() => listCategories("expense"), []);
  const allCategories = useLiveQuery(() => listCategories(), []);
  const budgets = useLiveQuery(() => listBudgets(ledgerId), [ledgerId]);
  const transactions = useLiveQuery(() => listMonthTransactions(ledgerId, month), [ledgerId, month]);
  const accounts = useLiveQuery(() => listAccounts(ledgerId), [ledgerId]);

  const categoryOf = useMemo(() => {
    const byId = new Map((allCategories ?? []).map((c) => [c.id, c]));
    return (id: string) => byId.get(id) ?? MISSING_CATEGORY;
  }, [allCategories]);
  const accountName = useMemo(() => {
    const byId = new Map((accounts ?? []).map((a) => [a.id, a.name]));
    return (id: string | null) => ((accounts?.length ?? 0) > 1 && id ? (byId.get(id) ?? null) : null);
  }, [accounts]);
  const summary = useMemo(() => summarize(transactions ?? [], categoryOf), [transactions, categoryOf]);

  const total = budgets?.get(TOTAL_BUDGET);
  const visible = (categories ?? []).filter((c) => !c.system);
  const withBudget = visible.filter((c) => budgets?.has(c.id));
  const without = visible.filter((c) => !budgets?.has(c.id));
  const fmt = (n: number) => formatMoney(n, currency);

  return (
    <>
      <Screen>
        <ScreenHeader title="Budgets">
          <div className="flex rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]">
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="grid size-10 place-items-center rounded-full hover:bg-surface-2 active:scale-90">
              <CaretLeftIcon size={18} weight="bold" />
            </button>
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className="grid size-10 place-items-center rounded-full hover:bg-surface-2 active:scale-90">
              <CaretRightIcon size={18} weight="bold" />
            </button>
          </div>
        </ScreenHeader>
        <p className="mt-2 text-muted">{monthLabel(month)}. Limits repeat every month.</p>

        {/* Whole-month budget */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setTarget({ categoryId: TOTAL_BUDGET, name: "the month", amount: total?.amount ?? null })}
          className="relative mt-6 block w-full overflow-hidden rounded-2xl bg-brand p-5 text-left text-brand-ink shadow-[0_18px_40px_-24px_rgb(20_28_60/0.7)]"
        >
          <p className="text-sm text-brand-muted">Monthly budget</p>
          {total ? (
            <>
              <FitText className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {summary.expense > total.amount ? `${fmt(summary.expense - total.amount)} over` : `${fmt(total.amount - summary.expense)} left`}
              </FitText>
              <p className="mt-1 text-sm text-brand-muted tabular-nums">
                {fmt(summary.expense)} spent of {fmt(total.amount)}
              </p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{
                    width: `${Math.min(1, summary.expense / total.amount) * 100}%`,
                    backgroundColor: budgetStatus(summary.expense, total.amount) === "over" ? "#ff9b87" : budgetStatus(summary.expense, total.amount) === "near" ? "#fbbf24" : "#86efac",
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <TargetIcon size={20} weight="duotone" aria-hidden="true" />
              Set a limit for all spending
            </p>
          )}
        </motion.button>

        {withBudget.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">By category</h2>
            <Stagger as="ul" className="space-y-2" stagger={0.05}>
              {withBudget.map((c) => {
                const spent = summary.spentByCategory.get(c.id) ?? 0;
                const limit = budgets!.get(c.id)!.amount;
                const status = budgetStatus(spent, limit);
                return (
                  <motion.li key={c.id} variants={staggerChild}>
                    <button
                      type="button"
                      onClick={() => setDetail(c)}
                      className="block w-full rounded-2xl bg-surface p-4 text-left shadow-[inset_0_0_0_1px_var(--line)] transition hover:bg-surface-2"
                    >
                      <span className="flex items-center gap-3">
                        <CategoryIcon icon={c.icon} color={c.color} size={40} />
                        <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="min-w-[7rem] flex-1">
                          <span className="block font-semibold wrap-break-word">{c.name}</span>
                          <span className={`block text-sm tabular-nums ${status === "over" ? "text-accent-text" : "text-muted"}`}>
                            {status === "over" ? `${fmt(spent - limit)} over` : `${fmt(limit - spent)} left`}
                          </span>
                        </span>
                        <span className="ml-auto text-right text-sm whitespace-nowrap tabular-nums">
                          <span className="block font-semibold">{fmt(spent)}</span>
                          <span className="block text-muted">of {fmt(limit)}</span>
                        </span>
                        </span>
                      </span>
                      <ProgressBar className="mt-3" value={spent} max={limit} color={c.color} label={`${c.name} budget used`} />
                    </button>
                  </motion.li>
                );
              })}
            </Stagger>
          </>
        )}

        {without.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">{withBudget.length ? "No budget yet" : "Set a budget per category"}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {without.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setTarget({ categoryId: c.id, name: c.name, amount: null })}
                    className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-[inset_0_0_0_1px_var(--line)] transition hover:bg-surface-2"
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium wrap-break-word">{c.name}</span>
                      <span className="block text-sm text-muted tabular-nums">{fmt(summary.spentByCategory.get(c.id) ?? 0)} spent</span>
                    </span>
                    <span className="text-sm font-semibold text-accent-text">Set</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Screen>

      <BudgetSheet target={target} onClose={() => setTarget(null)} />
      <CategoryDetailSheet
        category={detail}
        period={{ kind: "month", anchor: `${month}-01` }}
        categories={allCategories ?? []}
        categoryOf={categoryOf}
        accountName={accountName}
        onClose={() => setDetail(null)}
      />
    </>
  );
}
