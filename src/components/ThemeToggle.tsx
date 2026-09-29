import { AnimatePresence, motion } from "motion/react";
import { MonitorIcon, MoonIcon, SunIcon, type Icon } from "@phosphor-icons/react";
import { originOf, useTheme, type ThemeChoice } from "../lib/theme";

/** One-tap light/dark switch for tight spots (website nav, app sidebar). */
export function ThemeButton({ className = "" }: { className?: string }) {
  const { resolved, set } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={(e) => set(next, originOf(e))}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`relative grid size-10 place-items-center overflow-hidden rounded-full text-muted transition hover:bg-surface-2 hover:text-ink active:scale-90 ${className}`}
    >
      {/* The icon flips over like a tossed coin: sun on one face, moon on the other. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolved}
          style={{ transformPerspective: 240 }}
          initial={{ rotateY: -90, opacity: 0.4 }}
          animate={{ rotateY: 0, opacity: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ rotateY: 90, opacity: 0.4, transition: { duration: 0.14, ease: "easeIn" } }}
        >
          {resolved === "dark" ? <MoonIcon size={20} weight="duotone" /> : <SunIcon size={20} weight="duotone" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const OPTIONS: { value: ThemeChoice; label: string; icon: Icon }[] = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

/** Full System / Light / Dark choice, for Settings. */
export function ThemeSegmented() {
  const { choice, set } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
      {OPTIONS.map(({ value, label, icon: Glyph }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => set(value, originOf(e))}
            className={`relative flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="theme-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
              />
            )}
            <Glyph size={16} weight={active ? "fill" : "regular"} className="relative" aria-hidden="true" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
