import { useMemo, useState } from "react";
import { aggregateOperationPlaytestReceipts, createPairedOperationPlaytestReceipt } from "../utils/operationPlaytest.js";

const STORAGE_KEY = "cod-operation-paired-playtests-v1";
const RATING_FIELDS = ["repeatedness", "objectiveClarity", "controlTrust", "threatReadability", "memorableMoment", "immediateReplayIntent"];
const LABELS = { repeatedness: "Felt varied", objectiveClarity: "Objective clarity", controlTrust: "Control trust", threatReadability: "Threat readability", memorableMoment: "Memorable moment", immediateReplayIntent: "Replay intent" };

function readReceipts() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value.slice(-49) : []; } catch { return []; }
}

export default function OperationPlaytestCommandPost({ receipt }) {
  const defaults = useMemo(() => Object.fromEntries(RATING_FIELDS.flatMap((field) => [[`standard-${field}`, 3], [`operation-${field}`, 3]])), []);
  const [ratings, setRatings] = useState(defaults);
  const [standardDuration, setStandardDuration] = useState(600);
  const [preferredNextMode, setPreferredNextMode] = useState("operation");
  const [aggregate, setAggregate] = useState(null);
  const score = (mode, field) => Number(ratings[`${mode}-${field}`]);
  const run = (mode) => ({
    route: mode === "operation" ? receipt?.route || "uncommitted" : "standard-fixed",
    durationSeconds: mode === "operation" ? Math.max(1, Number(receipt?.durationSeconds) || 900) : Number(standardDuration),
    ...Object.fromEntries(RATING_FIELDS.map((field) => [field, score(mode, field)])),
  });
  const submit = () => {
    const paired = createPairedOperationPlaytestReceipt({ optIn: true, standard: run("standard"), operation: run("operation"), preferredNextMode });
    if (!paired) return;
    const receipts = [...readReceipts(), paired].slice(-50);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts)); } catch {}
    setAggregate(aggregateOperationPlaytestReceipts(receipts));
  };
  const download = () => {
    if (!aggregate) return;
    const href = URL.createObjectURL(new Blob([`${JSON.stringify(aggregate, null, 2)}\n`], { type: "application/json" }));
    const link = document.createElement("a"); link.href = href; link.download = "operation-playtest-aggregate.json"; link.click(); URL.revokeObjectURL(href);
  };
  return <details style={{ margin: "16px 0", border: "1px solid #465463", borderRadius: 8, padding: 12 }}>
    <summary style={{ cursor: "pointer", color: "#7FE6FF", fontWeight: 900 }}>OPT-IN PAIRED PLAYTEST COMMAND POST</summary>
    <p style={{ color: "#AAB7C4", fontSize: 11 }}>Compare one Standard run with this Operation. Stored locally; export contains aggregates only, with no identity or free text.</p>
    <label style={{ display: "grid", gap: 4, fontSize: 11 }}>Standard duration (seconds)
      <input type="number" min="1" max="3600" value={standardDuration} onChange={(event) => setStandardDuration(event.target.value)} style={{ minHeight: 44 }} />
    </label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: 6, alignItems: "center", marginTop: 10, fontSize: 10 }}>
      <strong>1 = low · 5 = high</strong><strong>STANDARD</strong><strong>OP</strong>
      {RATING_FIELDS.map((field) => <div key={field} style={{ display: "contents" }}>
        <label htmlFor={`standard-${field}`}>{LABELS[field]}</label>
        {["standard", "operation"].map((mode) => <select key={mode} id={`${mode}-${field}`} aria-label={`${mode} ${LABELS[field]}`} value={ratings[`${mode}-${field}`]} onChange={(event) => setRatings((current) => ({ ...current, [`${mode}-${field}`]: event.target.value }))} style={{ minHeight: 44 }}>
          {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>)}
      </div>)}
    </div>
    <label style={{ display: "grid", gap: 4, marginTop: 10, fontSize: 11 }}>Preferred next mode
      <select value={preferredNextMode} onChange={(event) => setPreferredNextMode(event.target.value)} style={{ minHeight: 44 }}>
        {['operation', 'standard', 'either', 'neither'].map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    <input type="button" value="SAVE OPT-IN PAIR" onClick={submit} style={{ minHeight: 48, width: "100%", marginTop: 10 }} />
    {aggregate && <div role="status" style={{ marginTop: 8, fontSize: 10 }}>
      SAMPLE {aggregate.sampleSize} · CAMPAIGN {aggregate.gates.campaignBreadth.eligible ? "ELIGIBLE" : `${aggregate.gates.campaignBreadth.remaining} MORE`} · CO-OP {aggregate.gates.realtimeCoop.eligible ? "EVIDENCE ELIGIBLE" : `${aggregate.gates.realtimeCoop.remaining} MORE`}
      <input type="button" value="EXPORT AGGREGATE JSON" onClick={download} style={{ minHeight: 44, width: "100%", marginTop: 8 }} />
    </div>}
  </details>;
}
