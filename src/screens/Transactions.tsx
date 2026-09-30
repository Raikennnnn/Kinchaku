import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, ChartBarIcon, XIcon } from "@phosphor-icons/react";
import { listAccounts } from "../data/accounts";
import { listCategories } from "../data/categories";
import { listMonthTransactions, listTransactions } from "../data/transactions";
import type { Category, Kind, Transaction } from "../db";
import { addDays, daysInMonth, longDayLabel, monthLabel, monthOf, monthShort, shiftMonth, shortDateLabel, today } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { defaultEntryDate } from "../lib/period";
import { compactMoney, groupByDay, MISSING_CATEGORY, summarize } from "../lib/summary";
import { useCurrency, useLedgerId } from "../state";
import { CalendarGrid } from "../components/Calendar";
import { CategoryDetailSheet } from "../components/CategoryDetailSheet";
import { CategoryBars, DailyBars, MonthTrend } from "../components/Charts";
import { EntrySheet } from "../components/EntrySheet";
import { EASE_OUT } from "../components/motion";
import { TransactionList } from "../components/TransactionList";
import { Screen } from "../components/ui";
import { AddButton } from "./Overview";

type View = "calendar" | "stats";

/** The month as a calendar of money in and out per day, or as charts. */
export function Transactions() {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const [month, setMonth] = useState(monthOf(today()));
  const [dir, setDir] = useState(0);
  const [view, setView] = useState<View>("calendar");
  const [day, setDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | Kind | null>(null);
  const [detail, setDetail] = useState<Category | null>(null);

  const categories = useLiveQuery(() => listCategories(), []);
  const accounts = useLiveQuery(() => listAccounts(ledgerId), [ledgerId]);
  const transactions = useLiveQuery(() => listMonthTransactions(ledgerId, month), [ledgerId, month]);

  const categoryOf = useMemo(() => {
    const byId = new Map((categories ?? []).map((c) => [c.id, c]));
    return (id: string) => byId.get(id) ?? MISSING_CATEGORY;
  }, [categories]);
  const accountName = useMemo(() => {
    const byId = new Map((accounts ?? []).map((a) => [a.id, a.name]));
    return (id: string | null) => ((accounts?.length ?? 0) > 1 && id ? (byId.get(id) ?? null) : null);
  }, [accounts]);

  const summary = useMemo(() => summarize(transactions ?? [], categoryOf), [transactions, categoryOf]);

  // Money in and out per day, for the calendar cells.
  const perDay = useMemo(() => {
    const map = new Map<string, { in: number; out: number }>();
    for (const t of transactions ?? []) {
      if (t.excluded) continue;
      const d = map.get(t.date) ?? { in: 0, out: 0 };
      if (t.type === "income") d.in += t.amount;
      else d.out += t.amount;
      map.set(t.date, d);
    }
    return map;
  }, [transactions]);

  const shown = day ? (transactions ?? []).filter((t) => t.date === day) : (transactions ?? []);
  const go = (by: number) => {
    setDir(by);
    setDay(null);
    setMonth((m) => shiftMonth(m, by));
  };
  const now = today();

  return (
    <>
      <Screen wide>
        <div className="flex items-end justify-between gap-3">
          <h1 className="min-w-0 leading-none">
            <button
              type="button"
              onClick={() => {
                setDir(month < monthOf(now) ? 1 : -1);
                setDay(null);
                setMonth(monthOf(now));
              }}
              className="block overflow-hidden text-left"
              title="Back to this month"
            >
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.span
                  key={month}
                  initial={{ opacity: 0, y: dir >= 0 ? "60%" : "-60%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: dir >= 0 ? "-60%" : "60%" }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="block truncate pb-1 font-display text-[1.8rem] font-semibold min-[400px]:text-[2.15rem] lg:text-[2.75rem]"
                >
                  {monthLabel(month).split(" ")[0]} <span className="text-muted">{month.slice(0, 4)}</span>
                </motion.span>
              </AnimatePresence>
            </button>
          </h1>
          <div className="flex shrink-0 rounded-full bg-surface pb-0 shadow-[inset_0_0_0_1px_var(--line)]">
            <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="grid size-10 place-items-center rounded-full hover:bg-surface-2 active:scale-90">
              <CaretLeftIcon size={18} weight="bold" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next month" className="grid size-10 place-items-center rounded-full hover:bg-surface-2 active:scale-90">
              <CaretRightIcon size={18} weight="bold" />
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="View" className="mt-5 grid max-w-xs grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
          {(
            [
              ["calendar", "Calendar", CalendarBlankIcon],
              ["stats", "Stats", ChartBarIcon],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`relative flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium ${view === v ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {view === v && (
                <motion.span layoutId="tx-view" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]" />
              )}
              <Icon size={16} weight={view === v ? "fill" : "regular"} className="relative" aria-hidden="true" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${view}-${month}`}
            initial={{ opacity: 0, x: dir * 30, y: dir === 0 ? 10 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            {view === "calendar" ? (
              <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
                <div className="space-y-5 lg:sticky lg:top-10">
                  <div className="rounded-2xl bg-surface p-3 shadow-[inset_0_0_0_1px_var(--line)] sm:p-4">
                    <CalendarGrid
                      month={month}
                      label={`${monthLabel(month)} by day`}
                      renderDay={(d, inMonth) => {
                        const v = perDay.get(d);
                        const selected = d === day;
                        return (
                          <button
                            type="button"
                            onClick={() => setDay(selected ? null : d)}
                            aria-pressed={selected}
                            aria-label={`${longDayLabel(d)}${v ? `, in ${formatMoney(v.in, currency)}, out ${formatMoney(v.out, currency)}` : ""}`}
                            disabled={!inMonth}
                            className={`flex h-16 w-full flex-col items-center rounded-xl px-0.5 pt-1.5 text-center transition sm:h-[4.5rem] ${
                              selected
                                ? "bg-ink text-bg"
                                : d === now
                                  ? "bg-accent/12 shadow-[inset_0_0_0_1.5px_var(--accent)]"
                                  : inMonth
                                    ? "hover:bg-surface-2"
                                    : "opacity-30"
                            }`}
                          >
                            <span className={`text-sm font-semibold tabular-nums ${d === now && !selected ? "text-accent-text" : ""}`}>
                              {Number(d.slice(8))}
                            </span>
                            {inMonth && v && v.in > 0 && (
                              <span className={`w-full truncate text-[10px] leading-tight tabular-nums ${selected ? "" : "text-positive"}`}>
                                +{compactMoney(v.in, currency)}
                              </span>
                            )}
                            {inMonth && v && v.out > 0 && (
                              <span className={`w-full truncate text-[10px] leading-tight tabular-nums ${selected ? "" : "text-muted"}`}>
                                −{compactMoney(v.out, currency)}
                              </span>
                            )}
                          </button>
                        );
                      }}
                    />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Money in", summary.income, "text-positive"],
                      ["Spent", summary.expense, ""],
                      ["Left", summary.balance, summary.balance < 0 ? "text-accent-text" : ""],
                    ].map(([label, value, cls]) => (
                      <div key={label as string} className="rounded-2xl bg-surface px-2 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
                        <dt className="text-xs text-muted">{label}</dt>
                        <dd className={`mt-0.5 truncate text-sm font-semibold tabular-nums sm:text-base ${cls}`}>
                          {formatMoney(value as number, currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <section aria-labelledby="tx-list-heading">
                  <div className="mb-3 flex items-center justify-between gap-3 px-2">
                    <h2 id="tx-list-heading" className="font-display text-xl font-semibold">
                      {day ? longDayLabel(day) : "All entries"}
                    </h2>
                    {day && (
                      <button type="button" onClick={() => setDay(null)} className="flex items-center gap-1 text-sm font-medium text-accent-text">
                        <XIcon size={14} weight="bold" aria-hidden="true" />
                        Whole month
                      </button>
                    )}
                  </div>
                  {transactions && shown.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
                      {day ? `Nothing on ${shortDateLabel(day)}.` : `Nothing in ${monthLabel(month)} yet.`}
                    </p>
                  ) : (
                    <TransactionList
                      days={groupByDay(shown)}
                      currency={currency}
                      categoryOf={categoryOf}
                      accountName={accountName}
                      onSelect={setEditing}
                      deletable
                    />
                  )}
                </section>
              </div>
            ) : (
              <Stats month={month} transactions={transactions ?? []} summary={summary} onSelectCategory={(id) => setDetail(categories?.find((c) => c.id === id) ?? null)} />
            )}
          </motion.div>
        </AnimatePresence>
      </Screen>

      <AddButton onAdd={() => setEditing("expense")} />
      <EntrySheet
        target={editing}
        defaultDate={day ?? defaultEntryDate({ kind: "month", anchor: `${month}-01` })}
        categories={categories ?? []}
        onClose={() => setEditing(null)}
      />
      <CategoryDetailSheet
        category={detail}
        period={{ kind: "month", anchor: `${month}-01` }}
        categories={categories ?? []}
        categoryOf={categoryOf}
        accountName={accountName}
        onClose={() => setDetail(null)}
      />
    </>
  );
}

function Stats({
  month,
  transactions,
  summary,
  onSelectCategory,
}: {
  month: string;
  transactions: Transaction[];
  summary: ReturnType<typeof summarize>;
  onSelectCategory: (id: string) => void;
}) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();

  // Six months ending with this one, for the trend.
  const first = shiftMonth(month, -5);
  const trendRows = useLiveQuery(
    () => listTransactions(ledgerId, `${first}-01`, `${month}-${String(daysInMonth(month)).padStart(2, "0")}`),
    [ledgerId, first, month],
  );
  const trend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(first, i));
    return months.map((m) => {
      const rows = (trendRows ?? []).filter((t) => !t.excluded && t.date.startsWith(m));
      return {
        month: m,
        label: monthShort(m),
        income: rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [trendRows, first]);

  const daily = useMemo(() => {
    const n = daysInMonth(month);
    const byDay = new Map<string, number>();
    for (const t of transactions) if (!t.excluded && t.type === "expense") byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
    return Array.from({ length: n }, (_, i) => {
      const date = addDays(`${month}-01`, i);
      return { date, label: longDayLabel(date), amount: byDay.get(date) ?? 0 };
    });
  }, [transactions, month]);

  const now = today();
  const elapsed = month === monthOf(now) ? Number(now.slice(8)) : month < monthOf(now) ? daysInMonth(month) : 0;
  const average = elapsed ? Math.round(summary.expense / elapsed) : 0;
  const biggest = daily.reduce((b, d) => (d.amount > b.amount ? d : b), { date: "", label: "", amount: 0 });
  const top = summary.expenseSlices[0];

  const tiles = [
    { label: "Average a day", value: formatMoney(average, currency), sub: elapsed ? `over ${elapsed} days` : "no days yet" },
    { label: "Biggest day", value: biggest.amount ? formatMoney(biggest.amount, currency) : "None", sub: biggest.date ? shortDateLabel(biggest.date) : "" },
    { label: "Top category", value: top ? top.category.name : "None", sub: top ? `${Math.round(top.share * 100)}% of spending` : "" },
  ];

  return (
    <div className="mt-6 space-y-8">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: EASE_OUT }}
            className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]"
          >
            <dt className="text-sm text-muted">{t.label}</dt>
            <dd className="mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums">{t.value}</dd>
            {t.sub && <dd className="text-xs text-muted">{t.sub}</dd>}
          </motion.div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)] sm:p-5" aria-labelledby="daily-heading">
          <h2 id="daily-heading" className="mb-4 font-semibold">
            Spending per day
          </h2>
          <DailyBars days={daily} currency={currency} />
        </section>
        <section className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)] sm:p-5" aria-labelledby="trend-heading">
          <h2 id="trend-heading" className="mb-3 font-semibold">
            Last 6 months
          </h2>
          <MonthTrend months={trend} currency={currency} />
        </section>
      </div>

      <section aria-labelledby="bycat-heading" className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)] sm:p-5">
        <h2 id="bycat-heading" className="mb-4 font-semibold">
          Where it went
        </h2>
        {summary.expenseSlices.length === 0 ? (
          <p className="text-sm text-muted">No spending in {monthLabel(month)}.</p>
        ) : (
          <CategoryBars slices={summary.expenseSlices} currency={currency} onSelect={onSelectCategory} />
        )}
      </section>
    </div>
  );
}
