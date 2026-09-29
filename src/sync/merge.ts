import { db, getSetting, setSetting, SYNCED_SETTINGS, SYNCED_TABLES, syncTransaction, type SyncedTable } from "../db";
import { cleanRecord, cleanSetting } from "../data/validate";

// How this device's records meet the account's. Kept apart from Firebase so
// the rules can be tested without it.

export type RemoteTable = SyncedTable | "settings";
export const REMOTE_TABLES: RemoteTable[] = [...SYNCED_TABLES, "settings"];

type Row = Record<string, unknown> & { updatedAt?: number; _dirty?: 0 | 1 };

/** Settings are keyed by name; every other record by id. */
export const keyOf = (table: RemoteTable, row: Row) => String(table === "settings" ? row.key : row.id);

/** A record as the account stores it: without this device's marks. */
export function toRemote(row: Row): Row {
  const { _dirty: _, ...rest } = row;
  return rest;
}

/** Local changes the account hasn't received yet. */
export async function collectDirty(table: RemoteTable): Promise<Row[]> {
  const rows = (await db.table(table).where("_dirty").equals(1).toArray()) as Row[];
  return table === "settings" ? rows.filter((r) => SYNCED_SETTINGS.includes(String(r.key))) : rows;
}

/** How many changes are waiting to go up, across every table. */
export async function pendingCount(): Promise<number> {
  let n = 0;
  for (const table of REMOTE_TABLES) n += await db.table(table).where("_dirty").equals(1).count();
  return n;
}

/** After an upload: clears the mark on records that haven't been edited again since. */
export async function markSynced(table: RemoteTable, sent: Row[]) {
  await syncTransaction([table], async () => {
    const t = db.table(table);
    for (const row of sent) {
      const key = keyOf(table, row);
      const current = (await t.get(key)) as Row | undefined;
      if (current?._dirty && current.updatedAt === row.updatedAt) await t.update(key, { _dirty: 0 });
    }
  });
}

/**
 * Takes records from the account. The newer edit wins; on a tie this device's
 * copy stays if it's waiting to go up (it's the same edit or a later one).
 * `preferRemote` lets the account win outright: used for settings the first
 * time a device signs in, so a new phone takes on the account's currency.
 * Returns how many records changed here.
 */
export async function applyRemote(table: RemoteTable, rows: Row[], preferRemote = false): Promise<number> {
  let changed = 0;
  await syncTransaction([table], async () => {
    const t = db.table(table);
    for (const raw of rows) {
      // Anything signed in as this person could have written it: check it like a backup file.
      const row = (table === "settings" ? cleanSetting(raw) : cleanRecord(table, raw)) as Row | null;
      if (!row) continue;
      const local = (await t.get(keyOf(table, row))) as Row | undefined;
      const remoteAt = Number(row.updatedAt ?? 0);
      const localAt = Number(local?.updatedAt ?? 0);
      const take = !local || (preferRemote && remoteAt !== localAt) || remoteAt > localAt;
      if (!take) continue;
      await t.put({ ...row, _dirty: 0 });
      changed++;
    }
  });
  return changed;
}

/** Up to when (server time, ms) this device has read each table from the account. */
const cursorKey = (table: RemoteTable) => `sync:cursor:${table}`;
export const getCursor = async (table: RemoteTable) => (await getSetting<number>(cursorKey(table))) ?? 0;
export async function advanceCursor(table: RemoteTable, ms: number) {
  if (ms > (await getCursor(table))) await setSetting(cursorKey(table), ms);
}

/** The account this device's data belongs to. */
export const getOwner = () => getSetting<string>("sync:uid");
export const setOwner = (uid: string) => setSetting("sync:uid", uid);

/** Removes everything stored on this device (used when signing out). */
export async function clearDevice() {
  await db.delete();
}
