import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ObeliskCallback } from "./ObeliskCallback.jsx";
import { ObeliskLogin } from "./ObeliskLogin.jsx";
import { getObeliskRoute } from "./obeliskRoutes.js";
import { applyTheme, readTheme } from "./utils/theme.js";
import { initializeSentry } from "./utils/sentryClient.js";
import "./auth.css";
import "./runtime-shell.css";
import { RuntimeBoundary } from "./RuntimeBoundary.jsx";

// Apply the project theme before React mounts so every entry surface starts dark by default.
applyTheme(readTheme(), { persist: false });

// Sentry error tracking — set VITE_SENTRY_DSN in .env.local to enable.
// Get your DSN at https://sentry.io → Project → Settings → SDK Setup
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  void initializeSentry(SENTRY_DSN);
}

const route = getObeliskRoute(window.location.pathname);
const surface = route === "login"
  ? <ObeliskLogin />
  : route === "callback"
    ? <ObeliskCallback />
    : <RuntimeBoundary />;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      {surface}
    </ErrorBoundary>
  </StrictMode>
);
