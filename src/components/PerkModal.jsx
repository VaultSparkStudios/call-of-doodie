import { useRef } from "react";
import { PERK_TIER_COLORS } from "../constants.js";
import { useGamepadNav } from "../hooks/useGamepadNav.js";
import { getPerkArchetypeMatches } from "../utils/buildArchetypes.js";

export default function PerkModal({ options, level, onSelect, buildArchetype, unlockedArchetypes = [] }) {
  const tierLabel = { common: "COMMON", uncommon: "UNCOMMON", rare: "RARE", legendary: "LEGENDARY", cursed: "⚠ CURSED" };

  // Gamepad nav: up/down through options, A to confirm
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const focusIdx = useGamepadNav({
    count:     options.length,
    cols:      1,
    enabled:   true,
    disableLR: true,
    onConfirm: (idx) => onSelectRef.current(options[idx]),
  });

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
        <p style={{ color: "#AAA", fontSize: 12, margin: "0 0 16px" }}>
          Choose one upgrade. They stack!
          <span style={{ color: "#555", marginLeft: 8 }}>🎮 D-pad + A to pick</span>
        </p>
        {buildArchetype && (
          <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${buildArchetype.color}44`, textAlign: "left" }}>
            <div style={{ fontSize: 10, color: buildArchetype.color, fontWeight: 900, letterSpacing: 1 }}>
              {buildArchetype.emoji} CURRENT BUILD: {buildArchetype.name.toUpperCase()} {buildArchetype.unlocked ? "CAPSTONE ACTIVE" : `${buildArchetype.count}/${buildArchetype.unlockAt}`}
            </div>
            <div style={{ fontSize: 10, color: "#AAA", marginTop: 3 }}>
              {unlockedArchetypes.length > 0 ? `Unlocked capstones: ${unlockedArchetypes.length}` : "Three aligned perks unlock a capstone bonus."}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((perk, i) => {
            const isCursed   = perk.tier === "cursed";
            const tierColor  = PERK_TIER_COLORS[perk.tier] || "#AAA";
            const isFocused  = focusIdx === i;
            const archetypeMatches = getPerkArchetypeMatches(perk);
            const favoredMatch = buildArchetype ? archetypeMatches.find(match => match.id === buildArchetype.id) : null;
            const baseBg     = isCursed ? "rgba(255,30,60,0.08)"  : "rgba(255,255,255,0.05)";
            const focusBg    = isCursed ? "rgba(255,30,60,0.22)"  : "rgba(255,255,255,0.14)";
            return (
              <button
                key={perk.id}
                onClick={() => onSelect(perk)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 10, cursor: "pointer",
                  background: isFocused ? focusBg : baseBg,
                  border: `2px solid ${tierColor}${isFocused ? "ee" : (isCursed ? "99" : "55")}`,
                  color: "#FFF", fontFamily: "'Courier New',monospace",
                  textAlign: "left", transition: "all 0.1s",
                  boxShadow: isFocused
                    ? `0 0 18px ${isCursed ? "rgba(255,30,60,0.45)" : tierColor + "55"}`
                    : (isCursed ? "0 0 12px rgba(255,30,60,0.2)" : "none"),
                  outline: isFocused ? `2px solid ${tierColor}` : "none",
                  outlineOffset: 3,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = focusBg; e.currentTarget.style.borderColor = tierColor; }}
                onMouseLeave={e => { if (focusIdx !== i) { e.currentTarget.style.background = baseBg; e.currentTarget.style.borderColor = tierColor + (isCursed ? "99" : "55"); } }}
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
                  {archetypeMatches.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                      {archetypeMatches.map(match => (
                        <span key={match.id} style={{ fontSize: 9, color: favoredMatch?.id === match.id ? "#FFF" : match.color, background: favoredMatch?.id === match.id ? `${match.color}44` : `${match.color}22`, border: `1px solid ${match.color}55`, borderRadius: 4, padding: "2px 5px", letterSpacing: 0.5 }}>
                          {match.emoji} {favoredMatch?.id === match.id ? "FITS BUILD" : match.name.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 20, color: tierColor, flexShrink: 0 }}>{isCursed ? "⚠" : "→"}</span>
              </button>
            );
          })}
        </div>

        <p style={{ color: "#555", fontSize: 10, marginTop: 16 }}>Game paused — take your time</p>
      </div>
    </div>
  );
}
