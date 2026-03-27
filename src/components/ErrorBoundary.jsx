import { Component } from "react";
import * as Sentry from "@sentry/react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Unhandled crash:", error, info);
    try { Sentry.captureException(error, { extra: { componentStack: info.componentStack } }); } catch { /* ignore */ }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const base = {
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0000", color: "#fff", fontFamily: "monospace", padding: 32, textAlign: "center",
    };

    return (
      <div style={base}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💀</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#FF4444", marginBottom: 8, letterSpacing: 2 }}>
          GAME CRASHED
        </div>
        <div style={{ fontSize: 13, color: "#AAA", maxWidth: 420, marginBottom: 24, lineHeight: 1.6 }}>
          Something blew up. Your progress may be lost.
          <br />
          <span style={{ color: "#FF8888", fontFamily: "monospace", fontSize: 11 }}>
            {this.state.error?.message || "Unknown error"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#FF4444", color: "#fff", border: "none", borderRadius: 6,
              padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 1,
            }}
          >
            RELOAD GAME
          </button>
          <a
            href="https://github.com/vaultsparkstudios/call-of-doodie/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "transparent", color: "#AAA", border: "1px solid #444", borderRadius: 6,
              padding: "10px 24px", fontSize: 13, cursor: "pointer", letterSpacing: 1, textDecoration: "none",
            }}
          >
            REPORT BUG
          </a>
        </div>
      </div>
    );
  }
}
