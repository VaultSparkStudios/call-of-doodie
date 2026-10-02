import { useEffect, useState } from "react";
import { handleObeliskCallback } from "./obelisk-callback.js";
import { sanitizeObeliskIdentity, savePassport } from "./utils/obeliskPassport.js";
import { saveCloudSession } from "./utils/cloudSession.js";
import { takeAuthReturn } from "./utils/authReturn.js";
import { applyTheme, nextTheme, readTheme, THEMES } from "./utils/theme.js";

let callbackAttempt = null;
function beginCallback() {
  if (callbackAttempt) return callbackAttempt;
  const params = new URLSearchParams(location.search);
  const token = params.get("obelisk_session");
  const returnTarget = takeAuthReturn(params.get("next"));
  history.replaceState(null, "", "/auth/callback");
  callbackAttempt = { token, returnTarget, promise: handleObeliskCallback({ token }) };
  return callbackAttempt;
}

export function ObeliskCallback() {
  const [state, setState] = useState({ status: "verifying", detail: "Checking your Obelisk session..." });
  const [theme, setTheme] = useState(() => readTheme());

  useEffect(() => {
    let cancelled = false;
    const attempt = beginCallback();
    attempt.promise
      .then((result) => {
        if (cancelled) return;
        if (result?.ok) {
          const passport = sanitizeObeliskIdentity(result);
          if (!passport || !savePassport(passport)) {
            setState({ status: "error", detail: "The identity response could not be stored safely on this device." });
            return;
          }
          const activeSession = attempt.token && saveCloudSession({ token: attempt.token, subject: passport.subject, capability: result.profileCapability, expiresAt: result.profileCapabilityExpiresAt });
          setState({ status: "success", detail: activeSession ? "Obelisk verified your session. Game progress remains on this device." : "Obelisk verified your identity. Your local receipt is saved; cloud backup is not active." });
          setTimeout(() => { location.replace(attempt.returnTarget); }, 900);
          return;
        }
        setState({ status: "error", detail: result?.reason === "no-token"
          ? "The sign-in link did not include a session. Start verification again from Passport."
          : "Obelisk could not confirm this session. Your local game progress is safe; start verification again from Passport." });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", detail: "Verification could not finish right now. Your local game progress is safe; try again from Passport." });
      });
    return () => { cancelled = true; };
  }, []);

  const isError = state.status === "error";
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-live="polite">
        <header className="auth-masthead">
          <a href="/" className="auth-brand">CALL OF <span>DOODIE</span></a>
          <button data-theme-toggle type="button" className="auth-theme" onClick={() => { const next = nextTheme(theme); applyTheme(next); setTheme(next); }} aria-label={`Switch to ${THEMES[nextTheme(theme)].label}`}>{THEMES[theme].icon} {THEMES[theme].label}</button>
        </header>
        <p className="auth-eyebrow">Call of Doodie · Porcelain Passport</p>
        <h1>{isError ? "Verification needs another pass" : "Verifying identity"}</h1>
        <p className="auth-lede">{state.detail}</p>
        {isError ? (
          <a href={`/login?next=${encodeURIComponent(callbackAttempt?.returnTarget || "/")}`} className="auth-brand">Back to Passport</a>
        ) : null}
      </section>
    </main>
  );
}
