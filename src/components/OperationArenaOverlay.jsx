import { useEffect, useMemo, useRef } from "react";
import { getOperationArenaCues } from "../systems/operationArenaState.js";

const ENCOUNTER_ACTIONS = Object.freeze({
  BREACH: { targetId: "door-north", command: "open", label: "BREACH THE NORTH DOOR", benefit: "Opens the short assault lane." },
  HOLD: { targetId: "turret-northwest", command: "power", label: "POWER THE HOLD TURRET", benefit: "Adds bounded auto-defense pressure." },
  ESCORT: { targetId: "valve-east", command: "power", label: "PRESSURIZE THE ESCORT LANE", benefit: "Keeps the cart lane clean and readable." },
  HUNT: { targetId: "watchtower-center", command: "enter", label: "TAKE THE WATCHTOWER", benefit: "Marks the target sightline." },
  SABOTAGE: { targetId: "pump-west", command: "flood", label: "FLOOD THE ENEMY LINE", benefit: "Changes the west lane into a hazard." },
  ESCAPE: { targetId: "extraction-toilet-alpha", command: "arm", label: "ARM EXTRACTION", benefit: "Prepares the porcelain exit." },
  BOSS: { targetId: "pump-west", command: "drain", label: "DRAIN THE BOSS FLOOR", benefit: "Clears the finale arena." },
});

function verbOf(encounter) {
  return String(encounter?.verb || encounter?.type || "").toUpperCase();
}

function getOperationEncounterAction(encounter) {
  return ENCOUNTER_ACTIONS[verbOf(encounter)] || null;
}

export default function OperationArenaOverlay({
  arenaState,
  encounter,
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
  const completed = Boolean(target && target.transitionReceipts) || (
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
  const trigger = () => {
    if (!action || completed) return;
    onInteract?.({ ...action, inputSource: "touch" });
  };

  useEffect(() => {
    if (!action || completed) return undefined;
    const onKeyDown = (event) => {
      if (event.code !== "KeyE" || event.repeat) return;
      event.preventDefault();
      onInteract?.({ ...action, inputSource: "keyboard" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [action, completed, onInteract]);

  useEffect(() => {
    if (!gamepadConnected || !action || completed || typeof navigator.getGamepads !== "function") return undefined;
    const id = setInterval(() => {
      const pressed = Boolean(navigator.getGamepads()?.find(Boolean)?.buttons?.[0]?.pressed);
      if (pressed && !pressedRef.current) onInteract?.({ ...action, inputSource: "controller" });
      pressedRef.current = pressed;
    }, 80);
    return () => clearInterval(id);
  }, [action, completed, gamepadConnected, onInteract]);

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
      {action && (
        <button
          type="button"
          data-testid="operation-interact"
          disabled={completed}
          onClick={trigger}
          style={{
            width: "100%",
            minHeight: 48,
            marginTop: 8,
            padding: "8px 10px",
            border: `1px solid ${completed ? "rgba(124,255,184,.32)" : "rgba(114,232,255,.58)"}`,
            borderRadius: 9,
            color: completed ? "#7CFFB8" : "#FFFFFF",
            background: completed ? "rgba(20,90,55,.22)" : "rgba(25,126,158,.24)",
            font: "inherit",
            fontSize: 10,
            fontWeight: 900,
            cursor: completed ? "default" : "pointer",
          }}
        >
          {completed ? `✓ ${cue?.stateLabel || "INTERACTION COMPLETE"}` : `${action.label} · E / A / USE`}
        </button>
      )}
      {cue && <div role="status" aria-live="polite" style={{ marginTop: 5, color: cue.tone === "danger" ? "#FFAA91" : "#9FE9C6", fontSize: 9 }}>{cue.worldCue} · {cue.pattern}</div>}
    </aside>
  );
}
