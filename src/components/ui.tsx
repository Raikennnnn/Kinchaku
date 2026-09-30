import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { currencyDigits, currencySymbol } from "../lib/money";
import { EASE_OUT } from "./motion";

/** An on/off switch with its label; the knob slides with a spring. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]"}`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className={`absolute top-1 size-5 rounded-full bg-white shadow ${checked ? "right-1" : "left-1"}`}
        />
      </button>
    </label>
  );
}

/**
 * Progress toward a limit or target, with a track. Turns warning-coloured at
 * 80% and red when over (for budgets); `positive` keeps it in the given colour
 * (for savings goals, where more is good).
 */
export function ProgressBar({
  value,
  max,
  color,
  positive = false,
  className = "",
  label,
}: {
  value: number;
  max: number;
  color: string;
  positive?: boolean;
  className?: string;
  label: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  const fill = positive ? color : ratio > 1 ? "var(--accent)" : ratio >= 0.8 ? "#f59e0b" : color;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <motion.div
        className="h-full origin-left rounded-full"
        style={{ backgroundColor: fill, width: `${Math.min(ratio, 1) * 100}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      />
    </div>
  );
}

/** The big amount box used in every money form. */
export function AmountField({
  value,
  onChange,
  currency,
  label,
  sign,
  signClass = "text-muted",
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: string;
  label: string;
  sign?: string;
  signClass?: string;
  autoFocus?: boolean;
}) {
  const digits = currencyDigits(currency);
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-muted">{label}</span>
      <span className="flex items-baseline gap-2 rounded-2xl bg-surface px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_2px_var(--accent-text)]">
        <span className={`shrink-0 text-2xl whitespace-nowrap ${signClass}`} aria-hidden="true">
          {sign}
          {currencySymbol(currency)}
        </span>
        <input
          data-autofocus={autoFocus || undefined}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={(0).toFixed(digits)}
          className="w-full min-w-0 bg-transparent text-[2.5rem] leading-none font-semibold tracking-tight tabular-nums outline-none placeholder:text-muted/50"
        />
      </span>
    </label>
  );
}

/** Form error with a small shake, so it's noticed without a modal. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <motion.p
      key={message}
      role="alert"
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: [0, -6, 5, -3, 0] }}
      transition={{ duration: 0.35 }}
      className="mt-4 text-sm font-medium text-accent-text"
    >
      {message}
    </motion.p>
  );
}

/** A row of choice chips that scrolls sideways when it doesn't fit. */
export function ChipRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:-mx-7 lg:px-7">
      {children}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition active:scale-95 ${
        selected
          ? "bg-ink text-bg"
          : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

/** Screen title row: big display heading with optional actions on the right. */
export function ScreenHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <h1 className="min-w-0 truncate font-display text-[1.8rem] leading-none font-semibold min-[400px]:text-[2.15rem] lg:text-[2.75rem]">
        {title}
      </h1>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** Wraps a screen's main content with the shared padding (clear of the phone tab bar, add button and cat). */
export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      className={`mx-auto max-w-lg overflow-x-clip px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+10.5rem)] lg:px-10 lg:pt-10 lg:pb-16 ${
        wide ? "lg:max-w-6xl" : "lg:max-w-4xl"
      }`}
    >
      {children}
    </main>
  );
}
