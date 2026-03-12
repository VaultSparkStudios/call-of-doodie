import { useState, useEffect } from "react";
import { WEAPONS, ENEMY_TYPES, DIFFICULTIES, ACHIEVEMENTS, META_UPGRADES, STARTER_LOADOUTS } from "../constants.js";
import { loadCareerStats, getDailyMissions, loadMissionProgress, loadMetaProgress, purchaseMetaUpgrade } from "../storage.js";
import LeaderboardPanel from "./LeaderboardPanel.jsx";
import AchievementsPanel from "./AchievementsPanel.jsx";

export default function MenuScreen({ username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, onStart, onRefreshLeaderboard, onChangeUsername, starterLoadout, setStarterLoadout }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showCareer, setShowCareer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showBestiary, setShowBestiary] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [career, setCareer] = useState(null);
  const [missions, setMissions] = useState([]);
  const [missionProgress, setMissionProgress] = useState({});
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    setCareer(loadCareerStats());
    setMissions(getDailyMissions());
    setMissionProgress(loadMissionProgress());
    setMeta(loadMetaProgress());
  }, []);

  const btnP = { padding: "14px 40px", fontSize: 18, fontWeight: 900, fontFamily: "'Courier New',monospace", background: "linear-gradient(180deg,#FF6B35,#CC4400)", color: "#FFF", border: "none", borderRadius: 6, cursor: "pointer", letterSpacing: 2 };
  const btnS = { ...btnP, background: "rgba(255,255,255,0.08)", color: "#CCC", border: "1px solid #444" };
  const card = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: 16 };
  const base = { width: "100%", height: "100dvh", margin: 0, overflow: "hidden", background: "#0a0a0a", fontFamily: "'Courier New', monospace", display: "flex", flexDirection: "column", position: "relative", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" };

  const fmtTime = (s) => {
    if (!s) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{ ...base, overflow: "hidden", alignItems: "center", color: "#fff", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", inset: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: 20, boxSizing: "border-box" }}>
      {showLeaderboard && <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} username={username} onClose={() => setShowLeaderboard(false)} />}
      {showAchievements && <AchievementsPanel achievementsUnlocked={career?.achievementsEver || []} onClose={() => setShowAchievements(false)} />}

      {/* Rules Modal */}
      {showRules && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>📜 RULES OF ENGAGEMENT</h3>
            <div style={{ fontSize: 13, color: "#EEE", lineHeight: 2 }}>
              <div>🎯 <strong style={{ color: "#FF6B35" }}>Objective:</strong> Survive as many waves as possible</div>
              <div>👾 <strong style={{ color: "#FF6B35" }}>Enemies:</strong> Spawn in waves, each harder than the last</div>
              <div>⚠️ <strong style={{ color: "#FF6B35" }}>Boss Waves:</strong> Every 5th wave spawns a powerful boss!</div>
              <div>⚡ <strong style={{ color: "#FF6B35" }}>Combos:</strong> Kill quickly for score multipliers (2s window)</div>
              <div>🔥 <strong style={{ color: "#FF6B35" }}>Killstreaks:</strong> Every 5 kills triggers a bonus attack</div>
              <div>💥 <strong style={{ color: "#FF6B35" }}>Critical Hits:</strong> 15% chance for 2x damage (gold text)</div>
              <div>💊 <strong style={{ color: "#FF6B35" }}>Pickups:</strong> Enemies drop health, ammo, speed, nukes & upgrades</div>
              <div>🔧 <strong style={{ color: "#FF6B35" }}>Weapon Upgrades:</strong> Rare drops — boost damage, fire rate & ammo!</div>
              <div>😇 <strong style={{ color: "#FF6B35" }}>Guardian Angel:</strong> Super rare boss drop — grants 1 extra life!</div>
              <div>✨ <strong style={{ color: "#FF6B35" }}>Perks:</strong> Pick one on every level-up. They stack!</div>
              <div>⚠️ <strong style={{ color: "#FF6B35" }}>Ranged Foes:</strong> Glowing ring enemies shoot at you!</div>
              <div>💨 <strong style={{ color: "#FF6B35" }}>Dash:</strong> Brief invincibility to dodge through danger</div>
              <div>⬆ <strong style={{ color: "#FF6B35" }}>XP & Levels:</strong> Level up from kills — choose a perk each time</div>
              <div>🏆 <strong style={{ color: "#FF6B35" }}>Leaderboard:</strong> Submit your score with famous last words</div>
            </div>
            <button onClick={() => setShowRules(false)} style={{ ...btnP, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
          </div>
        </div>
      )}

      {/* Controls Modal */}
      {showControls && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>⌨ CONTROLS</h3>
            {isMobile ? (
              <div style={{ fontSize: 13, color: "#EEE", lineHeight: 2.2 }}>
                <div>👆 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Left thumb</span> — Move soldier</div>
                <div>👆 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Right thumb</span> — Aim & auto-fire</div>
                <div>🎯 <span style={{ color: "#EEE" }}>Move only → auto-aims nearest enemy</span></div>
                <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>DASH button</span> — Invincible dodge</div>
                <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>GRENADE button</span> — AOE explosion</div>
                <div>🔢 <span style={{ color: "#FFD700", fontWeight: 800 }}>Weapon buttons</span> — Tap to swap</div>
                <div>⟳ <span style={{ color: "#FFD700", fontWeight: 800 }}>R button</span> — Manual reload</div>
                <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Pause button</span> — Pause menu</div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#EEE", lineHeight: 2.2 }}>
                <div>🏃 <span style={{ color: "#FF6B35", fontWeight: 800 }}>W/A/S/D</span> — Move</div>
                <div>🖱 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Mouse</span> — Aim</div>
                <div>🔫 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Left Click</span> — Shoot</div>
                <div>🔄 <span style={{ color: "#FFD700", fontWeight: 800 }}>R</span> — Reload</div>
                <div>🔢 <span style={{ color: "#FFD700", fontWeight: 800 }}>1 / 2 / 3 / 4</span> — Switch weapons</div>
                <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>5 / Q / G</span> — Throw grenade</div>
                <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>Space / Shift</span> — Dash</div>
                <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Escape</span> — Pause / Resume</div>
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "#FFD700", fontWeight: 700, marginBottom: 6 }}>WEAPONS</div>
              {WEAPONS.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: "#EEE" }}>
                  <span style={{ fontSize: 16 }}>{w.emoji}</span>
                  <span style={{ color: w.color, fontWeight: 700, minWidth: 140 }}>[{i + 1}] {w.name}</span>
                  <span style={{ color: "#CCC", fontSize: 11 }}>{w.desc}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowControls(false)} style={{ ...btnP, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
          </div>
        </div>
      )}

      {/* Most Wanted List Modal */}
      {showBestiary && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>👾 MOST WANTED LIST</h3>
            {ENEMY_TYPES.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 6, marginBottom: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 24 }}>{e.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: e.color }}>{e.name}</div>
                  <div style={{ fontSize: 10, color: "#CCC" }}>HP: {e.health} · Speed: {e.speed} · Points: {e.points}{e.ranged ? " · RANGED ⚡" : ""}</div>
                  <div style={{ fontSize: 10, color: "#FF69B4", fontStyle: "italic" }}>"{e.deathQuote}"</div>
                </div>
              </div>
            ))}
            <button onClick={() => setShowBestiary(false)} style={{ ...btnP, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
          </div>
        </div>
      )}

      {/* Career Stats Modal */}
      {showCareer && career && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 400, width: "100%", position: "relative", border: "1px solid rgba(0,229,255,0.25)", padding: "20px 16px", color: "#fff" }}>
            <button onClick={() => setShowCareer(false)} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
            <h3 style={{ color: "#00E5FF", margin: "0 0 8px", fontSize: 18, letterSpacing: 2 }}>📊 CAREER STATS</h3>
            {meta && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "7px 12px", borderRadius: 6, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)" }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <span style={{ color: "#FFD700", fontWeight: 900, fontSize: 14 }}>{meta.careerPoints || 0}</span>
                <span style={{ color: "#AAA", fontSize: 11 }}>career points · spend in 🎖️ UPGRADES</span>
              </div>
            )}
            {[
              ["🎮 Total Runs", career.totalRuns],
              ["☠️ Total Kills", career.totalKills.toLocaleString()],
              ["💀 Total Deaths", career.totalDeaths],
              ["🏆 Best Score", career.bestScore.toLocaleString()],
              ["🌊 Best Wave", career.bestWave],
              ["🔥 Best Streak", career.bestStreak],
              ["⚔️ Total Damage", career.totalDamage.toLocaleString()],
              ["⏱️ Total Play Time", fmtTime(career.totalPlayTime)],
              ["🏅 Achievements", `${career.achievementsEver?.length || 0} / ${ACHIEVEMENTS.length}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 }}>
                <span style={{ color: "#CCC" }}>{label}</span>
                <span style={{ color: "#FFF", fontWeight: 700 }}>{value}</span>
              </div>
            ))}
            {career.totalRuns === 0 && (
              <p style={{ color: "#666", fontSize: 12, textAlign: "center", marginTop: 12 }}>No runs yet. Get out there and die!</p>
            )}
          </div>
        </div>
      )}

      {/* Daily Missions Modal */}
      {showMissions && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.3)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FFD700", margin: "0 0 4px", fontSize: 18 }}>📋 DAILY MISSIONS</h3>
            <p style={{ color: "#888", fontSize: 11, margin: "0 0 14px" }}>Resets at midnight · Complete for career point bonuses</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {missions.map((m, i) => {
                const done = !!missionProgress[i];
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 8, background: done ? "rgba(0,255,136,0.07)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${done ? "rgba(0,255,136,0.35)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: done ? "#00FF88" : "#FFF" }}>{m.text}</div>
                      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Reward: +{m.goal} career pts on completion</div>
                    </div>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{done ? "✅" : "⬜"}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", fontSize: 12, color: "#CCC" }}>
              💡 Missions are tracked automatically in-game. Progress saves on run end.
            </div>
            <button onClick={() => setShowMissions(false)} style={{ ...btnP, marginTop: 16, width: "100%" }}>← BACK</button>
          </div>
        </div>
      )}

      {/* Meta Upgrades Modal */}
      {showUpgrades && meta && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,107,53,0.3)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18 }}>🎖️ META UPGRADES</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ color: "#888", fontSize: 11, margin: 0 }}>Permanent bonuses — active every run</p>
              <div style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.4)", borderRadius: 6, padding: "4px 10px", fontSize: 13, fontWeight: 900, color: "#FFD700" }}>
                ⭐ {meta.careerPoints || 0} pts
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {META_UPGRADES.map((u) => {
                const owned = (meta.unlocks || []).includes(u.id);
                const canAfford = (meta.careerPoints || 0) >= u.cost;
                return (
                  <div key={u.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 8, background: owned ? "rgba(255,107,53,0.08)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${owned ? "rgba(255,107,53,0.4)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{u.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: owned ? "#FF6B35" : "#FFF" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "#CCC", marginTop: 1 }}>{u.desc}</div>
                    </div>
                    {owned ? (
                      <div style={{ fontSize: 11, color: "#FF6B35", fontWeight: 700, flexShrink: 0 }}>OWNED ✓</div>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          const result = purchaseMetaUpgrade(u.id, u.cost);
                          if (result.success) setMeta(result.meta);
                        }}
                        style={{
                          padding: "6px 12px", borderRadius: 6, cursor: canAfford ? "pointer" : "not-allowed",
                          background: canAfford ? "linear-gradient(180deg,#FF6B35,#CC4400)" : "rgba(255,255,255,0.05)",
                          color: canAfford ? "#FFF" : "#555", border: "none",
                          fontFamily: "'Courier New',monospace", fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        ⭐ {u.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)", fontSize: 12, color: "#CCC" }}>
              💡 Earn career points by killing enemies in any run (1 pt per kill).
            </div>
            <button onClick={() => setShowUpgrades(false)} style={{ ...btnP, marginTop: 16, width: "100%" }}>← BACK</button>
          </div>
        </div>
      )}

      {/* Grid background */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,0.03) 49px,rgba(255,255,255,0.03) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(255,255,255,0.03) 49px,rgba(255,255,255,0.03) 50px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 500, width: "100%", margin: "auto" }}>
        <div style={{ fontSize: 10, color: "#BBB", letterSpacing: 6, marginBottom: 6 }}>VAULTSPARK STUDIOS PRESENTS</div>
        <h1 style={{ fontSize: "clamp(34px,9vw,64px)", fontWeight: 900, margin: 0, background: "linear-gradient(180deg,#FFD700,#FF6B00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -2, filter: "drop-shadow(0 0 20px rgba(255,107,0,0.5))" }}>
          CALL OF DOODIE
        </h1>
        <div style={{ fontSize: "clamp(10px,2.5vw,16px)", color: "#FF6B35", marginTop: -2, letterSpacing: 3 }}>MODERN WARFARE ON MOM'S WIFI</div>

        <div style={{ margin: "10px 0 6px", fontSize: 13, color: "#FFD700" }}>
          Deploying as: <span style={{ fontWeight: 900 }}>{username}</span>
          <span onClick={onChangeUsername} style={{ color: "#CCC", cursor: "pointer", marginLeft: 8, fontSize: 11, textDecoration: "underline" }}>(change)</span>
        </div>

        {/* Weapons loadout */}
        <div style={{ ...card, margin: "12px 0", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#DDD", marginBottom: 6, letterSpacing: 2, textAlign: "center", fontWeight: 700 }}>WEAPONS LOADOUT</div>
          {WEAPONS.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12 }}>
              <span style={{ width: 20, textAlign: "center" }}>{w.emoji}</span>
              <span style={{ flex: 1, fontWeight: 700, color: w.color }}>{w.name}</span>
              <span style={{ color: "#CCC", fontSize: 10 }}>[{i + 1}]</span>
              <span style={{ color: "#BBB", fontSize: 10, fontStyle: "italic" }}>{w.desc}</span>
            </div>
          ))}
        </div>

        {/* Difficulty */}
        <div style={{ ...card, margin: "0 0 12px", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#DDD", marginBottom: 8, letterSpacing: 2, textAlign: "center", fontWeight: 700 }}>DIFFICULTY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {Object.entries(DIFFICULTIES).map(([key, d]) => (
              <button key={key} onClick={() => setDifficulty(key)} style={{
                padding: "10px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                fontFamily: "'Courier New',monospace",
                background: difficulty === key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                border: difficulty === key ? `2px solid ${d.color}` : "1px solid rgba(255,255,255,0.1)",
                color: "#FFF", transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: d.color }}>{d.emoji} {d.label}</div>
                <div style={{ fontSize: 10, color: "#CCC", marginTop: 2 }}>{d.desc}</div>
                <div style={{ fontSize: 9, color: "#999", marginTop: 3 }}>HP: {d.playerHP} · Enemy HP: {d.healthMult}x · Speed: {d.speedMult}x</div>
              </button>
            ))}
          </div>
        </div>

        {/* Starter Loadout */}
        <div style={{ ...card, margin: "0 0 12px", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#DDD", marginBottom: 8, letterSpacing: 2, textAlign: "center", fontWeight: 700 }}>STARTER LOADOUT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {STARTER_LOADOUTS.map((l) => (
              <button key={l.id} onClick={() => setStarterLoadout?.(l.id)} style={{
                padding: "9px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                fontFamily: "'Courier New',monospace",
                background: starterLoadout === l.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                border: starterLoadout === l.id ? `2px solid ${l.color}` : "1px solid rgba(255,255,255,0.1)",
                color: "#FFF", transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: l.color }}>{l.emoji} {l.name}</div>
                <div style={{ fontSize: 10, color: "#CCC", marginTop: 2 }}>{l.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <button onClick={onStart} style={{ ...btnP, minWidth: 150 }}>DEPLOY</button>
          <button onClick={() => { onRefreshLeaderboard(); setShowLeaderboard(true); }} style={{ ...btnS, minWidth: 150 }}>LEADERBOARD</button>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <button onClick={() => { setCareer(loadCareerStats()); setMeta(loadMetaProgress()); setShowCareer(true); }} style={{ ...btnS, minWidth: 150 }}>📊 CAREER STATS</button>
          <button onClick={() => { setCareer(loadCareerStats()); setShowAchievements(true); }} style={{ ...btnS, minWidth: 150 }}>🏅 ACHIEVEMENTS</button>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <button onClick={() => { setMissions(getDailyMissions()); setMissionProgress(loadMissionProgress()); setShowMissions(true); }} style={{ ...btnS, minWidth: 150 }}>📋 MISSIONS</button>
          <button onClick={() => { setMeta(loadMetaProgress()); setShowUpgrades(true); }} style={{ ...btnS, minWidth: 150 }}>🎖️ UPGRADES</button>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={() => setShowRules(true)} style={{ ...btnS, minWidth: 150 }}>📜 RULES</button>
          <button onClick={() => setShowControls(true)} style={{ ...btnS, minWidth: 150 }}>⌨ CONTROLS</button>
          <button onClick={() => setShowBestiary(true)} style={{ ...btnS, minWidth: 150 }}>👾 MOST WANTED</button>
        </div>

        <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
          ✨ Perks on level-up · 🔧 Weapon upgrades · ⚠️ Boss waves every 5 waves
        </div>
      </div>
      </div>
    </div>
  );
}
