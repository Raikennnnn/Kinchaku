import { useEffect, useState } from "react";

export type KeyboardFit = {
  /** Where the visible area starts, from the top of the page's layout, in px. */
  top: number;
  /** Height still visible above the keyboard, in px. */
  height: number;
};

// Smaller changes are browser toolbars sliding in and out, not a keyboard.
const MIN_KEYBOARD = 120;

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  return el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "range", "color", "file"].includes((el as HTMLInputElement).type);
};

/**
 * Phones: whether the on-screen keyboard is open, and how much room is left
 * above it, so a sheet can sit on top of it with its input in view.
 *
 * Browsers differ in what they report (iPhone Safari shrinks innerHeight with
 * the keyboard, Android Chrome doesn't), but all of them shrink the visible
 * area, the visual viewport. So the keyboard counts as open when something is
 * being typed into and the visible area is well below the tallest it has been
 * at this width, and callers place things by the visible area's own top and
 * height, which mean the same everywhere.
 */
export function useKeyboardFit(active: boolean): KeyboardFit | null {
  const [fit, setFit] = useState<KeyboardFit | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) {
      setFit(null);
      return;
    }
    let width = window.innerWidth;
    let tallest = vv.height;
    const update = () => {
      if (window.innerWidth !== width) {
        // Turned sideways: start measuring again.
        width = window.innerWidth;
        tallest = vv.height;
      }
      tallest = Math.max(tallest, vv.height);
      const open = isTyping() && tallest - vv.height >= MIN_KEYBOARD;
      if (!open) return setFit(null);
      const top = Math.round(vv.offsetTop);
      const height = Math.round(vv.height);
      setFit((f) => (f && f.top === top && f.height === height ? f : { top, height }));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    // Focus moves before the keyboard finishes animating; check again after.
    const onFocus = () => {
      update();
      setTimeout(update, 350);
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
    };
  }, [active]);

  return fit;
}
