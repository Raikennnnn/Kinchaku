import { motion } from "motion/react";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import type { Kind } from "../db";

/** Expense / Money in toggle, with a pill that slides between the two. */
export function KindSwitch({ value, onChange, id }: { value: Kind; onChange: (kind: Kind) => void; id: string }) {
  const options = [
    { kind: "expense" as const, label: "Expense", Icon: ArrowUpRightIcon },
    { kind: "income" as const, label: "Money in", Icon: ArrowDownLeftIcon },
  ];
  return (
    <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
      {options.map(({ kind, label, Icon }) => {
        const active = value === kind;
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(kind)}
            className={`relative flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`kind-pill-${id}`}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
              />
            )}
            <Icon
              size={16}
              weight="bold"
              aria-hidden="true"
              className={`relative ${active ? (kind === "income" ? "text-positive" : "text-accent-text") : ""}`}
            />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
