import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";

// One short notice at a time ("Entry deleted · Undo"). It sits at the top on
// phones, clear of the tab bar, the add button and the cat, and at the bottom
// centre on desktops.

type Toast = { id: number; text: string; action?: { label: string; run: () => void } };

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(text: string, action?: Toast["action"]) {
  current = { id: nextId++, text, action };
  emit();
}

const dismiss = (id: number) => {
  if (current?.id === id) {
    current = null;
    emit();
  }
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function Toaster() {
  const toast = useSyncExternalStore(subscribe, () => current);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center px-4 lg:top-auto lg:bottom-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 480, damping: 34 }}
            className="pointer-events-auto flex items-center gap-4 rounded-full bg-ink py-2 pr-2 pl-5 text-sm text-bg shadow-[0_12px_32px_-12px_rgb(10_14_30/0.6)]"
          >
            <span>{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.run();
                  dismiss(toast.id);
                }}
                className="rounded-full bg-bg/15 px-4 py-1.5 font-semibold transition hover:bg-bg/25"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
