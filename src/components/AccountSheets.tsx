import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRightIcon, TrashIcon } from "@phosphor-icons/react";
import {
  addAccount,
  addTransfer,
  deleteAccount,
  deleteTransfer,
  isLiability,
  listAccounts,
  updateAccount,
  updateTransfer,
} from "../data/accounts";
import type { Account, AccountType, Transfer } from "../db";
import type { PresetIconName } from "../icons";
import { ISO_DATE, today } from "../lib/dates";
import { amountToInput, currencyDigits, parseAmount } from "../lib/money";
import { useCurrency, useLedgerId } from "../state";
import { CategoryIcon } from "./CategoryIcon";
import { ColorPicker, IconGrid } from "./pickers";
import { Sheet } from "./Sheet";
import { AmountField, Chip, ChipRow, FormError } from "./ui";

export const ACCOUNT_TYPES: { type: AccountType; label: string; icon: PresetIconName; color: string }[] = [
  { type: "cash", label: "Cash", icon: "wallet", color: "#22c55e" },
  { type: "bank", label: "Bank", icon: "landmark", color: "#0ea5e9" },
  { type: "ewallet", label: "E-wallet", icon: "smartphone", color: "#6366f1" },
  { type: "card", label: "Credit card", icon: "credit-card", color: "#ec4899" },
  { type: "savings", label: "Savings", icon: "piggy-bank", color: "#14b8a6" },
  { type: "loan", label: "Loan", icon: "hand-coins", color: "#f97316" },
];

const ACCOUNT_ICONS: PresetIconName[] = ["wallet", "landmark", "smartphone", "credit-card", "piggy-bank", "hand-coins", "briefcase", "house", "gift", "coffee", "car", "tag"];

export const accountTypeLabel = (t: AccountType) => ACCOUNT_TYPES.find((x) => x.type === t)?.label ?? t;

/* ---------- Add / edit an account ---------- */

export function AccountSheet({ target, onClose }: { target: Account | "new" | null; onClose: () => void }) {
  const [last, setLast] = useState(target);
  if (target !== null && target !== last) setLast(target);
  const shown = target ?? last;
  return (
    <Sheet open={target !== null} title={shown === "new" ? "New account" : "Edit account"} onClose={onClose}>
      {shown !== null && <AccountForm account={shown === "new" ? null : shown} onDone={onClose} />}
    </Sheet>
  );
}

function AccountForm({ account, onDone }: { account: Account | null; onDone: () => void }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const digits = currencyDigits(currency);
  const [type, setType] = useState<AccountType>(account?.type ?? "bank");
  const [name, setName] = useState(account?.name ?? "");
  const [color, setColor] = useState(account?.color ?? "#0ea5e9");
  const [icon, setIcon] = useState<PresetIconName>(account?.icon.kind === "preset" ? account.icon.name : "landmark");
  const [opening, setOpening] = useState(account ? amountToInput(Math.abs(account.opening), digits) : "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const owes = isLiability({ type });

  function pickType(t: AccountType) {
    const def = ACCOUNT_TYPES.find((x) => x.type === t)!;
    setType(t);
    // Follow the type's look unless the user already customised it.
    if (!account) {
      setIcon(def.icon);
      setColor(def.color);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Give the account a name, like GCash or BDO.");
    const value = opening.trim() === "" ? 0 : parseAmount(opening, digits);
    if (value === null) return setError("Enter a valid amount, or leave it empty for zero.");
    const input = {
      name: clean,
      type,
      color,
      icon: account?.icon.kind === "custom" ? account.icon : { kind: "preset" as const, name: icon },
      // Money owed is stored as a negative balance.
      opening: owes ? -value : value,
    };
    if (account) await updateAccount(account.id, input);
    else await addAccount(ledgerId, input);
    onDone();
  }

  return (
    <form onSubmit={save} noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-muted">Type</legend>
        <ChipRow label="Account type">
          {ACCOUNT_TYPES.map((t) => (
            <Chip key={t.type} selected={type === t.type} onClick={() => pickType(t.type)}>
              {t.label}
            </Chip>
          ))}
        </ChipRow>
      </fieldset>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-medium text-muted">Name</span>
        <input
          data-autofocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={30}
          placeholder={type === "ewallet" ? "e.g. GCash" : type === "bank" ? "e.g. BDO Savings" : "Name"}
          autoComplete="off"
          className="field"
        />
      </label>

      <div className="mt-6">
        <AmountField
          value={opening}
          onChange={setOpening}
          currency={currency}
          label={owes ? "Amount owed now" : "Balance now"}
          autoFocus={false}
        />
        <p className="mt-2 text-xs text-muted">
          {owes
            ? "What you owe today. Payments with this card add to it; transfers into it pay it down."
            : "What's in it today. Entries and transfers change it from here."}
        </p>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Colour</legend>
        <ColorPicker id="account" value={color} onChange={setColor} />
      </fieldset>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Icon</legend>
        <IconGrid value={icon} onChange={setIcon} color={color} names={ACCOUNT_ICONS} />
      </fieldset>

      <FormError message={error} />
      {confirmDelete && (
        <p className="mt-4 text-sm text-muted">Entries that used this account stay, without an account.</p>
      )}
      <div className="mt-7 flex gap-3">
        {account && (
          <button
            type="button"
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await deleteAccount(account.id);
              onDone();
            }}
            className="btn btn-secondary text-accent-text"
          >
            <TrashIcon size={18} weight="bold" aria-hidden="true" />
            {confirmDelete ? "Tap again to delete" : "Delete"}
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1">
          {account ? "Save changes" : "Add account"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Move money between accounts ---------- */

export function TransferSheet({ target, onClose }: { target: Transfer | "new" | null; onClose: () => void }) {
  const [last, setLast] = useState(target);
  if (target !== null && target !== last) setLast(target);
  const shown = target ?? last;
  return (
    <Sheet open={target !== null} title={shown === "new" ? "Transfer" : "Edit transfer"} onClose={onClose}>
      {shown !== null && <TransferForm transfer={shown === "new" ? null : shown} onDone={onClose} />}
    </Sheet>
  );
}

function TransferForm({ transfer, onDone }: { transfer: Transfer | null; onDone: () => void }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const digits = currencyDigits(currency);
  const accounts = useLiveQuery(() => listAccounts(ledgerId), [ledgerId]);
  const [fromId, setFromId] = useState<string | null>(transfer?.fromId ?? null);
  const [toId, setToId] = useState<string | null>(transfer?.toId ?? null);
  const [amount, setAmount] = useState(transfer ? amountToInput(transfer.amount, digits) : "");
  const [date, setDate] = useState(transfer?.date ?? today());
  const [note, setNote] = useState(transfer?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (accounts && accounts.length < 2) {
    return <p className="text-muted">Add at least two accounts to move money between them.</p>;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount, digits);
    if (value === null) return setError("Enter an amount.");
    if (!fromId || !toId) return setError("Pick both accounts.");
    if (fromId === toId) return setError("Pick two different accounts.");
    if (!ISO_DATE.test(date)) return setError("Pick a date.");
    const input = { fromId, toId, amount: value, date, note: note.trim() };
    if (transfer) await updateTransfer(transfer.id, input);
    else await addTransfer(ledgerId, input);
    onDone();
  }

  const picker = (value: string | null, set: (id: string) => void, label: string) => (
    <fieldset className="mt-5">
      <legend className="mb-2 text-sm font-medium text-muted">{label}</legend>
      <ChipRow label={label}>
        {(accounts ?? []).map((a) => (
          <Chip
            key={a.id}
            selected={value === a.id}
            onClick={() => {
              set(a.id);
              setError(null);
            }}
          >
            <CategoryIcon icon={a.icon} color={a.color} size={22} />
            {a.name}
          </Chip>
        ))}
      </ChipRow>
    </fieldset>
  );

  return (
    <form onSubmit={save} noValidate>
      <AmountField value={amount} onChange={setAmount} currency={currency} label="Amount" />
      {picker(fromId, setFromId, "From")}
      <div className="mt-3 flex justify-center text-muted" aria-hidden="true">
        <ArrowRightIcon size={18} weight="bold" className="rotate-90" />
      </div>
      {picker(toId, setToId, "To")}
      <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr]">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-muted">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-muted">Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Optional" autoComplete="off" className="field" />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted">Transfers aren't income or spending, so they don't change what's left this month.</p>
      <FormError message={error} />
      <div className="mt-7 flex gap-3">
        {transfer && (
          <button
            type="button"
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await deleteTransfer(transfer.id);
              onDone();
            }}
            className="btn btn-secondary text-accent-text"
          >
            <TrashIcon size={18} weight="bold" aria-hidden="true" />
            {confirmDelete ? "Tap again" : "Delete"}
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1">
          {transfer ? "Save changes" : "Move money"}
        </button>
      </div>
    </form>
  );
}
