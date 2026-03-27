import { useState, useEffect } from "react";
import { WEAPONS, DIFFICULTIES } from "../constants.js";
import { PERK_TIER_COLORS } from "../constants.js";

const THEME_NAMES = ["OFFICE","BUNKER","FACTORY","RUINS","DESERT","FOREST","SPACE","ARCTIC"];
const THEME_EMOJIS = ["🏢","🪖","🏭","🏚️","🌵","🌲","🚀","🧊"];

export default function HUD({
  wave, timeSurvived, score, kills, deaths, health, ammo, isReloading,
  currentWeapon, combo, comboTimer, killstreak, level, xp, xpNeeded,
  killFeed, username, grenadeReady, dashReady, extraLives, guardianAngelFlash,
  difficulty, isMobile, weaponUpgrades, activePerks, runModifier,
  onSwitchWeapon, onReload, onDash, onGrenade, onPause,
  fmtTime,
  overclockedActive, overclockedShots, waveStreak, mapTheme,
  vsScore, vsName,
  synergyChargeReady, onSynergyCharge,
  cursedHideScore,
  speedrunMode, startTime,
}) {
  const weapon = WEAPONS[currentWeapon];
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const comboColor = combo >= 10 ? "#FF0000" : combo >= 5 ? "#FF4500" : combo >= 3 ? "#FFD700" : "#FFF";
  const upgStars = (idx) => "⭐".repeat(weaponUpgrades?.[idx] || 0);

  // Tick state for speedrun timer re-rendering
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!speedrunMode) return;
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [speedrunMode]);

  const Tooltip = ({ text, visible }) => {
    if (!visible) return null;
    return (
      <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8, background: "rgba(0,0,0,0.92)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 10px", color: "#FFF", fontSize: 11, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 20, maxWidth: 220, textAlign: "center" }}>
        {text}
        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(0,0,0,0.92)" }} />
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: isMobile ? 56 : 0, pointerEvents: "none", color: "#fff" }}>

      {/* Mobile pause button */}
      {isMobile && (
        <div style={{ position: "absolute", top: 6, right: 8, pointerEvents: "all" }}>
          <button onClick={onPause} style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFF", fontSize: 15, width: 34, height: 34, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⏸</button>
        </div>
      )}

      {/* Wave / Timer */}
      <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "#FFF", background: "rgba(0,0,0,0.5)", padding: "3px 12px", borderRadius: 10, fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
        <span>WAVE {wave}</span>
        <span style={{ color: wave >= 15 ? "#FF0000" : wave >= 10 ? "#FF4500" : wave >= 5 ? "#FFD700" : "#0F0", fontSize: 9 }}>
          {wave >= 15 ? "☠️ EXTREME" : wave >= 10 ? "🔥 HARD" : wave >= 5 ? "⚠️ MEDIUM" : "✅ EASY"}
        </span>
        <span style={{ color: "#CCC" }}>{fmtTime(timeSurvived)}</span>
        {mapTheme != null && (
          <span style={{ color: "#999", fontSize: 9 }} title="Map theme">{THEME_EMOJIS[mapTheme] || ""} {THEME_NAMES[mapTheme] || ""}</span>
        )}
        {difficulty !== "normal" && <span style={{ color: diff.color, fontSize: 9 }}>{diff.emoji}</span>}
      </div>

      {/* Challenge score tracker */}
      {vsScore != null && (
        <div style={{
          position: "absolute", top: 46, left: "50%", transform: "translateX(-50%)",
          fontSize: 10, fontFamily: "'Courier New',monospace", fontWeight: 900,
          background: "rgba(0,0,0,0.6)", padding: "3px 12px", borderRadius: 8,
          border: score >= vsScore ? "1px solid rgba(0,255,136,0.5)" : "1px solid rgba(255,100,0,0.4)",
          color: score >= vsScore ? "#00FF88" : "#FF6B35",
          letterSpacing: 1, whiteSpace: "nowrap",
        }}>
          {score >= vsScore
            ? `🏆 BEATING ${vsName ? "@" + vsName : "THEM"} +${(score - vsScore).toLocaleString()}`
            : `⚔️ BEHIND ${vsName ? "@" + vsName : "THEM"} -${(vsScore - score).toLocaleString()}`
          }
        </div>
      )}

      {/* Speedrun timer */}
      {speedrunMode && startTime != null && (() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const ss = String(elapsed % 60).padStart(2, "0");
        return (
          <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", fontSize: 20, fontWeight: 900, color: "#00FF80", fontFamily: "'Courier New',monospace", letterSpacing: 3, textShadow: "0 0 12px rgba(0,255,128,0.6)", background: "rgba(0,0,0,0.55)", padding: "2px 12px", borderRadius: 8, border: "1px solid rgba(0,255,128,0.35)", whiteSpace: "nowrap" }}>
            ⏱ {mm}:{ss}
          </div>
        );
      })()}

      {/* Run modifier badge */}
      {runModifier && (
        <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#FFD700", background: "rgba(0,0,0,0.55)", padding: "2px 9px", borderRadius: 8, fontWeight: 700, letterSpacing: 1, border: "1px solid rgba(255,215,0,0.28)", whiteSpace: "nowrap" }} title={runModifier.desc}>
          {runModifier.emoji} {runModifier.name.toUpperCase()}
        </div>
      )}

      {/* Score */}
      <div style={{ position: "absolute", top: 8, right: 56 }}>
        <div style={{ fontSize: 10, color: "#CCC", textAlign: "right" }}>SCORE</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: cursedHideScore ? "#CC00FF" : "#FFD700", textAlign: "right" }}>{cursedHideScore ? "???" : score.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: "#DDD", textAlign: "right" }}>K:<span style={{ color: "#0F0" }}>{kills}</span> D:<span style={{ color: "#F44" }}>{deaths}</span></div>
      </div>

      {/* Synergy Burst button */}
      {synergyChargeReady && (
        <div
          onClick={onSynergyCharge}
          style={{
            position: "fixed", bottom: 90, right: 16,
            background: "rgba(255,136,255,0.2)", border: "2px solid #FF88FF",
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
            fontFamily: "'Courier New',monospace", fontSize: 11, color: "#FF88FF",
            fontWeight: 900, letterSpacing: 1, animation: "pulseGlow 1s infinite",
            boxShadow: "0 0 16px #FF88FF44", pointerEvents: "all",
          }}
        >
          ⚡ SYNERGY BURST [E]
        </div>
      )}

      {/* Combo */}
      {combo >= 2 && (
        <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: comboColor, textShadow: "0 0 10px " + comboColor }}>x{combo} COMBO</div>
          <div style={{ width: 80, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "3px auto", overflow: "hidden" }}>
            <div style={{ width: (comboTimer / 120) * 100 + "%", height: "100%", background: comboColor, transition: "width 0.05s" }} />
          </div>
        </div>
      )}

      {/* Killstreak */}
      {killstreak >= 3 && (
        <div style={{ position: "absolute", top: 8, left: 12, background: "rgba(255,69,0,0.2)", padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(255,69,0,0.4)", fontSize: 11, color: "#FF4500", fontWeight: 700 }}>
          {killstreak} STREAK
        </div>
      )}

      {/* Level / XP bar */}
      <div style={{ position: "absolute", top: 26, left: 12 }}>
        <div style={{ fontSize: 10, color: "#DDD" }}>Lv {level}</div>
        <div style={{ width: 70, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: (xp / xpNeeded) * 100 + "%", height: "100%", background: "#00FF88", borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 9, color: level % 3 === 0 ? "#00FF88" : "#888", marginTop: 1 }}>
          {level % 3 === 0 ? "✨ PERK NOW!" : `Perk in ${3 - (level % 3)} lvl${3 - (level % 3) > 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Kill Feed */}
      <div style={{ position: "absolute", top: 42, left: 12, maxWidth: 200 }}>
        {killFeed.slice(0, 4).map((kf, i) => (
          <div key={kf.id} style={{ fontSize: 10, color: "rgba(255,255,255," + (1 - i * 0.15) + ")", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: "#FFD700" }}>{username}</span> [{WEAPONS.find(w => w.name === kf.weapon)?.emoji}] <span style={{ color: "#FF69B4" }}>{kf.enemy}</span>
          </div>
        ))}
      </div>

      {/* Active perks row */}
      {activePerks?.length > 0 && (
        <div style={{ position: "absolute", bottom: isMobile ? 70 : 56, left: 12, display: "flex", gap: 3, flexWrap: "wrap", maxWidth: 200 }}>
          {activePerks.map((p, i) => (
            <span key={i} style={{ fontSize: 14, opacity: 0.85 }} title={p.name}>{p.emoji}</span>
          ))}
        </div>
      )}

      {/* HP bar */}
      <div style={{ position: "absolute", bottom: 8, left: 12, width: isMobile ? 100 : 180 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#DDD", marginBottom: 2 }}>
          <span>HP{extraLives > 0 ? " 😇" : ""}</span>
          <span>{health}/{diff.playerHP}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 3, height: 6, overflow: "hidden" }}>
          <div style={{ width: Math.min(100, (health / diff.playerHP) * 100) + "%", height: "100%", borderRadius: 3, background: health > 60 ? "#0F0" : health > 30 ? "#FA0" : "#F00", transition: "width 0.2s" }} />
        </div>
        {extraLives > 0 && <div style={{ fontSize: 9, color: "#FFD700", marginTop: 2 }}>Guardian Angel Active</div>}
      </div>

      {/* Overclocked heat gauge */}
      {overclockedActive && (
        <div style={{ position: "absolute", bottom: isMobile ? 70 : 52, right: isMobile ? 8 : 56, textAlign: "right", minWidth: 80 }}>
          <div style={{ fontSize: 9, color: overclockedShots >= 15 ? "#FF4400" : "#FF8800", marginBottom: 2 }}>
            🔧 HEAT {overclockedShots}/20
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 3, height: 4, overflow: "hidden" }}>
            <div style={{ width: (overclockedShots / 20) * 100 + "%", height: "100%", borderRadius: 3, background: overclockedShots >= 15 ? "#FF2200" : overclockedShots >= 10 ? "#FF8800" : "#FFCC00", transition: "width 0.05s" }} />
          </div>
        </div>
      )}

      {/* Wave streak badge */}
      {(waveStreak || 0) >= 3 && (
        <div style={{ position: "absolute", top: 8, left: killstreak >= 3 ? 110 : 12, background: "rgba(255,120,0,0.2)", padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(255,120,0,0.4)", fontSize: 11, color: "#FF8800", fontWeight: 700 }}>
          🔥 {waveStreak}-STREAK
        </div>
      )}

      {/* Ammo / weapon */}
      <div style={{ position: "absolute", bottom: 8, right: isMobile ? 8 : 56, textAlign: "right" }}>
        <div style={{ fontSize: 11, color: weaponUpgrades?.[currentWeapon] >= 3 && weapon.upgradedName ? "#FFD700" : weapon.color, marginBottom: 1, fontWeight: 600 }}>
          {weapon.emoji} {weaponUpgrades?.[currentWeapon] >= 3 && weapon.upgradedName
            ? <span style={{ color: "#FFD700", textShadow: "0 0 8px rgba(255,215,0,0.6)" }}>⭐⭐⭐ {weapon.upgradedName}</span>
            : <>{weapon.name}{weaponUpgrades?.[currentWeapon] > 0 && <span style={{ color: "#AA44FF", marginLeft: 4, fontSize: 10 }}>{upgStars(currentWeapon)}</span>}</>
          }
        </div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          <span style={{ color: ammo > 0 ? "#FFF" : "#F44" }}>{ammo}</span>
          <span style={{ color: "#BBB", fontSize: 13 }}>/{weapon.maxAmmo}</span>
        </div>
        {isReloading && <div style={{ fontSize: 11, color: "#FFD700", animation: "blink 0.5s infinite" }}>RELOADING...</div>}
      </div>

      {/* Low HP vignette */}
      {health < 30 && (
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 " + (100 - health * 2) + "px rgba(255,0,0," + (30 - health) / 60 + ")", pointerEvents: "none" }} />
      )}

      {/* Guardian Angel flash */}
      {guardianAngelFlash && (
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle,rgba(255,215,0,0.3) 0%,transparent 70%)", pointerEvents: "none", animation: "blink 0.5s infinite" }} />
      )}

      {/* Desktop weapon toolbar */}
      {!isMobile && (
        <DesktopToolbar
          currentWeapon={currentWeapon} weaponUpgrades={weaponUpgrades}
          grenadeReady={grenadeReady} dashReady={dashReady} isReloading={isReloading}
          onSwitchWeapon={onSwitchWeapon} onGrenade={onGrenade} onDash={onDash} onReload={onReload}
          Tooltip={Tooltip}
        />
      )}
    </div>
  );
}

const WEAPON_HOTKEYS = ["1","2","3","4","5","6","7","8","9","0","-","="];

function DesktopToolbar({ currentWeapon, weaponUpgrades, grenadeReady, dashReady, isReloading, onSwitchWeapon, onGrenade, onDash, onReload, Tooltip }) {
  const [hoveredTool, setHoveredTool] = useState(null);
  // Shrink weapon buttons when there are many weapons so the bar stays on-screen
  const btnSize = WEAPONS.length > 8 ? 32 : 38;
  const btnFont = WEAPONS.length > 8 ? 14 : 17;

  return (
    <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 3, alignItems: "center", background: "rgba(0,0,0,0.4)", padding: "4px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", pointerEvents: "all", maxWidth: "calc(100vw - 24px)", flexWrap: "nowrap", overflowX: "auto" }}>
      {WEAPONS.map((w, i) => (
        <div key={i} style={{ position: "relative" }} onMouseEnter={() => setHoveredTool("wpn-" + i)} onMouseLeave={() => setHoveredTool(null)}>
          <div
            style={{ width: btnSize, height: btnSize, borderRadius: 6, position: "relative", background: i === currentWeapon ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", border: i === currentWeapon ? "2px solid " + w.color : "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: btnFont, cursor: "pointer" }}
            onClick={() => onSwitchWeapon(i)}
          >
            {w.emoji}
            <span style={{ position: "absolute", top: 0, right: 2, fontSize: 9, color: i === currentWeapon ? w.color : "#AAA", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>{WEAPON_HOTKEYS[i] || i + 1}</span>
            {weaponUpgrades?.[i] > 0 && (
              <span style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", fontSize: 7, color: "#AA44FF", lineHeight: 1 }}>{"⭐".repeat(weaponUpgrades[i])}</span>
            )}
          </div>
          <Tooltip text={"[" + (WEAPON_HOTKEYS[i] || i + 1) + "] " + w.name + " — " + w.desc} visible={hoveredTool === "wpn-" + i} />
        </div>
      ))}

      <div style={{ width: 1, height: 26, background: "rgba(255,255,255,0.15)", margin: "0 2px" }} />

      <div style={{ position: "relative" }} onMouseEnter={() => setHoveredTool("grenade")} onMouseLeave={() => setHoveredTool(null)}>
        <div onClick={onGrenade} style={{ width: 38, height: 38, borderRadius: 6, position: "relative", background: grenadeReady ? "rgba(255,69,0,0.15)" : "rgba(255,255,255,0.05)", border: grenadeReady ? "1px solid rgba(255,69,0,0.4)" : "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "pointer" }}>
          💣
          <span style={{ position: "absolute", top: 0, right: 2, fontSize: 9, color: grenadeReady ? "#FF4500" : "#777", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>Q</span>
        </div>
        <Tooltip text="[Q/G] Grenade — AOE explosion" visible={hoveredTool === "grenade"} />
      </div>

      <div style={{ position: "relative" }} onMouseEnter={() => setHoveredTool("dash")} onMouseLeave={() => setHoveredTool(null)}>
        <div onClick={onDash} style={{ width: 38, height: 38, borderRadius: 6, position: "relative", background: dashReady ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.05)", border: dashReady ? "1px solid rgba(0,229,255,0.4)" : "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>
          💨
          <span style={{ position: "absolute", bottom: 0, right: 2, fontSize: 7, color: dashReady ? "#0EF" : "#777", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>⇧</span>
        </div>
        <Tooltip text="[Space/Shift] Dash — Invincible dodge" visible={hoveredTool === "dash"} />
      </div>

      <div style={{ position: "relative" }} onMouseEnter={() => setHoveredTool("reload")} onMouseLeave={() => setHoveredTool(null)}>
        <div onClick={onReload} style={{ width: 38, height: 38, borderRadius: 6, background: isReloading ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: isReloading ? "#FFD700" : "#FFF", fontWeight: 900, cursor: "pointer", fontFamily: "monospace" }}>R</div>
        <Tooltip text="[R] Reload — Refill your magazine" visible={hoveredTool === "reload"} />
      </div>
    </div>
  );
}

