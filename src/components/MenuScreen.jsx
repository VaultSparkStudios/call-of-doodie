import { useState, useEffect } from "react";
import { WEAPONS, DIFFICULTIES, ACHIEVEMENTS } from "../constants.js";
import { loadCareerStats } from "../storage.js";
import LeaderboardPanel from "./LeaderboardPanel.jsx";
import AchievementsPanel from "./AchievementsPanel.jsx";

export default function MenuScreen({ username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, onStart, onRefreshLeaderboard, onChangeUsername }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showCareer, setShowCareer] = useState(false);
  const [career, setCareer] = useState(null);

  useEffect(() => { setCareer(loadCareerStats()); }, []);

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
    <div style={{ ...base, alignItems: "center", justifyContent: "center", color: "#fff", padding: 20, boxSizing: "border-box", overflowY: "auto" }}>
      {showLeaderboard && <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} username={username} onClose={() => setShowLeaderboard(false)} />}
      {showAchievements && <AchievementsPanel achievementsUnlocked={career?.achievementsEver || []} onClose={() => setShowAchievements(false)} />}

      {/* Career Stats Modal */}
      {showCareer && career && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div style={{ ...card, maxWidth: 400, width: "100%", position: "relative", border: "1px solid rgba(0,229,255,0.25)", padding: "20px 16px", color: "#fff" }}>
            <button onClick={() => setShowCareer(false)} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
            <h3 style={{ color: "#00E5FF", margin: "0 0 14px", fontSize: 18, letterSpacing: 2 }}>📊 CAREER STATS</h3>
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

      {/* Grid background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,0.03) 49px,rgba(255,255,255,0.03) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(255,255,255,0.03) 49px,rgba(255,255,255,0.03) 50px)" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 500, width: "100%" }}>
        <div style={{ fontSize: 10, color: "#BBB", letterSpacing: 6, marginBottom: 6 }}>ACTIVISION'T PRESENTS</div>
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

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <button onClick={onStart} style={{ ...btnP, minWidth: 150 }}>DEPLOY</button>
          <button onClick={() => { onRefreshLeaderboard(); setShowLeaderboard(true); }} style={{ ...btnS, minWidth: 150 }}>LEADERBOARD</button>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={() => { setCareer(loadCareerStats()); setShowCareer(true); }} style={{ ...btnS, minWidth: 150 }}>📊 CAREER STATS</button>
          <button onClick={() => { setCareer(loadCareerStats()); setShowAchievements(true); }} style={{ ...btnS, minWidth: 150 }}>🏅 ACHIEVEMENTS</button>
        </div>

        {/* Controls reference */}
        <div style={{ ...card, margin: "0 auto", maxWidth: 440, padding: "14px 18px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ fontSize: 13, color: "#FFF", letterSpacing: 1, marginBottom: 8, fontWeight: 800 }}>CONTROLS</div>
          {isMobile ? (
            <div style={{ fontSize: 13, color: "#F0F0F0", lineHeight: 2.0 }}>
              <div><span style={{ color: "#FF6B35", fontWeight: 800 }}>Left thumb</span> - Move · <span style={{ color: "#FF6B35", fontWeight: 800 }}>Right thumb</span> - Aim &amp; fire</div>
              <div><span style={{ color: "#00E5FF", fontWeight: 800 }}>DASH</span> - Dodge · <span style={{ color: "#FF4500", fontWeight: 800 }}>GRENADE</span> - Boom</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#F0F0F0", lineHeight: 2.0 }}>
              <div><span style={{ color: "#FF6B35", fontWeight: 800 }}>WASD</span> Move · <span style={{ color: "#FF6B35", fontWeight: 800 }}>Mouse</span> Aim · <span style={{ color: "#FF6B35", fontWeight: 800 }}>Click</span> Shoot</div>
              <div><span style={{ color: "#FFD700", fontWeight: 800 }}>R</span> Reload · <span style={{ color: "#FFD700", fontWeight: 800 }}>1–4</span> Weapons · <span style={{ color: "#FF4500", fontWeight: 800 }}>5/Q/G</span> Grenade</div>
              <div><span style={{ color: "#00E5FF", fontWeight: 800 }}>Space/Shift</span> Dash · <span style={{ color: "#FFD700", fontWeight: 800 }}>Esc</span> Pause</div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
          ✨ Perks on level-up · 🔧 Weapon upgrades · ⚠️ Boss waves every 5 waves
        </div>
      </div>
    </div>
  );
}
