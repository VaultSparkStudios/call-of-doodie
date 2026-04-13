import { useState, useRef } from "react";
import { WAVE_ROUTES } from "../constants.js";
import { useGamepadNav } from "../hooks/useGamepadNav.js";

/**
 * Returns 3 route options: Standard always included, 2 more randomly chosen.
 * Filters out Boss Gauntlet if the next wave is already a boss wave.
 */
export function getRouteOptions(gs) {
  const nextWave = (gs.currentWave || 1) + 1;
  const nextIsAlreadyBoss = nextWave % 5 === 0;

  const pool = WAVE_ROUTES.filter(r => {
    if (r.id === "standard") return false;
    if (r.id === "boss_fork" && nextIsAlreadyBoss) return false;
    return true;
  });

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return [WAVE_ROUTES[0], ...shuffled.slice(0, 2)];
}

export default function RouteSelectModal({ options, wave, onSelect }) {
  const [hovered, setHovered] = useState(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const focusIdx = useGamepadNav({
    count: options.length, cols: 1, enabled: true, disableLR: true,
    onConfirm: (idx) => onSelectRef.current?.(options[idx]),
  });

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.85)",
      zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
    }}>
      <div style={{ maxWidth: 680, width: "92%", color: "#fff", textAlign: "center" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, color: "#555", letterSpacing: 4,
            marginBottom: 6, fontFamily: "'Courier New', monospace", fontWeight: 700,
          }}>
            ── WAVE {wave} COMPLETE ──
          </div>
          <div style={{
            fontSize: 26, fontWeight: 900, letterSpacing: 3,
            color: "#FFD700", textShadow: "0 0 20px rgba(255,215,0,0.4)",
            marginBottom: 4,
          }}>
            CHOOSE YOUR PATH
          </div>
          <div style={{ fontSize: 11, color: "#666" }}>
            This shapes the next wave
          </div>
        </div>

        {/* Route cards */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {options.map((route, rIdx) => {
            const isHov = hovered === route.id || focusIdx === rIdx;
            return (
              <button
                key={route.id}
                onClick={() => onSelect(route)}
                onMouseEnter={() => setHovered(route.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  flex: "1 1 155px",
                  maxWidth: 200,
                  background: isHov
                    ? `linear-gradient(160deg, ${route.color}28 0%, rgba(0,0,0,0.65) 100%)`
                    : "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.6) 100%)",
                  border: `2px solid ${isHov ? route.color : route.color + "33"}`,
                  outline: focusIdx === rIdx ? `2px solid ${route.color}` : "none",
                  outlineOffset: 2,
                  borderRadius: 14,
                  padding: "22px 14px 18px",
                  cursor: "pointer",
                  color: "#fff",
                  textAlign: "center",
                  transform: isHov ? "translateY(-3px)" : "translateY(0)",
                  boxShadow: isHov ? `0 6px 24px ${route.color}33` : "none",
                  transition: "all 0.14s ease",
                  outline: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Subtle top accent bar */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: isHov ? route.color : `${route.color}44`,
                  borderRadius: "12px 12px 0 0",
                  transition: "background 0.14s",
                }} />

                <div style={{ fontSize: 34, marginBottom: 10, lineHeight: 1 }}>{route.emoji}</div>
                <div style={{
                  fontSize: 12, fontWeight: 900,
                  color: isHov ? route.color : `${route.color}CC`,
                  letterSpacing: 1.5, marginBottom: 8,
                  fontFamily: "'Courier New', monospace",
                }}>
                  {route.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: isHov ? "#DDD" : "#888", lineHeight: 1.5 }}>
                  {route.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer tip */}
        <div style={{
          marginTop: 20, fontSize: 10,
          color: "#444", fontFamily: "'Courier New', monospace", letterSpacing: 1,
        }}>
          [CLICK / D-PAD + A TO SELECT · AFFECTS NEXT WAVE ONLY]
        </div>
      </div>
    </div>
  );
}
