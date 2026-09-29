import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { CheckIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { addLedger, deleteLedger, listLedgers, setActiveLedger, updateLedger } from "../data/ledgers";
import type { Ledger } from "../db";
import type { PresetIconName } from "../icons";
import { useLedgerId } from "../state";
import { CategoryIcon } from "../components/CategoryIcon";
import { Stagger, staggerChild } from "../components/motion";
import { ColorPicker, IconGrid } from "../components/pickers";
import { Sheet } from "../components/Sheet";
import { FormError, Screen, ScreenHeader } from "../components/ui";

const LEDGER_ICONS: PresetIconName[] = ["wallet", "briefcase", "house", "heart", "plane", "graduation-cap", "baby", "paw", "cart", "piggy-bank", "gift", "tag"];

/** Separate books, e.g. Personal, Business, a trip. Categories are shared between them. */
export function Ledgers() {
  const active = useLedgerId();
  const ledgers = useLiveQuery(listLedgers, []);
  const [editing, setEditing] = useState<Ledger | "new" | null>(null);

  return (
    <>
      <Screen>
        <ScreenHeader title="Ledgers">
          <button type="button" onClick={() => setEditing("new")} className="btn btn-primary btn-sm">
            <PlusIcon size={16} weight="bold" aria-hidden="true" />
            New ledger
          </button>
        </ScreenHeader>
        <p className="mt-3 max-w-[52ch] text-muted">
          Keep separate books, like Personal and Business. Each has its own entries, accounts, budgets and goals.
          Categories are shared.
        </p>
        <Stagger as="ul" className="mt-6 space-y-2" stagger={0.05}>
          {(ledgers ?? []).map((l) => (
            <motion.li key={l.id} variants={staggerChild} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void setActiveLedger(l.id)}
                aria-pressed={l.id === active}
                className={`flex flex-1 items-center gap-3.5 rounded-2xl bg-surface p-3.5 text-left transition hover:bg-surface-2 ${
                  l.id === active ? "shadow-[inset_0_0_0_2px_var(--accent)]" : "shadow-[inset_0_0_0_1px_var(--line)]"
                }`}
              >
                <CategoryIcon icon={{ kind: "preset", name: l.icon }} color={l.color} size={44} />
                <span className="min-w-0 flex-1 truncate font-semibold">{l.name}</span>
                {l.id === active && (
                  <span className="flex items-center gap-1 text-sm font-medium text-accent-text">
                    <CheckIcon size={16} weight="bold" aria-hidden="true" />
                    Open
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditing(l)}
                aria-label={`Edit ${l.name}`}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-muted shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink"
              >
                <PencilSimpleIcon size={18} weight="bold" />
              </button>
            </motion.li>
          ))}
        </Stagger>
      </Screen>
      <LedgerSheet target={editing} canDelete={(ledgers?.length ?? 0) > 1} onClose={() => setEditing(null)} />
    </>
  );
}

function LedgerSheet({ target, canDelete, onClose }: { target: Ledger | "new" | null; canDelete: boolean; onClose: () => void }) {
  const [last, setLast] = useState(target);
  if (target !== null && target !== last) setLast(target);
  const shown = target ?? last;
  return (
    <Sheet open={target !== null} title={shown === "new" ? "New ledger" : "Edit ledger"} onClose={onClose}>
      {shown !== null && <LedgerForm ledger={shown === "new" ? null : shown} canDelete={canDelete} onDone={onClose} />}
    </Sheet>
  );
}

function LedgerForm({ ledger, canDelete, onDone }: { ledger: Ledger | null; canDelete: boolean; onDone: () => void }) {
  const [name, setName] = useState(ledger?.name ?? "");
  const [color, setColor] = useState(ledger?.color ?? "#0ea5e9");
  const [icon, setIcon] = useState<PresetIconName>(ledger?.icon ?? "briefcase");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Give the ledger a name.");
    if (ledger) await updateLedger(ledger.id, { name: clean, color, icon });
    else await setActiveLedger(await addLedger({ name: clean, color, icon }));
    onDone();
  }

  return (
    <form onSubmit={save} noValidate>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-muted">Name</span>
        <input data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="e.g. Business" autoComplete="off" className="field" />
      </label>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Colour</legend>
        <ColorPicker id="ledger" value={color} onChange={setColor} />
      </fieldset>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Icon</legend>
        <IconGrid value={icon} onChange={setIcon} color={color} names={LEDGER_ICONS} />
      </fieldset>
      <FormError message={error} />
      {confirmDelete && <p className="mt-4 text-sm text-muted">Its entries, accounts, budgets and goals are hidden with it.</p>}
      <div className="mt-7 flex gap-3">
        {ledger && canDelete && (
          <button
            type="button"
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await deleteLedger(ledger.id);
              onDone();
            }}
            className="btn btn-secondary text-accent-text"
          >
            <TrashIcon size={18} weight="bold" aria-hidden="true" />
            {confirmDelete ? "Tap again" : "Delete"}
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1">
          {ledger ? "Save changes" : "Create and open"}
        </button>
      </div>
    </form>
  );
}
