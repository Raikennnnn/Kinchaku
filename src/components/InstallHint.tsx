import { useState } from "react";
import { ExportIcon, XIcon } from "@phosphor-icons/react";
import { detectPlatform, isInstalled, useInstallPrompt } from "../lib/install";

const DISMISSED_KEY = "kinchaku:install-hint-dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Suggests installing the app when it's open in a phone browser. Android and
 * desktop Chrome get a real Install button; iPhone gets the Share steps,
 * since Safari has no install prompt.
 */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => isInstalled() || wasDismissed());
  const install = useInstallPrompt();
  const ios = detectPlatform() === "ios";

  if (hidden || (!ios && !install)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: the hint just comes back next time.
    }
  };

  return (
    <aside className="mb-5 flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]">
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="size-10 shrink-0 rounded-[11px]" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Install Kinchaku</p>
        {ios ? (
          <p className="mt-0.5 text-muted">
            Tap <ExportIcon size={15} weight="bold" className="inline -translate-y-px" aria-label="Share" /> in
            Safari, then Add to Home Screen.
          </p>
        ) : (
          <p className="mt-0.5 text-muted">Open it like an app, even offline.</p>
        )}
      </div>
      {install && !ios && (
        <button type="button" onClick={install} className="btn btn-primary btn-sm">
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"
      >
        <XIcon size={16} weight="bold" />
      </button>
    </aside>
  );
}
