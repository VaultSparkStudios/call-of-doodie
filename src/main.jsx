import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import CallOfDoodie from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Sentry error tracking — set VITE_SENTRY_DSN in .env.local to enable.
// Get your DSN at https://sentry.io → Project → Settings → SDK Setup
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,   // 10% of sessions — adjust as needed
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [],
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <CallOfDoodie />
    </ErrorBoundary>
  </StrictMode>
);
