import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LEDGER_ID } from "./db";

/** The ledger being viewed and the user's currency, available everywhere in the app. */
type AppState = { ledgerId: string; currency: string };

const AppContext = createContext<AppState>({ ledgerId: DEFAULT_LEDGER_ID, currency: "EUR" });

export function AppStateProvider({ value, children }: { value: AppState; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useLedgerId = () => useContext(AppContext).ledgerId;
export const useCurrency = () => useContext(AppContext).currency;
