import { useState } from "react";
import { ACHIEVEMENTS, RANK_NAMES } from "../constants.js";
import LeaderboardPanel from "./LeaderboardPanel.jsx";

export default function DeathScreen({
  score, kills, deaths, wave, level, bestStreak, timeSurvived, totalDamage,
  crits, grenades, deathMessage, difficulty, achievementsUnlocked,
  leaderboard, lbLoading, username, DIFFICULTIES,
  onStartGame, onMenu, onRefreshLeaderboard, onSubmitScore,
  fmtTime,
}) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastWords, setLastWords] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const btnP = { padding: "14px 40px", fontSize: 18, fontWeight: 900, fontFamily: "'Courier New',monospace", background: "linear-gradient(180deg,#FF6B35,#CC4400)", color: "#FFF", border: "none", borderRadius: 6, cursor: "pointer", letterSpacing: 2 };
  const btnS = { ...btnP, background: "rgba(255,255,255,0.08)", color: "#CCC", border: "1px solid #444" };
  const card = { background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: 16 };
  const base = { width: "100%", height: "100dvh", margin: 0, overflow: "hidden", background: "#0a0a0a", fontFamily: "'Courier New', monospace", display: "flex", flexDirection: "column", position: "relative", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" };

  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const rankIndex = Math.min(Math.floor(kills / 10), RANK_NAMES.length - 1);

  const handleSubmit = async () => {
    const words = lastWords.trim().split(/\s+/).filter(Boolean);
    if (words.length > 5) { setLastWords(words.slice(0, 5).join(" ")); return; }
    await onSubmitScore({ lastWords: lastWords.trim() || "...", rank: RANK_NAMES[rankIndex] });
    setSubmitted(true);
  };

  return (
    <div style={{ ...base, alignItems: "center", justifyContent: "center", color: "#fff", background: "linear-gradient(135deg,#1a0000 0%,#2a0808 50%,#1a0000 100%)", padding: 16, boxSizing: "border-box", overflowY: "auto" }}>
      {showLeaderboard && (
        <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} username={username} onClose={() => setShowLeaderboard(false)} />
      )}
      <div style={{ textAlign: "center", maxWidth: 460, width: "100%" }}>
        <div style={{ fontSize: 48 }}>💀</div>
        <h2 style={{ fontSize: "clamp(24px,7vw,38px)", color: "#FF2222", margin: "4px 0", letterSpacing: 3 }}>YOU DIED</h2>
        <p style={{ color: "#FF6666", fontSize: 14, fontStyle: "italic", margin: "4px 0 8px" }}>"{deathMessage}"</p>
        <div style={{ fontSize: 11, color: diff.color, marginBottom: 12, fontWeight: 700 }}>
          {diff.emoji} {diff.label.toUpperCase()} MODE
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
          {[
            [score.toLocaleString(), "SCORE", "#FFD700"],
            [kills, "KILLS", "#0F0"],
            ["W" + wave, "WAVE", "#F44"],
            ["Lv " + level, "LEVEL", "#00FF88"],
            [bestStreak, "BEST STREAK", "#FF4500"],
            [fmtTime(timeSurvived), "SURVIVED", "#00BFFF"],
            [totalDamage.toLocaleString(), "TOTAL DMG", "#E040FB"],
            [crits || 0, "CRITS", "#FFD700"],
            [grenades || 0, "GRENADES", "#FF4500"],
          ].map(([val, label, color], i) => (
            <div key={i} style={{ ...card, padding: "8px 4px" }}>
              <div style={{ fontSize: 17, fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: 9, color: "#DDD", letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>

        {achievementsUnlocked.length > 0 && (
          <div style={{ marginBottom: 10, fontSize: 12, color: "#DDD" }}>
            {achievementsUnlocked.length} achievement{achievementsUnlocked.length > 1 ? "s" : ""} unlocked:{" "}
            <span style={{ color: "#FFD700" }}>
              {achievementsUnlocked.map(id => { const a = ACHIEVEMENTS.find(x => x.id === id); return a ? a.emoji : ""; }).join(" ")}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 10, color: "#EEE", fontSize: 13 }}>
          Rank: <span style={{ color: "#FFD700", fontWeight: 700 }}>{RANK_NAMES[rankIndex]}</span>
        </div>

        {!submitted ? (
          <div style={{ ...card, marginBottom: 12, border: "1px solid rgba(255,215,0,0.15)" }}>
            <div style={{ fontSize: 12, color: "#FFD700", marginBottom: 8, letterSpacing: 1, fontWeight: 700 }}>SUBMIT TO HALL OF SHAME</div>
            <input
              type="text"
              value={lastWords}
              maxLength={60}
              onChange={e => { const w = e.target.value.split(/\s+/).filter(Boolean); if (w.length <= 5) setLastWords(e.target.value); }}
              placeholder="Famous last words (5 words max)"
              style={{ width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: "'Courier New',monospace", fontStyle: "italic", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#FF69B4", textAlign: "center", outline: "none", marginBottom: 6, boxSizing: "border-box" }}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            />
            <div style={{ fontSize: 10, color: "#CCC", marginBottom: 8 }}>
              {lastWords.trim().split(/\s+/).filter(Boolean).length}/5 words
            </div>
            <button onClick={handleSubmit} style={{ ...btnP, width: "100%", fontSize: 14, padding: "10px" }}>SUBMIT SCORE</button>
          </div>
        ) : (
          <div style={{ ...card, marginBottom: 12, border: "1px solid rgba(0,255,0,0.2)", background: "rgba(0,255,0,0.03)" }}>
            <div style={{ color: "#0F0", fontSize: 14, fontWeight: 700 }}>Score submitted!</div>
            <div style={{ color: "#CCC", fontSize: 11, marginTop: 4 }}>Your shame is now public knowledge.</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStartGame} style={{ ...btnP, minWidth: 110, fontSize: 15 }}>PLAY AGAIN</button>
          <button onClick={() => { onRefreshLeaderboard(); setShowLeaderboard(true); }} style={{ ...btnS, minWidth: 130, fontSize: 15 }}>LEADERBOARD</button>
          <button onClick={onMenu} style={{ ...btnS, minWidth: 110, fontSize: 15 }}>RAGE QUIT</button>
        </div>
      </div>
    </div>
  );
}
