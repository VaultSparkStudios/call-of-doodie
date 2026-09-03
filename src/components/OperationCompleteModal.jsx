import { useEffect } from "react";
import OperationPlaytestCommandPost from "./OperationPlaytestCommandPost.jsx";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(4, 7, 10, 0.9)",
};

const panelStyle = {
  width: "min(560px, 100%)",
  maxHeight: "calc(100dvh - 40px)",
  overflowY: "auto",
  padding: 24,
  border: "1px solid rgba(0, 229, 255, 0.5)",
  borderRadius: 12,
  background: "linear-gradient(180deg, #101820, #080c10)",
  color: "#F7FAFC",
  fontFamily: "'Courier New', monospace",
  boxShadow: "0 20px 70px rgba(0, 0, 0, 0.65)",
};

const actionStyle = {
  minHeight: 48,
  width: "100%",
  padding: "10px 16px",
  border: "1px solid rgba(255, 255, 255, 0.28)",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.07)",
  color: "#FFFFFF",
  cursor: "pointer",
  font: "900 13px 'Courier New', monospace",
  letterSpacing: 1,
};

function safeText(value, fallback) {
  if (value == null || value === "") return fallback;
  return String(value);
}

function gateCopy(campaignGate) {
  const gate = campaignGate && typeof campaignGate === "object" ? campaignGate : {};
  const campaignEnabled = campaignGate === true || gate.campaignEnabled === true;
  const coopEnabled = gate.coopEnabled === true;
  return {
    campaign: safeText(
      gate.campaignMessage,
      campaignEnabled
        ? "Local campaign route continuity is enabled for this build."
        : "Campaign progression is not live yet; this victory is a local operation checkpoint.",
    ),
    coop: safeText(
      gate.coopMessage,
      coopEnabled
        ? "Co-op result sharing is enabled for this session."
        : "Co-op is not connected; this result does not represent a shared squad save.",
    ),
    continueAvailable: gate.continueAvailable !== false,
  };
}

export default function OperationCompleteModal({
  receipt,
  onContinue,
  onRematch,
  onReturnToMenu,
  campaignGate = null,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onReturnToMenu?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReturnToMenu]);

  const gate = gateCopy(campaignGate);
  const score = Number(receipt?.score ?? receipt?.finalScore ?? 0);
  const fingerprint = receipt?.fingerprint
    ?? receipt?.stateFingerprint
    ?? receipt?.transitionFingerprint;
  const scoreBreakdown = receipt?.scoreBreakdown?.schemaVersion === "operation-score-v2"
    ? receipt.scoreBreakdown
    : null;

  return (
    <div style={overlayStyle}>
      <section
        aria-describedby="operation-complete-summary"
        aria-labelledby="operation-complete-title"
        aria-modal="true"
        role="dialog"
        style={panelStyle}
      >
        <p style={{ color: "var(--cod-cyan)", fontSize: 11, letterSpacing: 3, margin: "0 0 6px" }}>
          OPERATION COMPLETE
        </p>
        <h2 id="operation-complete-title" style={{ color: "#FFD166", fontSize: 28, margin: 0 }}>
          MISSION VICTORY
        </h2>
        <p id="operation-complete-summary" style={{ color: "#C5D1DB", margin: "8px 0 20px" }}>
          {safeText(receipt?.mission, "Arena objective secured")}
        </p>

        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 18px", margin: 0 }}>
          <dt style={{ color: "#8CA0B3" }}>SCORE</dt>
          <dd style={{ color: "#FFFFFF", fontWeight: 900, margin: 0 }}>
            {Number.isFinite(score) ? score.toLocaleString() : "0"}
          </dd>
          <dt style={{ color: "#8CA0B3" }}>ACT / ROUTE</dt>
          <dd style={{ margin: 0 }}>
            {safeText(receipt?.act, "ACT UNASSIGNED")} · {safeText(receipt?.route, "ROUTE UNASSIGNED")}
          </dd>
          <dt style={{ color: "#8CA0B3" }}>CHECKPOINT</dt>
          <dd style={{ margin: 0 }}>{safeText(receipt?.checkpoint, "LOCAL RESULT ONLY")}</dd>
          <dt style={{ color: "#8CA0B3" }}>FINGERPRINT</dt>
          <dd style={{ color: "var(--cod-cyan)", margin: 0, overflowWrap: "anywhere" }}>
            {safeText(fingerprint, "UNAVAILABLE")}
          </dd>
        </dl>

        {scoreBreakdown && (
          <section
            aria-labelledby="operation-score-breakdown-title"
            style={{ margin: "18px 0 0", padding: 12, border: "1px solid rgba(0, 229, 255, 0.35)", borderRadius: 8 }}
          >
            <h3 id="operation-score-breakdown-title" style={{ margin: "0 0 9px", color: "var(--cod-cyan)", fontSize: 12, letterSpacing: 1.5 }}>
              OPERATION SCORE BREAKDOWN
            </h3>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr max-content", gap: "5px 12px", margin: 0, fontSize: 11 }}>
              <dt>OBJECTIVES</dt><dd style={{ margin: 0 }}>+{scoreBreakdown.objective.toLocaleString()}</dd>
              <dt>EXACT INTERACTIONS</dt><dd style={{ margin: 0 }}>+{scoreBreakdown.interaction.toLocaleString()}</dd>
              <dt>TEMPO</dt><dd style={{ margin: 0 }}>+{scoreBreakdown.tempo.toLocaleString()}</dd>
              <dt>EXTRACTION</dt><dd style={{ margin: 0 }}>+{scoreBreakdown.extraction.toLocaleString()}</dd>
              <dt>REINFORCEMENT PRESSURE</dt><dd style={{ margin: 0 }}>−{scoreBreakdown.pressurePenalty.toLocaleString()}</dd>
            </dl>
            <p style={{ margin: "9px 0 0", color: "#AAB7C4", fontSize: 9, lineHeight: 1.4 }}>
              Local deterministic evidence · advisory rivalry receipt · not server-authoritative
            </p>
          </section>
        )}

        <aside
          aria-label="Campaign and co-op availability"
          style={{ margin: "20px 0", padding: 12, border: "1px solid #465463", borderRadius: 8 }}
        >
          <p style={{ margin: "0 0 8px", color: "#E5C07B", fontSize: 11 }}>
            CAMPAIGN GATE — {gate.campaign}
          </p>
          <p style={{ margin: 0, color: "#AAB7C4", fontSize: 11 }}>
            CO-OP GATE — {gate.coop}
          </p>
        </aside>

        <OperationPlaytestCommandPost receipt={receipt} />

        <div style={{ display: "grid", gap: 8 }}>
          <button
            disabled={!gate.continueAvailable}
            onClick={onContinue}
            style={{
              ...actionStyle,
              background: gate.continueAvailable ? "linear-gradient(180deg, #FF7139, #C64018)" : "#343A40",
              cursor: gate.continueAvailable ? "pointer" : "not-allowed",
            }}
            type="button"
          >
            CONTINUE
          </button>
          <button onClick={onRematch} style={actionStyle} type="button">REMATCH</button>
          <button onClick={onReturnToMenu} style={actionStyle} type="button">
            RETURN TO MENU <span aria-hidden="true">· ESC</span>
          </button>
        </div>
      </section>
    </div>
  );
}
