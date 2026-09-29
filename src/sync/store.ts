import { useSyncExternalStore } from "react";

export type SyncUser = { uid: string; email: string | null; name: string | null; photo: string | null; provider: "password" | "google" };

export type SyncStatus = {
  /** off: signed out. starting: signing in or first download. */
  phase: "off" | "starting" | "syncing" | "synced" | "offline" | "error";
  user: SyncUser | null;
  /** Changes on this device the account hasn't received yet. */
  pending: number;
  /** When this device last finished syncing, in ms. */
  lastSynced: number | null;
  error: string | null;
};

let status: SyncStatus = { phase: "off", user: null, pending: 0, lastSynced: null, error: null };
const listeners = new Set<() => void>();

export function setSyncStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}

export const getSyncStatus = () => status;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The account and sync state, for the header badge and Settings. */
export const useSyncStatus = () => useSyncExternalStore(subscribe, getSyncStatus);
