import OperationArenaOverlay from "./OperationArenaOverlay.jsx";
import OperationCompleteModal from "./OperationCompleteModal.jsx";
import { getOperation } from "../systems/operationCampaign.js";
import { getCurrentEncounter } from "../systems/operationDirector.js";

const CAMPAIGN_GATE = Object.freeze({
  campaignEnabled: true,
  continueAvailable: true,
  campaignMessage: "Your route choices carry into later Operations on this device. Continue returns to the command deck.",
  coopEnabled: false,
  coopMessage: "These are solo Operations with computer-controlled allies. Online co-op is not available.",
});

export default function OperationRuntimeLayer({
  operationState, operationArenaState, operationObjectiveState, operationProximitySnapshot, operationDirective, operationCompleteReceipt,
  paused, gamepadConnected, onInteract, onInteractHeld, onContinue, onRematch,
}) {
  const encounter = getCurrentEncounter(operationState);
  return <>
    {operationState && operationArenaState && encounter && !paused && !operationCompleteReceipt && (
      <OperationArenaOverlay
        arenaState={operationArenaState}
        encounter={encounter}
        objectiveState={operationObjectiveState}
        proximitySnapshot={operationProximitySnapshot}
        progress={{ encounterNumber: operationState.currentEncounterIndex + 1, encounterTotal: getOperation(operationState.operationId)?.encounters.length || 7, act: encounter.act }}
        missionScore={operationState.score}
        directorReason={operationDirective?.directive || operationDirective?.reasonCode || ""}
        onInteract={onInteract}
        onInteractHeld={onInteractHeld}
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
