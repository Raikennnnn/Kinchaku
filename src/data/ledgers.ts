import { db, DEFAULT_LEDGER_ID, getSetting, setSetting, stamp, type Ledger } from "../db";
import type { PresetIconName } from "../icons";

export const listLedgers = () => db.ledgers.orderBy("order").filter((l) => !l.deleted).toArray();

/** The ledger being viewed; falls back to Personal if the saved one is gone. */
export async function getActiveLedgerId(): Promise<string> {
  const saved = await getSetting<string>("ledger");
  if (saved) {
    const ledger = await db.ledgers.get(saved);
    if (ledger && !ledger.deleted) return saved;
  }
  const first = (await listLedgers())[0];
  return first?.id ?? DEFAULT_LEDGER_ID;
}

export const setActiveLedger = (id: string) => setSetting("ledger", id);

export type LedgerInput = Pick<Ledger, "name" | "icon" | "color">;

/** Adds a ledger with its own Cash account, and returns its id. */
export async function addLedger(input: LedgerInput): Promise<string> {
  const last = await db.ledgers.orderBy("order").last();
  const ledger: Ledger = { ...input, ...stamp(), order: (last?.order ?? -1) + 1 };
  await db.transaction("rw", db.ledgers, db.accounts, async () => {
    await db.ledgers.add(ledger);
    await db.accounts.add({
      ...stamp(),
      ledgerId: ledger.id,
      name: "Cash",
      type: "cash",
      icon: { kind: "preset", name: "wallet" as PresetIconName },
      color: "#22c55e",
      opening: 0,
      order: 0,
    });
  });
  return ledger.id;
}

export const updateLedger = (id: string, input: LedgerInput) =>
  db.ledgers.update(id, { ...input, updatedAt: Date.now() });

/** Hides a ledger. Refuses to remove the last one. */
export async function deleteLedger(id: string): Promise<boolean> {
  const ledgers = await listLedgers();
  if (ledgers.length <= 1) return false;
  await db.ledgers.update(id, { deleted: true, updatedAt: Date.now() });
  if ((await getSetting<string>("ledger")) === id) {
    await setActiveLedger(ledgers.find((l) => l.id !== id)!.id);
  }
  return true;
}
