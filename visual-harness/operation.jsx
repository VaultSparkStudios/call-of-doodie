import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OperationCompleteModal from "../src/components/OperationCompleteModal.jsx";
import { applyTheme, readTheme } from "../src/utils/theme.js";

applyTheme(readTheme(), { persist: false });

const receipt = Object.freeze({
  mission: "Blacksite Flush",
  score: 8125,
  act: "ACT III",
  route: "Executive Washroom",
  checkpoint: "LOCAL OPERATION RECEIPT",
  fingerprint: "op-3101-executive-washroom-7f4c9b20",
  durationSeconds: 814,
  scoringContract: "operation-score-v2",
  scoreBreakdown: Object.freeze({
    schemaVersion: "operation-score-v2",
    objective: 7000,
    interaction: 450,
    tempo: 775,
    extraction: 500,
    pressurePenalty: 600,
    awarded: 8125,
  }),
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <OperationCompleteModal
      receipt={receipt}
      onContinue={() => {}}
      onRematch={() => {}}
      onReturnToMenu={() => {}}
    />
  </StrictMode>,
);
