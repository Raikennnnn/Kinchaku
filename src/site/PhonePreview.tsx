import { useMemo } from "react";
import { motion } from "motion/react";
import { GearSixIcon, PlusIcon } from "@phosphor-icons/react";
import { BalanceSummary } from "../components/BalanceSummary";
import { Brand } from "../components/Brand";
import { EASE_OUT } from "../components/motion";
import { TransactionList } from "../components/TransactionList";
import { monthName, monthOf, today } from "../lib/dates";
import { summarize } from "../lib/summary";
import { SAMPLE_CURRENCY, SAMPLE_TRANSACTIONS, sampleCategory } from "./sample";

/**
 * The app's real overview components, rendered with example data inside a
 * phone outline. Inert, so it can't be focused or clicked. Plays the same
 * entrance the app does: the balance counts up, the bar grows, rows follow.
 */
export function PhonePreview() {
  const month = monthOf(today());
  const s = useMemo(() => summarize(SAMPLE_TRANSACTIONS, sampleCategory), []);

  return (
    <figure className="w-[300px] rounded-[46px] bg-surface p-2 shadow-[0_40px_80px_-30px_rgb(15_20_45/0.55),inset_0_0_0_1px_var(--line)]">
      <div inert className="relative h-[610px] overflow-hidden rounded-[38px] bg-bg">
        {/* Rendered at a real phone width, then scaled to fit the outline. */}
        <div className="w-[356px] [zoom:0.8]">
          <div className="flex items-center justify-between px-4 pt-6 pb-1">
            <Brand size={26} />
            <GearSixIcon size={22} weight="duotone" className="text-muted" />
          </div>
          <div className="px-4 pt-4">
            <p className="font-display text-[2.15rem] leading-none font-semibold">{monthName(month)}</p>
            <div className="mt-5">
              <BalanceSummary
                phrase={`in ${monthName(month)}`}
                income={s.income}
                expense={s.expense}
                slices={s.expenseSlices}
                currency={SAMPLE_CURRENCY}
                onView
              />
            </div>
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.9, ease: EASE_OUT }}
            >
              <TransactionList days={s.days.slice(0, 2)} currency={SAMPLE_CURRENCY} categoryOf={sampleCategory} />
            </motion.div>
          </div>
        </div>
        <motion.span
          className="absolute right-4 bottom-4 grid size-12 place-items-center rounded-full bg-accent text-white shadow-[0_10px_24px_-8px_rgb(199_59_37/0.6)]"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 1.3 }}
        >
          <PlusIcon size={22} weight="bold" />
        </motion.span>
      </div>
      <figcaption className="sr-only">Example of the Kinchaku overview screen, with sample entries</figcaption>
    </figure>
  );
}
