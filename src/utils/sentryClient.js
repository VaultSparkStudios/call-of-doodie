let configuredDsn = "";
let clientPromise = null;

function loadSentry() {
  if (!configuredDsn) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@sentry/react")
      .then((Sentry) => {
        Sentry.init({
          dsn: configuredDsn,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0,
          integrations: [],
        });
        return Sentry;
      })
      .catch((error) => {
        console.warn("[sentry] Optional client failed to load:", error?.message || String(error));
        clientPromise = null;
        return null;
      });
  }
  return clientPromise;
}

export function initializeSentry(dsn) {
  configuredDsn = String(dsn || "").trim();
  return loadSentry();
}

export async function captureSentryException(error, context = {}) {
  const Sentry = await loadSentry();
  Sentry?.captureException(error, context);
}
