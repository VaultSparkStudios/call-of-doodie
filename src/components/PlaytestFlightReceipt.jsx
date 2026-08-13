import { useState } from "react";
import { annotateActivePlaytestFlight, buildPortablePlaytestReceipt, isPlaytestMode, loadPlaytestFlight, recordPlaytestPulse } from "../utils/playtestFlightRecorder.js";

const QUESTIONS = [
  ["Did the cause of death make sense?", "deathClarity", [["clear", "CLEAR"], ["partial", "PARTLY"], ["unclear", "UNCLEAR"]]],
  ["Would you start another run?", "replayIntent", [["now", "NOW"], ["later", "LATER"], ["no", "NO"]]],
  ["Did the controls obey you?", "inputTrust", [["trusted", "YES"], ["mixed", "MOSTLY"], ["failed", "NO"]]],
  ["Could you read the danger?", "threatReadability", [["clear", "CLEAR"], ["busy", "BUSY"], ["lost", "LOST"]]],
];

export default function PlaytestFlightReceipt({ cardStyle = {}, buttonStyle = {}, enabled = isPlaytestMode() }) {
  const [receipt, setReceipt] = useState(() => enabled ? loadPlaytestFlight() : null);
  const [copyState, setCopyState] = useState("idle");
  if (!enabled || !receipt) return null;

  const updateAnswer = (answer) => {
    const next = annotateActivePlaytestFlight(answer);
    if (next) {
      setReceipt(next);
      recordPlaytestPulse(next);
    }
  };
  const copyReceipt = async () => {
    const portable = buildPortablePlaytestReceipt(receipt || loadPlaytestFlight());
    if (!portable) return;
    try {
      if (typeof navigator.clipboard?.writeText !== "function") throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(JSON.stringify(portable, null, 2));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <section aria-label="Playtest flight receipt" style={{ ...cardStyle, marginBottom: 12, textAlign: "left", border: "1px solid rgba(180,140,255,0.48)", background: "rgba(110,70,180,0.11)" }}>
      <div style={{ fontSize: 10, color: "#C8A8FF", letterSpacing: 2, fontWeight: 900 }}>PLAYTEST FLIGHT RECEIPT · LOCAL ONLY</div>
      <p style={{ margin: "7px 0", fontSize: 10, color: "#D8D0E8", lineHeight: 1.45 }}>
        This opt-in receipt stays in this browser session. It stores observed milestones and these button answers—no callsign, free text, or network upload.
      </p>
      {QUESTIONS.map(([legend, key, answers]) => (
        <fieldset key={key} style={{ border: 0, padding: 0, margin: "8px 0" }}>
          <legend style={{ fontSize: 10, color: "#FFF", fontWeight: 900 }}>{legend}</legend>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
            {answers.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={receipt.annotations?.[key] === value} onClick={() => updateAnswer({ [key]: value })} style={{ ...buttonStyle, padding: "6px 9px", fontSize: 10, border: `1px solid ${receipt.annotations?.[key] === value ? "#C8A8FF" : "#555"}` }}>{label}</button>
            ))}
          </div>
        </fieldset>
      ))}
      <button type="button" onClick={copyReceipt} style={{ ...buttonStyle, width: "100%", minHeight: 44, fontSize: 10 }}>
        {copyState === "copied" ? "COPIED" : copyState === "error" ? "CLIPBOARD UNAVAILABLE" : "COPY JAVASCRIPT OBJECT NOTATION (JSON) RECEIPT"}
      </button>
    </section>
  );
}
