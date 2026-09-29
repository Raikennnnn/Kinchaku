import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ArrowLeftIcon, ArrowRightIcon, ArrowsClockwiseIcon, ChartDonutIcon, CloudSlashIcon } from "@phosphor-icons/react";
import { setCurrency } from "../db";
import { CurrencyPicker } from "../components/CurrencyPicker";
import { EASE_OUT, RevealWords } from "../components/motion";

const POINTS = [
  { icon: ChartDonutIcon, title: "See where it goes", text: "Every expense sorted by category, month by month." },
  { icon: ArrowsClockwiseIcon, title: "Money in, money out", text: "What's left rolls into next month." },
  { icon: CloudSlashIcon, title: "Works offline", text: "Everything is saved on this device first." },
];

const step: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT, staggerChildren: 0.07, delayChildren: 0.1 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, transition: { duration: 0.2, ease: "easeIn" } }),
};
const item: Variants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

/**
 * First run, before anything else: a short introduction, then the one thing
 * the app needs, a currency. Sign-in joins this flow when sync arrives.
 */
export function Welcome() {
  const [stage, setStage] = useState<"intro" | "currency">("intro");
  const dir = stage === "currency" ? 1 : -1;

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl grid-cols-1 content-start gap-6 overflow-x-clip px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] lg:grid-cols-2 lg:content-center lg:gap-14 lg:px-10 lg:py-16">
      <BrandPanel compact={stage === "currency"} />

      <div className="relative lg:min-h-[560px]">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          {stage === "intro" ? (
            <motion.section
              key="intro"
              custom={dir}
              variants={step}
              initial="enter"
              animate="center"
              exit="exit"
              aria-label="About Kinchaku"
              className="lg:pt-6"
            >
              <ul className="space-y-5">
                {POINTS.map(({ icon: Glyph, title, text }) => (
                  <motion.li key={title} variants={item} className="flex gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-accent-text shadow-[inset_0_0_0_1px_var(--line)]">
                      <Glyph size={24} weight="duotone" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-muted">{text}</span>
                    </span>
                  </motion.li>
                ))}
              </ul>
              <motion.div variants={item} className="mt-10">
                <button type="button" onClick={() => setStage("currency")} className="btn btn-primary group w-full sm:w-auto">
                  Get started
                  <ArrowRightIcon
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </motion.div>
            </motion.section>
          ) : (
            <motion.section
              key="currency"
              custom={dir}
              variants={step}
              initial="enter"
              animate="center"
              exit="exit"
              aria-labelledby="currency-heading"
            >
              <motion.div variants={item}>
                <button
                  type="button"
                  onClick={() => setStage("intro")}
                  className="-ml-2 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted transition hover:text-ink"
                >
                  <ArrowLeftIcon size={16} weight="bold" aria-hidden="true" />
                  Back
                </button>
                <h2 id="currency-heading" className="mt-3 font-display text-3xl font-semibold">
                  Which currency do you spend in?
                </h2>
                <p className="mt-2 mb-5 text-muted">You can change this later in Settings.</p>
              </motion.div>
              <motion.div variants={item}>
                <CurrencyPicker onPick={setCurrency} stickyTop="top-[env(safe-area-inset-top)]" />
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

/** Indigo panel with the logo and greeting. On phones it shrinks once you move past the intro. */
function BrandPanel({ compact }: { compact: boolean }) {
  return (
    <motion.section
      layout
      transition={{ layout: { duration: 0.5, ease: EASE_OUT } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl bg-brand text-brand-ink lg:sticky lg:top-16 lg:self-start lg:p-10 ${
        compact ? "p-5" : "p-7"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(255_255_255/0.1),transparent_55%)]"
      />
      <motion.div layout="position" className={`relative flex ${compact ? "items-center gap-4 lg:block" : "flex-col"}`}>
        <motion.img
          layout
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt=""
          initial={{ scale: 0.5, rotate: -14, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className={`rounded-[18px] ring-1 ring-white/15 ${compact ? "size-12 lg:size-16" : "size-16"}`}
        />
        <RevealWords
          as="h1"
          text="Welcome to Kinchaku"
          delay={0.25}
          className={`font-display leading-[1.02] font-semibold text-balance lg:mt-8 lg:text-5xl ${
            compact ? "text-2xl" : "mt-8 text-[2.6rem]"
          }`}
        />
      </motion.div>
      <AnimatePresence initial={false}>
        {!compact && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transition: { delay: 0.5, duration: 0.6, ease: EASE_OUT } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
            className="relative mt-4 max-w-[34ch] overflow-hidden text-brand-muted lg:block"
          >
            Your monthly budget, sorted by category. A kinchaku is a Japanese drawstring purse.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
