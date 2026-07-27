import { useState } from "react";
import { WEAPONS } from "../constants.js";
import { buildResponsiveHudModel } from "../utils/responsiveHudModel.js";

const TONE_COLOR = {
  success: "#7CFFB8",
  warning: "#FFC078",
  gold: "#FFD44D",
  info: "#BEEFFF",
};

export default function MobileHUD({
  isMobile = false,
  wave, timeSurvived, score, kills, deaths, health, maxHealth, level,
  currentWeapon, ammo, isReloading, extraLives, fmtTime, onPause,
  activeDrill, drillProgress, practiceMastery, runIntegrity, runModifier, rivalPace,
  vsScore, vsName, topGhosts, weeklyRival, bankedPerkChoices,
  nextPerkLevel, cursedHideScore, activeWaveContract, grenadeReady, dashReady,
  combo, killstreak, experimentMatched, reducedEffects,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const weapon = WEAPONS[currentWeapon];
  const model = buildResponsiveHudModel({
    score, combo, killstreak, grenadeReady, dashReady, isReloading,
    activeWaveContract, activeDrill, drillProgress, practiceMastery,
    runIntegrity, runModifier, rivalPace, vsScore, vsName,
    topGhosts, weeklyRival, experimentMatched, reducedEffects,
  });
  const { detailRows, primary, actionStates, capabilityReceipt } = model;
  const horizontal = isMobile ? { left: 6, right: 6 } : { left: "50%", width: "min(680px, calc(100vw - 32px))", transform: "translateX(-50%)" };

  return (
    <div data-hud-surface="compact" data-hud-capabilities={capabilityReceipt.alwaysVisible.join(",")} style={{ position: "absolute", inset: isMobile ? "0 0 64px" : 0, zIndex: 40, pointerEvents: "none", color: "#FFF", fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ position: "absolute", top: "max(6px, env(safe-area-inset-top))", ...horizontal, minHeight: 52, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 6, padding: "5px 6px", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, background: "rgba(5,8,10,.82)", boxShadow: "0 8px 24px rgba(0,0,0,.28)", backdropFilter: "blur(10px)" }}>
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

      {(primary || bankedPerkChoices > 0) && (
        <div style={{ position: "absolute", top: "calc(max(6px, env(safe-area-inset-top)) + 60px)", left: isMobile ? 8 : "50%", right: isMobile ? 8 : "auto", width: isMobile ? "auto" : "min(560px, calc(100vw - 32px))", transform: isMobile ? "none" : "translateX(-50%)", display: "flex", justifyContent: "center" }}>
          <button data-testid="hud-priority-chip" onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen} style={{ minHeight: 48, maxWidth: "100%", padding: "8px 14px", pointerEvents: "all", border: `1px solid ${TONE_COLOR[primary?.tone] || "#61DDFF"}55`, borderRadius: 999, color: TONE_COLOR[primary?.tone] || "#C6F6FF", background: "rgba(4,16,22,.86)", fontSize: 11, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {bankedPerkChoices > 0 ? `Perk ready ×${bankedPerkChoices}` : primary?.label}
            <span style={{ marginLeft: 8, color: "#7D98A4" }}>{detailsOpen ? "▲" : "▼"}</span>
          </button>
        </div>
      )}

      {detailsOpen && detailRows.length > 0 && (
        <div data-testid="hud-context-drawer" style={{ position: "absolute", top: "calc(max(6px, env(safe-area-inset-top)) + 114px)", left: isMobile ? 10 : "50%", right: isMobile ? 10 : "auto", width: isMobile ? "auto" : "min(560px, calc(100vw - 32px))", transform: isMobile ? "none" : "translateX(-50%)", maxHeight: "35dvh", overflowY: "auto", padding: 10, pointerEvents: "all", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, background: "rgba(4,7,10,.96)", boxShadow: "0 16px 40px rgba(0,0,0,.45)" }}>
          {detailRows.map((row, index) => (
            <div key={row.id} style={{ padding: "8px 9px", borderBottom: index < detailRows.length - 1 ? "1px solid rgba(255,255,255,.08)" : 0 }}>
              <strong style={{ display: "block", color: TONE_COLOR[row.tone], fontSize: 11 }}>{row.label}</strong>
              <span style={{ display: "block", marginTop: 2, color: "#AEB9C3", fontSize: 10, lineHeight: 1.35 }}>{row.detail}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "absolute", bottom: isMobile ? 8 : 18, left: isMobile ? 8 : "50%", right: isMobile ? 8 : "auto", width: isMobile ? "auto" : "min(680px, calc(100vw - 32px))", transform: isMobile ? "none" : "translateX(-50%)", display: "grid", gridTemplateColumns: "minmax(105px, 1fr) auto", alignItems: "end", gap: 8 }}>
        <div style={{ padding: "8px 10px", border: "1px solid rgba(255,255,255,.14)", borderRadius: 11, background: "rgba(4,7,10,.78)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, fontWeight: 850 }}><span>HEALTH{extraLives > 0 ? " · EXTRA LIFE" : ""}</span><span>{health}/{maxHealth}</span></div>
          <div style={{ height: 7, marginTop: 5, overflow: "hidden", borderRadius: 99, background: "rgba(255,255,255,.12)" }}>
            <div style={{ width: `${Math.min(100, (health / maxHealth) * 100)}%`, height: "100%", borderRadius: 99, background: health > maxHealth * .6 ? "#41DC72" : health > maxHealth * .3 ? "#FFB52E" : "#FF4F46" }} />
          </div>
          <div aria-label="Ability readiness" style={{ display: "flex", gap: 4, marginTop: 7 }}>
            {actionStates.map((action) => (
              <span key={action.id} data-action-state={action.ready ? "ready" : "cooldown"} style={{ flex: 1, padding: "3px 4px", border: `1px solid ${action.ready ? "rgba(124,255,184,.32)" : "rgba(255,192,120,.24)"}`, borderRadius: 5, color: action.ready ? "#7CFFB8" : "#FFC078", background: "rgba(0,0,0,.18)", fontSize: 7, fontWeight: 900, textAlign: "center", letterSpacing: .3 }}>
                {action.label} · {action.ready ? "READY" : action.id === "reload" ? "BUSY" : "COOL"}
              </span>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 112, padding: "8px 10px", border: `1px solid ${weapon.color}66`, borderRadius: 11, background: "rgba(4,7,10,.78)", textAlign: "right", backdropFilter: "blur(8px)" }}>
          <div style={{ color: weapon.color, fontSize: 10, fontWeight: 850, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{weapon.emoji} {weapon.name}</div>
          <div style={{ marginTop: 2, fontSize: 15, fontWeight: 950 }}>{isReloading ? "Reloading" : `${ammo}/${weapon.maxAmmo}`}</div>
          <div style={{ marginTop: 3, color: "#94A0AE", fontSize: 8, fontWeight: 750 }}>{isMobile ? "Use action controls" : "R reload · Shift dash · Q grenade"}</div>
        </div>
      </div>

      {health < maxHealth * .3 && <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${Math.max(35, 110 - health)}px rgba(255,0,0,.34)` }} />}
      <div aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Kills {kills}, deaths {deaths}, next perk level {nextPerkLevel}</div>
    </div>
  );
}
