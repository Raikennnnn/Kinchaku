import { useEffect, useState } from "react";
import { useMediaQuery } from "./media";

export type ThemeChoice = "system" | "light" | "dark";

const KEY = "kinchaku:theme";
const THEME_COLORS = { light: "#f4f4f1", dark: "#0e1014" };

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);

  // Keep the browser chrome (status bar, address bar) in step with the page.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const systemColor = meta.media.includes("dark") ? THEME_COLORS.dark : THEME_COLORS.light;
    meta.content = choice === "system" ? systemColor : THEME_COLORS[choice];
  }
}

/**
 * Keyframes for the "noren" reveal: the new theme drops in as vertical panels,
 * like the split curtain hung over a Japanese shop door. Panels fall one after
 * another, starting from the one under the tapped button, each with a slight
 * sway at its hem. Drawn as one clip-path polygon, so it's a single animation.
 */
function norenKeyframes(originX: number) {
  const panels = window.innerWidth < 640 ? 4 : 6;
  const first = Math.min(panels - 1, Math.max(0, Math.floor((originX / window.innerWidth) * panels)));
  const stagger = 0.07; // seconds between panels
  const fall = 0.5; // seconds for one panel to drop
  const total = stagger * Math.max(first, panels - 1 - first) + fall;
  const steps = 48;
  const ease = (t: number) => 1 - (1 - t) ** 3;

  const frames: Keyframe[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * total;
    const points = ["0% 0%"];
    for (let i = 0; i < panels; i++) {
      const p = Math.min(1, Math.max(0, (t - Math.abs(i - first) * stagger) / fall));
      const hem = ease(p) * 100;
      // The hem tilts while falling and settles flat; panels sway away from the start.
      const sway = Math.sin(p * Math.PI) * 2.5 * (i < first ? -1 : 1);
      points.push(`${(i / panels) * 100}% ${hem - sway}%`, `${((i + 1) / panels) * 100}% ${hem + sway}%`);
    }
    points.push("100% 0%");
    frames.push({ clipPath: `polygon(${points.join(", ")})` });
  }
  return { frames, duration: total * 1000 };
}

/**
 * Switches theme with the noren reveal, starting at `origin` (the button that
 * was tapped). Falls back to an instant switch where View Transitions aren't
 * supported or motion is reduced.
 */
function switchTheme(choice: ThemeChoice, origin?: { x: number; y: number }) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) {
    applyTheme(choice);
    return;
  }
  const { frames, duration } = norenKeyframes(origin?.x ?? window.innerWidth / 2);
  const transition = document.startViewTransition(() => applyTheme(choice));
  void transition.ready.then(() => {
    // Easing is baked into the frames (each panel has its own), so play them linearly.
    document.documentElement.animate(frames, {
      duration,
      easing: "linear",
      pseudoElement: "::view-transition-new(root)",
    });
  });
}

/**
 * The user's theme choice, the theme actually showing, and a setter. Shared
 * by the website and the app (same origin, same storage key), and kept in
 * sync across open tabs.
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const resolved: "light" | "dark" = choice === "system" ? (systemDark ? "dark" : "light") : choice;

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const next = readTheme();
      setChoice(next);
      applyTheme(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const set = (next: ThemeChoice, origin?: { x: number; y: number }) => {
    setChoice(next);
    switchTheme(next, origin);
  };

  return { choice, resolved, set };
}

/** Centre of the element that was clicked, for the reveal's starting point. */
export function originOf(e: { currentTarget: Element }) {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
