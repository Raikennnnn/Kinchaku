import { useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircleIcon, DownloadSimpleIcon, FileCsvIcon, FileArrowUpIcon, ShieldCheckIcon, WarningCircleIcon, type Icon } from "@phosphor-icons/react";
import { exportBackup, exportCsv, importBackup, importCsv } from "../data/backup";
import { listLedgers } from "../data/ledgers";
import { getSetting } from "../db";
import { addDays, dayLabel, today } from "../lib/dates";
import { readFile, saveFile } from "../lib/download";
import { useCurrency, useLedgerId } from "../state";
import { Screen, ScreenHeader } from "../components/ui";

type Notice = { ok: boolean; text: string } | null;

/** Get data out (spreadsheet, full backup) and back in (restore, import from another app). */
export function Backup() {
  const ledgerId = useLedgerId();
  const currency = useCurrency();
  const ledgers = useLiveQuery(listLedgers, []);
  const lastBackup = useLiveQuery(() => getSetting<string>("lastBackup"), []);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const ledgerName = ledgers?.find((l) => l.id === ledgerId)?.name ?? "Kinchaku";
  const stale = !lastBackup || lastBackup < addDays(today(), -30);

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setNotice(null);
    try {
      setNotice({ ok: true, text: await task() });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Backup & export" />
      <p className="mt-3 max-w-[52ch] text-muted">
        Your data lives on this device. Keep a backup file somewhere safe, like your email or Google Drive, so a lost
        phone doesn't mean lost records.
      </p>

      <div className={`mt-6 flex items-start gap-3 rounded-2xl p-4 text-sm ${stale ? "bg-[#f59e0b]/12" : "bg-surface shadow-[inset_0_0_0_1px_var(--line)]"}`}>
        {stale ? (
          <WarningCircleIcon size={20} weight="fill" className="shrink-0 text-[#d97706]" aria-hidden="true" />
        ) : (
          <ShieldCheckIcon size={20} weight="fill" className="shrink-0 text-positive" aria-hidden="true" />
        )}
        <p>
          {lastBackup ? `Last backup: ${dayLabel(lastBackup)}.` : "You haven't made a backup yet."}
          {stale && " It's a good time to make one."}
        </p>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 flex items-start gap-2 rounded-2xl p-4 text-sm font-medium ${notice.ok ? "bg-positive/10 text-positive" : "bg-accent/10 text-accent-text"}`}
          >
            {notice.ok ? <CheckCircleIcon size={18} weight="fill" aria-hidden="true" /> : <WarningCircleIcon size={18} weight="fill" aria-hidden="true" />}
            {notice.text}
          </motion.p>
        )}
      </AnimatePresence>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">Save</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Action
          icon={ShieldCheckIcon}
          title="Back up everything"
          text="Every ledger, entry, account, budget and goal, in one file you can restore later."
          disabled={busy}
          onClick={() =>
            run(async () => {
              await saveFile(`kinchaku-backup-${today()}.json`, await exportBackup(), "application/json");
              return "Backup file created.";
            })
          }
        />
        <Action
          icon={FileCsvIcon}
          title="Export spreadsheet"
          text={`Entries in ${ledgerName} as a CSV file for Excel or Google Sheets.`}
          disabled={busy}
          onClick={() =>
            run(async () => {
              const safe = ledgerName.replace(/[^\w-]+/g, "-").toLowerCase();
              await saveFile(`kinchaku-${safe}-${today()}.csv`, await exportCsv(ledgerId, currency), "text/csv");
              return "Spreadsheet created.";
            })
          }
        />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">Bring back</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Action
          icon={FileArrowUpIcon}
          title="Restore a backup"
          text="Merges a Kinchaku backup into this device. Newer changes win; nothing here is erased."
          disabled={busy}
          onClick={() => backupInput.current?.click()}
        />
        <Action
          icon={DownloadSimpleIcon}
          title="Import from a spreadsheet"
          text={`Adds entries to ${ledgerName} from a CSV with Date (YYYY-MM-DD), Category and Amount columns.`}
          disabled={busy}
          onClick={() => csvInput.current?.click()}
        />
      </div>

      <input
        ref={backupInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void run(async () => {
            const r = await importBackup(await readFile(file));
            return `Restored: ${r.added} added, ${r.updated} updated, ${r.skipped} already up to date${r.invalid ? `, ${r.invalid} skipped as invalid` : ""}.`;
          });
        }}
      />
      <input
        ref={csvInput}
        type="file"
        accept="text/csv,.csv"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void run(async () => {
            const r = await importCsv(await readFile(file), ledgerId);
            const extra = [
              r.newCategories && `${r.newCategories} new categories`,
              r.newAccounts && `${r.newAccounts} new accounts`,
              r.invalid && `${r.invalid} rows skipped`,
            ].filter(Boolean);
            return `Imported ${r.added} entries${extra.length ? ` (${extra.join(", ")})` : ""}.`;
          });
        }}
      />
    </Screen>
  );
}

function Action({ icon: Glyph, title, text, onClick, disabled }: { icon: Icon; title: string; text: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3.5 rounded-2xl bg-surface p-4 text-left shadow-[inset_0_0_0_1px_var(--line)] transition hover:bg-surface-2 active:scale-[0.99] disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent-text">
        <Glyph size={20} weight="duotone" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
    </button>
  );
}
