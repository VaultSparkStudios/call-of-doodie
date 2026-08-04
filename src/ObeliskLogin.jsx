import { useEffect, useRef, useState } from "react";
import { clearPassport, exportPassport, importPassport, readPassport, savePassport } from "./utils/obeliskPassport.js";
import { applyTheme, nextTheme, readTheme, THEMES } from "./utils/theme.js";

const IDP = "https://obeliskgate.com";

export function ObeliskLogin({ project = "Call of Doodie", tier = "T4", returnUrl }) {
  const fileRef = useRef(null);
  const [passport, setPassport] = useState(() => readPassport());
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(() => readTheme());

  useEffect(() => {
    const ret = returnUrl || `${location.origin}/auth/callback`;
    const script = document.createElement("script");
    script.src = `${IDP}/auth-client.js`;
    script.dataset.obeliskIdp = IDP;
    script.dataset.obeliskProject = project;
    script.dataset.obeliskTier = tier;
    script.dataset.obeliskReturn = ret;
    document.body.appendChild(script);
    return () => script.remove();
  }, [project, tier, returnUrl]);

  const toggleTheme = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    setTheme(next);
  };

  const downloadPassport = () => {
    const blob = new Blob([exportPassport(passport)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "call-of-doodie-porcelain-passport.json";
    anchor.click();
    URL.revokeObjectURL(href);
    setNotice("Local Passport backup downloaded.");
  };

  const restorePassport = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const restored = importPassport(await file.text());
      savePassport(restored);
      setPassport(restored);
      setNotice("Local Passport restored on this device.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Passport restore failed.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="passport-title">
        <header className="auth-masthead">
          <a href="/" className="auth-brand">CALL OF <span>DOODIE</span></a>
          <button data-theme-toggle type="button" className="auth-theme" onClick={toggleTheme} aria-label={`Switch to ${THEMES[nextTheme(theme)].label}`}>{THEMES[theme].icon} {THEMES[theme].label}</button>
        </header>
        <p className="auth-eyebrow">Optional identity · powered by Obelisk</p>
        <h1 id="passport-title">Porcelain Passport</h1>
        <p className="auth-lede">Verify one VaultSpark identity on this device. Guest play and game progress remain browser-local; cross-device progress sync is not active.</p>

        {passport ? (
          <section className="passport-receipt" aria-label="Local Passport receipt">
            <div><span>Identity</span><strong>Verified locally</strong></div>
            <div><span>Issuer</span><strong>{passport.issuer}</strong></div>
            <div><span>Verified</span><strong>{new Date(passport.verifiedAt).toLocaleDateString()}</strong></div>
            <p>This receipt identifies you to supported VaultSpark surfaces. It does not upload this game’s local progress.</p>
            <div className="auth-actions auth-actions--compact">
              <button type="button" onClick={downloadPassport}>Download backup</button>
              <button type="button" onClick={() => fileRef.current?.click()}>Restore backup</button>
              <button type="button" className="auth-danger" onClick={() => { clearPassport(); setPassport(null); setNotice("Local Passport forgotten."); }}>Forget this device</button>
            </div>
          </section>
        ) : (
          <div className="auth-actions">
            <button data-obelisk-signin type="button" className="auth-primary">Verify with Obelisk</button>
            <button data-obelisk-signup type="button">Create a VaultSpark identity</button>
            <button data-obelisk-recover type="button" className="auth-link">Recover Obelisk access</button>
          </div>
        )}

        <input ref={fileRef} className="auth-file" type="file" accept="application/json" onChange={restorePassport} aria-label="Restore Porcelain Passport backup" />
        {notice ? <p className="auth-notice" role="status">{notice}</p> : null}
        <footer className="auth-footer">
          <a href="/">Continue as guest</a>
          <span>Obelisk verifies identity; Call of Doodie keeps progress local.</span>
          <span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></span>
        </footer>
      </section>
    </main>
  );
}
