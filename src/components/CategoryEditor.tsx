import { useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageIcon, SquaresFourIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { CATEGORY_COLORS } from "../categories";
import { addCategory, deleteCategory, updateCategory } from "../data/categories";
import type { Category, IconRef, Kind } from "../db";
import { PRESET_ICONS, type PresetIconName } from "../icons";
import { fileToIcon } from "../lib/image";
import { CategoryIcon } from "./CategoryIcon";
import { QuickNotesEditor } from "./pickers";
import { Sheet } from "./Sheet";


const ICON_NAMES = Object.keys(PRESET_ICONS) as PresetIconName[];
const iconLabel = (name: string) => name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

type Props = {
  /** "new" to create, a category to edit, null when closed */
  target: Category | "new" | null;
  /** Kind for a new category (money in or expense); an edited one keeps its own. */
  kind: Kind;
  categories: Category[];
  /** Expense counts per category id, for the delete warning */
  usage?: Map<string, number>;
  onClose: () => void;
  onSaved?: (id: string) => void;
};

export function CategoryEditor({ target, onClose, ...rest }: Props) {
  // Keep showing the last form while the sheet animates closed.
  const [last, setLast] = useState(target);
  if (target !== null && target !== last) setLast(target);
  const shown = target ?? last;

  return (
    <Sheet
      open={target !== null}
      title={shown === "new" ? (rest.kind === "income" ? "New money-in category" : "New category") : "Edit category"}
      onClose={onClose}
    >
      {shown !== null && <EditorForm category={shown === "new" ? null : shown} onDone={onClose} {...rest} />}
    </Sheet>
  );
}

type FormProps = Omit<Props, "target" | "onClose"> & { category: Category | null; onDone: () => void };

function EditorForm({ category, kind: newKind, categories: allCategories, usage, onSaved, onDone }: FormProps) {
  const kind = category?.kind ?? newKind;
  // Names only need to be unique among categories of the same kind.
  const categories = allCategories.filter((c) => c.kind === kind);
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(
    category?.color ?? CATEGORY_COLORS.find((c) => !categories.some((k) => k.color === c)) ?? CATEGORY_COLORS[0]!,
  );
  const [icon, setIcon] = useState<IconRef>(category?.icon ?? { kind: "preset", name: "tag" });
  // The last preset picked, so switching tabs back and forth doesn't lose it.
  const [preset, setPreset] = useState<PresetIconName>(category?.icon.kind === "preset" ? category.icon.name : "tag");
  const [picture, setPicture] = useState<string | null>(category?.icon.kind === "custom" ? category.icon.dataUrl : null);
  const [tab, setTab] = useState<"icons" | "picture">(category?.icon.kind === "custom" ? "picture" : "icons");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quickNotes, setQuickNotes] = useState<string[]>(category?.quickNotes ?? []);
  const fileInput = useRef<HTMLInputElement>(null);

  const used = category ? (usage?.get(category.id) ?? 0) : 0;

  async function takeFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = await fileToIcon(file);
      setPicture(data);
      setIcon({ kind: "custom", dataUrl: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't use that image.");
    } finally {
      setBusy(false);
    }
  }

  function chooseTab(next: "icons" | "picture") {
    setTab(next);
    if (next === "icons") setIcon({ kind: "preset", name: preset });
    else if (picture) setIcon({ kind: "custom", dataUrl: picture });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Give the category a name.");
    const clash = categories.find((c) => c.id !== category?.id && c.name.toLowerCase() === clean.toLowerCase());
    if (clash) return setError(`You already have a category called ${clash.name}.`);
    if (tab === "picture" && !picture) return setError("Choose a picture, or pick an icon instead.");

    const input = { name: clean, color, icon, quickNotes };
    if (category) {
      await updateCategory(category.id, input);
      onSaved?.(category.id);
    } else {
      // Not `onSaved?.(await addCategory(...))`: when onSaved is missing, optional
      // chaining skips evaluating the argument, and nothing would be saved.
      const id = await addCategory({ ...input, kind });
      onSaved?.(id);
    }
    onDone();
  }

  async function remove() {
    if (!category) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteCategory(category.id);
    onDone();
  }

  const iconKey = icon.kind === "preset" ? icon.name : "picture";

  return (
    <form onSubmit={save} noValidate>
      {/* Live preview */}
      <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]">
        {/* The old and new icon cross over inside this fixed box, so the one
            leaving can't be placed anywhere else on the sheet mid-animation. */}
        <span className="relative size-16 shrink-0">
          <AnimatePresence initial={false}>
            <motion.span
              key={`${iconKey}-${color}`}
              initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="absolute inset-0"
            >
              <CategoryIcon icon={icon} color={color} size={64} />
            </motion.span>
          </AnimatePresence>
        </span>
        <div className="min-w-0">
          <p className={`truncate font-display text-2xl font-semibold ${name.trim() ? "" : "text-muted"}`}>
            {name.trim() || "Category name"}
          </p>
          <p className="text-sm text-muted">Preview</p>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-medium text-muted">Name</span>
        <input
          data-autofocus={category ? undefined : true}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={24}
          placeholder="e.g. Coffee, Rent, Pets"
          autoComplete="off"
          enterKeyHint="done"
          className="field"
        />
      </label>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Colour</legend>
        <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2.5">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={c}
              onClick={() => setColor(c)}
              className="relative grid size-9 place-items-center rounded-full transition active:scale-90"
            >
              {c === color && (
                <motion.span
                  layoutId="colour-ring"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  className="absolute -inset-1 rounded-full shadow-[inset_0_0_0_2px_var(--ink)]"
                />
              )}
              <span className="size-7 rounded-full" style={{ backgroundColor: c }} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-muted">Icon</legend>
        <div role="tablist" aria-label="Icon source" className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
          {(
            [
              ["icons", "Icons", SquaresFourIcon],
              ["picture", "Your picture", ImageIcon],
            ] as const
          ).map(([value, label, Glyph]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => chooseTab(value)}
              className={`relative flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition ${
                tab === value ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {tab === value && (
                <motion.span
                  layoutId="icon-source-pill"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
                />
              )}
              <Glyph size={16} weight={tab === value ? "fill" : "regular"} className="relative" aria-hidden="true" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === "icons" ? (
            <motion.div
              key="icons"
              role="radiogroup"
              aria-label="Icons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8"
            >
              {ICON_NAMES.map((n) => {
                const selected = icon.kind === "preset" && icon.name === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={iconLabel(n)}
                    title={iconLabel(n)}
                    onClick={() => {
                      setPreset(n);
                      setIcon({ kind: "preset", name: n });
                    }}
                    className={`grid aspect-square place-items-center rounded-xl transition active:scale-90 ${
                      selected ? "bg-surface shadow-[inset_0_0_0_2px_var(--accent)]" : "hover:bg-surface-2"
                    }`}
                  >
                    <CategoryIcon icon={{ kind: "preset", name: n }} color={color} size={38} />
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="picture"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-3"
            >
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  void takeFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void takeFile(e.dataTransfer.files[0]);
                }}
                disabled={busy}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 border-dashed p-4 text-left transition ${
                  dragging ? "border-accent bg-surface" : "border-line hover:bg-surface"
                }`}
              >
                {picture ? (
                  <CategoryIcon icon={{ kind: "custom", dataUrl: picture }} color={color} size={64} />
                ) : (
                  <span className="grid size-16 shrink-0 place-items-center rounded-[19px] bg-surface-2 text-muted">
                    <UploadSimpleIcon size={26} weight="duotone" />
                  </span>
                )}
                <span>
                  <span className="block font-semibold">
                    {busy ? "Preparing pictureÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦" : picture ? "Choose a different picture" : "Choose a picture"}
                  </span>
                  <span className="block text-sm text-muted">A photo or logo. It's cropped to a square.</span>
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-1 text-sm font-medium text-muted">Quick notes</legend>
        <p className="mb-3 text-xs text-muted">Offered as one-tap notes when you add an entry in this category.</p>
        <QuickNotesEditor value={quickNotes} onChange={setQuickNotes} />
      </fieldset>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key={error}
            role="alert"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: [0, -6, 5, -3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-4 text-sm font-medium text-accent-text"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {confirmDelete && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden text-sm text-muted"
          >
            {used > 0
              ? `${used} ${used === 1 ? "expense uses" : "expenses use"} this category. ${used === 1 ? "It stays" : "They stay"}, labelled "Deleted category".`
              : "No expenses use this category."}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-7 flex gap-3">
        {category && (
          <button type="button" onClick={remove} className="btn btn-secondary text-accent-text">
            <TrashIcon size={18} weight="bold" aria-hidden="true" />
            {confirmDelete ? "Tap again to delete" : "Delete"}
          </button>
        )}
        <button type="submit" disabled={busy} className="btn btn-primary flex-1 disabled:opacity-60">
          {category ? "Save changes" : "Add category"}
        </button>
      </div>
    </form>
  );
}
