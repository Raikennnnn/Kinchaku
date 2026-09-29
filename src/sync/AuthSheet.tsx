import { useEffect, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircleIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { db, getSetting } from "../db";
import { Sheet } from "../components/Sheet";
import { FormError } from "../components/ui";
import { EASE_OUT } from "../components/motion";
import { loadSync } from "./client";
import { friendlyError } from "./errors";

type Mode = "signin" | "signup" | "reset";

const TITLES: Record<Mode, string> = { signin: "Sign in", signup: "Create account", reset: "Reset password" };
const MIN_PASSWORD = 8;

// After a few wrong passwords in a row, the form waits a little longer each
// time before trying again. Firebase also limits attempts on its side; this
// just stops the form from hammering it.
let failures = 0;
let waitUntil = 0;
const noteFailure = () => {
  failures++;
  if (failures >= 3) waitUntil = Date.now() + Math.min(60, 2 ** (failures - 2) * 5) * 1000;
};

/** Sign in, create an account, or get a password reset email. */
export function AuthSheet({ open, onClose, startIn = "signin" }: { open: boolean; onClose: () => void; startIn?: Mode }) {
  const [mode, setMode] = useState<Mode>(startIn);
  // Each opening starts where the button said: "Create account" or "Sign in".
  useEffect(() => {
    if (open) setMode(startIn);
  }, [open, startIn]);
  const close = onClose;
  return (
    <Sheet open={open} title={TITLES[mode]} onClose={close}>
      <AuthForm mode={mode} setMode={setMode} onDone={close} />
    </Sheet>
  );
}

function AuthForm({ mode, setMode, onDone }: { mode: Mode; setMode: (m: Mode) => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  // What's on this device before its first sign-in goes up to the account, so say so.
  const localEntries = useLiveQuery(async () =>
    (await getSetting<string>("sync:uid")) ? 0 : db.transactions.filter((t) => !t.deleted).count(),
  );

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setResetSent(false);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    const wait = Math.ceil((waitUntil - Date.now()) / 1000);
    if (wait > 0 && mode === "signin") {
      setError(`Too many tries. Wait ${wait} second${wait === 1 ? "" : "s"}, then try again.`);
      return;
    }
    setBusy("email");
    try {
      const sync = await loadSync();
      if (mode === "reset") {
        await sync.sendReset(email);
        setResetSent(true);
      } else {
        await (mode === "signup" ? sync.signUpWithEmail(email, password) : sync.signInWithEmail(email, password));
        failures = 0;
        onDone();
      }
    } catch (err) {
      if (mode === "signin") noteFailure();
      setError(friendlyError(err) || null);
    } finally {
      setBusy(null);
    }
  }

  async function google() {
    setError(null);
    setBusy("google");
    try {
      const sync = await loadSync();
      await sync.signInWithGoogle();
      onDone(); // on phones the page has already gone to Google by now
    } catch (err) {
      setError(friendlyError(err) || null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={mode}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
        exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      >
        <p className="mb-5 text-muted">
          {mode === "reset"
            ? "Enter the email you signed up with and we'll send you a link to choose a new password."
            : "One account keeps your phone and computer in step. Everything still works offline and syncs when you're back online."}
          {mode !== "reset" && !!localEntries && (
            <span className="mt-2 block text-sm">
              The {localEntries} entr{localEntries === 1 ? "y" : "ies"} already on this device will be added to the account.
            </span>
          )}
        </p>

        {mode !== "reset" && (
          <>
            <button type="button" onClick={google} disabled={busy !== null} className="btn btn-secondary w-full">
              <GoogleMark />
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
            <div className="my-5 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              or with email
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        {resetSent ? (
          <p className="flex items-start gap-2.5 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]" role="status">
            <CheckCircleIcon size={22} weight="fill" className="shrink-0 text-positive" aria-hidden="true" />
            <span>
              If there's an account for <strong className="font-semibold">{email.trim()}</strong>, a reset link is on its way. Check your
              inbox and spam folder.
            </span>
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                className="field"
              />
            </label>
            {mode !== "reset" && (
              <label className="block">
                <span className="mb-2 flex items-baseline justify-between text-sm font-medium text-muted">
                  Password
                  {mode === "signup" && <span className="text-xs font-normal">At least {MIN_PASSWORD} characters</span>}
                </span>
                <span className="relative block">
                  <input
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    minLength={mode === "signup" ? MIN_PASSWORD : undefined}
                    className="field pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                    className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-full text-muted transition hover:text-ink"
                  >
                    {show ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </span>
              </label>
            )}
            <button type="submit" disabled={busy !== null} className="btn btn-primary w-full">
              {busy === "email" ? "One moment…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
            </button>
          </form>
        )}

        <FormError message={error} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          {mode === "signin" && (
            <>
              <button type="button" onClick={() => switchTo("signup")} className="font-medium text-accent-text hover:underline">
                New here? Create an account
              </button>
              <button type="button" onClick={() => switchTo("reset")} className="text-muted hover:text-ink">
                Forgot password?
              </button>
            </>
          )}
          {mode === "signup" && (
            <button type="button" onClick={() => switchTo("signin")} className="font-medium text-accent-text hover:underline">
              Already have an account? Sign in
            </button>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => switchTo("signin")} className="font-medium text-accent-text hover:underline">
              Back to sign in
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Google's "G", in its own colours as their brand rules ask. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
