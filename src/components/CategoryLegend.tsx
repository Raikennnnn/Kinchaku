import { formatMoney } from "../lib/money";
import type { Slice } from "../lib/summary";
import { CategoryIcon } from "./CategoryIcon";
import { ProgressBar } from "./ui";

type Props = {
  slices: Slice[];
  currency: string;
  /** Monthly limits by category id; shows a small bar under categories that have one. */
  budgets?: Map<string, number>;
  onSelect?: (categoryId: string) => void;
};

/** Each category with its amount and share; tap one to open it. */
export function CategoryLegend({ slices, currency, budgets, onSelect }: Props) {
  if (slices.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-2" aria-label="By category">
      {slices.map((s) => {
        const limit = budgets?.get(s.id);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect?.(s.id)}
              disabled={!onSelect}
              className="flex w-full min-w-0 items-center gap-3 rounded-xl p-1.5 text-left transition enabled:hover:bg-surface-2 enabled:active:scale-[0.98]"
            >
              <CategoryIcon icon={s.category.icon} color={s.category.color} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{s.category.name}</span>
                <span className="block text-sm tabular-nums">
                  <span className="font-semibold">{formatMoney(s.amount, currency)}</span>
                  <span className="ml-1.5 text-muted">
                    {limit ? `of ${formatMoney(limit, currency)}` : `${Math.round(s.share * 100)}%`}
                  </span>
                </span>
                {limit ? (
                  <ProgressBar className="mt-1.5 h-1.5" value={s.amount} max={limit} color={s.category.color} label={`${s.category.name} budget used`} />
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
