import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRightIcon, CaretRightIcon } from "@phosphor-icons/react";
import { getSetting, setCurrency, setSetting } from "../db";
import { DEFAULT_PET_NAME, type PetLangSetting } from "../pet/PetCompanion";
import { PetCat } from "../pet/PetCat";
import { CurrencyPicker } from "./CurrencyPicker";
import { Sheet } from "./Sheet";
import { ThemeSegmented } from "./ThemeToggle";
import { Chip, Toggle } from "./ui";

type Props = { open: boolean; currency: string; onClose: () => void; onOpenCategories: () => void };

const row = "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2";

const PET_LANGS: { value: PetLangSetting; label: string }[] = [
  { value: "auto", label: "Match my question" },
  { value: "en", label: "English" },
  { value: "tl", label: "Tagalog" },
];

export function SettingsSheet({ open, currency, onClose, onOpenCategories }: Props) {
  const [changing, setChanging] = useState(false);
  const name = new Intl.DisplayNames(["en"], { type: "currency" }).of(currency) ?? currency;

  return (
    <Sheet
      open={open}
      title={changing ? "Currency" : "Settings"}
      onClose={() => {
        setChanging(false);
        onClose();
      }}
    >
      {changing ? (
        <>
          <p className="mb-4 text-sm text-muted">
            This changes the currency symbol only. Amounts you already entered are not converted.
          </p>
          <CurrencyPicker
            value={currency}
            onPick={async (code) => {
              await setCurrency(code);
              setChanging(false);
            }}
          />
        </>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-medium text-muted">Appearance</h3>
          <ThemeSegmented />

          <PetSettings />

          <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--line)]">
            <button type="button" onClick={() => setChanging(true)} className={row}>
              <span>Currency</span>
              <span className="flex min-w-0 items-center gap-2 text-muted">
                <span className="truncate">{name}</span>
                <CaretRightIcon size={16} weight="bold" aria-hidden="true" />
              </span>
            </button>
            <button type="button" onClick={onOpenCategories} className={`${row} border-t border-line`}>
              <span>Categories</span>
              <CaretRightIcon size={16} weight="bold" className="text-muted" aria-hidden="true" />
            </button>
            <a href={import.meta.env.BASE_URL} className={`${row} border-t border-line`}>
              <span>About Kinchaku</span>
              <ArrowUpRightIcon size={16} weight="bold" className="text-muted" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-6 text-sm text-muted">
            Your data is saved on this device and works offline. Signing in to sync between devices is on the way.
          </p>
        </>
      )}
    </Sheet>
  );
}

/** The budget cat's name, visibility and reply language. */
function PetSettings() {
  const pet = useLiveQuery(async () => ({
    name: (await getSetting<string>("petName")) ?? "",
    hidden: (await getSetting<boolean>("petHidden")) ?? false,
    lang: (await getSetting<PetLangSetting>("petLang")) ?? "auto",
  }));
  const [draft, setDraft] = useState<string | null>(null);
  if (!pet) return null;
  const value = draft ?? pet.name;

  return (
    <section className="mt-6" aria-labelledby="pet-settings">
      <h3 id="pet-settings" className="mb-2 text-sm font-medium text-muted">
        Budget cat
      </h3>
      <div className="space-y-4 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line)]">
        <div className="flex items-center gap-3">
          <PetCat mood="happy" size={48} label="Budget cat" />
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-muted">Name</span>
            <input
              value={value}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft !== null) void setSetting("petName", draft.trim().slice(0, 20));
                setDraft(null);
              }}
              maxLength={20}
              placeholder={DEFAULT_PET_NAME}
              autoComplete="off"
              className="field"
            />
          </label>
        </div>
        <Toggle
          checked={!pet.hidden}
          onChange={(v) => void setSetting("petHidden", !v)}
          label="Show the cat"
          hint="Tap it on any screen to ask about your money. On Home it also reminds you about your spending."
        />
        <div>
          <span className="mb-2 block text-sm font-medium">Replies in</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reply language">
            {PET_LANGS.map((l) => (
              <Chip key={l.value} selected={pet.lang === l.value} onClick={() => void setSetting("petLang", l.value)}>
                {l.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
