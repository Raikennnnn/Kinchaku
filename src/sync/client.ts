import { getSetting } from "../db";
import { syncConfigured } from "./config";

// Firebase is a large download, so it only loads for people who use an
// account: at startup when this device is signed in, or when the sign-in
// sheet opens. Everyone else gets the app without it.
type Engine = typeof import("./engine");
let engine: Promise<Engine> | null = null;

export function loadSync(): Promise<Engine> {
  engine ??= import("./engine").then(async (m) => {
    await m.start();
    return m;
  });
  return engine;
}

/** Marks that the page is about to leave for Google's sign-in, so it picks the result up on return. */
export const REDIRECT_FLAG = "kinchaku:auth-redirect";

/** Starts syncing on app start if this device is signed in (or just came back from signing in). */
export async function bootSync() {
  if (!syncConfigured) return;
  let returning = false;
  try {
    returning = sessionStorage.getItem(REDIRECT_FLAG) !== null;
  } catch {
    // Storage blocked: nothing to pick up.
  }
  if (returning || (await getSetting<string>("sync:uid"))) void loadSync();
}
