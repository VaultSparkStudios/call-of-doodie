import { Component, Suspense } from "react";

import { planPanelRecovery } from "../utils/asyncPanelRecovery.js";

const shell = {
  position: "fixed",
  inset: 0,
  zIndex: 220,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(5,8,14,0.78)",
  color: "#EAFBFF",
  fontFamily: "'Courier New',monospace",
  textAlign: "center",
};

export function AsyncPanelLoading({ label = "game panel" }) {
  return (
    <div role="status" aria-live="polite" style={{ ...shell, pointerEvents: "none" }}>
      <div style={{ border: "1px solid rgba(0,229,255,0.4)", borderRadius: 10, padding: "12px 18px", background: "rgba(0,16,28,0.9)", boxShadow: "0 0 24px rgba(0,229,255,0.15)" }}>
        <div style={{ color: "#7FE6FF", fontSize: 11, fontWeight: 900, letterSpacing: 2 }}>LOADING {String(label).toUpperCase()}…</div>
        <div style={{ color: "#9AAEC4", fontSize: 9, marginTop: 5 }}>Your current run state stays in memory.</div>
      </div>
    </div>
  );
}

class PanelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, reloadBlocked: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[AsyncPanelBoundary] Lazy panel failed", error?.name || "Error");
  }

  recover = () => {
    if (this.props.onRecover) return this.props.onRecover();
    const plan = planPanelRecovery();
    if (plan.action === "wait") return this.setState({ reloadBlocked: true });
    return globalThis.location?.reload?.();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ ...shell, pointerEvents: "all" }}>
        <div style={{ width: "min(92vw, 430px)", border: "1px solid rgba(255,96,72,0.55)", borderRadius: 12, padding: 20, background: "rgba(36,8,8,0.96)", boxShadow: "0 0 32px rgba(255,68,68,0.18)" }}>
          <div style={{ color: "#FF9C88", fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>PANEL LOAD INTERRUPTED</div>
          <p style={{ color: "#D7C4C4", fontSize: 11, lineHeight: 1.5 }}>A stale or unavailable code chunk stopped this panel. Reload to recover the current deployed version.</p>
          <button type="button" onClick={this.recover} disabled={this.state.reloadBlocked} style={{ border: "1px solid #FF8A72", borderRadius: 6, background: "#FF6B50", color: "#170300", padding: "8px 14px", font: "900 10px monospace", cursor: "pointer" }}>{this.state.reloadBlocked ? "RELOAD ALREADY ATTEMPTED" : "RELOAD GAME"}</button>
          {this.state.reloadBlocked && <p style={{ color: "#FFB8A8", fontSize: 10 }}>Wait one minute or use the browser refresh after checking your connection.</p>}
        </div>
      </div>
    );
  }
}

export default function AsyncPanelBoundary({ children, label = "game panel", onRecover }) {
  return (
    <PanelErrorBoundary onRecover={onRecover}>
      <Suspense fallback={<AsyncPanelLoading label={label} />}>
        {children}
      </Suspense>
    </PanelErrorBoundary>
  );
}
