import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { countByCategory, listCategories } from "../data/categories";
import type { Category, Kind } from "../db";
import { CategoryEditor } from "../components/CategoryEditor";
import { CategoryIcon } from "../components/CategoryIcon";
import { KindSwitch } from "../components/KindSwitch";
import { EASE_OUT } from "../components/motion";

/** Every category, split into expenses and money in, with how often each is used. */
export function Categories() {
  const [kind, setKind] = useState<Kind>("expense");
  const all = useLiveQuery(() => listCategories(), []);
  const usage = useLiveQuery(countByCategory, []);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  // App-owned categories (carry-over) aren't editable, so they're not listed.
  const shown = (all ?? []).filter((c) => c.kind === kind && !c.system);

  return (
    <main className="mx-auto max-w-lg px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:max-w-4xl lg:px-10 lg:pt-10 lg:pb-16">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[1.8rem] leading-none font-semibold min-[400px]:text-[2.15rem] lg:text-[2.75rem]">
          Categories
        </h1>
        <button type="button" onClick={() => setEditing("new")} className="btn btn-primary btn-sm">
          <PlusIcon size={16} weight="bold" aria-hidden="true" />
          New category
        </button>
      </div>
      <p className="mt-3 max-w-[52ch] text-muted">
        Expenses are what you spend on. Money in is where your money comes from, like an allowance, salary or a loan
        paid back to you.
      </p>

      <div className="mt-6 max-w-sm">
        <KindSwitch id="categories" value={kind} onChange={setKind} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={kind}
          className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
        >
          <AnimatePresence initial={false}>
            {shown.map((c) => {
              const count = usage?.get(c.id) ?? 0;
              return (
                <motion.li
                  key={c.id}
                  layout
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                >
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="flex w-full items-center gap-4 rounded-2xl bg-surface p-3.5 text-left shadow-[inset_0_0_0_1px_var(--line)] transition hover:bg-surface-2 active:scale-[0.99]"
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size={46} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.name}</span>
                      <span className="block text-sm text-muted">
                        {count === 0 ? "Not used yet" : count === 1 ? "1 entry" : `${count} entries`}
                      </span>
                    </span>
                    <CaretRightIcon size={16} weight="bold" className="text-muted" aria-hidden="true" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      </AnimatePresence>

      <CategoryEditor
        target={editing}
        kind={kind}
        categories={all ?? []}
        usage={usage}
        onClose={() => setEditing(null)}
      />
    </main>
  );
}
