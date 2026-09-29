import { useState } from "react";
import { motion } from "motion/react";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { CATEGORY_COLORS } from "../categories";
import { PRESET_ICONS, type PresetIconName } from "../icons";
import { CategoryIcon } from "./CategoryIcon";

export const ICON_NAMES = Object.keys(PRESET_ICONS) as PresetIconName[];
export const iconLabel = (name: string) => name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Round colour swatches; a ring glides to the chosen one. `id` keeps rings separate when two pickers are open. */
export function ColorPicker({ value, onChange, id }: { value: string; onChange: (c: string) => void; id: string }) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2.5">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          onClick={() => onChange(c)}
          className="relative grid size-9 place-items-center rounded-full transition active:scale-90"
        >
          {c === value && (
            <motion.span
              layoutId={`colour-ring-${id}`}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="absolute -inset-1 rounded-full shadow-[inset_0_0_0_2px_var(--ink)]"
            />
          )}
          <span className="size-7 rounded-full" style={{ backgroundColor: c }} />
        </button>
      ))}
    </div>
  );
}

/** Grid of the preset icons, tinted in the chosen colour. */
export function IconGrid({
  value,
  onChange,
  color,
  names = ICON_NAMES,
}: {
  value: string | null;
  onChange: (name: PresetIconName) => void;
  color: string;
  names?: PresetIconName[];
}) {
  return (
    <div role="radiogroup" aria-label="Icons" className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
      {names.map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconLabel(n)}
            title={iconLabel(n)}
            onClick={() => onChange(n)}
            className={`grid aspect-square place-items-center rounded-xl transition active:scale-90 ${
              selected ? "bg-surface shadow-[inset_0_0_0_2px_var(--accent)]" : "hover:bg-surface-2"
            }`}
          >
            <CategoryIcon icon={{ kind: "preset", name: n }} color={color} size={38} />
          </button>
        );
      })}
    </div>
  );
}

/** Editable list of short notes, shown as removable chips with an add field. */
export function QuickNotesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const note = draft.trim().replace(/\s+/g, " ").slice(0, 30);
    if (note && !value.some((v) => v.toLowerCase() === note.toLowerCase()) && value.length < 12) {
      onChange([...value, note]);
    }
    setDraft("");
  };
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {value.map((note) => (
            <motion.li key={note} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="flex items-center gap-1 rounded-full bg-surface py-1.5 pr-1.5 pl-3 text-sm shadow-[inset_0_0_0_1px_var(--line)]">
                {note}
                <button
                  type="button"
                  aria-label={`Remove ${note}`}
                  onClick={() => onChange(value.filter((v) => v !== note))}
                  className="grid size-6 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <XIcon size={12} weight="bold" />
                </button>
              </span>
            </motion.li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={30}
          placeholder="e.g. Lunch"
          autoComplete="off"
          className="field"
          aria-label="New quick note"
        />
        <button type="button" onClick={add} className="btn btn-secondary btn-sm shrink-0" disabled={!draft.trim()}>
          <PlusIcon size={16} weight="bold" aria-hidden="true" />
          Add
        </button>
      </div>
    </div>
  );
}
