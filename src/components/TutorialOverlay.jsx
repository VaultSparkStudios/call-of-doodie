import { useState, useEffect } from "react";

const TUTORIAL_KEY = "cod-tutorial-v1";

const HINTS = [
  { key: "move",    emoji: "🕹️", title: "MOVE",    pc: "WASD",        mobile: "Left stick",  controller: "Left stick",  color: "#00FF88" },
  { key: "shoot",   emoji: "🔫", title: "SHOOT",   pc: "Left click",  mobile: "Right stick", controller: "RT / R2",     color: "#FF6B35" },
  { key: "dash",    emoji: "💨", title: "DASH",    pc: "Space/Shift", mobile: "Dash button", controller: "R3 (click)",  color: "#00E5FF" },
  { key: "grenade", emoji: "💣", title: "GRENADE", pc: "Q / G",       mobile: "💣 button",   controller: "B / Circle",  color: "#FFD700" },
  { key: "weapons", emoji: "🔧", title: "WEAPONS", pc: "1-9 / scroll",mobile: "◀ ▶ arrows",  controller: "LB/RB",       color: "#AA44FF" },
];

export default function TutorialOverlay({ isMobile, controllerConnected, wave, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    setVisible(true);
  }, []);

  // Auto-dismiss after 18s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => handleDismiss(), 18000);
    return () => clearTimeout(t);
  }, [visible]);

  // Auto-dismiss when leaving wave 1
  useEffect(() => {
    if (wave > 1 && visible) handleDismiss();
  }, [wave]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(TUTORIAL_KEY, "1");
    onDismiss?.();
  };

  if (!visible || dismissed) return null;

  const inputMode = controllerConnected ? "controller" : isMobile ? "mobile" : "pc";

  return (
    <div style={{
      position: "absolute", bottom: isMobile ? 70 : 60, left: "50%", transform: "translateX(-50%)",
      zIndex: 80, pointerEvents: "all", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    }}>
      <div style={{
        background: "rgba(0,0,0,0.88)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 10, padding: "10px 14px", display: "flex", gap: 10, flexWrap: "wrap",
        justifyContent: "center", maxWidth: "min(96vw, 500px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.7)",
      }}>
        {HINTS.map(h => (
          <div key={h.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 60 }}>
            <div style={{ fontSize: 18 }}>{h.emoji}</div>
            <div style={{ fontSize: 9, fontWeight: 900, color: h.color, letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>{h.title}</div>
            <div style={{ fontSize: 9, color: "#CCC", textAlign: "center", fontFamily: "'Courier New',monospace" }}>{h[inputMode]}</div>
          </div>
        ))}
      </div>
      <button
        onClick={handleDismiss}
        style={{
          padding: "5px 18px", fontSize: 10, fontWeight: 900, fontFamily: "'Courier New',monospace",
          background: "rgba(255,107,53,0.18)", border: "1px solid rgba(255,107,53,0.5)",
          borderRadius: 5, color: "#FF6B35", cursor: "pointer", letterSpacing: 1,
        }}
      >
        GOT IT
      </button>
    </div>
  );
}
