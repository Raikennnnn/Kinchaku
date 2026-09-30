import { useEffect, useRef, type ElementType, type ReactNode, useLayoutEffect } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { formatMoney } from "../lib/money";

/** The easing used everywhere: quick start, long soft landing. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: (stagger: number = 0.08) => ({ transition: { staggerChildren: stagger } }),
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_OUT } },
};

/** Parent for a group whose children (using staggerChild) enter one after another. */
export function Stagger({
  children,
  className,
  stagger = 0.08,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  as?: "div" | "ul" | "ol";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={staggerParent}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </Tag>
  );
}

const wordParent: Variants = {
  hidden: {},
  show: (delay: number = 0) => ({ transition: { staggerChildren: 0.055, delayChildren: delay } }),
};
const wordChild: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.9, ease: EASE_OUT } },
};

/**
 * A headline whose words rise out of their own line, one after another.
 * Screen readers get the plain sentence. `onView` waits until it scrolls in.
 */
export function RevealWords({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  onView = false,
  id,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  onView?: boolean;
  id?: string;
}) {
  const words = text.split(" ");
  const trigger = onView
    ? { whileInView: "show", viewport: { once: true, amount: 0.6 } }
    : { animate: "show" };
  return (
    <Tag className={className} id={id}>
      <span className="sr-only">{text}</span>
      <motion.span aria-hidden="true" variants={wordParent} custom={delay} initial="hidden" {...trigger}>
        {words.map((word, i) => (
          <span key={i}>
            {/* Clip each word so it appears to slide up from behind a baseline. */}
            <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
              <motion.span className="inline-block" variants={wordChild}>
                {word}
              </motion.span>
            </span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/**
 * One line (a big amount) that shrinks to fit its box instead of being cut
 * off: the font steps down just enough, never below `min` px. It re-measures
 * when the box resizes and when the text changes (AnimatedMoney counting up).
 */
export function FitText({ children, className = "", min = 18 }: { children: ReactNode; className?: string; min?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      if (el.scrollWidth <= el.clientWidth + 0.5) return;
      const base = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${Math.max(min, Math.floor(base * (el.clientWidth / el.scrollWidth) * 0.97))}px`;
    };
    fit();
    const resize = new ResizeObserver(fit);
    if (el.parentElement) resize.observe(el.parentElement);
    const text = new MutationObserver(fit);
    text.observe(el, { subtree: true, childList: true, characterData: true });
    return () => {
      resize.disconnect();
      text.disconnect();
    };
  }, [min]);
  return (
    <span ref={ref} className={`block min-w-0 overflow-hidden whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

/**
 * A money amount that rolls to its new value instead of jumping. Starts from
 * `from` (0 by default) on first show; `onView` waits until it's on screen.
 */
export function AnimatedMoney({
  value,
  currency,
  className,
  from = 0,
  onView = false,
}: {
  value: number;
  currency: string;
  className?: string;
  from?: number;
  onView?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const shown = useMotionValue(reduce ? value : from);
  const active = !onView || seen;

  useEffect(() => {
    if (!active) return;
    if (reduce) {
      shown.set(value);
      return;
    }
    const controls = animate(shown, value, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [active, reduce, shown, value]);

  // Write straight to the DOM: no React re-render per animation frame.
  useMotionValueEvent(shown, "change", (v) => {
    if (ref.current) ref.current.textContent = formatMoney(Math.round(v), currency);
  });

  return (
    <span ref={ref} className={className}>
      {formatMoney(reduce ? value : from, currency)}
    </span>
  );
}
