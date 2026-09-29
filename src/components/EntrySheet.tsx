import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { ArrowsClockwiseIcon, CheckCircleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { listAccounts, preferredAccountId, rememberAccount } from "../data/accounts";
import { FREQUENCY_LABEL, startRecurring } from "../data/recurring";
import { addTransaction, deleteTransaction, updateTransaction } from "../data/transactions";
import type { Category, Frequency, Kind, Transaction } from "../db";
import { ISO_DATE } from "../lib/dates";
import { amountToInput, currencyDigits, parseAmount } from "../lib/money";
import { useCurrency, useLedgerId } from "../state";
import { CategoryEditor } from "./CategoryEditor";
import { CategoryIcon } from "./CategoryIcon";
import { KindSwitch } from "./KindSwitch";
import { Sheet } from "./Sheet";
import { AmountField, Chip, ChipRow, FormError, Toggle } from "./ui";

type Props = {
  /** A kind to start a new entry of, an entry to edit, or null when closed */
  target: Transaction | Kind | null;
  defaultDate: string;
  /** All visible categories; the form shows the ones matching the chosen type. */
  categories: Category[];
  /** Preselect this category for a new entry (e.g. from a category's page). */
  defaultCategoryId?: string;
  onClose: () => void;
};

export function EntrySheet({ target, onClose, ...rest }: Props) {
  // Keep showing the last form while the sheet animates closed.
  const [last, setLast] = useState(target);
  if (target !== null && target !== last) setLast(target);
  const shown = target ?? last;
  const editing = shown !== null && typeof shown === "object";

  return (
    <Sheet open={target !== null} title={editing ? "Edit entry" : "New entry"} onClose={onClose}>
      {shown !== null && (
        <EntryForm entry={editing ? shown : null} startKind={editing ? shown.type : shown} onDone={onClose} {...rest} />
      )}
    </Sheet>
  );
}

type FormProps = Omit<Props, "target" | "onClose"> & { entry: Transaction | null; startKind: Kind; onDone: () => void };

const FREQUENCIES: (Frequency | null)[] = [null, "daily", "weekly", "monthly", "yearly"];

function EntryForm({ entry, startKind, defaultDate, categories, defaultCategoryId, onDone }: FormProps) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const digits = currencyDigits(currency);
  const accounts = useLiveQuery(() => listAccounts(ledgerId), [ledgerId]);
  const preferred = useLiveQuery(() => preferredAccountId(ledgerId), [ledgerId]);

  const [type, setType] = useState<Kind>(startKind);
  const [amount, setAmount] = useState(entry ? amountToInput(entry.amount, digits) : "");
  const [categoryId, setCategoryId] = useState<string | null>(
    entry?.categoryId ?? (categories.some((c) => c.id === defaultCategoryId && c.kind === startKind) ? defaultCategoryId! : null),
  );
  // undefined = not chosen yet, so the preferred account applies once it loads.
  const [accountId, setAccountId] = useState<string | null | undefined>(entry ? entry.accountId : undefined);
  const [date, setDate] = useState(entry?.date ?? defaultDate);
  const [note, setNote] = useState(entry?.note ?? "");
  const [excluded, setExcluded] = useState(entry?.excluded ?? false);
  const [repeat, setRepeat] = useState<Frequency | null>(null);
  const [addAnother, setAddAnother] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [creating, setCreating] = useState(false);

  const account = accountId === undefined ? (preferred ?? null) : accountId;
  // Categories of the chosen type. App-owned ones (carry-over, savings) only show when this entry already uses one.
  const choices = categories.filter((c) => c.kind === type && (!c.system || c.id === entry?.categoryId));
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const quickNotes = selectedCategory?.quickNotes ?? [];

  function switchType(next: Kind) {
    setType(next);
    setError(null);
    if (categoryId && !categories.some((c) => c.id === categoryId && c.kind === next)) setCategoryId(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount, digits);
    if (value === null) {
      setError(digits === 0 ? "Enter an amount in whole numbers." : `Enter an amount with up to ${digits} decimals.`);
      return;
    }
    if (!categoryId) return setError("Pick a category.");
    if (!ISO_DATE.test(date)) return setError("Pick a date.");

    const input = { type, amount: value, categoryId, accountId: account, date, note: note.trim(), excluded };
    if (entry) {
      await updateTransaction(entry.id, input);
    } else {
      const recurringId = repeat ? await startRecurring(ledgerId, input, repeat) : null;
      await addTransaction(ledgerId, input, recurringId);
      await rememberAccount(ledgerId, account);
    }

    if (addAnother && !entry) {
      // Ready for the next one: same type, category, account and date.
      setAmount("");
      setNote("");
      setRepeat(null);
      setSavedCount((n) => n + 1);
      document.querySelector<HTMLInputElement>("dialog[open] [data-autofocus]")?.focus();
      return;
    }
    onDone();
  }

  async function remove() {
    if (!entry) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteTransaction(entry.id);
    onDone();
  }

  const income = type === "income";

  return (
    <>
      <form onSubmit={save} noValidate>
        <KindSwitch id="entry" value={type} onChange={switchType} />

        <div className="mt-5">
          <AmountField
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setError(null);
            }}
            currency={currency}
            label={income ? "Amount received" : "Amount spent"}
            sign={income ? "+" : "−"}
            signClass={income ? "text-positive" : "text-muted"}
          />
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-medium text-muted">{income ? "Where it came from" : "Category"}</legend>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={type}
              initial={{ opacity: 0, x: income ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: income ? -16 : 16 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-4 gap-1.5 sm:grid-cols-5"
            >
              {choices.map((c) => {
                const selected = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setCategoryId(c.id);
                      setError(null);
                    }}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-xs transition active:scale-95 ${
                      selected ? "" : "hover:bg-surface-2"
                    }`}
                  >
                    {selected && (
                      // One highlight that glides between categories as the choice changes.
                      <motion.span
                        layoutId="category-highlight"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                        className="absolute inset-0 rounded-xl bg-surface shadow-[inset_0_0_0_2px_var(--accent)]"
                      />
                    )}
                    <span className="relative">
                      <CategoryIcon icon={c.icon} color={c.color} size={42} />
                    </span>
                    <span className={`relative line-clamp-2 text-center leading-tight ${selected ? "font-semibold" : ""}`}>
                      {c.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-xs text-muted transition hover:bg-surface-2 hover:text-ink active:scale-95"
              >
                <span className="grid size-[42px] place-items-center rounded-[13px] border-2 border-dashed border-line">
                  <PlusIcon size={18} weight="bold" aria-hidden="true" />
                </span>
                <span className="leading-tight">New</span>
              </button>
            </motion.div>
          </AnimatePresence>
        </fieldset>

        {accounts && accounts.length > 0 && (
          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium text-muted">{income ? "Received in" : "Paid with"}</legend>
            <ChipRow label="Account">
              {accounts.map((a) => (
                <Chip key={a.id} selected={account === a.id} onClick={() => setAccountId(a.id)}>
                  <CategoryIcon icon={a.icon} color={a.color} size={22} />
                  {a.name}
                </Chip>
              ))}
              <Chip selected={account === null} onClick={() => setAccountId(null)}>
                No account
              </Chip>
            </ChipRow>
          </fieldset>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Note</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder={income ? "e.g. From Mom" : "Optional"}
              autoComplete="off"
              className="field"
            />
          </label>
        </div>

        <AnimatePresence initial={false}>
          {quickNotes.length > 0 && (
            <motion.div
              key={categoryId}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <ChipRow label="Quick notes">
                  {quickNotes.map((q) => (
                    <Chip key={q} selected={note === q} onClick={() => setNote(note === q ? "" : q)}>
                      {q}
                    </Chip>
                  ))}
                </ChipRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!entry && (
          <fieldset className="mt-6">
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted">
              <ArrowsClockwiseIcon size={14} weight="bold" aria-hidden="true" />
              Repeat
            </legend>
            <ChipRow label="Repeat">
              {FREQUENCIES.map((f) => (
                <Chip key={f ?? "never"} selected={repeat === f} onClick={() => setRepeat(f)}>
                  {f ? FREQUENCY_LABEL[f] : "Never"}
                </Chip>
              ))}
            </ChipRow>
          </fieldset>
        )}
        {entry?.recurringId && (
          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <ArrowsClockwiseIcon size={14} weight="bold" aria-hidden="true" />
            Added by a repeating entry. Changes here affect only this one.
          </p>
        )}

        <div className="mt-5 space-y-2 rounded-2xl bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
          <Toggle
            checked={excluded}
            onChange={setExcluded}
            label="Leave out of totals"
            hint="Still shown and still moves the account, but not counted in budgets or stats."
          />
          {!entry && (
            <Toggle
              checked={addAnother}
              onChange={setAddAnother}
              label="Add another after saving"
              hint="Keeps the category, account and date for the next entry."
            />
          )}
        </div>

        <FormError message={error} />

        <AnimatePresence>
          {savedCount > 0 && (
            <motion.p
              key={savedCount}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2 text-sm font-medium text-positive"
              role="status"
            >
              <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
              Saved {savedCount === 1 ? "1 entry" : `${savedCount} entries`}. Add the next one.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-6 flex gap-3">
          {entry && (
            <button type="button" onClick={remove} className="btn btn-secondary text-accent-text">
              <TrashIcon size={18} weight="bold" aria-hidden="true" />
              {confirmDelete ? "Tap again to delete" : "Delete"}
            </button>
          )}
          <button type="submit" className="btn btn-primary flex-1">
            {entry ? "Save changes" : income ? "Add money in" : "Add expense"}
          </button>
        </div>
      </form>

      {/* Opens on top of this sheet; kept outside the form so its own form doesn't nest. */}
      <CategoryEditor
        target={creating ? "new" : null}
        kind={type}
        categories={categories}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setCategoryId(id);
          setError(null);
        }}
      />
    </>
  );
}
