import { registerSW } from "virtual:pwa-register";
import { showToast } from "../components/Toast";

/**
 * Keeps installed copies (the Android app, iPhone home-screen app, desktop
 * install) on the latest version without interrupting anyone.
 *
 * The offline cache serves the version already on the phone and fetches a new
 * one in the background. The new one then takes over:
 * - right away if it arrives just after opening and nothing is being edited,
 * - otherwise the moment the app goes to the background (so it's current the
 *   next time it's opened), with a "Refresh" notice meanwhile.
 * It also looks for a new version whenever the app comes back to the
 * foreground, and every half hour while it's open.
 */
export function keepAppUpdated() {
  const openedAt = Date.now();
  let ready = false;

  const busy = () =>
    !!document.querySelector("dialog[open]") || !!document.activeElement?.matches("input, textarea, select, [contenteditable]");

  const apply = () => void updateSW(true);

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = true;
      if (document.visibilityState === "hidden") return apply();
      if (Date.now() - openedAt < 6000 && !busy()) return apply();
      showToast("New version ready", { label: "Refresh", run: apply });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && ready) apply();
        else if (document.visibilityState === "visible") check();
      });
      setInterval(check, 30 * 60_000);
    },
  });
}

/** The website has nothing to lose on a reload, so it just takes new versions. */
export function keepSiteUpdated() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => void updateSW(true),
  });
}
