import OperationArenaOverlay from "./OperationArenaOverlay.jsx";
import OperationCompleteModal from "./OperationCompleteModal.jsx";
import { getOperation } from "../systems/operationCampaign.js";
import { getCurrentEncounter } from "../systems/operationDirector.js";

const CAMPAIGN_GATE = Object.freeze({
  campaignEnabled: true,
  continueAvailable: true,
  campaignMessage: "Local route continuity is active; broader campaign expansion remains gated until at least 10 evidence-bound paired receipts. Continue returns to the command deck.",
  coopEnabled: false,
  coopMessage: "Realtime co-op remains gated until at least 20 paired receipts and the authoritative capacity court pass.",
});

export default function OperationRuntimeLayer({
  operationState, operationArenaState, operationObjectiveState, operationDirective, operationCompleteReceipt,
  paused, gamepadConnected, onInteract, onContinue, onRematch,
}) {
  const encounter = getCurrentEncounter(operationState);
  return <>
    {operationState && operationArenaState && encounter && !paused && !operationCompleteReceipt && (
      <OperationArenaOverlay
        arenaState={operationArenaState}
        encounter={encounter}
        objectiveState={operationObjectiveState}
        progress={{ encounterNumber: operationState.currentEncounterIndex + 1, encounterTotal: getOperation(operationState.operationId)?.encounters.length || 7, act: encounter.act }}
        missionScore={operationState.score}
        directorReason={operationDirective?.directive || operationDirective?.reasonCode || ""}
        onInteract={onInteract}
        gamepadConnected={gamepadConnected}
      />
    )}
    {operationCompleteReceipt && (
      <OperationCompleteModal
        receipt={operationCompleteReceipt}
        onContinue={onContinue}
        onRematch={onRematch}
        onReturnToMenu={onContinue}
        campaignGate={CAMPAIGN_GATE}
      />
    )}
  </>;
}
