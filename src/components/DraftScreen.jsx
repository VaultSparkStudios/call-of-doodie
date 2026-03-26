import { useState } from "react";

const TIER_COLORS = { common: "#AAA", uncommon: "#00CC88", rare: "#6688FF", legendary: "#FFD700", cursed: "#CC00FF" };

export default function DraftScreen({ options, onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Courier New',monospace", color: "#fff",
    }}>
      <div style={{ maxWidth: 640, width: "94%", textAlign: "center" }}>
        <div style={{ fontSize: 9, color: "#555", letterSpacing: 5, marginBottom: 12 }}>── PRE-DEPLOYMENT ──</div>
        <div style={{ fontSize: "clamp(20px,5vw,32px)", fontWeight: 900, color: "#FFD700", letterSpacing: 3, marginBottom: 6 }}>
          CHOOSE YOUR EDGE
        </div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 28 }}>
          Pick one starting advantage — or skip to go in clean.
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          {options.map(perk => {
            const col = TIER_COLORS[perk.tier] || "#AAA";
            const isHov = hovered === perk.id;
            return (
              <button key={perk.id} onClick={() => onSelect(perk)}
                onMouseEnter={() => setHovered(perk.id)} onMouseLeave={() => setHovered(null)}
                style={{
                  flex: "1 1 160px", maxWidth: 190,
                  background: isHov ? `linear-gradient(160deg, ${col}20, rgba(0,0,0,0.7))` : "rgba(255,255,255,0.04)",
                  border: `2px solid ${isHov ? col : col + "44"}`,
                  borderRadius: 14, padding: "20px 14px 16px", cursor: "pointer",
                  color: "#fff", textAlign: "center",
                  transform: isHov ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: isHov ? `0 8px 28px ${col}33` : "none",
                  transition: "all 0.14s ease", outline: "none",
                }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{perk.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: isHov ? col : col + "CC", letterSpacing: 1.5, marginBottom: 6 }}>
                  {perk.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, color: "#666", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>{perk.tier}</div>
                <div style={{ fontSize: 11, color: isHov ? "#DDD" : "#777", lineHeight: 1.5 }}>{perk.desc}</div>
              </button>
            );
          })}
        </div>
        <button onClick={() => onSelect(null)} style={{
          background: "none", border: "1px solid #333", borderRadius: 6,
          color: "#555", fontSize: 11, padding: "8px 20px", cursor: "pointer",
          fontFamily: "'Courier New',monospace", letterSpacing: 1,
        }}>
          SKIP — GO IN CLEAN
        </button>
      </div>
    </div>
  );
}
