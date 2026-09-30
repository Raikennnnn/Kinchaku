import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/bricolage-grotesque";
import { Landing } from "./Landing";
import { keepSiteUpdated } from "../lib/updates";
import "../index.css";
import "./site.css";

keepSiteUpdated();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Honour the system "reduce motion" setting everywhere. */}
    <MotionConfig reducedMotion="user">
      <Landing />
    </MotionConfig>
  </StrictMode>,
);
