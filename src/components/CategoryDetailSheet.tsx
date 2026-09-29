import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PencilSimpleIcon, PlusIcon, TargetIcon } from "@phosphor-icons/react";
import { listBudgets } from "../data/budgets";
import { listCategoryTransactions } from "../data/transactions";
import type { Category, Transaction } from "../db";
import { formatMoney } from "../lib/money";
import { defaultEntryDate, periodPhrase, periodRange, type Period } from "../lib/period";
import { groupByDay, type CategoryLook } from "../lib/summary";
import { useCurrency, useLedgerId } from "../state";
import { BudgetSheet, type BudgetTarget } from "./BudgetSheet";
import { CategoryEditor } from "./CategoryEditor";
import { CategoryIcon } from "./CategoryIcon";
import { EntrySheet } from "./EntrySheet";
import { Sheet } from "./Sheet";
import { TransactionList } from "./TransactionList";
import { ProgressBar } from "./ui";

type Props = {
  category: Category | null;
  period: Period;
  categories: Category[];
  categoryOf: (id: string) => CategoryLook;
  accountName: (id: string | null) => string | null;
  onClose: () => void;
};

/** One category over a period: its total, budget progress and every entry. */
export function CategoryDetailSheet({ category, onClose, ...rest }: Props) {
  const [last, setLast] = useState(category);
  if (category !== null && category !== last) setLast(category);
  const shown = category ?? last;
  return (
    <Sheet open={category !== null} title={shown?.name ?? "Category"} onClose={onClose}>
      {shown && <Detail category={shown} {...rest} />}
    </Sheet>
  );
}

function Detail({ category, period, categories, categoryOf, accountName }: Omit<Props, "category" | "onClose"> & { category: Category }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const { start, end } = periodRange(period);
  const entries = useLiveQuery(
    () => listCategoryTransactions(ledgerId, category.id, start, end),
    [ledgerId, category.id, start, end],
  );
  const budgets = useLiveQuery(() => listBudgets(ledgerId), [ledgerId]);
  const [editing, setEditing] = useState<Transaction | "expense" | "income" | null>(null);
  const [budgetTarget, setBudgetTarget] = useState<BudgetTarget | null>(null);
  const [editingCategory, setEditingCategory] = useState(false);

  const total = (entries ?? []).filter((t) => !t.excluded).reduce((s, t) => s + t.amount, 0);
  const days = useMemo(() => groupByDay(entries ?? []), [entries]);
  const budget = budgets?.get(category.id);
  const showBudget = category.kind === "expense" && period.kind === "month";

  return (
    <>
      <div className="flex items-center gap-4">
        <CategoryIcon icon={category.icon} color={category.color} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {category.kind === "income" ? "Received" : "Spent"} {periodPhrase(period)}
          </p>
          <p className={`text-3xl font-semibold tracking-tight tabular-nums ${category.kind === "income" ? "text-positive" : ""}`}>
            {formatMoney(total, currency)}
          </p>
        </div>
        {!category.system && (
          <button
            type="button"
            onClick={() => setEditingCategory(true)}
            aria-label="Edit category"
            className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink"
          >
            <PencilSimpleIcon size={18} weight="bold" />
          </button>
        )}
      </div>

      {showBudget && (
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]">
          {budget ? (
            <>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">
                  {total > budget.amount
                    ? `${formatMoney(total - budget.amount, currency)} over`
                    : `${formatMoney(budget.amount - total, currency)} left of ${formatMoney(budget.amount, currency)}`}
                </span>
                <button
                  type="button"
                  onClick={() => setBudgetTarget({ categoryId: category.id, name: category.name, amount: budget.amount })}
                  className="font-semibold text-accent-text"
                >
                  Change
                </button>
              </div>
              <ProgressBar className="mt-3" value={total} max={budget.amount} color={category.color} label={`${category.name} budget used`} />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setBudgetTarget({ categoryId: category.id, name: category.name, amount: null })}
              className="flex w-full items-center gap-3 text-left text-sm"
            >
              <TargetIcon size={20} weight="duotone" className="text-accent-text" aria-hidden="true" />
              <span className="flex-1">
                <span className="block font-semibold">No budget set</span>
                <span className="block text-muted">Set a monthly limit for {category.name}.</span>
              </span>
              <span className="font-semibold text-accent-text">Set</span>
            </button>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-semibold">
          {(entries ?? []).length === 1 ? "1 entry" : `${(entries ?? []).length} entries`}
        </h3>
        {!category.system && (
          <button type="button" onClick={() => setEditing(category.kind)} className="btn btn-secondary btn-sm">
            <PlusIcon size={16} weight="bold" aria-hidden="true" />
            Add
          </button>
        )}
      </div>
      <div className="mt-3">
        {entries && entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            Nothing here {periodPhrase(period)}.
          </p>
        ) : (
          <TransactionList days={days} currency={currency} categoryOf={categoryOf} accountName={accountName} onSelect={setEditing} />
        )}
      </div>

      <EntrySheet
        target={editing}
        defaultDate={defaultEntryDate(period)}
        categories={categories}
        defaultCategoryId={category.id}
        onClose={() => setEditing(null)}
      />
      <BudgetSheet target={budgetTarget} onClose={() => setBudgetTarget(null)} />
      <CategoryEditor
        target={editingCategory ? category : null}
        kind={category.kind}
        categories={categories}
        onClose={() => setEditingCategory(false)}
      />
    </>
  );
}
