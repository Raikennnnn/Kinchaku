import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { ArrowRightIcon, ArrowsLeftRightIcon, EyeIcon, EyeSlashIcon, PlusIcon } from "@phosphor-icons/react";
import { accountBalances, isLiability, listAccounts, listTransfers } from "../data/accounts";
import { getSetting, setSetting, type Account, type Transfer } from "../db";
import { dayLabel } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { useCurrency, useLedgerId } from "../state";
import { AccountSheet, accountTypeLabel, TransferSheet } from "../components/AccountSheets";
import { CategoryIcon } from "../components/CategoryIcon";
import { AnimatedMoney, FitText, Stagger, staggerChild } from "../components/motion";
import { Screen, ScreenHeader } from "../components/ui";

/** Where the money is: every account's balance, net worth, and transfers between them. */
export function Accounts() {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const accounts = useLiveQuery(() => listAccounts(ledgerId), [ledgerId]);
  const balances = useLiveQuery(() => accountBalances(ledgerId), [ledgerId]);
  const transfers = useLiveQuery(() => listTransfers(ledgerId, "0000-01-01", "9999-12-31"), [ledgerId]);
  const hidden = useLiveQuery(async () => (await getSetting<boolean>("hideBalances")) ?? false, []);
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [transfer, setTransfer] = useState<Transfer | "new" | null>(null);

  const { assets, liabilities } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    for (const a of accounts ?? []) {
      const b = balances?.get(a.id) ?? 0;
      if (b >= 0) assets += b;
      else liabilities += -b;
    }
    return { assets, liabilities };
  }, [accounts, balances]);

  const names = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const fmt = (n: number) => (hidden ? "••••" : formatMoney(n, currency));
  const have = (accounts ?? []).filter((a) => !isLiability(a));
  const owe = (accounts ?? []).filter((a) => isLiability(a));

  const row = (a: Account) => {
    const b = balances?.get(a.id) ?? 0;
    const owes = isLiability(a);
    return (
      <motion.li key={a.id} variants={staggerChild}>
        <button
          type="button"
          onClick={() => setEditing(a)}
          className="flex w-full items-center gap-3.5 rounded-2xl bg-surface p-3.5 text-left shadow-[inset_0_0_0_1px_var(--line)] transition hover:bg-surface-2 active:scale-[0.99]"
        >
          <CategoryIcon icon={a.icon} color={a.color} size={44} />
          <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="min-w-[7rem] flex-1">
            <span className="block font-semibold wrap-break-word">{a.name}</span>
            <span className="block text-sm text-muted">{accountTypeLabel(a.type)}</span>
          </span>
          <span className="ml-auto text-right whitespace-nowrap tabular-nums">
            <span className={`block font-semibold ${b < 0 ? "text-accent-text" : ""}`}>{fmt(Math.abs(b))}</span>
            <span className="block text-xs text-muted">{owes || b < 0 ? "owed" : "available"}</span>
          </span>
          </span>
        </button>
      </motion.li>
    );
  };

  return (
    <>
      <Screen>
        <ScreenHeader title="Accounts">
          <button type="button" onClick={() => setTransfer("new")} className="btn btn-secondary btn-sm">
            <ArrowsLeftRightIcon size={16} weight="bold" aria-hidden="true" />
            <span className="hidden sm:inline">Transfer</span>
          </button>
          <button type="button" onClick={() => setEditing("new")} className="btn btn-primary btn-sm">
            <PlusIcon size={16} weight="bold" aria-hidden="true" />
            <span className="hidden sm:inline">New account</span>
            <span className="sm:hidden">Add</span>
          </button>
        </ScreenHeader>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          aria-label="Net worth"
          className="relative mt-6 overflow-hidden rounded-2xl bg-brand p-5 text-brand-ink shadow-[0_18px_40px_-24px_rgb(20_28_60/0.7)] lg:p-6"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(255_255_255/0.09),transparent_55%)]" />
          <div className="relative flex items-start justify-between">
            <p className="text-sm text-brand-muted">Net worth</p>
            <button
              type="button"
              onClick={() => void setSetting("hideBalances", !hidden)}
              aria-label={hidden ? "Show balances" : "Hide balances"}
              className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/15"
            >
              {hidden ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
          {hidden ? (
            <p className="relative text-[2.75rem] leading-none font-semibold tracking-tight">••••</p>
          ) : (
            <FitText className="relative text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums">
              <AnimatedMoney value={assets - liabilities} currency={currency} />
            </FitText>
          )}
          <dl className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-brand-muted">You have</dt>
              <dd className="font-semibold tabular-nums">{fmt(assets)}</dd>
            </div>
            <div>
              <dt className="text-brand-muted">You owe</dt>
              <dd className="font-semibold tabular-nums">{fmt(liabilities)}</dd>
            </div>
          </dl>
        </motion.section>

        {have.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">Money you have</h2>
            <Stagger as="ul" className="grid grid-cols-1 gap-2 sm:grid-cols-2" stagger={0.05}>
              {have.map(row)}
            </Stagger>
          </>
        )}
        {owe.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">Cards and loans</h2>
            <Stagger as="ul" className="grid grid-cols-1 gap-2 sm:grid-cols-2" stagger={0.05}>
              {owe.map(row)}
            </Stagger>
          </>
        )}
        {accounts && accounts.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-muted">
            No accounts yet. Add cash, a bank or an e-wallet like GCash to see where your money is.
          </p>
        )}

        {transfers && transfers.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">Transfers</h2>
            <ul className="divide-y divide-line rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--line)]">
              {transfers.slice(0, 20).map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setTransfer(t)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="wrap-break-word">{names.get(t.fromId) ?? "Deleted"}</span>
                        <ArrowRightIcon size={12} weight="bold" className="shrink-0 text-muted" aria-label="to" />
                        <span className="wrap-break-word">{names.get(t.toId) ?? "Deleted"}</span>
                      </span>
                      <span className="block text-muted">
                        {dayLabel(t.date)}
                        {t.note && ` · ${t.note}`}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{fmt(t.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Screen>

      <AccountSheet target={editing} onClose={() => setEditing(null)} />
      <TransferSheet target={transfer} onClose={() => setTransfer(null)} />
    </>
  );
}
