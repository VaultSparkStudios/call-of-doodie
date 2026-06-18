import { useEffect, useState } from "react";
import { handleObeliskCallback } from "./obelisk-callback.js";

export function ObeliskCallback() {
  const [state, setState] = useState({ status: "verifying", detail: "Checking your Obelisk session..." });

  useEffect(() => {
    let cancelled = false;
    handleObeliskCallback()
      .then((result) => {
        if (cancelled) return;
        if (result?.ok) {
          try {
            localStorage.setItem("cod-obelisk-identity", JSON.stringify({ verifiedAt: Date.now(), result }));
          } catch {}
          setState({ status: "success", detail: "Account verified. Returning to the game..." });
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
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 24,
      background: "#090b10",
      color: "#f5efe2",
      fontFamily: "system-ui, sans-serif",
    }}>
      <section style={{
        width: "min(420px, 100%)",
        padding: 24,
        border: "1px solid rgba(255,255,255,.14)",
        borderRadius: 8,
        background: "#10151f",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", opacity: .68 }}>Call of Doodie</div>
        <h1 style={{ fontSize: 24, margin: "10px 0" }}>{isError ? "Sign-in needs another pass" : "Signing you in"}</h1>
        <p style={{ margin: "0 0 18px", opacity: .75 }}>{state.detail}</p>
        {isError ? (
          <a href="/login" style={{ color: "#f5c542", fontWeight: 700 }}>Back to sign in</a>
        ) : null}
      </section>
    </main>
  );
}
