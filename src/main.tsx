import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/bricolage-grotesque";
import App from "./App";
import { keepAppUpdated } from "./lib/updates";
import "./index.css";

// Ask the browser not to clear our data when the device runs low on space.
// Android Chrome usually grants this for installed apps; iOS ignores it.
navigator.storage?.persist?.().catch(() => {});

keepAppUpdated();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Honour the system "reduce motion" setting everywhere. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
