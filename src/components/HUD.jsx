import { useState, useEffect, useSyncExternalStore } from "react";

// Subscribe to the adaptive-effects flag set by useGameLoop. Polls once a
// second so we don't churn on every frame.
function useReducedEffects() {
  return useSyncExternalStore(
    (cb) => { const id = setInterval(cb, 1000); return () => clearInterval(id); },
    () => (typeof window !== "undefined" && window.__codReducedEffects) ? 1 : 0,
    () => 0,
  );
}
import { WEAPONS, DIFFICULTIES } from "../constants.js";
import { getHudCenterStackLayout, getHudDebugSlots, isHudDebugEnabled } from "../utils/hudLayout.js";
import { buildRunDrillLiveProgress } from "../systems/runDrill.js";
import { buildRivalPace } from "../utils/rivalPace.js";
import MobileHUD from "./MobileHUD.jsx";

const THEME_NAMES = ["OFFICE","BUNKER","FACTORY","RUINS","DESERT","FOREST","SPACE","ARCTIC"];
const THEME_EMOJIS = ["🏢","🪖","🏭","🏚️","🌵","🌲","🚀","🧊"];

export default function HUD({
  wave, timeSurvived, score, kills, deaths, health, ammo, isReloading,
  currentWeapon, combo, comboTimer, killstreak, level, xp, xpNeeded,
  killFeed, username, grenadeReady, dashReady, extraLives, guardianAngelFlash,
  bankedPerkChoices, nextPerkLevel,
  difficulty, isMobile, weaponUpgrades, activePerks, runModifier, weaponEvolutions,
  buildArchetype, unlockedArchetypes,
  onPause,
  fmtTime,
  overclockedActive, overclockedShots, waveStreak, activeWaveContract = null, mapTheme,
  vsScore, vsName,
  synergyChargeReady, onSynergyCharge,
  cursedHideScore,
  speedrunMode, startTime,
  missions, missionDoneSet,
  hud, heat, topGhosts, weeklyRival,
  experimentMatched = null,
  careerBestWave = 0,
  practiceDrill = null,
  runDrill = null,
  runIntegrity = null,
  practiceEvidence = null,
}) {
  // Default to standard if missing (e.g. when called from older callers/tests).
  const HUD_FLAGS = hud || {
    showMissionWidget: true, showWaveIncoming: true, showHeatMeter: true,
    showAmmoBars: true, showSynergyChips: true, showBuildSummary: false,
    showMutationBanner: true, showCoinStreak: true,
  };
  const activeDrill = runDrill || practiceDrill;
  const drillProgress = buildRunDrillLiveProgress(activeDrill, { wave, score });
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

  const reducedEffects = useReducedEffects();
  const hudDebugEnabled = isHudDebugEnabled();
  const rivalPace = buildRivalPace({ score, wave, topGhosts, weeklyRival });
  const centerStack = getHudCenterStackLayout({
    isMobile,
    hasIntegrityWarning: runIntegrity?.onlineEligible === false,
    hasDrill: Boolean(activeDrill),
    hasSpeedrun: Boolean(speedrunMode),
    hasRunModifier: Boolean(runModifier),
    hasChallenge: vsScore != null,
    hasGhosts: Array.isArray(topGhosts) && topGhosts.length > 0,
    hasWeeklyRival: Boolean(weeklyRival),
    hasRivalPace: Boolean(rivalPace),
  });

  if (isMobile || hud?.useCompactDesktop !== false) {
    return (
      <MobileHUD
        isMobile={isMobile}
        wave={wave} timeSurvived={timeSurvived} score={score} kills={kills} deaths={deaths}
        health={health} maxHealth={diff.playerHP} level={level}
        currentWeapon={currentWeapon} ammo={ammo} isReloading={isReloading} extraLives={extraLives}
        fmtTime={fmtTime} onPause={onPause}
        activeDrill={activeDrill} drillProgress={drillProgress} practiceEvidence={practiceEvidence} runIntegrity={runIntegrity}
        runModifier={runModifier} rivalPace={rivalPace} vsScore={vsScore} vsName={vsName}
        topGhosts={topGhosts} weeklyRival={weeklyRival}
        bankedPerkChoices={bankedPerkChoices} nextPerkLevel={nextPerkLevel}
        cursedHideScore={cursedHideScore}
        activeWaveContract={activeWaveContract} grenadeReady={grenadeReady} dashReady={dashReady}
        combo={combo} killstreak={killstreak} experimentMatched={experimentMatched}
        reducedEffects={Boolean(reducedEffects)}
      />
    );
  }
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: isMobile ? 56 : 0, pointerEvents: "none", color: "#fff" }}>

      {/* Mobile pause button */}
      {isMobile && (
        <div style={{ position: "absolute", top: 6, right: 8, pointerEvents: "all" }}>
          <button onClick={onPause} style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFF", fontSize: 15, width: 34, height: 34, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⏸</button>
        </div>
      )}

      {/* Reduced-effects indicator (auto-flipped by adaptive frame monitor) */}
      {reducedEffects ? (
        <div title="Effects automatically reduced to keep your framerate stable. Lower 'Particles' in settings to make it permanent."
             style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,180,0,0.45)", color: "#FFC355", padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>
          ⚡ PERF MODE
        </div>
      ) : null}

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

      {runIntegrity?.onlineEligible === false && (
        <div
          data-testid="run-integrity-warning"
          title={runIntegrity.detail}
          style={{
            position: "absolute", top: centerStack.slots.integrity, left: "50%", transform: "translateX(-50%)",
            maxWidth: "min(94vw, 560px)",
            background: "rgba(72,18,0,0.9)",
            border: "1px solid rgba(255,150,72,0.7)",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 9,
            fontFamily: "'Courier New',monospace",
            color: "#FFD0A8",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: 0.8,
            fontWeight: 900,
          }}
        >
          ⚠ {runIntegrity.label} · {runIntegrity.faultCount} RECOVERED STAGE{runIntegrity.faultCount === 1 ? "" : "S"}
        </div>
      )}

      {activeDrill && (
        <div style={{
          position: "absolute", top: centerStack.slots.drill, left: "50%", transform: "translateX(-50%)",
          maxWidth: "min(92vw, 520px)",
          background: "rgba(0,229,255,0.12)",
          border: "1px solid rgba(0,229,255,0.45)",
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: 9,
          fontFamily: "'Courier New',monospace",
          color: "#BFF7FF",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          letterSpacing: 0.5,
        }} title={activeDrill.detail}>
          <strong>{activeDrill.label}</strong>{" "}
          <span style={{ color: "#FFF" }}>{activeDrill.title}</span>
          {drillProgress?.label && <span style={{ color: drillProgress.color }}> · {drillProgress.label}</span>}
          {practiceEvidence?.label && <span style={{ color: practiceEvidence.repeatable ? "#00FF88" : "#FFD166" }}> · {practiceEvidence.label}</span>}
        </div>
      )}

      {/* Challenge score tracker */}
      {vsScore != null && (
        <div style={{
          position: "absolute", top: centerStack.slots.challenge, left: "50%", transform: "translateX(-50%)",
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

      {Array.isArray(topGhosts) && topGhosts.length > 0 && (
        <div style={{
          position: "absolute", top: centerStack.slots.ghosts, left: "50%", transform: "translateX(-50%)",
          maxWidth: "min(92vw, 520px)", display: "flex", gap: 5, alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.52)", border: "1px solid rgba(0,229,255,0.22)", borderRadius: 8,
          padding: "3px 8px", fontSize: 9, fontFamily: "'Courier New',monospace", color: "#BEEFFF",
          whiteSpace: "nowrap", overflow: "hidden",
        }} title="Top leaderboard ghosts loaded for this mode and difficulty">
          <span style={{ color: "#00E5FF", fontWeight: 900 }}>GHOST PACK</span>
          {topGhosts.slice(0, 3).map((ghost, index) => (
            <span key={`${ghost.name || "ghost"}-${index}`} style={{ color: index === 0 ? "#FFD700" : "#D8F6FF", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 138 }}>
              {index + 1}. {(ghost.name || "Ghost").slice(0, 12)} {Math.max(0, Number(ghost.score || 0)).toLocaleString()}
            </span>
          ))}
        </div>
      )}

      {weeklyRival && (
        <div style={{
          position: "absolute", top: centerStack.slots.weeklyRival, left: "50%", transform: "translateX(-50%)",
          maxWidth: "min(92vw, 460px)",
          background: "rgba(18,0,28,0.66)", border: `1px solid ${score >= (weeklyRival.score || 0) ? "rgba(0,255,136,0.45)" : "rgba(204,68,255,0.4)"}`, borderRadius: 8,
          padding: "3px 9px", fontSize: 9, fontFamily: "'Courier New',monospace",
          color: score >= (weeklyRival.score || 0) ? "#00FF88" : "#E0B5FF",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }} title="Best leaderboard run from the last 7 days">
          <strong>WEEKLY RIVAL</strong>{" "}
          {(weeklyRival.name || "Ghost").slice(0, 14)} W{Math.max(1, Number(weeklyRival.wave || 1))}{" "}
          {score >= (weeklyRival.score || 0)
            ? `BEATING +${(score - (weeklyRival.score || 0)).toLocaleString()}`
            : `BEHIND -${((weeklyRival.score || 0) - score).toLocaleString()}`}
        </div>
      )}

      {rivalPace && (
        <div style={{
          position: "absolute", top: centerStack.slots.rivalPace, left: "50%", transform: "translateX(-50%)",
          maxWidth: "min(92vw, 430px)",
          background: rivalPace.ahead ? "rgba(0,38,25,0.68)" : "rgba(31,16,0,0.68)",
          border: `1px solid ${rivalPace.ahead ? "rgba(0,255,136,0.42)" : "rgba(255,160,64,0.42)"}`,
          borderRadius: 8,
          padding: "3px 9px",
          fontSize: 9,
          fontFamily: "'Courier New',monospace",
          color: rivalPace.ahead ? "#85FFC0" : "#FFC078",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          letterSpacing: 0.5,
        }} title={`Nearest live rival: ${rivalPace.name}, ${rivalPace.targetScore.toLocaleString()} points`}>
          <strong>{rivalPace.label}</strong>{" "}
          <span style={{ color: "rgba(255,255,255,0.72)" }}>{rivalPace.detail}</span>
        </div>
      )}

      {/* Speedrun timer */}
      {speedrunMode && startTime != null && (() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const ss = String(elapsed % 60).padStart(2, "0");
        return (
          <div style={{ position: "absolute", top: centerStack.slots.speedrun, left: "50%", transform: "translateX(-50%)", fontSize: 20, fontWeight: 900, color: "#00FF80", fontFamily: "'Courier New',monospace", letterSpacing: 3, textShadow: "0 0 12px rgba(0,255,128,0.6)", background: "rgba(0,0,0,0.55)", padding: "2px 12px", borderRadius: 8, border: "1px solid rgba(0,255,128,0.35)", whiteSpace: "nowrap" }}>
            ⏱ {mm}:{ss}
          </div>
        );
      })()}

      {/* Run modifier badge */}
      {runModifier && (
        <div style={{ position: "absolute", top: centerStack.slots.runModifier, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#FFD700", background: "rgba(0,0,0,0.55)", padding: "2px 9px", borderRadius: 8, fontWeight: 700, letterSpacing: 1, border: "1px solid rgba(255,215,0,0.28)", whiteSpace: "nowrap" }} title={runModifier.desc}>
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
        <div style={{ fontSize: 9, color: bankedPerkChoices > 0 ? "#00FF88" : "#888", marginTop: 1 }}>
          {bankedPerkChoices > 0
            ? `✨ PERK READY x${bankedPerkChoices}`
            : `Next doctrine: Lv ${nextPerkLevel}`}
        </div>
        <div style={{ fontSize: 8, color: bankedPerkChoices > 0 ? "#9FFFD3" : "#666", marginTop: 2, maxWidth: 112, lineHeight: 1.25 }}>
          {bankedPerkChoices > 0
            ? "Opens after the wave-clear chain."
            : "Safe-point upgrades reduce mid-fight disruption."}
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

      {buildArchetype && (
        <div style={{ position: "absolute", bottom: isMobile ? 104 : 90, left: 12, background: "rgba(0,0,0,0.55)", border: `1px solid ${buildArchetype.color}66`, borderRadius: 6, padding: "5px 8px", maxWidth: 220 }}>
          <div style={{ fontSize: 10, color: buildArchetype.color, fontWeight: 900, letterSpacing: 1 }}>
            {buildArchetype.emoji} {buildArchetype.name.toUpperCase()} {buildArchetype.count >= buildArchetype.unlockAt ? "CAPSTONE" : `${buildArchetype.count}/${buildArchetype.unlockAt}`}
          </div>
          <div style={{ fontSize: 9, color: "#BBB", marginTop: 2 }}>
            {buildArchetype.statusDetail}
          </div>
          {!buildArchetype.unlocked && (
            <div style={{ fontSize: 8, color: "#888", marginTop: 3 }}>
              Next: {buildArchetype.nextMilestoneLabel}
            </div>
          )}
          {unlockedArchetypes?.length > 1 && (
            <div style={{ fontSize: 8, color: "#888", marginTop: 3 }}>
              Unlocked: {unlockedArchetypes.length}
            </div>
          )}
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

      {activeWaveContract && (
        <div style={{ position: "absolute", top: ((waveStreak || 0) >= 3 ? 34 : 8), left: killstreak >= 3 ? 110 : 12, maxWidth: 210, background: "rgba(255,209,102,0.14)", padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(255,209,102,0.42)", fontSize: 10, color: activeWaveContract.color || "#FFD166", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={activeWaveContract.description}>
          {activeWaveContract.label} · +{activeWaveContract.rewardCoins}💩
        </div>
      )}

      {/* Experiment follow-through chip */}
      {experimentMatched === "matched" && (
        <div style={{ position: "absolute", top: (waveStreak || 0) >= 3 ? 34 : 8, left: 12, background: "rgba(100,255,140,0.12)", padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(100,255,140,0.35)", fontSize: 10, color: "#88FF99", fontWeight: 700 }}>
          🧪 EXPERIMENT
        </div>
      )}

      {/* Live pace chip vs personal best */}
      {careerBestWave > 0 && wave >= 3 && !speedrunMode && (() => {
        const ahead = wave >= careerBestWave;
        const paceTop = ((waveStreak || 0) >= 3 ? 34 : 8) + (experimentMatched === "matched" ? 24 : 0);
        return (
          <div style={{ position: "absolute", top: paceTop + 24, left: 12, background: ahead ? "rgba(0,200,80,0.12)" : "rgba(255,100,0,0.10)", padding: "2px 8px", borderRadius: 4, border: `1px solid ${ahead ? "rgba(0,200,80,0.4)" : "rgba(255,100,0,0.35)"}`, fontSize: 10, color: ahead ? "#44FF88" : "#FF8844", fontWeight: 700 }}>
            {ahead ? `📈 PB PACE W${careerBestWave}` : `📉 PACE -${careerBestWave - wave}W`}
          </div>
        );
      })()}

      {/* Ammo / weapon */}
      <div style={{ position: "absolute", bottom: 8, right: isMobile ? 8 : 56, textAlign: "right" }}>
        {/* Grenade / Dash cooldown chips — parity with compact HUD ability-readiness row */}
        <div aria-label="Ability readiness" style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginBottom: 5 }}>
          <span data-action-state={dashReady ? "ready" : "cooldown"} style={{ fontSize: 8, fontWeight: 900, padding: "2px 6px", borderRadius: 4, border: `1px solid ${dashReady ? "rgba(124,255,184,.32)" : "rgba(255,192,120,.24)"}`, color: dashReady ? "#7CFFB8" : "#FFC078", background: "rgba(0,0,0,.22)", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
            DASH [⇧] · {dashReady ? "READY" : "COOL"}
          </span>
          <span data-action-state={grenadeReady ? "ready" : "cooldown"} style={{ fontSize: 8, fontWeight: 900, padding: "2px 6px", borderRadius: 4, border: `1px solid ${grenadeReady ? "rgba(124,255,184,.32)" : "rgba(255,192,120,.24)"}`, color: grenadeReady ? "#7CFFB8" : "#FFC078", background: "rgba(0,0,0,.22)", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
            GRENADE [Q] · {grenadeReady ? "READY" : "COOL"}
          </span>
        </div>
        <div style={{ fontSize: 11, color: weaponUpgrades?.[currentWeapon] >= 3 && weapon.upgradedName ? "#FFD700" : weapon.color, marginBottom: 1, fontWeight: 600 }}>
          {weapon.emoji} {weaponEvolutions?.[currentWeapon]?.evolved
            ? <span style={{ color: "#FF6B35", textShadow: "0 0 8px rgba(255,107,53,0.7)" }}>🔥 {weaponEvolutions[currentWeapon].name}</span>
            : weaponUpgrades?.[currentWeapon] >= 3 && weapon.upgradedName
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

      {/* In-game mission progress widget */}
      {HUD_FLAGS.showMissionWidget && missions && missions.length > 0 && (
        <div style={{ position: "absolute", top: 44, left: 12, maxWidth: 190, pointerEvents: "none" }}>
          {missions.map((m, idx) => {
            const done = missionDoneSet?.has(idx);
            return (
              <div key={idx} style={{ marginBottom: 5, opacity: done ? 0.45 : 0.88 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: done ? "#00FF88" : "#CCC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span>{m.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{done ? "✓ " : ""}{m.text}</span>
                </div>
                {!done && (
                  <div style={{ width: 120, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 1, marginTop: 2, overflow: "hidden" }}>
                    <div style={{ width: Math.min(100, ((m._progress || 0) / m.goal) * 100) + "%", height: "100%", background: "#FFD700", borderRadius: 1, transition: "width 0.3s" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Heat meter (top-right) */}
      {HUD_FLAGS.showHeatMeter && typeof heat === "number" && heat > 5 && (
        <div title={`Heat ${Math.round(heat)} — kills + multikills increase, decays over time`} style={{ position: "absolute", top: 8, right: 8, padding: "3px 9px", background: "rgba(0,0,0,0.55)", border: `1px solid rgba(255,${Math.max(40, 200 - heat * 1.6)},0,0.6)`, borderRadius: 999, fontSize: 10, color: heat >= 70 ? "#FF3300" : heat >= 40 ? "#FF8800" : "#FFC800", fontWeight: 900, letterSpacing: 1.5 }}>
          🔥 HEAT {Math.round(heat)}{heat >= 70 ? " · OVERDRIVE" : ""}
        </div>
      )}

      {hudDebugEnabled && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 999 }}>
          {getHudDebugSlots({ isMobile }).map((slot) => (
            <div
              key={slot.id}
              style={{
                position: "absolute",
                ...slot.style,
                maxWidth: "calc(100vw - 16px)",
                border: "1px dashed rgba(0,229,255,0.55)",
                background: "rgba(0,229,255,0.045)",
                color: "#7FE6FF",
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: 1,
                padding: 4,
                boxSizing: "border-box",
              }}
            >
              {slot.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
