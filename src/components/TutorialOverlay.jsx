import { useState, useEffect, useCallback } from "react";
import { getControllerLabels } from "../utils/gamepad.js";
import { completeTutorial, shouldShowTutorial, tutorialStepComplete } from "../utils/tutorialProgress.js";

const STEPS = [
  {
    emoji: "💀", title: "WELCOME, SOLDIER", requirement: null,
    desc: "Survive absurd waves. This training advances from actions we observe, never from a timer.",
    pc: null, mobile: null, controller: null, color: "#FFD700", tip: "Choose NEXT when you are ready to move.",
  },
  {
    emoji: "🕹️", title: "MOVE", requirement: "move",
    desc: "Reposition once so the input path can confirm movement.",
    pc: "WASD", mobile: "Left thumb", controller: "Left stick", color: "#00FF88", tip: "Observed movement advances training.",
  },
  {
    emoji: "🔫", title: "SHOOT + FIRST KILL", requirement: ["shoot", "kill"],
    desc: "Fire and defeat one enemy. A trigger press alone is not a successful attack.",
    pc: "Mouse aim + Left Click", mobile: "Right thumb", controller: "RT / R2", color: "#FF6B35", tip: "Gold numbers mark critical hits.",
  },
  {
    emoji: "💨", title: "DASH", requirement: "dash",
    desc: "Use the short invincible dodge once.",
    pc: "Space or Shift", mobile: "DASH button", controller: "A / Cross", color: "#00E5FF", tip: "Dash through danger; do not stand still.",
  },
  {
    emoji: "💣", title: "GRENADE", requirement: "grenade",
    desc: "Throw one area-of-effect grenade.",
    pc: "Q or G", mobile: "💣 button", controller: "B / Circle", color: "#FF4500", tip: "Save it for groups when the cooldown matters.",
  },
  {
    emoji: "✨", title: "CHOOSE A PERK", requirement: "perk",
    desc: "Earn experience from kills, level up, and choose one perk.",
    pc: null, mobile: null, controller: null, color: "#AA44FF", tip: "Perks stack; synergies define the run.",
  },
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
    }, 160);
  }, [animating, handleDismiss, isLast]);

  useEffect(() => {
    if (!visible || !observed) return undefined;
    const timer = setTimeout(() => goNext(), isLast ? 650 : 350);
    return () => clearTimeout(timer);
  }, [goNext, isLast, observed, visible]);

  if (!visible) return null;

  const controlText = inputMode === "controller"
    ? ({ MOVE: controllerLabels.move, "SHOOT + FIRST KILL": controllerLabels.shoot, DASH: controllerLabels.dash, GRENADE: controllerLabels.grenade }[current.title] || current[inputMode])
    : current[inputMode];

  return (
    <div aria-live="polite" style={{ position: "absolute", bottom: isMobile ? 80 : 70, left: "50%", transform: "translateX(-50%)", zIndex: 80, pointerEvents: "all", width: "min(92vw, 440px)" }}>
      <div style={{ background: "rgba(8,8,20,0.94)", border: `1px solid ${current.color}66`, borderRadius: 14, padding: "14px 18px", boxShadow: `0 0 28px ${current.color}22, 0 6px 32px rgba(0,0,0,0.8)`, opacity: animating ? 0.3 : 1, transition: "opacity 0.16s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>{current.emoji}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: current.color, letterSpacing: 2, fontFamily: "monospace" }}>{current.title}</div>
            <div style={{ fontSize: 11, color: "#CCC", fontFamily: "monospace", marginTop: 1 }}>{current.desc}</div>
          </div>
        </div>
        {controlText && <div style={{ background: `${current.color}18`, border: `1px solid ${current.color}44`, borderRadius: 6, padding: "5px 10px", marginBottom: 8, color: current.color, font: "900 12px monospace" }}>{controlText}</div>}
        <div role="status" style={{ fontSize: 10, color: observed ? "#9BFFBD" : "#B8C2D8", fontFamily: "monospace" }}>
          {current.requirement ? (observed ? "✓ ACTION OBSERVED" : "WAITING FOR OBSERVED ACTION") : "READY WHEN YOU ARE"}
        </div>
        {current.tip && <div style={{ fontSize: 9, color: "#888", fontFamily: "monospace", marginTop: 6 }}>💡 {current.tip}</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>{STEPS.map((_, index) => <div key={index} style={{ width: index === step ? 14 : 6, height: 6, borderRadius: 3, background: index === step ? current.color : "rgba(255,255,255,0.2)" }} />)}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleDismiss} style={{ padding: "4px 12px", font: "700 9px monospace", background: "transparent", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 4, color: "#AAA", cursor: "pointer" }}>SKIP</button>
            <button onClick={goNext} style={{ padding: "4px 16px", font: "900 9px monospace", background: `linear-gradient(180deg,${current.color}cc,${current.color}88)`, border: `1px solid ${current.color}`, borderRadius: 4, color: "#000", cursor: "pointer" }}>{isLast ? "FINISH" : observed ? "OBSERVED ✓" : "NEXT →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
