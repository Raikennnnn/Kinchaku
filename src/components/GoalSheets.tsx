import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { MinusIcon, PencilSimpleIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { addDeposit, addGoal, deleteDeposit, deleteGoal, goalTotals, listDeposits, updateGoal } from "../data/goals";
import type { Goal } from "../db";
import type { PresetIconName } from "../icons";
import { dayLabel, ISO_DATE, today } from "../lib/dates";
import { amountToInput, currencyDigits, formatMoney, parseAmount } from "../lib/money";
import { useCurrency, useLedgerId } from "../state";
import { CategoryIcon } from "./CategoryIcon";
import { ColorPicker, IconGrid } from "./pickers";
import { Sheet } from "./Sheet";
import { AmountField, FormError, ProgressBar, Toggle } from "./ui";
import { FitText } from "./motion";

const GOAL_ICONS: PresetIconName[] = ["piggy-bank", "plane", "house", "car", "laptop", "smartphone", "graduation-cap", "gift", "heart", "umbrella", "bike", "ticket"];

/* ---------- Create / edit ---------- */

export function GoalSheet({ target, onClose }: { target: Goal | "new" | null; onClose: () => void }) {
  const [last, setLast] = useState(target);
  if (target !== null && target !== last) setLast(target);
  const shown = target ?? last;
  return (
    <Sheet open={target !== null} title={shown === "new" ? "New savings goal" : "Edit goal"} onClose={onClose}>
      {shown !== null && <GoalForm goal={shown === "new" ? null : shown} onDone={onClose} />}
    </Sheet>
  );
}

function GoalForm({ goal, onDone }: { goal: Goal | null; onDone: () => void }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const digits = currencyDigits(currency);
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? amountToInput(goal.target, digits) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [color, setColor] = useState(goal?.color ?? "#14b8a6");
  const [icon, setIcon] = useState<PresetIconName>(goal?.icon.kind === "preset" ? goal.icon.name : "piggy-bank");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Name the goal, like Trip to Japan.");
    const value = parseAmount(target, digits);
    if (value === null) return setError("Enter how much you want to save.");
    if (deadline && !ISO_DATE.test(deadline)) return setError("Pick a valid date, or leave it empty.");
    const input = { name: clean, target: value, deadline: deadline || null, color, icon: { kind: "preset" as const, name: icon } };
    if (goal) await updateGoal(goal.id, input);
    else await addGoal(ledgerId, input);
    onDone();
  }

  return (
    <form onSubmit={save} noValidate>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-muted">Name</span>
        <input
          data-autofocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={30}
          placeholder="e.g. Trip to Japan"
          autoComplete="off"
          className="field"
        />
      </label>
      <div className="mt-6">
        <AmountField value={target} onChange={setTarget} currency={currency} label="Target" autoFocus={false} />
      </div>
      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-medium text-muted">By when (optional)</span>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="field" />
      </label>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Colour</legend>
        <ColorPicker id="goal" value={color} onChange={setColor} />
      </fieldset>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Icon</legend>
        <IconGrid value={icon} onChange={setIcon} color={color} names={GOAL_ICONS} />
      </fieldset>
      <FormError message={error} />
      <div className="mt-7 flex gap-3">
        {goal && (
          <button
            type="button"
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await deleteGoal(goal.id);
              onDone();
            }}
            className="btn btn-secondary text-accent-text"
          >
            <TrashIcon size={18} weight="bold" aria-hidden="true" />
            {confirmDelete ? "Tap again" : "Delete"}
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1">
          {goal ? "Save changes" : "Create goal"}
        </button>
      </div>
    </form>
  );
}

/* ---------- A goal: progress, add or take out money, history ---------- */

export function GoalDetailSheet({ goal, onClose, onEdit }: { goal: Goal | null; onClose: () => void; onEdit: (g: Goal) => void }) {
  const [last, setLast] = useState(goal);
  if (goal !== null && goal !== last) setLast(goal);
  const shown = goal ?? last;
  return (
    <Sheet open={goal !== null} title={shown?.name ?? "Goal"} onClose={onClose}>
      {shown && <GoalDetail goal={shown} onEdit={onEdit} />}
    </Sheet>
  );
}

function GoalDetail({ goal, onEdit }: { goal: Goal; onEdit: (g: Goal) => void }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const digits = currencyDigits(currency);
  const totals = useLiveQuery(() => goalTotals(ledgerId), [ledgerId]);
  const deposits = useLiveQuery(() => listDeposits(goal.id), [goal.id]);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [fromMonth, setFromMonth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saved = totals?.get(goal.id) ?? 0;
  const left = Math.max(0, goal.target - saved);
  const fmt = (n: number) => formatMoney(n, currency);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount, digits);
    if (value === null) return setError("Enter an amount.");
    if (direction === "out" && value > saved) return setError(`There's only ${fmt(saved)} in this goal.`);
    await addDeposit(ledgerId, goal, direction === "in" ? value : -value, today(), note.trim(), fromMonth);
    setAmount("");
    setNote("");
    setError(null);
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <CategoryIcon icon={goal.icon} color={goal.color} size={56} />
        <div className="min-w-0 flex-1">
          <FitText className="text-3xl font-semibold tracking-tight tabular-nums">{fmt(saved)}</FitText>
          <p className="text-sm text-muted">
            of {fmt(goal.target)}
            {goal.deadline && ` by ${dayLabel(goal.deadline)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(goal)}
          aria-label="Edit goal"
          className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink"
        >
          <PencilSimpleIcon size={18} weight="bold" />
        </button>
      </div>
      <ProgressBar className="mt-4 h-3" value={saved} max={goal.target} color={goal.color} positive label={`${goal.name} progress`} />
      <p className="mt-2 text-sm text-muted">{left === 0 ? "Goal reached. Nicely done." : `${fmt(left)} to go`}</p>

      <form onSubmit={submit} noValidate className="mt-6 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Add or take out">
          {(
            [
              ["in", "Add money", PlusIcon],
              ["out", "Take out", MinusIcon],
            ] as const
          ).map(([d, label, Icon]) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => setDirection(d)}
              className={`relative flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium ${direction === d ? "text-ink" : "text-muted"}`}
            >
              {direction === d && (
                <motion.span layoutId="goal-dir" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-bg shadow-[0_1px_3px_rgb(0_0_0/0.12)]" />
              )}
              <Icon size={14} weight="bold" className="relative" aria-hidden="true" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <AmountField value={amount} onChange={(v) => { setAmount(v); setError(null); }} currency={currency} label="Amount" autoFocus={false} />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder="Note (optional)"
          autoComplete="off"
          className="field mt-3"
          aria-label="Note"
        />
        <div className="mt-3">
          <Toggle
            checked={fromMonth}
            onChange={setFromMonth}
            label={direction === "in" ? "Take it from this month's money" : "Add it back to this month's money"}
            hint={direction === "in" ? "Recorded as a 'To savings' expense, so what's left stays accurate." : "Recorded as money in for this month."}
          />
        </div>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary mt-4 w-full">
          {direction === "in" ? "Add to goal" : "Take out of goal"}
        </button>
      </form>

      {deposits && deposits.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 font-semibold">History</h3>
          <ul className="divide-y divide-line">
            {deposits.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block">{dayLabel(d.date)}</span>
                  {d.note && <span className="line-clamp-2 text-muted wrap-break-word">{d.note}</span>}
                </span>
                <span className={`shrink-0 font-semibold whitespace-nowrap tabular-nums ${d.amount > 0 ? "text-positive" : ""}`}>
                  {d.amount > 0 ? "+" : "−"}
                  {fmt(Math.abs(d.amount))}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteDeposit(d)}
                  aria-label="Remove"
                  className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <XIcon size={14} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
