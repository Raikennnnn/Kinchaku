import { useEffect, useState } from "react";

export type KeyboardFit = {
  /** Space the on-screen keyboard takes at the bottom of the layout viewport, in px. */
  inset: number;
  /** Height still visible above the keyboard, in px. */
  height: number;
};

// Smaller gaps are browser toolbars sliding in and out, not a keyboard.
const MIN_KEYBOARD = 120;

/**
 * Phones: the on-screen keyboard covers the bottom of the screen without
 * resizing the page (iOS always, Android Chrome by default), so anything
 * pinned to the bottom, like a sheet's input, ends up hidden behind it. This
 * follows the visible area (the visual viewport) and returns how much the
 * keyboard covers, or null while it's closed, so the sheet can sit above it.
 */
export function useKeyboardFit(active: boolean): KeyboardFit | null {
  const [fit, setFit] = useState<KeyboardFit | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) {
      setFit(null);
      return;
    }
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setFit(inset >= MIN_KEYBOARD ? { inset, height: Math.round(vv.height) } : null);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return fit;
}
