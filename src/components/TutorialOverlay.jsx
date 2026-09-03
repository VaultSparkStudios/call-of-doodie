import { useState, useEffect, useCallback } from "react";
import { getControllerLabels } from "../utils/gamepad.js";
import { completeTutorial, shouldShowTutorial, tutorialStepComplete } from "../utils/tutorialProgress.js";
import "./tutorial-overlay.css";

const STEPS = [
  { icon: "↔", title: "Move", requirement: "move", desc: "Reposition to keep enemies at a safe distance.", pc: "WASD", mobile: "Drag the left side", controller: "Left stick", color: "#00FF88" },
  { icon: "✦", title: "Fire and defeat one enemy", requirement: ["shoot", "kill"], desc: "Aim into a crowd and keep moving.", pc: "Aim + left click", mobile: "Drag the right side", controller: "RT / R2", color: "#FFB14A" },
  { icon: "»", title: "Dash", requirement: "dash", desc: "Dodge through danger while briefly invulnerable.", pc: "Space or Shift", mobile: "Tap Dash", controller: "A / Cross", color: "var(--cod-cyan)" },
  { icon: "●", title: "Throw a grenade", requirement: "grenade", desc: "Use grenades when enemies group together.", pc: "Q or G", mobile: "Tap Grenade", controller: "B / Circle", color: "var(--cod-orange)" },
  { icon: "◆", title: "Choose an upgrade", requirement: "perk", desc: "Collect experience, level up, and shape your build.", pc: null, mobile: null, controller: null, color: "#C790FF" },
];

export default function TutorialOverlay({ isMobile, controllerConnected, controllerType = "controller", evidence = {}, onDismiss }) {
  const [visible, setVisible] = useState(() => shouldShowTutorial());
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const observed = tutorialStepComplete(current.requirement, evidence);
  const inputMode = controllerConnected ? "controller" : isMobile ? "mobile" : "pc";
  const controllerLabels = getControllerLabels(controllerType);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    completeTutorial();
    onDismiss?.();
  }, [onDismiss]);

  const goNext = useCallback(() => {
    if (animating) return;
    if (isLast) return handleDismiss();
    setAnimating(true);
    setTimeout(() => {
      setStep((value) => Math.min(STEPS.length - 1, value + 1));
      setAnimating(false);
    }, 140);
  }, [animating, handleDismiss, isLast]);

  useEffect(() => {
    if (!visible || !observed) return undefined;
    const timer = setTimeout(() => goNext(), isLast ? 500 : 260);
    return () => clearTimeout(timer);
  }, [goNext, isLast, observed, visible]);

  if (!visible) return null;

  const controlText = inputMode === "controller"
    ? ({ Move: controllerLabels.move, "Fire and defeat one enemy": controllerLabels.shoot, Dash: controllerLabels.dash, "Throw a grenade": controllerLabels.grenade }[current.title] || current[inputMode])
    : current[inputMode];

  return (
    <aside className={`training-chip${isMobile ? " training-chip--mobile" : ""}${observed ? " training-chip--observed" : ""}`} aria-live="polite" style={{ "--training-color": current.color }}>
      <div className="training-chip__progress" aria-label={`Training step ${step + 1} of ${STEPS.length}`}>
        <span style={{ width: `${((step + (observed ? 1 : 0)) / STEPS.length) * 100}%` }} />
      </div>
      <div className="training-chip__body">
        <span className="training-chip__icon" aria-hidden="true">{observed ? "✓" : current.icon}</span>
        <div className="training-chip__copy">
          <div className="training-chip__eyebrow">Training · {step + 1}/{STEPS.length}</div>
          <strong>{observed ? "Nice. Keep moving." : current.title}</strong>
          <span>{observed ? "Next tip incoming…" : current.desc}</span>
        </div>
        {controlText && !observed && <kbd>{controlText}</kbd>}
        <button type="button" onClick={handleDismiss} aria-label="Skip training">Skip</button>
      </div>
    </aside>
  );
}
