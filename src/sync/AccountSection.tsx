import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowsClockwiseIcon, EnvelopeSimpleIcon, SignOutIcon, TrashIcon } from "@phosphor-icons/react";
import { EASE_OUT } from "../components/motion";
import { AuthSheet } from "./AuthSheet";
import { loadSync } from "./client";
import { friendlyError } from "./errors";
import { syncConfigured } from "./config";
import { useSyncStatus } from "./store";
import { statusText, SyncIcon } from "./SyncStatus";

const card = "rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]";

/** Settings: sign in to sync, or who's signed in and how syncing is going. */
export function AccountSection() {
  const status = useSyncStatus();
  const [signingIn, setSigningIn] = useState(false);
  const [confirm, setConfirm] = useState<"signout" | "delete" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  if (!syncConfigured) return null;

  const user = status.user;
  return (
    <section className="mb-6" aria-labelledby="account-heading">
      <h3 id="account-heading" className="mb-2 text-sm font-medium text-muted">
        Account
      </h3>
      {!user ? (
        <div className={card}>
          <p className="flex items-center gap-2 font-semibold">
            <ArrowsClockwiseIcon size={20} weight="duotone" className="text-accent-text" aria-hidden="true" />
            Sync across your devices
          </p>
          <p className="mt-1 text-sm text-muted">
            Sign in on your phone and computer to see the same entries on both. It still works offline and catches up when you're back online.
          </p>
          <button type="button" onClick={() => setSigningIn(true)} className="btn btn-primary btn-sm mt-4">
            Sign in or create account
          </button>
          {status.error && <p className="mt-3 text-sm text-accent-text">{status.error}</p>}
        </div>
      ) : (
        <div className={card}>
          <div className="flex items-center gap-3">
            <Avatar name={user.name ?? user.email ?? "?"} photo={user.photo} />
            <div className="min-w-0 flex-1">
              {user.name && <p className="font-semibold wrap-break-word">{user.name}</p>}
              <p className={`wrap-anywhere ${user.name ? "text-sm text-muted" : "font-semibold"}`}>{user.email}</p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm" role="status">
            <SyncIcon status={status} size={18} />
            <span className="text-muted">{statusText(status)}</span>
          </p>
          {user.provider === "password" && !user.verified && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm">
              <EnvelopeSimpleIcon size={18} weight="duotone" className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
              <span>
                Check your inbox to confirm your email. It's how you'll get back in if you forget your password.{" "}
                {resent ? (
                  <span className="text-muted">Sent again.</span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await (await loadSync()).resendVerification();
                        setResent(true);
                      } catch (e) {
                        setProblem(friendlyError(e) || null);
                      }
                    }}
                    className="font-medium text-accent-text hover:underline"
                  >
                    Send it again
                  </button>
                )}
              </span>
            </p>
          )}

          <AnimatePresence initial={false} mode="wait">
            {confirm === "signout" ? (
              <motion.div
                key="signout"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto", transition: { duration: 0.3, ease: EASE_OUT } }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                className="overflow-hidden"
              >
                <p className="mt-4 text-sm">
                  {status.pending > 0 ? (
                    <strong className="font-semibold text-accent-text">
                      {status.pending} change{status.pending === 1 ? " on this device hasn't" : "s on this device haven't"} synced yet and
                      will be lost.{" "}
                    </strong>
                  ) : null}
                  Your data stays in your account. Signing out removes this device's copy until you sign in again.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={leaving}
                    onClick={async () => {
                      setLeaving(true);
                      await (await loadSync()).signOutAndClear();
                    }}
                    className="btn btn-sm bg-accent text-white"
                  >
                    {leaving ? "Signing out…" : "Sign out"}
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : confirm === "delete" ? (
              <motion.div
                key="delete"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto", transition: { duration: 0.3, ease: EASE_OUT } }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                className="overflow-hidden"
              >
                <p className="mt-4 text-sm">
                  <strong className="font-semibold text-accent-text">
                    This permanently deletes your account and everything synced to it, on every device.
                  </strong>{" "}
                  It can't be undone. Export a backup first (More, then Backup &amp; export) if you want a copy.
                </p>
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-sm text-muted">
                    Type <strong className="font-semibold text-ink">DELETE</strong> to confirm
                  </span>
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" className="field" />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={leaving || typed.trim() !== "DELETE"}
                    onClick={async () => {
                      setLeaving(true);
                      setProblem(null);
                      try {
                        await (await loadSync()).deleteAccount();
                      } catch (e) {
                        setProblem(friendlyError(e) || null);
                        setLeaving(false);
                      }
                    }}
                    className="btn btn-sm bg-accent text-white disabled:opacity-50"
                  >
                    {leaving ? "Deleting…" : "Delete account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirm(null);
                      setTyped("");
                      setProblem(null);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="mt-4 flex flex-wrap items-center justify-between gap-2"
              >
                <button type="button" onClick={() => setConfirm("signout")} className="btn btn-secondary btn-sm">
                  <SignOutIcon size={16} weight="bold" aria-hidden="true" />
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm("delete")}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted transition hover:text-accent-text"
                >
                  <TrashIcon size={15} aria-hidden="true" />
                  Delete account
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {problem && user && (
        <p role="alert" className="mt-3 text-sm font-medium text-accent-text">
          {problem}
        </p>
      )}
      <AuthSheet open={signingIn} onClose={() => setSigningIn(false)} />
    </section>
  );
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) {
    return <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="size-11 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand font-display text-lg font-semibold text-brand-ink" aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
