import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so check for touch too.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** True when running as an installed app (Home Screen on iPhone, installed PWA elsewhere). */
export function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Chrome and Edge fire beforeinstallprompt when the app can be installed.
 * Returns a function that shows the browser's install dialog, or null when
 * that isn't available (iPhone, Firefox, or already installed).
 */
export function useInstallPrompt(): (() => Promise<void>) | null {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!event) return null;
  return async () => {
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };
}
