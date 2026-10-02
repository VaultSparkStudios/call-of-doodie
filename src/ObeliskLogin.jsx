import { useEffect, useRef, useState } from "react";
import { clearPassport, exportPassport, importPassport, readPassport, savePassport } from "./utils/obeliskPassport.js";
import { clearCloudSession } from "./utils/cloudSession.js";
import { describeAccountState, revalidateAccountSession } from "./utils/accountSession.js";
import { saveAuthReturn } from "./utils/authReturn.js";
import { applyTheme, nextTheme, readTheme, THEMES } from "./utils/theme.js";

const IDP = "https://obeliskgate.com";

export function ObeliskLogin({ project = "Call of Doodie", tier = "T4", returnUrl }) {
  const fileRef = useRef(null);
  const [passport, setPassport] = useState(() => readPassport());
  const [notice, setNotice] = useState("");
  const [sessionStatus, setSessionStatus] = useState(passport ? "checking" : "guest");
  const [theme, setTheme] = useState(() => readTheme());

  useEffect(() => {
    const target = saveAuthReturn(new URLSearchParams(location.search).get("next") || "/");
    const ret = returnUrl || `${location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
    const script = document.createElement("script");
    script.src = `${IDP}/auth-client.js`;
    script.dataset.obeliskIdp = IDP;
    script.dataset.obeliskProject = project;
    script.dataset.obeliskTier = tier;
    script.dataset.obeliskReturn = ret;
    document.body.appendChild(script);
    return () => script.remove();
  }, [project, tier, returnUrl]);

  useEffect(() => {
    if (!passport) { setSessionStatus("guest"); return; }
    let alive = true;
    revalidateAccountSession(passport).then((result) => { if (alive) setSessionStatus(result.state); });
    return () => { alive = false; };
  }, [passport]);

  const recheckSession = async () => {
    setSessionStatus("checking");
    const result = await revalidateAccountSession(passport);
    setSessionStatus(result.state);
  };

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
      clearCloudSession();
      savePassport(restored);
      setPassport(restored);
      setSessionStatus("receipt");
      setNotice("Local receipt restored. Verify with Obelisk to start a session; the export checksum does not prove identity.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Passport restore failed.");
    } finally {
      event.target.value = "";
    }
  };

  const account = describeAccountState(passport, sessionStatus, false);

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
            <div><span>Identity</span><strong>{sessionStatus === "checking" ? "Checking active session…" : account.label}</strong></div>
            <div><span>Issuer</span><strong>{passport.issuer}</strong></div>
            <div><span>Receipt saved</span><strong>{new Date(passport.verifiedAt).toLocaleDateString()}</strong></div>
            <p>The receipt is a local copy, not an active sign-in. Its export checksum checks file integrity, not identity authenticity. Game progress stays separate.</p>
            <div className="auth-actions auth-actions--compact">
              <button type="button" onClick={recheckSession}>Recheck session</button>
              {sessionStatus === "verified" && <button type="button" onClick={() => { clearCloudSession(); setSessionStatus("receipt"); setNotice("Obelisk session ended on this tab. Your local game save remains."); }}>End session</button>}
              <button type="button" onClick={downloadPassport}>Download local receipt</button>
              <button type="button" onClick={() => fileRef.current?.click()}>Restore local receipt</button>
              <button type="button" className="auth-danger" onClick={() => { clearCloudSession(); clearPassport(); setPassport(null); setSessionStatus("guest"); setNotice("Local Passport forgotten. Game progress remains on this device."); }}>Forget this device</button>
            </div>
          </section>
        ) : null}

        <div className="auth-actions">
          <button data-obelisk-signin type="button" className="auth-primary">{passport ? "Verify again with Obelisk" : "Verify with Obelisk"}</button>
          <button data-obelisk-signup type="button">Create a VaultSpark identity</button>
          <button data-obelisk-recover type="button" className="auth-link">Recover Obelisk access</button>
        </div>

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
