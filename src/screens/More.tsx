import { motion } from "motion/react";
import { CaretRightIcon, GearSixIcon, type Icon } from "@phosphor-icons/react";
import { MORE_ITEMS, type View } from "../components/AppShell";
import { Stagger, staggerChild } from "../components/motion";
import { Screen, ScreenHeader } from "../components/ui";

/** Phone-only menu for the screens that don't fit in the tab bar. */
export function More({ onNavigate, onOpenSettings }: { onNavigate: (v: View) => void; onOpenSettings: () => void }) {
  return (
    <Screen>
      <ScreenHeader title="More" />
      <Stagger as="ul" className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--line)]" stagger={0.04}>
        {MORE_ITEMS.map(({ view, label, hint, icon }) => (
          <Row key={view} icon={icon} label={label} hint={hint} onClick={() => onNavigate(view)} />
        ))}
        <Row icon={GearSixIcon} label="Settings" hint="Appearance, currency" onClick={onOpenSettings} />
      </Stagger>
    </Screen>
  );
}

function Row({ icon: Glyph, label, hint, onClick }: { icon: Icon; label: string; hint: string; onClick: () => void }) {
  return (
    <motion.li variants={staggerChild} className="border-b border-line last:border-b-0">
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-surface-2">
        <span className="grid size-10 place-items-center rounded-xl bg-surface-2">
          <Glyph size={20} weight="duotone" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{label}</span>
          <span className="block truncate text-sm text-muted">{hint}</span>
        </span>
        <CaretRightIcon size={16} weight="bold" className="text-muted" aria-hidden="true" />
      </button>
    </motion.li>
  );
}
