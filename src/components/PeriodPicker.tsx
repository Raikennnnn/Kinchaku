import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { monthLabel, monthOf, monthShort, shiftMonth, startOfWeek, today } from "../lib/dates";
import { isCurrentPeriod, periodLabel, periodRange, shiftPeriod, type Period, type PeriodKind } from "../lib/period";
import { CalendarGrid } from "./Calendar";
import { EASE_OUT } from "./motion";
import { Sheet } from "./Sheet";

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: "day", label: "Day" },
  { kind: "week", label: "Week" },
  { kind: "month", label: "Month" },
  { kind: "year", label: "Year" },
];

/**
 * The screen title for a period, with arrows to step through it and a tap to
 * open the picker. The title slides in the direction you're moving.
 */
export function PeriodNav({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState(0);
  const step = (by: number) => {
    setDir(by);
    onChange(shiftPeriod(period, by));
  };
  const label = periodLabel(period);
  const [main, rest] = period.kind === "month" ? label.split(" ") : [label, ""];

  return (
    <div className="flex items-end justify-between gap-3">
      <h1 className="min-w-0 leading-none">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${label}. Change period`}
          className="flex max-w-full items-center gap-2 overflow-hidden text-left"
        >
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.span
              key={`${period.kind}-${period.anchor}`}
              initial={{ opacity: 0, y: dir >= 0 ? "60%" : "-60%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dir >= 0 ? "-60%" : "60%" }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="block pb-1 font-display text-[1.55rem] leading-tight font-semibold min-[360px]:text-[1.8rem] min-[400px]:text-[2.15rem] lg:text-[2.75rem]"
            >
              {main} {rest && <span className="text-muted">{rest}</span>}
            </motion.span>
          </AnimatePresence>
          <CaretDownIcon size={18} weight="bold" className="mb-1 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </h1>
      <div className="flex shrink-0 rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous"
          className="grid size-10 place-items-center rounded-full transition hover:bg-surface-2 active:scale-90"
        >
          <CaretLeftIcon size={18} weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next"
          className="grid size-10 place-items-center rounded-full transition hover:bg-surface-2 active:scale-90"
        >
          <CaretRightIcon size={18} weight="bold" />
        </button>
      </div>

      <PeriodSheet
        open={open}
        period={period}
        onClose={() => setOpen(false)}
        onPick={(p) => {
          setDir(p.anchor >= period.anchor ? 1 : -1);
          onChange(p);
          setOpen(false);
        }}
      />
    </div>
  );
}

function PeriodSheet({
  open,
  period,
  onClose,
  onPick,
}: {
  open: boolean;
  period: Period;
  onClose: () => void;
  onPick: (p: Period) => void;
}) {
  return (
    <Sheet open={open} title="Show" onClose={onClose}>
      <PeriodChooser period={period} onPick={onPick} />
    </Sheet>
  );
}

/** The picker's contents; mounted fresh each time the sheet opens. */
function PeriodChooser({ period, onPick }: { period: Period; onPick: (p: Period) => void }) {
  const [kind, setKind] = useState<PeriodKind>(period.kind);
  const [viewMonth, setViewMonth] = useState(monthOf(period.anchor));
  const [viewYear, setViewYear] = useState(Number(period.anchor.slice(0, 4)));
  const now = today();
  const selected = periodRange(period);

  return (
    <>
      <div role="tablist" aria-label="Period" className="grid grid-cols-4 gap-1 rounded-full bg-surface-2 p-1">
        {KINDS.map(({ kind: k, label }) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`relative rounded-full py-2 text-sm font-medium transition ${kind === k ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {kind === k && (
              <motion.span
                layoutId="period-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-[330px]">
        {(kind === "day" || kind === "week") && (
          <>
            <Stepper label={monthLabel(viewMonth)} onStep={(by) => setViewMonth(shiftMonth(viewMonth, by))} />
            <CalendarGrid
              month={viewMonth}
              label={`Pick a ${kind}`}
              renderDay={(d, inMonth) => {
                const inSelection =
                  period.kind === kind &&
                  (kind === "day" ? d === period.anchor : startOfWeek(d) === startOfWeek(period.anchor));
                return (
                  <button
                    type="button"
                    onClick={() => onPick({ kind, anchor: d })}
                    aria-pressed={inSelection}
                    className={`grid aspect-square w-full place-items-center rounded-xl text-sm tabular-nums transition active:scale-90 ${
                      inSelection
                        ? "bg-ink font-semibold text-bg"
                        : `${inMonth ? "" : "text-muted/60"} hover:bg-surface-2 ${d === now ? "font-semibold text-accent-text" : ""}`
                    }`}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              }}
            />
          </>
        )}

        {kind === "month" && (
          <>
            <Stepper label={String(viewYear)} onStep={(by) => setViewYear(viewYear + by)} />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const m = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
                const isSelected = period.kind === "month" && monthOf(period.anchor) === m;
                const isNow = monthOf(now) === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onPick({ kind: "month", anchor: `${m}-01` })}
                    aria-pressed={isSelected}
                    className={`rounded-full py-3 text-sm font-medium transition active:scale-95 ${
                      isSelected
                        ? "bg-ink text-bg"
                        : `bg-surface shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2 ${isNow ? "text-accent-text" : ""}`
                    }`}
                  >
                    {monthShort(m)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {kind === "year" && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => Number(now.slice(0, 4)) - 6 + i).map((y) => {
              const isSelected = period.kind === "year" && selected.start.startsWith(String(y));
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => onPick({ kind: "year", anchor: `${y}-01-01` })}
                  aria-pressed={isSelected}
                  className={`rounded-full py-3 text-sm font-medium tabular-nums transition active:scale-95 ${
                    isSelected ? "bg-ink text-bg" : "bg-surface shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2"
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!(kind === period.kind && isCurrentPeriod(period)) ? (
        <button type="button" onClick={() => onPick({ kind, anchor: now })} className="btn btn-secondary mt-4 w-full">
          {kind === "day" ? "Today" : `This ${kind}`}
        </button>
      ) : null}
    </>
  );
}

function Stepper({ label, onStep }: { label: string; onStep: (by: number) => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <button type="button" onClick={() => onStep(-1)} aria-label="Previous" className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
        <CaretLeftIcon size={16} weight="bold" />
      </button>
      <span className="font-semibold">{label}</span>
      <button type="button" onClick={() => onStep(1)} aria-label="Next" className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
        <CaretRightIcon size={16} weight="bold" />
      </button>
    </div>
  );
}
