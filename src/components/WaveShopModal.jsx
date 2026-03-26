import { useRef } from "react";
import { WEAPONS } from "../constants.js";
import { useGamepadNav } from "../hooks/useGamepadNav.js";

// Derive a 0-1 score for a weapon stat for the mini bar
function _wpnStatBar(label, weapon) {
  if (label === "DMG") {
    // bulletDamage range ~8 (pistol) to ~120 (railgun) — normalize 0-120
    return Math.min(1, (weapon.bulletDamage || 10) / 90);
  }
  if (label === "RATE") {
    // fireRate: lower = faster. Range ~4 (minigun) to ~45 (sniper). Invert.
    return Math.min(1, 1 - ((weapon.fireRate || 20) - 4) / 50);
  }
  if (label === "RANGE") {
    const life = weapon.bulletLife || 40;
    const spd  = weapon.bulletSpeed || 9;
    return Math.min(1, (life * spd) / 600);
  }
  return 0;
}

function WeaponStatBars({ weaponIdx }) {
  const w = WEAPONS[weaponIdx];
  if (!w) return null;
  const stats = [["DMG", _wpnStatBar("DMG", w)], ["RATE", _wpnStatBar("RATE", w)], ["RANGE", _wpnStatBar("RANGE", w)]];
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      {stats.map(([label, val]) => (
        <div key={label} style={{ flex: 1 }}>
          <div style={{ fontSize: 8, color: "#888", marginBottom: 2, letterSpacing: 1 }}>{label}</div>
          <div style={{ height: 4, background: "#222", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.round(val * 100)}%`, height: "100%", background: val > 0.7 ? "#FF6600" : val > 0.4 ? "#FFD700" : "#00CC88", borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WaveShopModal({ options, wave, onSelect, boughtHistory = [], currentWeapon = 0 }) {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Gamepad nav: up/down through shop options, A to buy
  const focusIdx = useGamepadNav({
    count:     options.length,
    cols:      1,
    enabled:   true,
    disableLR: true,
    onConfirm: (idx) => onSelectRef.current(options[idx].id),
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backdropFilter: "blur(8px)",
      fontFamily: "'Courier New',monospace", color: "#fff",
    }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>📦</div>
        <h2 style={{ fontSize: "clamp(16px,4vw,24px)", fontWeight: 900, margin: "0 0 4px", color: "#FFD700", letterSpacing: 2 }}>
          WAVE {wave - 1} CLEAR!
        </h2>
        <p style={{ color: "#AAA", fontSize: 12, margin: "0 0 18px" }}>
          Choose your reward — one pick only.
          <span style={{ color: "#555", marginLeft: 8 }}>🎮 D-pad + A</span>
        </p>

        {boughtHistory.length > 0 && (
          <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 9, color: "#888", letterSpacing: 1, marginBottom: 6 }}>BOUGHT THIS RUN</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {boughtHistory.map((item, i) => (
                <span key={i} style={{ fontSize: 11, background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 5, padding: "3px 8px", color: "#CCC" }}>
                  {item.emoji} {item.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt, i) => {
            const isFocused = focusIdx === i;
            return (
              <button
                key={opt.id}
                onClick={() => onSelect(opt.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 10, cursor: "pointer",
                  background: isFocused ? "rgba(255,215,0,0.16)" : "rgba(255,255,255,0.05)",
                  border: isFocused ? "2px solid rgba(255,215,0,0.75)" : "1px solid rgba(255,215,0,0.25)",
                  color: "#fff", fontFamily: "'Courier New',monospace",
                  textAlign: "left", width: "100%",
                  transition: "all 0.1s",
                  boxShadow: isFocused ? "0 0 18px rgba(255,215,0,0.3)" : "none",
                  outline: isFocused ? "2px solid rgba(255,215,0,0.6)" : "none",
                  outlineOffset: 3,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,215,0,0.12)"; e.currentTarget.style.borderColor = "rgba(255,215,0,0.6)"; }}
                onMouseLeave={e => { if (focusIdx !== i) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,215,0,0.25)"; } }}
              >
                <span style={{ fontSize: 32, lineHeight: 1 }}>{opt.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#FFD700", marginBottom: 2 }}>{opt.name}</div>
                  <div style={{ fontSize: 12, color: "#CCC" }}>{opt.desc}</div>
                  {opt.id === "upgrade" && <WeaponStatBars weaponIdx={currentWeapon} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
