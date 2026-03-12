import { useState } from "react";
import { ACHIEVEMENTS, RANK_NAMES } from "../constants.js";
import LeaderboardPanel from "./LeaderboardPanel.jsx";

const TIER_COLORS = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", legendary: "#FF6B35" };

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
  const [sharing, setSharing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  const generateScoreCard = () => new Promise((resolve) => {
    const W = 1200, H = 630;
    const cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    const c = cvs.getContext("2d");
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const rank = RANK_NAMES[Math.min(Math.floor(kills / 10), RANK_NAMES.length - 1)];

    // Background
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a0a"); bg.addColorStop(0.5, "#12082a"); bg.addColorStop(1, "#1a0505");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    // Grid overlay
    c.strokeStyle = "rgba(255,255,255,0.03)"; c.lineWidth = 1;
    for (let x = 0; x < W; x += 50) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 50) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    // Orange accent bar at top
    const accent = c.createLinearGradient(0, 0, W, 0);
    accent.addColorStop(0, "#FF6B35"); accent.addColorStop(0.5, "#FFD700"); accent.addColorStop(1, "#FF6B35");
    c.fillStyle = accent; c.fillRect(0, 0, W, 5);

    // Studio label
    c.font = "bold 18px 'Courier New', monospace";
    c.fillStyle = "#888"; c.textAlign = "center";
    c.fillText("VAULTSPARK STUDIOS PRESENTS", W / 2, 40);

    // Game title
    const titleGrad = c.createLinearGradient(0, 50, 0, 130);
    titleGrad.addColorStop(0, "#FFD700"); titleGrad.addColorStop(1, "#FF6B00");
    c.font = "bold 90px 'Courier New', monospace";
    c.fillStyle = titleGrad;
    c.shadowColor = "rgba(255,107,0,0.6)"; c.shadowBlur = 30;
    c.fillText("CALL OF DOODIE", W / 2, 130);
    c.shadowBlur = 0;

    // Subtitle
    c.font = "bold 20px 'Courier New', monospace";
    c.fillStyle = "#FF6B35"; c.fillText("MODERN WARFARE ON MOM'S WIFI", W / 2, 160);

    // Divider
    c.strokeStyle = "rgba(255,215,0,0.3)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(80, 180); c.lineTo(W - 80, 180); c.stroke();

    // Player name + rank + difficulty
    c.font = "bold 24px 'Courier New', monospace";
    c.fillStyle = "#CCC"; c.fillText("DEPLOYED AS:", W / 2, 215);
    c.font = "bold 32px 'Courier New', monospace";
    c.fillStyle = "#FFD700"; c.fillText(username.toUpperCase() + "  ·  " + rank.toUpperCase(), W / 2, 252);
    c.font = "bold 18px 'Courier New', monospace";
    c.fillStyle = diff.color || "#CCC"; c.fillText(diff.emoji + " " + diff.label.toUpperCase() + " MODE", W / 2, 278);

    // Stats grid (3 columns)
    const stats = [
      { val: score.toLocaleString(), label: "SCORE", color: "#FFD700" },
      { val: kills, label: "KILLS", color: "#00FF88" },
      { val: "WAVE " + wave, label: "WAVE REACHED", color: "#FF4444" },
      { val: "LV " + level, label: "LEVEL", color: "#00E5FF" },
      { val: fmtTime(timeSurvived), label: "SURVIVED", color: "#00BFFF" },
      { val: bestStreak, label: "BEST STREAK", color: "#FF4500" },
    ];
    const colW = (W - 160) / 3, startX = 80, startY = 305;
    stats.forEach((s, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = startX + col * colW + colW / 2;
      const y = startY + row * 90;
      c.fillStyle = "rgba(255,255,255,0.05)";
      c.beginPath(); c.roundRect(startX + col * colW, y - 44, colW - 10, 78, 8); c.fill();
      c.strokeStyle = "rgba(255,255,255,0.08)"; c.lineWidth = 1;
      c.beginPath(); c.roundRect(startX + col * colW, y - 44, colW - 10, 78, 8); c.stroke();
      c.font = "bold 36px 'Courier New', monospace";
      c.fillStyle = s.color; c.fillText(s.val, x, y);
      c.font = "11px 'Courier New', monospace";
      c.fillStyle = "#AAA"; c.fillText(s.label, x, y + 20);
    });

    // Death message
    c.font = "italic 18px 'Courier New', monospace";
    c.fillStyle = "#FF69B4"; c.fillText('"' + deathMessage + '"', W / 2, 510);

    // CTA
    c.font = "bold 22px 'Courier New', monospace";
    c.fillStyle = "#FFF"; c.fillText("💀  CAN YOU SURVIVE LONGER?  💀", W / 2, 548);

    // URL
    c.font = "16px 'Courier New', monospace";
    c.fillStyle = "#FF6B35"; c.fillText("vaultsparkstudios.com/call-of-doodie", W / 2, 575);

    // Bottom accent bar
    c.fillStyle = accent; c.fillRect(0, H - 5, W, 5);

    cvs.toBlob(blob => resolve({ blob, cvs }), "image/png");
  });

  const handleShare = async () => {
    setSharing(true);
    try {
      const { blob } = await generateScoreCard();
      const file = new File([blob], "call-of-doodie-score.png", { type: "image/png" });
      const shareText = `I scored ${score.toLocaleString()} pts and reached Wave ${wave} in Call of Doodie! 💀 Can you beat me?`;
      const shareUrl = "https://vaultsparkstudios.com/call-of-doodie";
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Call of Doodie Score", text: shareText, url: shareUrl });
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "call-of-doodie-score.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("Share failed", e);
    }
    setSharing(false);
  };

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
    <div style={{ ...base, touchAction: "pan-y", overflow: "hidden auto", alignItems: "center", justifyContent: "center", color: "#fff", background: "linear-gradient(135deg,#1a0000 0%,#2a0808 50%,#1a0000 100%)", padding: 16, boxSizing: "border-box" }}>
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
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#AAA", letterSpacing: 1, marginBottom: 6 }}>
              {achievementsUnlocked.length} ACHIEVEMENT{achievementsUnlocked.length > 1 ? "S" : ""} UNLOCKED
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {achievementsUnlocked.map(id => {
                const a = ACHIEVEMENTS.find(x => x.id === id);
                if (!a) return null;
                const tc = TIER_COLORS[a.tier] || "#DDD";
                const isOpen = activeTooltip === id;
                return (
                  <div
                    key={id}
                    style={{ position: "relative", display: "inline-block" }}
                    onMouseEnter={() => setActiveTooltip(id)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(isOpen ? null : id)}
                  >
                    <div style={{
                      fontSize: 22, padding: "5px 7px", borderRadius: 7, cursor: "pointer",
                      background: isOpen ? `rgba(255,255,255,0.12)` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isOpen ? tc : "rgba(255,255,255,0.12)"}`,
                      boxShadow: isOpen ? `0 0 8px ${tc}55` : "none",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      userSelect: "none",
                    }}>
                      {a.emoji}
                    </div>
                    {isOpen && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 6px)", left: "50%",
                        transform: "translateX(-50%)", zIndex: 200,
                        background: "#111", border: `1px solid ${tc}`,
                        borderRadius: 8, padding: "8px 10px", width: 170,
                        boxShadow: `0 4px 16px rgba(0,0,0,0.85)`,
                        pointerEvents: "none", textAlign: "left",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: tc, letterSpacing: 1, marginBottom: 3 }}>
                          {a.emoji} {a.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#CCC", lineHeight: 1.4 }}>{a.desc}</div>
                        <div style={{ fontSize: 9, color: tc, marginTop: 5, textTransform: "uppercase", letterSpacing: 1, opacity: 0.8 }}>
                          {a.tier}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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

        <div style={{ marginBottom: 10 }}>
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{ ...btnS, width: "100%", fontSize: 15, background: "linear-gradient(180deg,rgba(255,107,53,0.2),rgba(255,107,53,0.1))", border: "1px solid rgba(255,107,53,0.5)", color: sharing ? "#888" : "#FF6B35" }}
          >
            {sharing ? "⏳ GENERATING..." : "📸 SHARE SCORE"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStartGame} style={{ ...btnP, minWidth: 110, fontSize: 15 }}>PLAY AGAIN</button>
          <button onClick={() => { onRefreshLeaderboard(); setShowLeaderboard(true); }} style={{ ...btnS, minWidth: 130, fontSize: 15 }}>LEADERBOARD</button>
          <button onClick={onMenu} style={{ ...btnS, minWidth: 110, fontSize: 15 }}>RAGE QUIT</button>
        </div>
      </div>
    </div>
  );
}
