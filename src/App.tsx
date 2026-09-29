import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { getActiveLedgerId } from "./data/ledgers";
import { runDueRecurring } from "./data/recurring";
import { getCurrency } from "./db";
import { AppStateProvider } from "./state";
import { bootSync } from "./sync/client";
import { AppShell, type View } from "./components/AppShell";
import { EASE_OUT } from "./components/motion";
import { SettingsSheet } from "./components/SettingsSheet";
import { Accounts } from "./screens/Accounts";
import { Backup } from "./screens/Backup";
import { Budgets } from "./screens/Budgets";
import { Categories } from "./screens/Categories";
import { Goals } from "./screens/Goals";
import { Ledgers } from "./screens/Ledgers";
import { More } from "./screens/More";
import { PetCompanion } from "./pet/PetCompanion";
import { Overview } from "./screens/Overview";
import { Recurring } from "./screens/Recurring";
import { Transactions } from "./screens/Transactions";
import { Welcome } from "./screens/Welcome";

export default function App() {
  // undefined while the database opens, null until a currency is chosen
  const currency = useLiveQuery(getCurrency);
  const ledgerId = useLiveQuery(getActiveLedgerId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<View>("home");

  // Add repeating entries that came due while the app was closed, and again
  // whenever it comes back to the foreground (it may have been open overnight).
  // Signed in on this device: start syncing with the account.
  useEffect(() => {
    void bootSync();
  }, []);

  useEffect(() => {
    void runDueRecurring();
    const onVisible = () => {
      if (document.visibilityState === "visible") void runDueRecurring();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (currency === undefined || ledgerId === undefined) return null;

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const screen = () => {
    switch (view) {
      case "home":
        return <Overview />;
      case "transactions":
        return <Transactions />;
      case "budgets":
        return <Budgets />;
      case "accounts":
        return <Accounts />;
      case "more":
        return <More onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)} />;
      case "categories":
        return <Categories />;
      case "goals":
        return <Goals />;
      case "recurring":
        return <Recurring />;
      case "ledgers":
        return <Ledgers />;
      case "backup":
        return <Backup />;
    }
  };

  return (
    // Leaving the welcome flow fades it out before the app rises in.
    <AnimatePresence mode="wait" initial={false}>
      {currency === null ? (
        <motion.div key="welcome" exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}>
          <Welcome />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <AppStateProvider value={{ ledgerId, currency }}>
            <AppShell view={view} onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  // Switching ledger re-mounts the screen so its state starts fresh.
                  key={`${view}-${ledgerId}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  {screen()}
                </motion.div>
              </AnimatePresence>
            </AppShell>
            {/* Outside the screen transition, so the cat stays put while tabs change. */}
            <PetCompanion onHome={view === "home"} />
            <SettingsSheet
              open={settingsOpen}
              currency={currency}
              onClose={() => setSettingsOpen(false)}
              onOpenCategories={() => {
                setSettingsOpen(false);
                navigate("categories");
              }}
            />
          </AppStateProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
