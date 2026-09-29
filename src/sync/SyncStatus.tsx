import { motion } from "motion/react";
import { CloudArrowUpIcon, CloudCheckIcon, CloudSlashIcon, CloudWarningIcon, DeviceMobileIcon, type Icon } from "@phosphor-icons/react";
import { useSyncStatus, type SyncStatus } from "./store";

const plural = (n: number) => `${n} change${n === 1 ? "" : "s"}`;

/** One line about where syncing stands. */
export function statusText(s: SyncStatus): string {
  switch (s.phase) {
    case "starting":
      return "Getting your data…";
    case "syncing":
      return s.pending > 0 ? `Syncing ${plural(s.pending)}…` : "Syncing…";
    case "synced":
      return "Synced";
    case "offline":
      return s.pending > 0 ? `Offline. ${plural(s.pending)} will sync when you're back online` : "Offline. Changes will sync when you're back online";
    case "error":
      return s.error ?? "Couldn't sync. Trying again soon";
    default:
      return "Saved on this device";
  }
}

const ICONS: Record<SyncStatus["phase"], Icon> = {
  off: DeviceMobileIcon,
  starting: CloudArrowUpIcon,
  syncing: CloudArrowUpIcon,
  synced: CloudCheckIcon,
  offline: CloudSlashIcon,
  error: CloudWarningIcon,
};

/** The status icon; it bobs while data is moving. */
export function SyncIcon({ status, size = 20 }: { status: SyncStatus; size?: number }) {
  const Glyph = ICONS[status.phase];
  const moving = status.phase === "syncing" || status.phase === "starting";
  return (
    <motion.span
      className={`inline-grid place-items-center ${status.phase === "error" ? "text-accent-text" : status.phase === "synced" ? "text-positive" : ""}`}
      animate={moving ? { y: [0, -2.5, 0] } : { y: 0 }}
      transition={moving ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      aria-hidden="true"
    >
      <Glyph size={size} weight="duotone" />
    </motion.span>
  );
}

/** Header button showing the sync state; opens Settings. Hidden while signed out. */
export function SyncBadge({ onOpen }: { onOpen: () => void }) {
  const status = useSyncStatus();
  if (!status.user) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Account: ${statusText(status)}`}
      title={statusText(status)}
      className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink active:scale-90"
    >
      <SyncIcon status={status} size={22} />
    </button>
  );
}

/** Sidebar footer line: where the data is. */
export function SyncLine() {
  const status = useSyncStatus();
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      <SyncIcon status={status} size={14} />
      <span className="min-w-0">{statusText(status)}</span>
    </p>
  );
}
