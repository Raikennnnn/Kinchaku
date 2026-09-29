import { db, stamp, type Category, type Kind } from "../db";

/** Visible categories, optionally only one kind, in the user's order. */
export const listCategories = (kind?: Kind) =>
  db.categories
    .orderBy("order")
    .filter((c) => !c.deleted && (!kind || c.kind === kind))
    .toArray();

export type CategoryInput = Pick<Category, "name" | "icon" | "color" | "quickNotes">;

/** Adds a category at the end of the list and returns its id. */
export async function addCategory(input: CategoryInput & { kind: Kind }): Promise<string> {
  const last = await db.categories.orderBy("order").last();
  const record = { ...input, ...stamp(), order: (last?.order ?? -1) + 1, builtIn: false };
  await db.categories.add(record);
  return record.id;
}

export const updateCategory = (id: string, input: CategoryInput) =>
  db.categories.update(id, { ...input, updatedAt: Date.now() });

/** Hides the category. Its entries stay, shown as "Deleted category". */
export const deleteCategory = (id: string) => db.categories.update(id, { deleted: true, updatedAt: Date.now() });

/** How many (non-deleted) entries each category has, in every ledger. */
export async function countByCategory(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  await db.transactions
    .filter((t) => !t.deleted)
    .each((t) => counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1));
  return counts;
}
