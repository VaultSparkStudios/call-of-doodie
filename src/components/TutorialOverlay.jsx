import { useState, useEffect, useRef, useCallback } from "react";

const TUTORIAL_KEY = "cod-tutorial-v1";

const STEPS = [
  {
    emoji: "💀",
    title: "WELCOME, SOLDIER",
    desc: "Survive endless waves of absurd enemies. The longer you last, the harder it gets.",
    pc: null, mobile: null, controller: null,
    color: "#FFD700",
    tip: null,
  },
  {
    emoji: "🕹️",
    title: "MOVE",
    desc: "Dodge enemies and reposition constantly — standing still is death.",
    pc: "WASD",
    mobile: "Left thumb",
    controller: "Left stick",
    color: "#00FF88",
    tip: "Dash through enemies for brief invincibility!",
  },
  {
    emoji: "🔫",
    title: "SHOOT",
    desc: "Aim and fire at enemies. Kill streaks multiply your score.",
    pc: "Mouse aim + Left Click",
    mobile: "Right thumb",
    controller: "RT / R2",
    color: "#FF6B35",
    tip: "Critical hits deal 2× damage — look for the gold numbers!",
  },
  {
    emoji: "💨",
    title: "DASH",
    desc: "Short invincible dodge through enemies and bullets.",
    pc: "Space or Shift",
    mobile: "DASH button",
    controller: "R3 (right stick click)",
    color: "#00E5FF",
    tip: "Dash kills count for special missions!",
  },
  {
    emoji: "💣",
    title: "GRENADE",
    desc: "AOE explosion — great for clearing groups of enemies.",
    pc: "Q or G",
    mobile: "💣 button",
    controller: "LB / L1",
    color: "#FF4500",
    tip: "Perks can boost grenade damage and cut cooldown.",
  },
  {
    emoji: "✨",
    title: "LEVEL UP → PERKS",
    desc: "Kill enemies to gain XP. Every level-up lets you choose a perk — they stack.",
    pc: null, mobile: null, controller: null,
    color: "#AA44FF",
    tip: "Pair perks wisely — some have powerful synergies!",
  },
];

export default function TutorialOverlay({ isMobile, controllerConnected, wave, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const autoTimerRef = useRef(null);

  const inputMode = controllerConnected ? "controller" : isMobile ? "mobile" : "pc";
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    setVisible(true);
  }, []);

  // Auto-advance steps every 6 seconds
  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(TUTORIAL_KEY, "1");
    onDismiss?.();
  }, [onDismiss]);

  const goNext = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimating(false);
    }, 160);
  }, [animating]);

  useEffect(() => {
    if (!visible || dismissed) return;
    clearTimeout(autoTimerRef.current);
    autoTimerRef.current = setTimeout(() => {
      if (isLast) handleDismiss();
      else goNext();
    }, 6000);
    return () => clearTimeout(autoTimerRef.current);
  }, [dismissed, goNext, handleDismiss, isLast, visible]);

  useEffect(() => {
    if (wave > 1 && visible) handleDismiss();
  }, [handleDismiss, visible, wave]);

  if (!visible || dismissed) return null;

  const controlText = current[inputMode];

  return (
    <div style={{
      position: "absolute",
      bottom: isMobile ? 80 : 70,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 80,
      pointerEvents: "all",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      width: "min(92vw, 440px)",
    }}>
      {/* Main card */}
      <div style={{
        background: "rgba(8,8,20,0.94)",
        border: `1px solid ${current.color}44`,
        borderRadius: 14,
        padding: "14px 18px",
        width: "100%",
        boxShadow: `0 0 28px ${current.color}22, 0 6px 32px rgba(0,0,0,0.8)`,
        opacity: animating ? 0.3 : 1,
        transition: "opacity 0.16s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>{current.emoji}</div>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 900, color: current.color,
              letterSpacing: 2, fontFamily: "'Courier New',monospace",
            }}>
              {current.title}
            </div>
            <div style={{ fontSize: 11, color: "#CCC", fontFamily: "'Courier New',monospace", marginTop: 1 }}>
              {current.desc}
            </div>
          </div>
        </div>

        {/* Control badge */}
        {controlText && (
          <div style={{
            background: `${current.color}18`,
            border: `1px solid ${current.color}44`,
            borderRadius: 6,
            padding: "5px 10px",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{ fontSize: 9, color: "#888", fontFamily: "'Courier New',monospace", letterSpacing: 1 }}>
              {controllerConnected ? "🎮" : isMobile ? "📱" : "⌨️"}
            </span>
            <span style={{ fontSize: 12, fontWeight: 900, color: current.color, fontFamily: "'Courier New',monospace" }}>
              {controlText}
            </span>
          </div>
        )}

        {/* Tip */}
        {current.tip && (
          <div style={{ fontSize: 9, color: "#888", fontFamily: "'Courier New',monospace", fontStyle: "italic" }}>
            💡 {current.tip}
          </div>
        )}

        {/* Footer: progress dots + buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 14 : 6, height: 6,
                borderRadius: 3,
                background: i === step ? current.color : "rgba(255,255,255,0.2)",
                transition: "all 0.25s ease",
              }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleDismiss} style={{
              padding: "4px 12px", fontSize: 9, fontWeight: 700,
              fontFamily: "'Courier New',monospace",
              background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4, color: "#666", cursor: "pointer", letterSpacing: 1,
            }}>
              SKIP
            </button>
            <button onClick={isLast ? handleDismiss : goNext} style={{
              padding: "4px 16px", fontSize: 9, fontWeight: 900,
              fontFamily: "'Courier New',monospace",
              background: `linear-gradient(180deg,${current.color}cc,${current.color}88)`,
              border: `1px solid ${current.color}`,
              borderRadius: 4, color: "#000", cursor: "pointer", letterSpacing: 1,
            }}>
              {isLast ? "LET'S GO! 💀" : "NEXT →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
