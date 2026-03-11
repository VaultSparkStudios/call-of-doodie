import { ACHIEVEMENTS } from "../constants.js";

export default function AchievementsPanel({ achievementsUnlocked, onClose }) {
  const card = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: 16 };
  const tierColors = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", legendary: "#FF44FF" };
  const tierNames  = { bronze: "BRONZE",   silver: "SILVER",   gold: "GOLD",   legendary: "LEGENDARY" };
  const unlocked = achievementsUnlocked.length;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked / total) * 100);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
      <div style={{ ...card, maxWidth: 520, width: "100%", maxHeight: "88vh", overflow: "auto", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "18px 14px", color: "#fff" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
        <h3 style={{ color: "#FFD700", margin: "0 0 2px", fontSize: 18, letterSpacing: 2 }}>🏅 CAREER ACHIEVEMENTS</h3>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#CCC", marginBottom: 3 }}>
            <span>{unlocked}/{total} UNLOCKED</span><span>{pct}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg,#FF6B35,#FFD700)", borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>
        {["legendary", "gold", "silver", "bronze"].map(tier => {
          const tierAchs = ACHIEVEMENTS.filter(a => a.tier === tier);
          if (tierAchs.length === 0) return null;
          return (
            <div key={tier} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: tierColors[tier], fontWeight: 900, letterSpacing: 2, marginBottom: 6, borderBottom: "1px solid " + tierColors[tier] + "44", paddingBottom: 4 }}>
                {tierNames[tier]} ({tierAchs.filter(a => achievementsUnlocked.includes(a.id)).length}/{tierAchs.length})
              </div>
              {tierAchs.map(a => {
                const isUnlocked = achievementsUnlocked.includes(a.id);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderRadius: 6, marginBottom: 2, background: isUnlocked ? "rgba(255,215,0,0.06)" : "transparent", opacity: isUnlocked ? 1 : 0.45 }}>
                    <span style={{ fontSize: 20, filter: isUnlocked ? "none" : "grayscale(1)" }}>{a.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isUnlocked ? tierColors[tier] : "#999" }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: isUnlocked ? "#CCC" : "#666" }}>{a.desc}</div>
                    </div>
                    {isUnlocked && <span style={{ fontSize: 10, color: "#0F0", fontWeight: 900 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
