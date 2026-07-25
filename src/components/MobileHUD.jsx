import { useState } from "react";
import { WEAPONS } from "../constants.js";

export default function MobileHUD({
  wave, timeSurvived, score, kills, deaths, health, maxHealth, level,
  currentWeapon, ammo, isReloading, extraLives, fmtTime, onPause,
  activeDrill, drillProgress, runIntegrity, runModifier, rivalPace,
  vsScore, vsName, topGhosts, weeklyRival, bankedPerkChoices,
  nextPerkLevel, cursedHideScore,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const weapon = WEAPONS[currentWeapon];
  const detailRows = [
    runIntegrity?.onlineEligible === false ? { label: "Local-only run", detail: runIntegrity.detail, tone: "warning" } : null,
    activeDrill ? { label: activeDrill.title, detail: drillProgress?.label || activeDrill.detail, tone: "info" } : null,
    runModifier ? { label: runModifier.name, detail: runModifier.desc, tone: "gold" } : null,
    vsScore != null ? {
      label: score >= vsScore ? `Ahead of ${vsName || "challenge"}` : `Chasing ${vsName || "challenge"}`,
      detail: `${Math.abs(score - vsScore).toLocaleString()} points`,
      tone: score >= vsScore ? "success" : "warning",
    } : null,
    rivalPace ? { label: rivalPace.label, detail: rivalPace.detail, tone: rivalPace.ahead ? "success" : "warning" } : null,
    weeklyRival ? { label: "Weekly rival", detail: `${weeklyRival.name || "Ghost"} · wave ${weeklyRival.wave || 1}`, tone: "info" } : null,
    Array.isArray(topGhosts) && topGhosts.length > 0 ? { label: "Ghost pack", detail: `${topGhosts.length} comparison runs loaded`, tone: "info" } : null,
  ].filter(Boolean);

  return (
    <div style={{ position: "absolute", inset: "0 0 64px", zIndex: 40, pointerEvents: "none", color: "#FFF", fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ position: "absolute", top: "max(6px, env(safe-area-inset-top))", left: 6, right: 6, minHeight: 52, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 6, padding: "5px 6px", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, background: "rgba(5,8,10,.78)", boxShadow: "0 8px 24px rgba(0,0,0,.28)", backdropFilter: "blur(10px)" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#93A3B3", fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>LEVEL {level}</div>
          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" }}>WAVE {wave}</div>
        </div>
        <div style={{ minWidth: 84, textAlign: "center" }}>
          <div style={{ color: "#93A3B3", fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>TIME</div>
          <div style={{ marginTop: 2, fontSize: 13, fontWeight: 900 }}>{fmtTime(timeSurvived)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
          <div style={{ minWidth: 62, textAlign: "right" }}>
            <div style={{ color: "#93A3B3", fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>SCORE</div>
            <div style={{ marginTop: 2, color: cursedHideScore ? "#D764FF" : "#FFD44D", fontSize: 13, fontWeight: 950 }}>{cursedHideScore ? "???" : score.toLocaleString()}</div>
          </div>
          <button onClick={onPause} aria-label="Pause game" style={{ width: 48, height: 48, display: "grid", placeItems: "center", pointerEvents: "all", border: "1px solid rgba(255,255,255,.18)", borderRadius: 11, color: "#FFF", background: "rgba(255,255,255,.08)", fontSize: 16 }}>Ⅱ</button>
        </div>
      </div>

      {(detailRows.length > 0 || bankedPerkChoices > 0) && (
        <div style={{ position: "absolute", top: "calc(max(6px, env(safe-area-inset-top)) + 60px)", left: 8, right: 8, display: "flex", justifyContent: "center" }}>
          <button onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen} style={{ minHeight: 48, maxWidth: "100%", padding: "8px 14px", pointerEvents: "all", border: "1px solid rgba(97,221,255,.28)", borderRadius: 999, color: "#C6F6FF", background: "rgba(4,16,22,.82)", fontSize: 11, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {bankedPerkChoices > 0 ? `Perk ready ×${bankedPerkChoices}` : detailRows[0]?.label}
            <span style={{ marginLeft: 8, color: "#7D98A4" }}>{detailsOpen ? "▲" : "▼"}</span>
          </button>
        </div>
      )}

      {detailsOpen && detailRows.length > 0 && (
        <div style={{ position: "absolute", top: "calc(max(6px, env(safe-area-inset-top)) + 114px)", left: 10, right: 10, maxHeight: "35dvh", overflowY: "auto", padding: 10, pointerEvents: "all", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, background: "rgba(4,7,10,.94)", boxShadow: "0 16px 40px rgba(0,0,0,.45)" }}>
          {detailRows.map((row, index) => (
            <div key={`${row.label}-${index}`} style={{ padding: "8px 9px", borderBottom: index < detailRows.length - 1 ? "1px solid rgba(255,255,255,.08)" : 0 }}>
              <strong style={{ display: "block", color: row.tone === "success" ? "#7CFFB8" : row.tone === "warning" ? "#FFC078" : row.tone === "gold" ? "#FFD44D" : "#BEEFFF", fontSize: 11 }}>{row.label}</strong>
              <span style={{ display: "block", marginTop: 2, color: "#AEB9C3", fontSize: 10, lineHeight: 1.35 }}>{row.detail}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, display: "grid", gridTemplateColumns: "minmax(105px, 1fr) auto", alignItems: "end", gap: 8 }}>
        <div style={{ padding: "8px 10px", border: "1px solid rgba(255,255,255,.14)", borderRadius: 11, background: "rgba(4,7,10,.75)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, fontWeight: 850 }}><span>HEALTH{extraLives > 0 ? " · EXTRA LIFE" : ""}</span><span>{health}/{maxHealth}</span></div>
          <div style={{ height: 7, marginTop: 5, overflow: "hidden", borderRadius: 99, background: "rgba(255,255,255,.12)" }}>
            <div style={{ width: `${Math.min(100, (health / maxHealth) * 100)}%`, height: "100%", borderRadius: 99, background: health > maxHealth * .6 ? "#41DC72" : health > maxHealth * .3 ? "#FFB52E" : "#FF4F46" }} />
          </div>
        </div>
        <div style={{ minWidth: 112, padding: "8px 10px", border: `1px solid ${weapon.color}66`, borderRadius: 11, background: "rgba(4,7,10,.75)", textAlign: "right", backdropFilter: "blur(8px)" }}>
          <div style={{ color: weapon.color, fontSize: 10, fontWeight: 850, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{weapon.emoji} {weapon.name}</div>
          <div style={{ marginTop: 2, fontSize: 15, fontWeight: 950 }}>{isReloading ? "Reloading" : `${ammo}/${weapon.maxAmmo}`}</div>
        </div>
      </div>

      {health < maxHealth * .3 && <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${Math.max(35, 110 - health)}px rgba(255,0,0,.34)` }} />}
      <div aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Kills {kills}, deaths {deaths}, next perk level {nextPerkLevel}</div>
    </div>
  );
}

