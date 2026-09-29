import type { PresetIconName } from "./icons";

/** Money out (expenses) or money in (allowance, salary, paid-back loans...). */
export type Kind = "expense" | "income";

export type DefaultCategory = {
  id: string;
  name: string;
  icon: PresetIconName;
  color: string;
  kind: Kind;
  /** One-tap notes offered when adding an entry in this category. */
  quickNotes: string[];
  /** Used by the app itself (carry-over, savings), not offered in pickers. */
  system?: boolean;
};

/** Colours offered for categories, accounts and goals. Chosen to read on light, dark and the indigo panel. */
export const CATEGORY_COLORS = [
  "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#d946ef", "#a78bfa",
  "#6366f1", "#0ea5e9", "#06b6d4", "#14b8a6", "#22c55e", "#84cc16",
];

/** Holds what's carried from one month into the next. */
export const CARRY_CATEGORY_ID = "carried-over";
/** Money moved from the month into a savings goal. */
export const SAVINGS_CATEGORY_ID = "to-savings";

// Built-in categories use fixed ids, so two devices that each create them
// while offline end up with the same records instead of duplicates.
// Colours are picked to read on the light, dark and indigo surfaces.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { id: "gas", name: "Gas", icon: "fuel", color: "#f59e0b", kind: "expense", quickNotes: ["Fuel", "Parking", "Toll", "Car wash"] },
  { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#ec4899", kind: "expense", quickNotes: ["Clothes", "Online", "Household", "Gadgets"] },
  { id: "food-drink", name: "Food & Drink", icon: "utensils", color: "#22c55e", kind: "expense", quickNotes: ["Breakfast", "Lunch", "Dinner", "Snacks", "Coffee", "Groceries"] },
  { id: "self-care", name: "Self Care", icon: "sparkles", color: "#06b6d4", kind: "expense", quickNotes: ["Haircut", "Skincare", "Gym", "Medicine"] },
  { id: "loan", name: "Loan", icon: "landmark", color: "#a78bfa", kind: "expense", quickNotes: ["Monthly payment", "Credit card"] },

  { id: "allowance", name: "Allowance", icon: "wallet", color: "#22c55e", kind: "income", quickNotes: ["Monthly", "Weekly"] },
  { id: "salary", name: "Salary", icon: "briefcase", color: "#14b8a6", kind: "income", quickNotes: ["Payday", "Overtime", "Bonus"] },
  { id: "pension", name: "Pension", icon: "piggy-bank", color: "#0ea5e9", kind: "income", quickNotes: ["Monthly"] },
  { id: "reward", name: "Reward", icon: "gift", color: "#f59e0b", kind: "income", quickNotes: ["Gift", "Cashback", "Prize"] },
  { id: "paid-loans", name: "Paid loans", icon: "hand-coins", color: "#84cc16", kind: "income", quickNotes: ["Paid back"] },

  { id: CARRY_CATEGORY_ID, name: "Carried over", icon: "repeat", color: "#6366f1", kind: "income", quickNotes: [], system: true },
  { id: SAVINGS_CATEGORY_ID, name: "To savings", icon: "piggy-bank", color: "#6366f1", kind: "expense", quickNotes: [], system: true },
];
