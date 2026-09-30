import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import {
  ArrowsClockwiseIcon,
  BankIcon,
  CalendarDotsIcon,
  CaretDownIcon,
  CaretLeftIcon,
  ChartDonutIcon,
  CheckIcon,
  CloudArrowDownIcon,
  DotsThreeCircleIcon,
  GearSixIcon,
  NotebookIcon,
  PiggyBankIcon,
  SquaresFourIcon,
  TargetIcon,
  type Icon,
} from "@phosphor-icons/react";
import { listLedgers, setActiveLedger } from "../data/ledgers";
import { useLedgerId } from "../state";
import { SyncBadge, SyncLine } from "../sync/SyncStatus";
import { Brand } from "./Brand";
import { CategoryIcon } from "./CategoryIcon";
import { Sheet } from "./Sheet";
import { ThemeButton } from "./ThemeToggle";

export type View =
  | "home"
  | "transactions"
  | "budgets"
  | "accounts"
  | "more"
  | "categories"
  | "goals"
  | "recurring"
  | "ledgers"
  | "backup";

const MAIN: { view: View; label: string; icon: Icon }[] = [
  { view: "home", label: "Home", icon: ChartDonutIcon },
  { view: "transactions", label: "Transactions", icon: CalendarDotsIcon },
  { view: "budgets", label: "Budgets", icon: TargetIcon },
  { view: "accounts", label: "Accounts", icon: BankIcon },
];

export const MORE_ITEMS: { view: View; label: string; hint: string; icon: Icon }[] = [
  { view: "categories", label: "Categories", hint: "Expense and money-in categories", icon: SquaresFourIcon },
  { view: "goals", label: "Savings goals", hint: "Save up for something", icon: PiggyBankIcon },
  { view: "recurring", label: "Repeating", hint: "Bills, subscriptions, salary", icon: ArrowsClockwiseIcon },
  { view: "ledgers", label: "Ledgers", hint: "Separate books, like Personal and Business", icon: NotebookIcon },
  { view: "backup", label: "Backup & export", hint: "Back up, export to a spreadsheet, import", icon: CloudArrowDownIcon },
];

const isMoreView = (v: View) => MORE_ITEMS.some((i) => i.view === v);

type Props = { view: View; onNavigate: (view: View) => void; onOpenSettings: () => void; children: ReactNode };

/** Sidebar on desktop; top bar plus a bottom tab bar on phones. */
export function AppShell({ view, onNavigate, onOpenSettings, children }: Props) {
  const [switching, setSwitching] = useState(false);
  const ledgerId = useLedgerId();
  const ledgers = useLiveQuery(listLedgers, []);
  const ledger = ledgers?.find((l) => l.id === ledgerId);
  const manyLedgers = (ledgers?.length ?? 0) > 1;

  const navButton = (item: { view: View; label: string; icon: Icon }, pillId: string) => {
    const active = item.view === view;
    const Glyph = item.icon;
    return (
      <button
        key={item.view}
        type="button"
        onClick={() => onNavigate(item.view)}
        aria-current={active ? "page" : undefined}
        className={`relative flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left font-medium transition ${active ? "text-ink" : "text-muted hover:text-ink"}`}
      >
        {active && (
          <motion.span layoutId={pillId} transition={{ type: "spring", stiffness: 480, damping: 38 }} className="absolute inset-0 rounded-full bg-surface-2" />
        )}
        <Glyph size={20} weight={active ? "fill" : "duotone"} className="relative" aria-hidden="true" />
        <span className="relative">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line px-4 py-6 lg:flex">
        <div className="px-3">
          <Brand />
        </div>
        {ledger && (
          <button
            type="button"
            onClick={() => setSwitching(true)}
            className="mt-5 flex items-center gap-2.5 rounded-2xl bg-surface px-3 py-2.5 text-left shadow-[inset_0_0_0_1px_var(--line)] transition hover:bg-surface-2"
          >
            <CategoryIcon icon={{ kind: "preset", name: ledger.icon }} color={ledger.color} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">Ledger</span>
              <span className="block text-sm font-semibold wrap-break-word">{ledger.name}</span>
            </span>
            <CaretDownIcon size={14} weight="bold" className="text-muted" aria-hidden="true" />
          </button>
        )}
        <nav className="mt-6 space-y-1" aria-label="Main">
          {MAIN.map((i) => navButton(i, "sidebar-pill"))}
        </nav>
        <p className="mt-6 mb-1 px-4 text-xs font-semibold text-muted">Manage</p>
        <nav className="space-y-1" aria-label="Manage">
          {MORE_ITEMS.map((i) => navButton(i, "sidebar-pill"))}
        </nav>
        <div className="mt-auto pt-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex flex-1 items-center gap-3 rounded-full px-4 py-2.5 text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              <GearSixIcon size={20} weight="duotone" aria-hidden="true" />
              Settings
            </button>
            <ThemeButton />
          </div>
          <div className="mt-4 px-4">
            <SyncLine />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-1 lg:hidden">
          {isMoreView(view) ? (
            <button type="button" onClick={() => onNavigate("more")} className="-ml-2 flex items-center gap-1 rounded-full px-2 py-2 font-medium text-muted hover:text-ink">
              <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
              More
            </button>
          ) : (
            <Brand size={26} compact={manyLedgers} />
          )}
          <div className="flex min-w-0 items-center">
            {ledger && manyLedgers && (
              <button
                type="button"
                onClick={() => setSwitching(true)}
                className="mr-1 flex min-w-0 items-center gap-1.5 rounded-full bg-surface py-1.5 pr-2.5 pl-1.5 text-sm font-medium shadow-[inset_0_0_0_1px_var(--line)]"
              >
                <CategoryIcon icon={{ kind: "preset", name: ledger.icon }} color={ledger.color} size={22} />
                <span className="max-w-[9rem] truncate">{ledger.name}</span>
                <CaretDownIcon size={12} weight="bold" className="shrink-0 text-muted" aria-hidden="true" />
              </button>
            )}
            <SyncBadge onOpen={onOpenSettings} />
            <ThemeButton />
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Settings"
              className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink active:scale-90"
            >
              <GearSixIcon size={22} weight="duotone" />
            </button>
          </div>
        </header>
        {children}
      </div>

      {/* Bottom tabs on phones */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-line/80 bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {[...MAIN, { view: "more" as View, label: "More", icon: DotsThreeCircleIcon }].map(({ view: v, label, icon: Glyph }) => {
            const active = v === view || (v === "more" && isMoreView(view));
            return (
              <button
                key={v}
                type="button"
                onClick={() => onNavigate(v)}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition active:scale-95 ${active ? "text-ink" : "text-muted"}`}
              >
                {active && (
                  <motion.span layoutId="tab-indicator" transition={{ type: "spring", stiffness: 480, damping: 38 }} className="absolute top-0 h-0.5 w-9 rounded-full bg-accent" />
                )}
                <Glyph size={23} weight={active ? "fill" : "regular"} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={switching} title="Ledgers" onClose={() => setSwitching(false)}>
        <ul className="space-y-2">
          {(ledgers ?? []).map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={async () => {
                  await setActiveLedger(l.id);
                  setSwitching(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left transition hover:bg-surface-2 ${
                  l.id === ledgerId ? "shadow-[inset_0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line)]"
                }`}
              >
                <CategoryIcon icon={{ kind: "preset", name: l.icon }} color={l.color} size={36} />
                <span className="min-w-0 flex-1 font-semibold wrap-break-word">{l.name}</span>
                {l.id === ledgerId && <CheckIcon size={18} weight="bold" className="text-accent-text" aria-label="Open" />}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setSwitching(false);
            onNavigate("ledgers");
          }}
          className="btn btn-secondary mt-4 w-full"
        >
          Manage ledgers
        </button>
      </Sheet>
    </div>
  );
}
