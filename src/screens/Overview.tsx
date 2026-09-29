import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ArrowDownLeftIcon, ArrowsClockwiseIcon, PlusIcon, WarningIcon } from "@phosphor-icons/react";
import { listAccounts } from "../data/accounts";
import { budgetStatus, listBudgets, TOTAL_BUDGET } from "../data/budgets";
import { listCategories } from "../data/categories";
import { carryOver, carryState, dismissCarry, listTransactions } from "../data/transactions";
import type { Category, Kind, Transaction } from "../db";
import { monthName, monthOf, shiftMonth, today } from "../lib/dates";
import { useMediaQuery } from "../lib/media";
import { formatMoney } from "../lib/money";
import { defaultEntryDate, periodPhrase, periodRange, shiftPeriod, thisPeriod, type Period } from "../lib/period";
import { MISSING_CATEGORY, summarize } from "../lib/summary";
import { useCurrency, useLedgerId } from "../state";
import { BalanceSummary } from "../components/BalanceSummary";
import { BudgetSheet, type BudgetTarget } from "../components/BudgetSheet";
import { CategoryDetailSheet } from "../components/CategoryDetailSheet";
import { CategoryLegend } from "../components/CategoryLegend";
import { EntrySheet } from "../components/EntrySheet";
import { InstallHint } from "../components/InstallHint";
import { EASE_OUT } from "../components/motion";
import { PeriodNav } from "../components/PeriodPicker";
import { SyncPrompt } from "../sync/SyncPrompt";
import { TransactionList } from "../components/TransactionList";
import { ProgressBar } from "../components/ui";

// Content slides in from the side you're heading to; on first open it just rises.
const page: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36, y: dir === 0 ? 16 : 0 }),
  center: { opacity: 1, x: 0, y: 0, transition: { duration: 0.45, ease: EASE_OUT, staggerChildren: 0.06 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36, transition: { duration: 0.16, ease: "easeIn" } }),
};
const part: Variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export function Overview() {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const [period, setPeriod] = useState<Period>(() => thisPeriod("month"));
  const [dir, setDir] = useState(0);
  const [editing, setEditing] = useState<Transaction | Kind | null>(null);
  const [detail, setDetail] = useState<Category | null>(null);
  const [budgetTarget, setBudgetTarget] = useState<BudgetTarget | null>(null);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { start, end } = periodRange(period);

  const categories = useLiveQuery(() => listCategories(), []);
  const transactions = useLiveQuery(() => listTransactions(ledgerId, start, end), [ledgerId, start, end]);
  const accounts = useLiveQuery(() => listAccounts(ledgerId), [ledgerId]);
  const budgets = useLiveQuery(() => listBudgets(ledgerId), [ledgerId]);

  const categoryOf = useMemo(() => {
    const byId = new Map((categories ?? []).map((c) => [c.id, c]));
    return (id: string) => byId.get(id) ?? MISSING_CATEGORY;
  }, [categories]);
  const accountName = useMemo(() => {
    const byId = new Map((accounts ?? []).map((a) => [a.id, a.name]));
    // Only worth showing when there's more than one account to tell apart.
    return (id: string | null) => ((accounts?.length ?? 0) > 1 && id ? (byId.get(id) ?? null) : null);
  }, [accounts]);

  const summary = useMemo(() => summarize(transactions ?? [], categoryOf), [transactions, categoryOf]);
  const monthly = period.kind === "month";
  const budgetLimits = useMemo(
    () => (monthly && budgets ? new Map([...budgets].map(([id, b]) => [id, b.amount])) : undefined),
    [budgets, monthly],
  );
  const totalBudget = monthly ? budgets?.get(TOTAL_BUDGET) : undefined;
  const warnings = monthly
    ? summary.expenseSlices.filter((s) => {
        const limit = budgetLimits?.get(s.id);
        return limit !== undefined && budgetStatus(s.amount, limit) !== "ok";
      })
    : [];

  const go = (by: number) => {
    setDir(by);
    setPeriod((p) => shiftPeriod(p, by));
  };

  // Desktop shortcuts: N adds an expense, I adds money in, arrows step the period.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, dialog[open]")) return;
      const key = e.key.toLowerCase();
      if (key === "n" || key === "i") {
        e.preventDefault();
        setEditing(key === "n" ? "expense" : "income");
      } else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openCategory = (id: string) => {
    const c = categories?.find((x) => x.id === id);
    if (c) setDetail(c);
  };

  return (
    <>
      <main className="mx-auto max-w-lg overflow-x-clip px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+11rem)] lg:max-w-6xl lg:px-10 lg:pt-10 lg:pb-16">
        <InstallHint />
        <SyncPrompt />

        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <PeriodNav
              period={period}
              onChange={(p) => {
                setDir(p.anchor >= period.anchor ? 1 : -1);
                setPeriod(p);
              }}
            />
          </div>
          <div className="hidden shrink-0 items-center gap-2 pb-1 lg:flex">
            <button type="button" onClick={() => setEditing("income")} className="btn btn-secondary btn-sm">
              <ArrowDownLeftIcon size={16} weight="bold" className="text-positive" aria-hidden="true" />
              Money in
              <kbd className="ml-1 rounded-md bg-surface-2 px-1.5 font-mono text-xs">I</kbd>
            </button>
            <button type="button" onClick={() => setEditing("expense")} className="btn btn-primary btn-sm">
              <PlusIcon size={18} weight="bold" aria-hidden="true" />
              Add expense
              <kbd className="ml-1 rounded-md bg-white/20 px-1.5 font-mono text-xs">N</kbd>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${period.kind}-${start}`}
            custom={dir}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            className="mt-6 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-12"
          >
            <div className="space-y-6 lg:sticky lg:top-10">
              {monthly && start <= today() && <CarryPrompt month={monthOf(start)} />}
              <motion.div
                variants={part}
                // Swipe the summary sideways on a phone to step through periods.
                drag={desktop ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.22}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) go(1);
                  else if (info.offset.x > 70) go(-1);
                }}
              >
                <BalanceSummary
                  phrase={periodPhrase(period)}
                  income={summary.income}
                  expense={summary.expense}
                  slices={summary.expenseSlices}
                  currency={currency}
                />
              </motion.div>

              {monthly && (totalBudget || warnings.length > 0) && (
                <motion.section variants={part} aria-label="Budgets" className="space-y-3 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]">
                  {totalBudget && (
                    <button
                      type="button"
                      onClick={() => setBudgetTarget({ categoryId: TOTAL_BUDGET, name: "the month", amount: totalBudget.amount })}
                      className="block w-full text-left"
                    >
                      <span className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">Monthly budget</span>
                        <span className="text-muted tabular-nums">
                          {formatMoney(summary.expense, currency)} of {formatMoney(totalBudget.amount, currency)}
                        </span>
                      </span>
                      <ProgressBar className="mt-2" value={summary.expense} max={totalBudget.amount} color="#6366f1" label="Monthly budget used" />
                    </button>
                  )}
                  {warnings.map((w) => {
                    const limit = budgetLimits!.get(w.id)!;
                    const over = w.amount > limit;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => openCategory(w.id)}
                        className="flex w-full items-center gap-2.5 text-left text-sm"
                      >
                        <WarningIcon size={18} weight="fill" className={over ? "text-accent-text" : "text-[#d97706]"} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          {over
                            ? `${w.category.name} is ${formatMoney(w.amount - limit, currency)} over budget`
                            : `${w.category.name} is at ${Math.round((w.amount / limit) * 100)}% of its budget`}
                        </span>
                      </button>
                    );
                  })}
                </motion.section>
              )}

              {summary.expenseSlices.length > 0 && (
                <motion.section variants={part} aria-labelledby="spending-heading">
                  <h2 id="spending-heading" className="mb-2 text-sm font-semibold text-muted">
                    Spending
                  </h2>
                  <CategoryLegend slices={summary.expenseSlices} currency={currency} budgets={budgetLimits} onSelect={openCategory} />
                </motion.section>
              )}
              {summary.incomeSlices.length > 0 && (
                <motion.section variants={part} aria-labelledby="income-heading">
                  <h2 id="income-heading" className="mb-2 text-sm font-semibold text-muted">
                    Money in
                  </h2>
                  <CategoryLegend slices={summary.incomeSlices} currency={currency} onSelect={openCategory} />
                </motion.section>
              )}
            </div>

            <motion.section variants={part} aria-labelledby="entries-heading">
              <h2 id="entries-heading" className="mb-3 px-2 font-display text-xl font-semibold">
                Entries
              </h2>
              {transactions && transactions.length === 0 ? (
                <EmptyState phrase={periodPhrase(period)} onAdd={setEditing} />
              ) : (
                <TransactionList
                  days={summary.days}
                  currency={currency}
                  categoryOf={categoryOf}
                  accountName={accountName}
                  onSelect={setEditing}
                />
              )}
            </motion.section>
          </motion.div>
        </AnimatePresence>
      </main>

      <AddButton onAdd={() => setEditing("expense")} />

      <EntrySheet
        target={editing}
        defaultDate={defaultEntryDate(period)}
        categories={categories ?? []}
        onClose={() => setEditing(null)}
      />
      <CategoryDetailSheet
        category={detail}
        period={period}
        categories={categories ?? []}
        categoryOf={categoryOf}
        accountName={accountName}
        onClose={() => setDetail(null)}
      />
      <BudgetSheet target={budgetTarget} onClose={() => setBudgetTarget(null)} />
    </>
  );
}

/** Round add button on phones, above the tab bar and aligned to the content column. */
export function AddButton({ onAdd, label = "Add entry" }: { onAdd: () => void; label?: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-10 lg:hidden">
      <div className="mx-auto flex max-w-lg justify-end px-5">
        <motion.button
          type="button"
          onClick={onAdd}
          aria-label={label}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.3 }}
          className="pointer-events-auto grid size-15 place-items-center rounded-full bg-accent text-white shadow-[0_12px_28px_-8px_rgb(199_59_37/0.6)]"
        >
          <PlusIcon size={28} weight="bold" />
        </motion.button>
      </div>
    </div>
  );
}

/**
 * Offers to bring last month's result into this one: a leftover is added as
 * money in, an overspend is taken out. Asked once per month.
 */
function CarryPrompt({ month }: { month: string }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const previous = shiftMonth(month, -1);
  const state = useLiveQuery(() => carryState(ledgerId, month, previous), [ledgerId, month]);
  const [busy, setBusy] = useState(false);

  const show = !!state && !state.decided && state.previousEntries > 0 && state.previousBalance !== 0;
  const left = (state?.previousBalance ?? 0) > 0;
  const amount = formatMoney(Math.abs(state?.previousBalance ?? 0), currency);
  const prevName = monthName(previous);

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.aside
          key="carry"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="overflow-hidden"
          aria-label="Carry over"
        >
          <div className="flex gap-3.5 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#6366f1]/15 text-[#6366f1]">
              <ArrowsClockwiseIcon size={20} weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">
                {left ? `${prevName} ended with ${amount} left.` : `${prevName} went ${amount} over.`}
              </p>
              <p className="mt-0.5 text-muted">
                {left ? `Add it to ${monthName(month)}'s money?` : `Take it out of ${monthName(month)}?`}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await carryOver(ledgerId, month, state!.previousBalance, prevName);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  {left ? "Carry it over" : "Take it out"}
                </button>
                <button type="button" onClick={() => void dismissCarry(ledgerId, month)} className="btn btn-secondary btn-sm">
                  Not now
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function EmptyState({ phrase, onAdd }: { phrase: string; onAdd: (kind: Kind) => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <motion.img
        src={`${import.meta.env.BASE_URL}logo.svg`}
        alt=""
        className="mx-auto size-14 rounded-2xl"
        initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
      />
      <p className="mt-4 font-display text-lg font-semibold">Nothing {phrase} yet</p>
      <p className="mt-1 text-sm text-muted">Start with the money you have, like an allowance or salary, then log what you spend.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => onAdd("income")} className="btn btn-secondary btn-sm">
          <ArrowDownLeftIcon size={16} weight="bold" className="text-positive" aria-hidden="true" />
          Add money in
        </button>
        <button type="button" onClick={() => onAdd("expense")} className="btn btn-secondary btn-sm">
          <PlusIcon size={16} weight="bold" aria-hidden="true" />
          Add expense
        </button>
      </div>
    </div>
  );
}
