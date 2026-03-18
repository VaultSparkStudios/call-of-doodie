import { useState, useEffect, useCallback } from "react";
import { WEAPONS, ENEMY_TYPES, DIFFICULTIES, ACHIEVEMENTS, META_UPGRADES, STARTER_LOADOUTS, NEW_FEATURES } from "../constants.js";
import { loadCareerStats, getDailyMissions, loadMissionProgress, loadMetaProgress, purchaseMetaUpgrade, prestigeAccount, getAccountLevel } from "../storage.js";
import LeaderboardPanel from "./LeaderboardPanel.jsx";
import AchievementsPanel from "./AchievementsPanel.jsx";
import SettingsPanel from "./SettingsPanel.jsx";

const TIER_LABELS = ["", "Ⅰ", "Ⅱ", "Ⅲ"];
const TIER_COLORS = ["#555", "#CD7F32", "#C0C0C0", "#FFD700"];

export default function MenuScreen({ username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, lbHasMore, onLoadMore, onStart, onRefreshLeaderboard, onChangeUsername, starterLoadout, setStarterLoadout, gameSettings, onSaveSettings }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showCareer, setShowCareer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showBestiary, setShowBestiary] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showNewFeatures, setShowNewFeatures] = useState(false);
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customSeed, setCustomSeed] = useState("");
  const [career, setCareer] = useState(null);
  const [missions, setMissions] = useState([]);
  const [missionProgress, setMissionProgress] = useState({});
  const [meta, setMeta] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const c = loadCareerStats();
    setCareer(c);
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

  const accountLevel = career ? getAccountLevel(career.totalKills) : 1;
  const prestige = meta?.prestige || 0;
  const PRESTIGE_REQUIRED_LEVEL = 25;
  const canPrestige = accountLevel >= PRESTIGE_REQUIRED_LEVEL;

  // Generate social share card for New Features
  const generateFeatureCard = useCallback(() => new Promise((resolve) => {
    const W = 1200, H = 630;
    const cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    const c = cvs.getContext("2d");

    // Background gradient
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a12");
    bg.addColorStop(0.5, "#110808");
    bg.addColorStop(1, "#080a0a");
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    // Grid overlay
    c.strokeStyle = "rgba(255,255,255,0.03)";
    c.lineWidth = 1;
    for (let x = 0; x < W; x += 50) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 50) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    // Left accent bar
    const accentGrad = c.createLinearGradient(0, 0, 0, H);
    accentGrad.addColorStop(0, "#FF6B35");
    accentGrad.addColorStop(1, "#CC2200");
    c.fillStyle = accentGrad;
    c.fillRect(0, 0, 7, H);

    // Title
    c.font = "900 76px Arial, sans-serif";
    c.fillStyle = "#FF6B35";
    c.shadowColor = "rgba(255,107,53,0.7)";
    c.shadowBlur = 36;
    c.fillText("CALL OF DOODIE", 60, 108);
    c.shadowBlur = 0;

    // Subtitle
    c.font = "bold 22px 'Courier New', monospace";
    c.fillStyle = "#FFD700";
    c.fillText("MODERN WARFARE ON MOM'S WIFI", 62, 148);

    // Divider
    c.strokeStyle = "rgba(255,107,53,0.35)";
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(60, 170); c.lineTo(W - 60, 170); c.stroke();

    // What's new label
    c.font = "900 18px 'Courier New', monospace";
    c.fillStyle = "#FF6B35";
    c.fillText("✦  WHAT'S NEW", 60, 208);

    // Features — single column, font scales down if any line is too wide
    const MAX_FEAT_W = W - 120; // 60px margin each side
    let featFontSize = 20;
    c.font = `bold ${featFontSize}px 'Courier New', monospace`;
    (NEW_FEATURES || []).forEach(f => {
      while (c.measureText(f).width > MAX_FEAT_W && featFontSize > 13) {
        featFontSize--;
        c.font = `bold ${featFontSize}px 'Courier New', monospace`;
      }
    });
    c.fillStyle = "#EEEEEE";
    const rowH = Math.max(featFontSize + 18, 36);
    (NEW_FEATURES || []).forEach((f, i) => {
      c.fillText(f, 60, 248 + i * rowH);
    });

    // Player stats card
    if (career && career.totalRuns > 0) {
      const sy = H - 148;
      c.fillStyle = "rgba(255,255,255,0.04)";
      c.strokeStyle = "rgba(255,215,0,0.2)";
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(60, sy, 520, 82, 8);
      c.fill(); c.stroke();

      const lvlLabel = prestige > 0 ? `P${prestige} · LVL ${accountLevel}` : `LVL ${accountLevel}`;
      c.font = "bold 15px 'Courier New', monospace";
      c.fillStyle = "#FFD700";
      c.fillText(`${username || "SOLDIER"}  ·  ${lvlLabel}`, 80, sy + 30);
      c.font = "13px 'Courier New', monospace";
      c.fillStyle = "#BBBBBB";
      c.fillText(`${(career.totalKills || 0).toLocaleString()} kills  ·  Best ${(career.bestScore || 0).toLocaleString()} pts  ·  Wave ${career.bestWave || 0}`, 80, sy + 56);
    }

    // CTA
    c.font = "900 30px 'Courier New', monospace";
    c.fillStyle = "#FFFFFF";
    c.shadowColor = "rgba(255,107,53,0.9)";
    c.shadowBlur = 24;
    c.fillText("▶  PLAY FREE AT VAULTSPARKSTUDIOS.COM", 60, H - 34);
    c.shadowBlur = 0;

    // Watermark
    c.font = "11px 'Courier New', monospace";
    c.fillStyle = "rgba(255,255,255,0.22)";
    c.fillText("VAULTSPARK STUDIOS", W - 210, H - 18);

    cvs.toBlob(blob => resolve({ blob }), "image/png");
  }), [career, username, prestige, accountLevel]);

  const handleShareFeatures = async () => {
    setSharing(true);
    try {
      const { blob } = await generateFeatureCard();
      const file = new File([blob], "call-of-doodie-whats-new.png", { type: "image/png" });
      const shareText = "Call of Doodie just dropped new features — global leaderboard, map themes, prestige system & more. Play free:";
      const shareUrl = "https://vaultsparkstudios.com/call-of-doodie";
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Call of Doodie — What's New", text: shareText, url: shareUrl });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "call-of-doodie-whats-new.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("Share failed", e);
    }
    setSharing(false);
  };

  const handlePrestige = () => {
    const updated = prestigeAccount();
    setMeta(updated);
    setShowPrestigeConfirm(false);
    setShowUpgrades(false);
  };

  return (
    <div style={{ ...base, touchAction: "pan-y", overflow: "hidden", alignItems: "center", color: "#fff", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", inset: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: 20, boxSizing: "border-box" }}>
      {showLeaderboard && <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLeaderboard(false)} />}
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
          <div style={{ ...card, maxWidth: 420, width: "100%", position: "relative", border: "1px solid rgba(0,229,255,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowCareer(false)} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
            <h3 style={{ color: "#00E5FF", margin: "0 0 8px", fontSize: 18, letterSpacing: 2 }}>📊 CAREER STATS</h3>
            {meta && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "7px 12px", borderRadius: 6, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)" }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <span style={{ color: "#FFD700", fontWeight: 900, fontSize: 14 }}>{meta.careerPoints || 0}</span>
                <span style={{ color: "#AAA", fontSize: 11 }}>career points · spend in 🎖️ UPGRADES</span>
              </div>
            )}
            {career.totalRuns === 0 ? (
              <p style={{ color: "#666", fontSize: 12, textAlign: "center", marginTop: 12 }}>No runs yet. Get out there and die!</p>
            ) : (() => {
              const runs = career.totalRuns || 1;
              const avgScore = career.totalScore ? Math.floor(career.totalScore / runs) : 0;
              const kd = career.totalDeaths > 0 ? (career.totalKills / career.totalDeaths).toFixed(1) : career.totalKills.toFixed(1);
              const avgKills = Math.floor(career.totalKills / runs);
              const Section = ({ label }) => (
                <div style={{ fontSize: 9, color: "#00E5FF", fontWeight: 700, letterSpacing: 2, padding: "10px 0 4px", borderBottom: "1px solid rgba(0,229,255,0.15)", marginBottom: 2 }}>
                  {label}
                </div>
              );
              const Row = ({ label, value, color }) => (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "#CCC" }}>{label}</span>
                  <span style={{ color: color || "#FFF", fontWeight: 700 }}>{value}</span>
                </div>
              );
              return (
                <>
                  <Section label="SCORE" />
                  <Row label="🏆 Best Score" value={career.bestScore.toLocaleString()} color="#FFD700" />
                  <Row label="📈 Total Score" value={(career.totalScore || 0).toLocaleString()} color="#FFD700" />
                  <Row label="📊 Avg Score / Run" value={avgScore.toLocaleString()} />

                  <Section label="COMBAT" />
                  <Row label="☠️ Total Kills" value={career.totalKills.toLocaleString()} color="#00FF88" />
                  <Row label="🎯 Best Kills / Run" value={career.bestKills || 0} color="#00FF88" />
                  <Row label="⚡ Avg Kills / Run" value={avgKills} />
                  <Row label="💀 K/D Ratio" value={kd} color={parseFloat(kd) >= 10 ? "#FFD700" : "#FFF"} />
                  <Row label="⚔️ Total Damage" value={career.totalDamage.toLocaleString()} color="#E040FB" />
                  <Row label="💥 Total Crits" value={(career.totalCrits || 0).toLocaleString()} color="#FF4500" />
                  <Row label="💣 Grenades Thrown" value={(career.totalGrenades || 0).toLocaleString()} />
                  <Row label="💨 Total Dashes" value={(career.totalDashes || 0).toLocaleString()} />
                  <Row label="👹 Boss Kills" value={(career.totalBossKills || 0).toLocaleString()} color="#FF4444" />

                  <Section label="PROGRESSION" />
                  <Row label="🎮 Total Runs" value={career.totalRuns} />
                  <Row label="🌊 Best Wave" value={career.bestWave} color="#00BFFF" />
                  <Row label="🔥 Best Streak" value={career.bestStreak} color="#FF4500" />
                  <Row label="🌪️ Best Combo" value={`×${career.bestCombo || 0}`} color="#FF4500" />
                  <Row label="⬆️ Best Level" value={career.bestLevel || 0} color="#00FF88" />
                  <Row label="⏱️ Total Play Time" value={fmtTime(career.totalPlayTime)} />
                  <Row label="🏅 Achievements" value={`${career.achievementsEver?.length || 0} / ${ACHIEVEMENTS.length}`} color="#FFD700" />
                </>
              );
            })()}
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

      {/* Prestige Confirm Modal */}
      {showPrestigeConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.96)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(6px)" }}>
          <div style={{ ...card, maxWidth: 400, width: "100%", border: "1px solid rgba(255,215,0,0.4)", padding: "28px 20px", color: "#fff", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>⭐</div>
            <h2 style={{ color: "#FFD700", margin: "0 0 10px", fontSize: 22, letterSpacing: 2 }}>PRESTIGE {prestige + 1}</h2>
            <div style={{ fontSize: 13, color: "#CCC", lineHeight: 1.9, marginBottom: 16 }}>
              <div style={{ color: "#FF4444" }}>✗ All meta upgrades reset</div>
              <div style={{ color: "#FF4444" }}>✗ Career points reset to 0</div>
              <div style={{ color: "#00FF88", marginTop: 4 }}>✓ Prestige {prestige + 1} badge earned</div>
              <div style={{ color: "#00FF88" }}>✓ All difficulties +{(prestige + 1) * 10}% harder (more glory)</div>
            </div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 20 }}>Kill records & achievements are preserved forever.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setShowPrestigeConfirm(false)} style={{ ...btnS, padding: "10px 24px", fontSize: 14 }}>CANCEL</button>
              <button onClick={handlePrestige} style={{ ...btnP, padding: "10px 24px", fontSize: 14, background: "linear-gradient(180deg,#FFD700,#AA7700)", color: "#000" }}>
                PRESTIGE ★
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meta Upgrades Modal */}
      {showUpgrades && meta && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 520, width: "100%", position: "relative", border: "1px solid rgba(255,107,53,0.3)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18 }}>🎖️ META UPGRADES</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ color: "#888", fontSize: 11, margin: 0 }}>Permanent bonuses · 3 tiers each · sequential purchase required</p>
              <div style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.4)", borderRadius: 6, padding: "4px 10px", fontSize: 13, fontWeight: 900, color: "#FFD700", flexShrink: 0 }}>
                ⭐ {(meta.careerPoints || 0).toLocaleString()}
              </div>
            </div>

            {/* Prestige section */}
            <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 8, background: prestige > 0 ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${prestige > 0 ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.1)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>⭐</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: prestige > 0 ? "#FFD700" : "#FFF" }}>
                    PRESTIGE {prestige > 0 ? `${prestige} — Reach P${prestige + 1}` : "— Reset & Rise"}
                  </div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                    {prestige > 0
                      ? `Active: enemies +${prestige * 10}% health & speed on all difficulties.`
                      : "Resets all upgrades & points. Permanently raises difficulty. Earn prestige badge."}
                  </div>
                  {!canPrestige && (
                    <div style={{ fontSize: 10, color: "#FF6B35", marginTop: 2 }}>
                      Requires Account Level {PRESTIGE_REQUIRED_LEVEL} · You are Level {accountLevel}
                    </div>
                  )}
                </div>
                <button
                  disabled={!canPrestige}
                  onClick={() => setShowPrestigeConfirm(true)}
                  style={{
                    padding: "7px 12px", borderRadius: 6, flexShrink: 0,
                    cursor: canPrestige ? "pointer" : "not-allowed",
                    background: canPrestige ? "linear-gradient(180deg,#FFD700,#AA7700)" : "rgba(255,255,255,0.05)",
                    color: canPrestige ? "#000" : "#444", border: "none",
                    fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 900,
                  }}
                >
                  PRESTIGE ★
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {META_UPGRADES.map((u) => {
                const ownedTier = (meta.upgradeTiers || {})[u.id] || 0;
                const nextTier = ownedTier + 1;
                const isMaxed = ownedTier >= u.tiers.length;
                const nextCost = isMaxed ? 0 : u.tiers[nextTier - 1].cost;
                const canAfford = !isMaxed && (meta.careerPoints || 0) >= nextCost;
                const activeTierDesc = ownedTier > 0 ? u.tiers[ownedTier - 1].desc : null;
                return (
                  <div key={u.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
                    background: isMaxed ? "rgba(255,215,0,0.05)" : ownedTier > 0 ? "rgba(255,107,53,0.05)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isMaxed ? "rgba(255,215,0,0.35)" : ownedTier > 0 ? "rgba(255,107,53,0.3)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{u.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isMaxed ? "#FFD700" : ownedTier > 0 ? "#FF6B35" : "#EEE" }}>{u.name}</span>
                        {/* Tier pips */}
                        <div style={{ display: "flex", gap: 3 }}>
                          {u.tiers.map((_, ti) => (
                            <div key={ti} style={{
                              width: 10, height: 10, borderRadius: 2,
                              background: ti < ownedTier ? TIER_COLORS[ti + 1] : "rgba(255,255,255,0.1)",
                              border: `1px solid ${ti < ownedTier ? TIER_COLORS[ti + 1] : "rgba(255,255,255,0.18)"}`,
                            }} />
                          ))}
                        </div>
                        {isMaxed && <span style={{ fontSize: 9, color: "#FFD700", fontWeight: 900 }}>MAX</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#AAA", lineHeight: 1.4 }}>
                        {activeTierDesc
                          ? <span style={{ color: "#CCC" }}>{activeTierDesc}</span>
                          : <span style={{ color: "#777" }}>{u.tiers[0].desc}</span>
                        }
                      </div>
                      {!isMaxed && ownedTier > 0 && (
                        <div style={{ fontSize: 9, color: "#888", marginTop: 1 }}>▲ Next: {u.tiers[nextTier - 1].desc}</div>
                      )}
                    </div>
                    {isMaxed ? (
                      <div style={{ fontSize: 14, color: "#FFD700", flexShrink: 0 }}>★★★</div>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          const result = purchaseMetaUpgrade(u.id, nextTier, nextCost);
                          if (result.success) setMeta(result.meta);
                        }}
                        style={{
                          padding: "5px 9px", borderRadius: 6, flexShrink: 0,
                          cursor: canAfford ? "pointer" : "not-allowed",
                          background: canAfford ? "linear-gradient(180deg,#FF6B35,#CC4400)" : "rgba(255,255,255,0.04)",
                          color: canAfford ? "#FFF" : "#444", border: "none",
                          fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                        }}
                      >
                        {TIER_LABELS[nextTier]} ⭐{nextCost.toLocaleString()}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: "rgba(255,107,53,0.05)", border: "1px solid rgba(255,107,53,0.18)", fontSize: 10, color: "#AAA" }}>
              💡 Earn 1 career pt per kill · Daily missions grant bonus pts · Upgrades persist between runs (reset on prestige)
            </div>
            <button onClick={() => setShowUpgrades(false)} style={{ ...btnP, marginTop: 14, width: "100%" }}>← BACK</button>
          </div>
        </div>
      )}

      {/* New Features Modal */}
      {showNewFeatures && (
        <>
          <style>{`.wnscroll::-webkit-scrollbar{width:5px}.wnscroll::-webkit-scrollbar-track{background:rgba(255,255,255,0.04);border-radius:3px}.wnscroll::-webkit-scrollbar-thumb{background:rgba(255,107,53,0.55);border-radius:3px}.wnscroll{scrollbar-width:thin;scrollbar-color:rgba(255,107,53,0.55) rgba(255,255,255,0.04)}`}</style>
          <div
            onClick={e => { if (e.target === e.currentTarget) setShowNewFeatures(false); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 12px env(safe-area-inset-bottom,12px)", backdropFilter: "blur(4px)" }}
          >
            <div style={{ ...card, maxWidth: 460, width: "100%", border: "1px solid rgba(255,107,53,0.4)", padding: 0, color: "#fff", display: "flex", flexDirection: "column", maxHeight: "90dvh", overflow: "hidden" }}>
              {/* Sticky header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,107,53,0.2)", flexShrink: 0 }}>
                <h3 style={{ color: "#FF6B35", margin: 0, fontSize: 17, letterSpacing: 2 }}>✦ WHAT'S NEW</h3>
                <button
                  onClick={() => setShowNewFeatures(false)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#CCC", fontSize: 16, cursor: "pointer", fontFamily: "monospace", lineHeight: 1, borderRadius: 6, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  aria-label="Close"
                >✕</button>
              </div>

              {/* Scrollable list */}
              <div className="wnscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
                  {NEW_FEATURES.map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#EEE", padding: "9px 12px", borderRadius: 6, background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.14)", lineHeight: 1.4, flexShrink: 0 }}>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky footer */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,107,53,0.2)", flexShrink: 0 }}>
                <button
                  onClick={handleShareFeatures}
                  disabled={sharing}
                  style={{ ...btnP, width: "100%", fontSize: 14, padding: "12px 20px", background: sharing ? "rgba(255,255,255,0.05)" : "linear-gradient(180deg,#FF6B35,#CC4400)", color: sharing ? "#555" : "#FFF" }}
                >
                  {sharing ? "GENERATING..." : "📤 SHARE THIS UPDATE"}
                </button>
                <div style={{ fontSize: 10, color: "#444", textAlign: "center", marginTop: 8 }}>Generates a shareable image card · no login required</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Panel */}
      {showSettings && gameSettings && (
        <SettingsPanel
          settings={gameSettings}
          onSave={s => { onSaveSettings(s); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Grid background */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,0.03) 49px,rgba(255,255,255,0.03) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(255,255,255,0.03) 49px,rgba(255,255,255,0.03) 50px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 500, width: "100%", margin: "auto" }}>
        <div style={{ fontSize: 10, color: "#BBB", letterSpacing: 6, marginBottom: 6 }}>VAULTSPARK STUDIOS PRESENTS</div>
        <h1 style={{ fontSize: "clamp(34px,9vw,64px)", fontWeight: 900, margin: 0, background: "linear-gradient(180deg,#FFD700,#FF6B00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -2, filter: "drop-shadow(0 0 20px rgba(255,107,0,0.5))" }}>
          CALL OF DOODIE
        </h1>
        <div style={{ fontSize: "clamp(10px,2.5vw,16px)", color: "#FF6B35", marginTop: -2, letterSpacing: 3 }}>MODERN WARFARE ON MOM'S WIFI</div>

        {/* Username + Account Level badge */}
        <div style={{ margin: "10px 0 6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#FFD700" }}>
            Deploying as: <span style={{ fontWeight: 900 }}>{username}</span>
            <span onClick={onChangeUsername} style={{ color: "#CCC", cursor: "pointer", marginLeft: 8, fontSize: 11, textDecoration: "underline" }}>(change)</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20,
            background: prestige > 0 ? "rgba(255,215,0,0.14)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${prestige > 0 ? "rgba(255,215,0,0.45)" : "rgba(255,255,255,0.18)"}`,
          }}>
            {prestige > 0 && <span style={{ fontSize: 11, color: "#FFD700", fontWeight: 900 }}>P{prestige}</span>}
            <span style={{ fontSize: 11, color: prestige > 0 ? "#FFD700" : "#AAA", fontWeight: 700 }}>LVL {accountLevel}</span>
          </div>
        </div>

        {/* New Features banner */}
        <div
          onClick={() => setShowNewFeatures(true)}
          style={{ ...card, margin: "6px 0 10px", padding: "9px 14px", cursor: "pointer", border: "1px solid rgba(255,107,53,0.35)", background: "rgba(255,107,53,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 900, letterSpacing: 2 }}>✦ WHAT'S NEW</div>
            <div style={{ fontSize: 10, color: "#AAA", marginTop: 2 }}>Tiered upgrades · Prestige · Map themes · Global leaderboard</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleShareFeatures(); }}
              disabled={sharing}
              style={{ padding: "4px 9px", borderRadius: 4, cursor: "pointer", background: "rgba(255,107,53,0.18)", border: "1px solid rgba(255,107,53,0.45)", color: "#FF6B35", fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}
            >
              {sharing ? "..." : "📤 SHARE"}
            </button>
            <span style={{ color: "#666", fontSize: 13 }}>›</span>
          </div>
        </div>

        {/* Weapons loadout */}
        <div style={{ ...card, margin: "0 0 10px", textAlign: "left" }}>
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
        <div style={{ ...card, margin: "0 0 10px", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#DDD", marginBottom: 8, letterSpacing: 2, textAlign: "center", fontWeight: 700 }}>
            DIFFICULTY
            {prestige > 0 && <span style={{ color: "#FFD700", fontSize: 9, marginLeft: 8, fontWeight: 700 }}>+{prestige * 10}% HARDER (P{prestige})</span>}
          </div>
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
                <div style={{ fontSize: 9, color: "#999", marginTop: 3 }}>
                  HP: {d.playerHP} · Enemy HP: {prestige > 0 ? (d.healthMult * (1 + prestige * 0.1)).toFixed(2) : d.healthMult}x · Speed: {prestige > 0 ? (d.speedMult * (1 + prestige * 0.1)).toFixed(2) : d.speedMult}x
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Starter Loadout */}
        <div style={{ ...card, margin: "0 0 10px", textAlign: "left" }}>
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
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <button onClick={() => onStart(customSeed || undefined)} style={{ ...btnP, minWidth: 150 }}>DEPLOY</button>
          <button onClick={() => { onRefreshLeaderboard(); setShowLeaderboard(true); }} style={{ ...btnS, minWidth: 150 }}>LEADERBOARD</button>
        </div>
        {/* Seed + Settings row */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <input
            value={customSeed} onChange={e => setCustomSeed(e.target.value.replace(/\D/g, ""))}
            placeholder="Seed # (optional)"
            maxLength={6}
            style={{ width: 120, padding: "6px 10px", fontSize: 11, fontFamily: "monospace", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, color: "#EEE", outline: "none", textAlign: "center" }}
          />
          <button onClick={() => setShowSettings(true)} style={{ ...btnS, padding: "6px 14px", fontSize: 11 }}>⚙ SETTINGS</button>
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
