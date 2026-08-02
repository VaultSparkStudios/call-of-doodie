export function formatDebugNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

export function buildInputDebugRows(data = {}) {
  const d = data || {};
  return [
    ["SRC", d.source || "--"],
    ["MOVE", `${Array.isArray(d.movementSources) && d.movementSources.length ? d.movementSources.join("+") : "idle"}${d.movementContention ? " !CONFLICT" : ""}`],
    ["PAD", d.connected ? `${d.controllerType || "controller"} #${d.controllerIndex ?? "?"}` : "none"],
    ["ID", d.controllerId ? String(d.controllerId).slice(0, 34) : "--"],
    ["LSTICK", `${formatDebugNumber(d.leftX)} ${formatDebugNumber(d.leftY)} ${d.leftActive ? "ACTIVE" : "idle"}`],
    ["AIM", `${formatDebugNumber(d.aimAngle)} rad`],
    ["PAD AIM", d.gamepadAimAngle == null ? "--" : `${formatDebugNumber(d.gamepadAimAngle)} rad`],
    ["PTR", `${d.pointerX ?? "--"},${d.pointerY ?? "--"}`],
    ["SWEEP", d.pointerSweep ? `pointer:${d.pointerSweep}` : "--"],
    ["CAL", d.calibration || "unverified"],
    ["INPUT AGE", d.inputAgeMs == null ? "--" : `${Math.round(d.inputAgeMs)} ms`],
    ["RELEASE", d.lastReleaseReason ? `${d.lastReleaseReason} · ${Math.round(d.lastReleaseAgeMs || 0)} ms` : "--"],
    ["ACTIONS", `shoot:${d.shoot ? "1" : "0"} dash:${d.dashReady ? "ready" : "cool"} grenade:${d.grenadeReady ? "ready" : "cool"} reload:${d.reloading ? "1" : "0"}`],
    ["TRACE", `${d.traceEvents || 0} events · aim ${d.traceAim || 0} · move ${d.traceMove || 0}`],
  ];
}
