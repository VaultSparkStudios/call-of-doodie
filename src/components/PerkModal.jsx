import { PERKS, CURSED_PERKS, PERK_TIER_COLORS, PERK_TIER_WEIGHTS } from "../constants.js";

/** Pick `count` random perks. One slot has a 35% chance to be a cursed perk. */
export function getRandomPerks(count = 3) {
  const pool = [];
  PERKS.forEach(p => {
    const w = PERK_TIER_WEIGHTS[p.tier] || 1;
    for (let i = 0; i < w; i++) pool.push(p);
  });

  const chosen = [];
  const used = new Set();
  let attempts = 0;
  while (chosen.length < count && attempts < 200) {
    attempts++;
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(p.id)) { used.add(p.id); chosen.push(p); }
  }
  while (chosen.length < count) chosen.push(PERKS[Math.floor(Math.random() * PERKS.length)]);

  // 35% chance: replace the last option with a random cursed perk
  if (Math.random() < 0.35 && CURSED_PERKS.length > 0) {
    const cursed = CURSED_PERKS[Math.floor(Math.random() * CURSED_PERKS.length)];
    chosen[chosen.length - 1] = cursed;
  }
  return chosen;
}

export default function PerkModal({ options, level, onSelect }) {
  const tierLabel = { common: "COMMON", uncommon: "UNCOMMON", rare: "RARE", legendary: "LEGENDARY", cursed: "⚠ CURSED" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backdropFilter: "blur(8px)",
    }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center", color: "#fff", fontFamily: "'Courier New',monospace" }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>✨</div>
        <h2 style={{ fontSize: "clamp(18px,5vw,28px)", fontWeight: 900, margin: "0 0 4px", color: "#00FF88", letterSpacing: 2 }}>
          LEVEL {level} — PERK SELECT
        </h2>
        <p style={{ color: "#AAA", fontSize: 12, margin: "0 0 16px" }}>Choose one upgrade. They stack!</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((perk) => {
            const isCursed = perk.tier === "cursed";
            const tierColor = PERK_TIER_COLORS[perk.tier] || "#AAA";
            const baseBg = isCursed ? "rgba(255,30,60,0.08)" : "rgba(255,255,255,0.05)";
            const hoverBg = isCursed ? "rgba(255,30,60,0.18)" : "rgba(255,255,255,0.12)";
            return (
              <button
                key={perk.id}
                onClick={() => onSelect(perk)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 10, cursor: "pointer",
                  background: baseBg,
                  border: "2px solid " + tierColor + (isCursed ? "99" : "55"),
                  color: "#FFF", fontFamily: "'Courier New',monospace",
                  textAlign: "left", transition: "all 0.15s",
                  boxShadow: isCursed ? "0 0 12px rgba(255,30,60,0.2)" : "none",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.borderColor = tierColor; }}
                onMouseLeave={e => { e.currentTarget.style.background = baseBg; e.currentTarget.style.borderColor = tierColor + (isCursed ? "99" : "55"); }}
              >
                <span style={{ fontSize: 32, flexShrink: 0 }}>{perk.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 900, fontSize: 15, color: isCursed ? "#FF6677" : "#FFF" }}>{perk.name}</span>
                    <span style={{ fontSize: 9, color: tierColor, fontWeight: 700, letterSpacing: 1, background: tierColor + "22", padding: "2px 6px", borderRadius: 4 }}>
                      {tierLabel[perk.tier] || perk.tier.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: isCursed ? "#FF9999" : "#CCC" }}>{perk.desc}</div>
                </div>
                <span style={{ fontSize: 20, color: tierColor, flexShrink: 0 }}>{isCursed ? "⚠" : "→"}</span>
              </button>
            );
          })}
        </div>

        <p style={{ color: "#aaa", fontSize: 10, marginTop: 16 }}>Game paused — take your time</p>
      </div>
    </div>
  );
}
