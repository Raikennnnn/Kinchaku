import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { DevicesIcon, XIcon } from "@phosphor-icons/react";
import { getSetting, setSetting } from "../db";
import { EASE_OUT } from "../components/motion";
import { AuthSheet } from "./AuthSheet";
import { syncConfigured } from "./config";

/**
 * Home card inviting someone who has never signed in on this device to make
 * an account, until they do or close it.
 */
export function SyncPrompt() {
  const state = useLiveQuery(async () => ({
    // A device that has signed in before is either signed in or about to be.
    signedInBefore: !!(await getSetting<string>("sync:uid")),
    dismissed: (await getSetting<boolean>("syncPromptDismissed")) ?? false,
  }));
  const [auth, setAuth] = useState<"signin" | "signup" | null>(null);
  const show = syncConfigured && !!state && !state.signedInBefore && !state.dismissed;

  return (
    <>
      <AnimatePresence initial={false}>
        {show && (
          <motion.aside
            key="sync-prompt"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transition: { duration: 0.4, ease: EASE_OUT, delay: 0.3 } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
            className="overflow-hidden"
            aria-label="Sync across your devices"
          >
            <div className="relative mb-5 flex gap-3.5 rounded-2xl bg-surface p-4 pr-11 shadow-[inset_0_0_0_1px_var(--line)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
                <DevicesIcon size={20} weight="duotone" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">Use Kinchaku on your phone and computer</p>
                <p className="mt-0.5 text-muted">Make a free account to keep them in sync. What you've entered here comes with you.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setAuth("signup")} className="btn btn-primary btn-sm">
                    Create account
                  </button>
                  <button type="button" onClick={() => setAuth("signin")} className="btn btn-secondary btn-sm">
                    Sign in
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void setSetting("syncPromptDismissed", true)}
                aria-label="Not now"
                title="Not now. You can sign in from Settings any time."
                className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                <XIcon size={14} weight="bold" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <AuthSheet open={auth !== null} startIn={auth ?? "signin"} onClose={() => setAuth(null)} />
    </>
  );
}
