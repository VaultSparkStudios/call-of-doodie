import { useEffect, useState } from "react";
import { handleObeliskCallback } from "./obelisk-callback.js";
import { sanitizeObeliskIdentity, savePassport } from "./utils/obeliskPassport.js";
import { applyTheme, nextTheme, readTheme, THEMES } from "./utils/theme.js";

export function ObeliskCallback() {
  const [state, setState] = useState({ status: "verifying", detail: "Checking your Obelisk session..." });
  const [theme, setTheme] = useState(() => readTheme());

  useEffect(() => {
    let cancelled = false;
    handleObeliskCallback()
      .then((result) => {
        if (cancelled) return;
        if (result?.ok) {
          const passport = sanitizeObeliskIdentity(result);
          if (!passport || !savePassport(passport)) {
            setState({ status: "error", detail: "The identity response could not be stored safely on this device." });
            return;
          }
          setState({ status: "success", detail: "Identity verified locally. Your game progress remains on this device." });
          setTimeout(() => { location.href = "/"; }, 900);
          return;
        }
        setState({ status: "error", detail: result?.detail || result?.reason || "verify-failed" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", detail: "verify-failed" });
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
          <a href="/login" className="auth-brand">Back to Passport</a>
        ) : null}
      </section>
    </main>
  );
}
