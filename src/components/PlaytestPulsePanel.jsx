import { useState } from "react";
import { buildPortablePlaytestPulse } from "../utils/playtestFlightRecorder.js";

const GROUPS = [
  ["DEATH CLARITY", "clarity", [["clear", "CLEAR"], ["partial", "PARTLY"], ["unclear", "UNCLEAR"]]],
  ["REPLAY INTENT", "replay", [["now", "NOW"], ["later", "LATER"], ["no", "NO"]]],
  ["CONTROL TRUST", "inputTrust", [["trusted", "TRUSTED"], ["mixed", "MIXED"], ["failed", "FAILED"]]],
  ["DANGER READABILITY", "threatReadability", [["clear", "CLEAR"], ["busy", "BUSY"], ["lost", "LOST"]]],
];

export default function PlaytestPulsePanel({ pulse, palette }) {
  const [copyState, setCopyState] = useState("idle");
  if (!pulse || pulse.sampleSize < 1) return null;

  const copyAggregate = async () => {
    try {
      if (typeof navigator.clipboard?.writeText !== "function") throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(JSON.stringify(buildPortablePlaytestPulse(pulse), null, 2));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <details
      data-testid="playtest-pulse-panel"
      style={{ maxWidth: 760, margin: "10px auto 0", padding: "10px 12px", borderRadius: 10, border: `1px solid ${palette.line}`, background: palette.panel, color: palette.ink, textAlign: "left" }}
    >
      <summary style={{ cursor: "pointer", color: palette.ink, fontWeight: 900, letterSpacing: 1.2 }}>
        PLAYTEST COMMAND POST · {pulse.sampleSize} LOCAL RECEIPT{pulse.sampleSize === 1 ? "" : "S"}
      </summary>
      <p style={{ margin: "9px 0", color: palette.muted, lineHeight: 1.5 }}>
        Explicit tester answers stored on this device. Aggregate export contains no flight identifier, callsign, free text, or network upload.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
        {GROUPS.map(([label, key, options]) => (
          <section key={key} aria-label={label.toLowerCase()} style={{ padding: 10, borderRadius: 8, background: palette.panelSoft, border: `1px solid ${palette.line}` }}>
            <strong style={{ color: palette.cyan, letterSpacing: 1 }}>{label}</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7 }}>
              {options.map(([value, text]) => <span key={value}>{text} {pulse[key]?.[value] || 0}</span>)}
            </div>
          </section>
        ))}
      </div>
      <button type="button" onClick={copyAggregate} style={{ width: "100%", minHeight: 44, marginTop: 10, borderRadius: 8, border: `1px solid ${palette.line}`, background: palette.panelStrong, color: palette.ink, font: "inherit", fontWeight: 900, cursor: "pointer" }}>
        {copyState === "copied" ? "AGGREGATE COPIED" : copyState === "error" ? "CLIPBOARD UNAVAILABLE" : "COPY JAVASCRIPT OBJECT NOTATION (JSON) AGGREGATE"}
      </button>
    </details>
  );
}
