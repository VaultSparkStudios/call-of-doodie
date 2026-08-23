import { useEffect, useMemo, useRef } from "react";
import { getOperationArenaCues } from "../systems/operationArenaState.js";
import { getOperationEncounterAction } from "../systems/operationEncounterContract.js";

function verbOf(encounter) {
  return String(encounter?.verb || encounter?.type || "").toUpperCase();
}

export default function OperationArenaOverlay({
  arenaState,
  encounter,
  objectiveState,
  proximitySnapshot,
  progress,
  missionScore = 0,
  directorReason = "",
  onInteract,
  gamepadConnected = false,
}) {
  const action = getOperationEncounterAction(encounter);
  const cues = useMemo(() => arenaState ? getOperationArenaCues(arenaState) : [], [arenaState]);
  const target = action ? arenaState?.interactables?.find((item) => item.id === action.targetId) : null;
  const cue = action ? cues.find((item) => item.id === action.targetId) : null;
  const completed = objectiveState ? objectiveState.actionComplete : Boolean(target && target.transitionReceipts) || (
    action?.command === "open" && target?.state === "open"
  ) || (
    action?.command === "power" && target?.state === "powered"
  ) || (
    action?.command === "enter" && target?.state === "occupied"
  ) || (
    action?.command === "flood" && target?.state === "flooded"
  ) || (
    action?.command === "arm" && target?.state === "ready"
  ) || (
    action?.command === "drain" && target?.state === "drained"
  );
  const pressedRef = useRef(false);
  const inRange = proximitySnapshot?.available === true && proximitySnapshot.inRange === true;
  const trigger = () => {
    if (!action || completed || !inRange) return;
    onInteract?.({ ...action, inputSource: "touch" });
  };

  useEffect(() => {
    if (!action || completed) return undefined;
    const onKeyDown = (event) => {
      if (event.code !== "KeyE" || event.repeat || !inRange) return;
      event.preventDefault();
      onInteract?.({ ...action, inputSource: "keyboard" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [action, completed, inRange, onInteract]);

  useEffect(() => {
    if (!gamepadConnected || !action || completed || typeof navigator.getGamepads !== "function") return undefined;
    const id = setInterval(() => {
      const pressed = Boolean(navigator.getGamepads()?.find(Boolean)?.buttons?.[0]?.pressed);
      if (pressed && !pressedRef.current && inRange) onInteract?.({ ...action, inputSource: "controller" });
      pressedRef.current = pressed;
    }, 80);
    return () => clearInterval(id);
  }, [action, completed, gamepadConnected, inRange, onInteract]);

  if (!arenaState || !encounter) return null;
  const encounterNumber = Number(progress?.encounterNumber || progress?.index + 1 || 1);
  const encounterTotal = Number(progress?.encounterTotal || progress?.total || 7);
  const act = Number(progress?.act || encounter?.act || 1);

  return (
    <aside
      data-testid="operation-arena-overlay"
      aria-label="Operation command overlay"
      style={{
        position: "absolute",
        top: "max(150px, calc(env(safe-area-inset-top) + 72px))",
        right: 8,
        zIndex: 48,
        width: "min(310px, calc(100vw - 16px))",
        padding: 10,
        pointerEvents: "all",
        border: "1px solid rgba(80,225,255,.46)",
        borderRadius: 12,
        color: "#EAFBFF",
        background: "rgba(4,12,18,.91)",
        boxShadow: "0 12px 32px rgba(0,0,0,.38)",
        backdropFilter: "blur(10px)",
        fontFamily: "Inter,system-ui,sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#72E8FF", fontSize: 9, fontWeight: 900, letterSpacing: 1.2 }}>
        <span>OPERATION · ACT {act}</span>
        <span>{encounterNumber}/{encounterTotal} · {missionScore.toLocaleString()} PTS</span>
      </div>
      <strong style={{ display: "block", marginTop: 6, fontSize: 14, letterSpacing: .6 }}>
        {verbOf(encounter)} · {encounter.label || encounter.title || "FIELD ORDER"}
      </strong>
      <span style={{ display: "block", marginTop: 3, color: "#AFC4CD", fontSize: 10, lineHeight: 1.35 }}>
        {encounter.description || encounter.objective || action?.benefit}
      </span>
      {directorReason && <span style={{ display: "block", marginTop: 5, color: "#FFD57B", fontSize: 9 }}>DIRECTOR: {directorReason}</span>}
      {objectiveState && <span data-testid="operation-objective-status" style={{ display: "block", marginTop: 5, color: objectiveState.actionComplete ? "#7CFFB8" : "#FFD57B", fontSize: 9, fontWeight: 900 }}>
        {objectiveState.actionComplete ? "OBJECTIVE CONFIRMED" : objectiveState.reinforcementCount > 0 ? `OBJECTIVE REQUIRED · REINFORCEMENTS ${objectiveState.reinforcementCount}` : "OBJECTIVE ACTION REQUIRED"}
      </span>}
      {action && !completed && <div
        data-testid="operation-proximity-status"
        style={{
          marginTop: 6,
          padding: "6px 8px",
          border: `1px solid ${inRange ? "rgba(124,255,184,.45)" : "rgba(255,213,123,.48)"}`,
          borderRadius: 7,
          color: inRange ? "#7CFFB8" : "#FFD57B",
          background: inRange ? "rgba(20,90,55,.18)" : "rgba(115,73,12,.18)",
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: .5,
        }}
      >
        {!proximitySnapshot?.available
          ? "TARGET POSITION UNAVAILABLE · ACTION LOCKED"
          : inRange
            ? `IN RANGE · ${proximitySnapshot.centerDistancePx} PX ${proximitySnapshot.direction}`
            : `${proximitySnapshot.distanceToRangePx} PX TO RANGE · MOVE ${proximitySnapshot.direction}`}
      </div>}
      {action && (
        <button
          type="button"
          data-testid="operation-interact"
          disabled={completed || !inRange}
          onClick={trigger}
          style={{
            width: "100%",
            minHeight: 48,
            marginTop: 8,
            padding: "8px 10px",
            border: `1px solid ${completed ? "rgba(124,255,184,.32)" : inRange ? "rgba(114,232,255,.58)" : "rgba(255,213,123,.38)"}`,
            borderRadius: 9,
            color: completed ? "#7CFFB8" : inRange ? "#FFFFFF" : "#C7B98E",
            background: completed ? "rgba(20,90,55,.22)" : inRange ? "rgba(25,126,158,.24)" : "rgba(90,72,34,.18)",
            font: "inherit",
            fontSize: 10,
            fontWeight: 900,
            cursor: completed || !inRange ? "not-allowed" : "pointer",
          }}
        >
          {completed
            ? `✓ ${cue?.stateLabel || "INTERACTION COMPLETE"}`
            : inRange
              ? `${action.label} · E / A / USE`
              : `${action.label} · GET IN RANGE`}
        </button>
      )}
      {cue && <div role="status" aria-live="polite" style={{ marginTop: 5, color: cue.tone === "danger" ? "#FFAA91" : "#9FE9C6", fontSize: 9 }}>{cue.worldCue} · {cue.pattern}</div>}
    </aside>
  );
}
