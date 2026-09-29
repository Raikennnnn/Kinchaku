import { useMemo, useState } from "react";
import { CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { currencySymbol } from "../lib/money";

type Currency = { code: string; name: string; symbol: string };

// ISO codes for precious metals, funds and test codes, not spendable money.
const NOT_MONEY = new Set(["XAG", "XAU", "XBA", "XBB", "XBC", "XBD", "XDR", "XPD", "XPT", "XSU", "XTS", "XUA", "XXX"]);
const POPULAR = ["USD", "EUR", "JPY", "GBP", "CNY", "AUD", "CAD", "CHF"];

function listCurrencies(): Currency[] {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  return Intl.supportedValuesOf("currency")
    .filter((code) => !NOT_MONEY.has(code))
    .map((code) => ({ code, name: names.of(code) ?? code, symbol: currencySymbol(code) }));
}

type Props = {
  value?: string;
  onPick: (code: string) => void;
  /** Where the search box sticks while scrolling; full-page use clears the iPhone status bar. */
  stickyTop?: string;
};

export function CurrencyPicker({ value, onPick, stickyTop = "top-0" }: Props) {
  const [query, setQuery] = useState("");
  const all = useMemo(listCurrencies, []);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? all.filter((c) => c.code.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle))
    : all;
  const popular = needle ? [] : POPULAR.flatMap((code) => all.filter((c) => c.code === code));

  const row = (c: Currency) => (
    <li key={c.code}>
      <button
        type="button"
        onClick={() => onPick(c.code)}
        aria-pressed={c.code === value}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2"
      >
        <span className="w-10 font-mono text-[13px] text-muted">{c.code}</span>
        <span className="min-w-0 flex-1 truncate">{c.name}</span>
        <span className="text-muted">{c.symbol}</span>
        <CheckIcon size={16} weight="bold" className={c.code === value ? "text-accent-text" : "invisible"} />
      </button>
    </li>
  );

  return (
    <div>
      <label className={`sticky ${stickyTop} z-10 -mx-1 block bg-bg px-1 pb-2`}>
        <span className="sr-only">Search currencies</span>
        <span className="flex items-center gap-2.5 rounded-full bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_2px_var(--accent-text)]">
          <MagnifyingGlassIcon size={18} className="text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or code"
            autoComplete="off"
            className="w-full bg-transparent outline-none placeholder:text-muted"
          />
        </span>
      </label>

      {popular.length > 0 && (
        <>
          <h3 className="mt-4 mb-1 px-3 text-sm font-semibold">Popular</h3>
          <ul>{popular.map(row)}</ul>
          <h3 className="mt-5 mb-1 border-t border-line px-3 pt-5 text-sm font-semibold">All currencies</h3>
        </>
      )}

      {matches.length > 0 ? (
        <ul className={needle ? "mt-2" : ""}>{matches.map(row)}</ul>
      ) : (
        <p className="mt-4 px-3 text-sm text-muted">No currency matches “{query}”.</p>
      )}
    </div>
  );
}
