import { useState, type FormEvent } from "react";
import { setBudget } from "../data/budgets";
import { amountToInput, currencyDigits, parseAmount } from "../lib/money";
import { useCurrency, useLedgerId } from "../state";
import { Sheet } from "./Sheet";
import { AmountField, FormError } from "./ui";

export type BudgetTarget = { categoryId: string; name: string; amount: number | null };

/** Sets or removes a monthly limit for a category (or the whole month). */
export function BudgetSheet({ target, onClose }: { target: BudgetTarget | null; onClose: () => void }) {
  const [last, setLast] = useState(target);
  if (target !== null && target !== last) setLast(target);
  const shown = target ?? last;
  return (
    <Sheet open={target !== null} title={shown ? `Budget for ${shown.name}` : "Budget"} onClose={onClose}>
      {shown && <BudgetForm target={shown} onDone={onClose} />}
    </Sheet>
  );
}

function BudgetForm({ target, onDone }: { target: BudgetTarget; onDone: () => void }) {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const digits = currencyDigits(currency);
  const [amount, setAmount] = useState(target.amount ? amountToInput(target.amount, digits) : "");
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount, digits);
    if (value === null) return setError("Enter the most you want to spend in a month.");
    await setBudget(ledgerId, target.categoryId, value);
    onDone();
  }

  return (
    <form onSubmit={save} noValidate>
      <AmountField
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setError(null);
        }}
        currency={currency}
        label="Monthly limit"
      />
      <p className="mt-3 text-sm text-muted">
        Applies every month. You'll see a warning at 80% and when you go over.
      </p>
      <FormError message={error} />
      <div className="mt-6 flex gap-3">
        {target.amount !== null && (
          <button
            type="button"
            onClick={async () => {
              await setBudget(ledgerId, target.categoryId, null);
              onDone();
            }}
            className="btn btn-secondary text-accent-text"
          >
            Remove
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1">
          Save budget
        </button>
      </div>
    </form>
  );
}
