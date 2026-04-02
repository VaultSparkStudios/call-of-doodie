import { useState, useRef, useEffect } from "react";
import { ACHIEVEMENTS, RANK_NAMES, WEAPONS } from "../constants.js";
import LeaderboardPanel from "./LeaderboardPanel.jsx";
import VirtualKeyboard from "./VirtualKeyboard.jsx";
import { qrEncode } from "../utils/qrEncode.js";

const TIER_COLORS = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", legendary: "#FF6B35" };

export default function DeathScreen({
  score, kills, deaths: _deaths, wave, level, bestStreak, timeSurvived, totalDamage,
  crits, grenades, deathMessage, difficulty, runSeed, runModifier, achievementsUnlocked,
  activePerks, missionsSummary,
  leaderboard, lbLoading, lbHasMore, onLoadMore, username, DIFFICULTIES,
  onStartGame, onMenu, onRefreshLeaderboard, onSubmitScore,
  highlightGifUrl, gifEncoding,
  fmtTime,
  gamepadConnected, onInstallApp,
  weaponKills, scoreAttackMode, playerSkin,
  dailyChallengeMode, bossRushMode, cursedRunMode, vsScore, vsName,
  ghostKey,
}) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastWords, setLastWords] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'pending' | 'online' | 'local'
  const [globalRank, setGlobalRank] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showLastWordsKeyboard, setShowLastWordsKeyboard] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [showAllWeapons, setShowAllWeapons] = useState(false);
  const qrCanvasRef = useRef(null);

  // ── Ghost path visualization ───────────────────────────────────────────────
  const [ghostData, setGhostData] = useState(null);
  const ghostCanvasRef = useRef(null);

  useEffect(() => {
    if (!ghostKey) return;
    try {
      const raw = sessionStorage.getItem(ghostKey);
      if (raw) setGhostData(JSON.parse(raw));
    } catch {}
  }, [ghostKey]);

  useEffect(() => {
    if (!ghostData || !ghostCanvasRef.current) return;
    const canvas = ghostCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
    if (ghostData.length < 2) return;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    ghostData.forEach(pt => { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y); });
    const rangeX = Math.max(maxX - minX, 100), rangeY = Math.max(maxY - minY, 100);
    const toC = (x, y) => [(x - minX) / rangeX * (W - 20) + 10, (y - minY) / rangeY * (H - 20) + 10];
    ctx.beginPath();
    const [sx0, sy0] = toC(ghostData[0].x, ghostData[0].y);
    ctx.moveTo(sx0, sy0);
    ghostData.forEach((pt, i) => {
      if (i === 0) return;
      const [cx, cy] = toC(pt.x, pt.y);
      ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = "#00FFFF"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7; ctx.stroke();
    ctx.globalAlpha = 1;
    const [ex, ey] = toC(ghostData[ghostData.length - 1].x, ghostData[ghostData.length - 1].y);
    ctx.fillStyle = "#FF4444"; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
    const [stx, sty] = toC(ghostData[0].x, ghostData[0].y);
    ctx.fillStyle = "#00FF88"; ctx.beginPath(); ctx.arc(stx, sty, 4, 0, Math.PI * 2); ctx.fill();
  }, [ghostData]);

  // ── QR code rendering ─────────────────────────────────────────────────────
  const challengeUrl = runSeed > 0 ? (() => {
    const params = new URLSearchParams({ seed: runSeed, diff: difficulty, vs: score });
    if (username) params.set("vsName", username);
    return `${location.origin}${location.pathname}?${params.toString()}`;
  })() : null;

  useEffect(() => {
    if (!showQR || !challengeUrl) return;
    setQrError(false);
    if (!qrCanvasRef.current) return;
    try {
      const { matrix, size } = qrEncode(challengeUrl);
      const scale = 6;
      const canvas = qrCanvasRef.current;
      canvas.width = (size + 8) * scale;
      canvas.height = (size + 8) * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (matrix[r][c]) ctx.fillRect((c + 4) * scale, (r + 4) * scale, scale, scale);
      }
    } catch (e) { console.warn("QR encode failed:", e); setQrError(true); }
  }, [showQR, challengeUrl]);

  const generateScoreCard = () => new Promise((resolve) => {
    const W = 1200, H = 630;
    const cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    const c = cvs.getContext("2d");
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const rank = RANK_NAMES[Math.min(Math.floor(kills / 10), RANK_NAMES.length - 1)];

    // ── Background: dark with scanlines + vignette ────────────────────────────
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0d0005"); bg.addColorStop(0.45, "#140a1a"); bg.addColorStop(1, "#0a0200");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // Scanlines
    c.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < H; y += 4) { c.fillRect(0, y, W, 2); }
    // Vignette
    const vig = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.82);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.75)");
    c.fillStyle = vig; c.fillRect(0, 0, W, H);

    // ── Stream chrome: top bar ────────────────────────────────────────────────
    c.fillStyle = "rgba(0,0,0,0.72)"; c.fillRect(0, 0, W, 52);
    // LIVE badge
    c.fillStyle = "#E00000"; c.beginPath(); c.roundRect(16, 12, 68, 28, 5); c.fill();
    c.font = "bold 16px 'Courier New', monospace"; c.textAlign = "left";
    c.fillStyle = "#FFF"; c.fillText("● LIVE", 24, 31);
    // Channel name (centre)
    c.textAlign = "center";
    c.font = "bold 20px 'Courier New', monospace"; c.fillStyle = "#FFF";
    c.fillText("📺  CALL OF DOODIE  ·  MODERN WARFARE ON MOM'S WIFI", W / 2, 32);
    // Viewer count (right)
    const _viewers = ((score / 100 + kills * 3 + wave * 50) | 0).toLocaleString();
    c.textAlign = "right"; c.font = "14px 'Courier New', monospace"; c.fillStyle = "#CCC";
    c.fillText("👥 " + _viewers + " watching", W - 18, 20);
    c.fillStyle = "#888"; c.fillText("vaultsparkstudios.com/call-of-doodie", W - 18, 38);

    // ── KILLCAM banner ────────────────────────────────────────────────────────
    c.textAlign = "center";
    c.fillStyle = "rgba(180,0,0,0.82)"; c.fillRect(0, 52, W, 50);
    c.font = "bold 30px 'Courier New', monospace";
    c.fillStyle = "#FFF"; c.shadowColor = "#F00"; c.shadowBlur = 20;
    const _modeLabel = bossRushMode ? "  ·  ☠ BOSS RUSH" : cursedRunMode ? "  ·  ☠ CURSED" : scoreAttackMode ? "  ·  ⏱ SCORE ATTACK" : dailyChallengeMode ? "  ·  📅 DAILY" : "";
    c.fillText("💀  KILLCAM  ·  " + (playerSkin || "🪖") + " " + username.toUpperCase() + "  HAS FALLEN" + _modeLabel, W / 2, 86);
    c.shadowBlur = 0;

    // ── Match HUD: left side stat pills ───────────────────────────────────────
    const _pillY = 120, _pillH = 36, _pillGap = 8;
    const _pills = [
      { label: "WAVE", val: String(wave), color: "#FF3333" },
      { label: "KILLS", val: String(kills), color: "#00FF88" },
      { label: "STREAK", val: String(bestStreak), color: "#FF8800" },
    ];
    let _px = 18;
    _pills.forEach(p => {
      const tw = Math.max(90, p.val.length * 18 + 60);
      c.fillStyle = "rgba(0,0,0,0.7)"; c.beginPath(); c.roundRect(_px, _pillY, tw, _pillH, 6); c.fill();
      c.strokeStyle = p.color + "88"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(_px, _pillY, tw, _pillH, 6); c.stroke();
      c.textAlign = "left"; c.font = "10px 'Courier New', monospace"; c.fillStyle = p.color;
      c.fillText(p.label, _px + 8, _pillY + 14);
      c.font = "bold 18px 'Courier New', monospace"; c.fillStyle = "#FFF";
      c.fillText(p.val, _px + 8, _pillY + _pillH - 8);
      _px += tw + _pillGap;
    });

    // ── Rank + difficulty pill (right side) ───────────────────────────────────
    c.textAlign = "right";
    c.font = "bold 16px 'Courier New', monospace"; c.fillStyle = diff.color || "#CCC";
    c.fillText(diff.emoji + " " + diff.label.toUpperCase() + "  ·  " + rank.toUpperCase(), W - 18, _pillY + _pillH - 6);
    c.font = "13px 'Courier New', monospace"; c.fillStyle = "#888";
    c.fillText("⏱ " + fmtTime(timeSurvived) + "  survived", W - 18, _pillY + 14);

    // ── Big score in the middle ───────────────────────────────────────────────
    c.textAlign = "center";
    const scoreGrad = c.createLinearGradient(0, 190, 0, 300);
    scoreGrad.addColorStop(0, "#FFD700"); scoreGrad.addColorStop(1, "#FF6B00");
    c.font = "bold 140px 'Courier New', monospace";
    c.fillStyle = scoreGrad;
    c.shadowColor = "rgba(255,150,0,0.55)"; c.shadowBlur = 40;
    c.fillText(score.toLocaleString(), W / 2, 295);
    c.shadowBlur = 0;
    c.font = "bold 20px 'Courier New', monospace"; c.fillStyle = "#CCC";
    c.fillText("FINAL SCORE", W / 2, 325);

    // ── Stats row ─────────────────────────────────────────────────────────────
    const _stats = [
      { val: "LV " + level, label: "LEVEL", color: "#00E5FF" },
      { val: kills, label: "ELIMINATED", color: "#00FF88" },
      { val: "WAVE " + wave, label: "REACHED", color: "#FF4444" },
      { val: fmtTime(timeSurvived), label: "SURVIVED", color: "#00BFFF" },
    ];
    const _sw = W / _stats.length;
    _stats.forEach((s, i) => {
      const sx = _sw * i + _sw / 2;
      c.fillStyle = "rgba(255,255,255,0.05)";
      c.beginPath(); c.roundRect(_sw * i + 10, 348, _sw - 20, 80, 6); c.fill();
      c.strokeStyle = s.color + "44"; c.lineWidth = 1;
      c.beginPath(); c.roundRect(_sw * i + 10, 348, _sw - 20, 80, 6); c.stroke();
      c.textAlign = "center";
      c.font = "bold 30px 'Courier New', monospace"; c.fillStyle = s.color;
      c.shadowColor = s.color; c.shadowBlur = 8;
      c.fillText(s.val, sx, 390);
      c.shadowBlur = 0;
      c.font = "11px 'Courier New', monospace"; c.fillStyle = "#888";
      c.fillText(s.label, sx, 416);
    });

    // ── Death quote ───────────────────────────────────────────────────────────
    c.textAlign = "center";
    c.font = "italic 17px 'Courier New', monospace";
    c.fillStyle = "#FF8888"; c.fillText('"' + deathMessage + '"', W / 2, 462);

    // ── Bottom bar: CTA ───────────────────────────────────────────────────────
    c.fillStyle = "rgba(0,0,0,0.8)"; c.fillRect(0, H - 72, W, 72);
    const ctaGrad = c.createLinearGradient(0, 0, W, 0);
    ctaGrad.addColorStop(0, "#FF6B35"); ctaGrad.addColorStop(0.5, "#FFD700"); ctaGrad.addColorStop(1, "#FF6B35");
    c.fillStyle = ctaGrad; c.fillRect(0, H - 72, W, 4);
    c.font = "bold 24px 'Courier New', monospace"; c.fillStyle = "#FFF";
    c.fillText("💀  CAN YOU BEAT " + username.toUpperCase() + "?  ·  vaultsparkstudios.com/call-of-doodie  💀", W / 2, H - 32);
    c.font = "13px 'Courier New', monospace"; c.fillStyle = "#888";
    c.fillText("FREE TO PLAY IN YOUR BROWSER  ·  SHARE YOUR SCORE  ·  #CallOfDoodie", W / 2, H - 12);

    cvs.toBlob(blob => resolve({ blob, cvs }), "image/png");
  });

  const handleShare = async () => {
    setSharing(true);
    try {
      const { blob } = await generateScoreCard();
      const file = new File([blob], "call-of-doodie-score.png", { type: "image/png" });
      const _modeTag = bossRushMode ? " [BOSS RUSH]" : cursedRunMode ? " [CURSED]" : scoreAttackMode ? " [SCORE ATTACK]" : dailyChallengeMode ? " [DAILY]" : "";
      const shareText = `I scored ${score.toLocaleString()} pts and reached Wave ${wave}${_modeTag} in Call of Doodie! 💀 Can you beat me?`;
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
    setSubmitStatus('pending');
    try {
      const result = await onSubmitScore({ lastWords: lastWords.trim() || "...", rank: RANK_NAMES[rankIndex] });
      setSubmitStatus(result?.online ? 'online' : 'local');
      if (result?.globalRank) setGlobalRank(result.globalRank);
    } catch {
      setSubmitStatus('local');
    }
  };

  return (
    <div style={{ ...base, touchAction: "pan-y", overflowY: "auto", overflowX: "hidden", color: "#fff", background: "linear-gradient(135deg,#1a0000 0%,#2a0808 50%,#1a0000 100%)", boxSizing: "border-box" }}>
      {showLeaderboard && (
        <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLeaderboard(false)} />
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100%", padding: "20px 16px", paddingBottom: "max(56px, env(safe-area-inset-bottom, 24px))", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", maxWidth: 460, width: "100%", margin: "auto" }}>
        <div style={{ fontSize: 52, lineHeight: 1, paddingTop: 4 }}>💀</div>
        <h2 style={{ fontSize: "clamp(24px,7vw,38px)", color: "#FF2222", margin: "4px 0", letterSpacing: 3 }}>YOU DIED</h2>
        <p style={{ color: "#FF6666", fontSize: 14, fontStyle: "italic", margin: "4px 0 8px" }}>"{deathMessage}"</p>
        <div style={{ fontSize: 11, color: diff.color, marginBottom: 6, fontWeight: 700 }}>
          {diff.emoji} {diff.label.toUpperCase()} MODE
          {scoreAttackMode  && <span style={{ marginLeft: 8, color: "#FF6600" }}>⏱ SCORE ATTACK</span>}
          {dailyChallengeMode && <span style={{ marginLeft: 8, color: "#00E5FF" }}>📅 DAILY CHALLENGE</span>}
          {bossRushMode     && <span style={{ marginLeft: 8, color: "#FF3333", fontWeight: 900 }}>☠ BOSS RUSH</span>}
          {cursedRunMode    && <span style={{ marginLeft: 8, color: "#CC00FF", fontWeight: 900 }}>☠ CURSED</span>}
        </div>

        {/* Challenge result card */}
        {vsScore != null && (
          <div style={{
            ...card,
            marginBottom: 12,
            border: score >= vsScore
              ? "1px solid rgba(0,255,136,0.4)"
              : "1px solid rgba(255,100,53,0.4)",
            background: score >= vsScore
              ? "rgba(0,255,136,0.04)"
              : "rgba(255,80,0,0.04)",
            textAlign: "center",
          }}>
            {score >= vsScore ? (
              <>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#00FF88", letterSpacing: 2 }}>CHALLENGE BEATEN!</div>
                <div style={{ fontSize: 11, color: "#CCC", marginTop: 4 }}>
                  You beat {vsName ? <span style={{ color: "#FFD700" }}>@{vsName}</span> : "their score"} by{" "}
                  <span style={{ color: "#00FF88", fontWeight: 900 }}>+{(score - vsScore).toLocaleString()} pts</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 4 }}>💀</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#FF4444", letterSpacing: 2 }}>CHALLENGE FAILED</div>
                <div style={{ fontSize: 11, color: "#CCC", marginTop: 4 }}>
                  {vsName ? <span style={{ color: "#FFD700" }}>@{vsName}</span> : "They"} beat you by{" "}
                  <span style={{ color: "#FF4444", fontWeight: 900 }}>{(vsScore - score).toLocaleString()} pts</span>
                </div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>Target: {vsScore.toLocaleString()} pts</div>
              </>
            )}
          </div>
        )}

        {runModifier && (
          <div style={{ marginBottom: 10, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(255,215,0,0.3)", background: "rgba(255,215,0,0.06)", display: "inline-block" }}>
            <span style={{ color: "#FFD700", fontSize: 11, fontWeight: 700 }}>{runModifier.emoji} {runModifier.name.toUpperCase()}</span>
            <span style={{ color: "#bbb", fontSize: 10, marginLeft: 8 }}>{runModifier.desc}</span>
          </div>
        )}

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

        {/* Weapon kill breakdown */}
        {weaponKills && weaponKills.some(k => k > 0) && (() => {
          const all = weaponKills
            .map((k, i) => ({ kills: k, wpn: WEAPONS[i] }))
            .filter(x => x.kills > 0 && x.wpn)
            .sort((a, b) => b.kills - a.kills);
          const displayed = showAllWeapons ? all : all.slice(0, 3);
          return (
            <div style={{ ...card, marginBottom: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 7 }}>TOP WEAPONS</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {displayed.map(({ kills, wpn }, i) => (
                  <div key={wpn.name} style={{ textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 14px", border: i === 0 && !showAllWeapons ? "1px solid rgba(255,215,0,0.35)" : "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 22 }}>{wpn.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: i === 0 && !showAllWeapons ? "#FFD700" : "#CCC", marginTop: 2 }}>{kills}</div>
                    <div style={{ fontSize: 8, color: "#888", letterSpacing: 0.5 }}>{wpn.name.slice(0, 14).toUpperCase()}</div>
                  </div>
                ))}
              </div>
              {all.length > 3 && (
                <button onClick={() => setShowAllWeapons(v => !v)} style={{ marginTop: 8, background: "none", border: "none", color: "#888", fontSize: 10, cursor: "pointer", letterSpacing: 0.5 }}>
                  {showAllWeapons ? "▲ SHOW LESS" : `▼ +${all.length - 3} MORE`}
                </button>
              )}
            </div>
          );
        })()}

        {/* Run summary: perks taken + daily missions */}
        {((activePerks && activePerks.length > 0) || (missionsSummary && missionsSummary.length > 0)) && (
          <div style={{ ...card, marginBottom: 10, padding: "10px 12px" }}>
            {activePerks && activePerks.length > 0 && (
              <div style={{ marginBottom: missionsSummary && missionsSummary.length > 0 ? 8 : 0 }}>
                <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>
                  PERKS TAKEN ({activePerks.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                  {activePerks.map((p, i) => (
                    <span key={i} style={{ fontSize: 11, background: p.cursed ? "rgba(180,20,20,0.25)" : "rgba(255,255,255,0.07)", border: `1px solid ${p.cursed ? "rgba(220,50,50,0.5)" : "rgba(255,255,255,0.15)"}`, borderRadius: 5, padding: "3px 7px", color: p.cursed ? "#FF6666" : "#DDD", whiteSpace: "nowrap" }}>
                      {p.emoji} {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {missionsSummary && missionsSummary.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>
                  DAILY MISSIONS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {missionsSummary.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: m.completed ? "#00FF88" : "#777" }}>
                      <span>{m.completed ? "✅" : "⬜"}</span>
                      <span>{m.icon} {m.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ghost path visualization */}
        {ghostData && ghostData.length > 10 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 10, fontFamily: "'Courier New',monospace" }}>── GHOST RACE — YOUR PATH ──</div>
            <canvas ref={ghostCanvasRef} width={280} height={140} style={{ borderRadius: 6, border: "1px solid #1A1A1A", display: "block", margin: "0 auto" }} />
            <div style={{ fontSize: 9, color: "#444", marginTop: 6, textAlign: "center" }}>
              🟢 START  🔴 DEATH  — {ghostData.length} position samples
            </div>
          </div>
        )}

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

        {showLastWordsKeyboard && (
          <VirtualKeyboard
            value={lastWords}
            onChange={v => { const w = v.split(/\s+/).filter(Boolean); if (w.length <= 5) setLastWords(v); }}
            onConfirm={() => setShowLastWordsKeyboard(false)}
            maxLength={60}
            title="FAMOUS LAST WORDS (5 WORDS MAX)"
          />
        )}

        {!submitStatus || submitStatus === 'pending' ? (
          <div style={{ ...card, marginBottom: 12, border: "1px solid rgba(255,215,0,0.15)" }}>
            <div style={{ fontSize: 12, color: "#FFD700", marginBottom: 8, letterSpacing: 1, fontWeight: 700 }}>SUBMIT TO HALL OF SHAME</div>
            <input
              type="text"
              value={lastWords}
              maxLength={60}
              autoFocus
              onChange={e => { const w = e.target.value.split(/\s+/).filter(Boolean); if (w.length <= 5) setLastWords(e.target.value); }}
              placeholder="Famous last words (5 words max)"
              style={{ width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: "'Courier New',monospace", fontStyle: "italic", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#FFF", textAlign: "center", outline: "none", marginBottom: 6, boxSizing: "border-box" }}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#CCC" }}>{lastWords.trim().split(/\s+/).filter(Boolean).length}/5 words</div>
              {gamepadConnected && (
                <button onClick={() => setShowLastWordsKeyboard(true)} style={{ fontSize: 10, padding: "3px 8px", background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 4, color: "#FF6B35", cursor: "pointer", fontFamily: "'Courier New',monospace", fontWeight: 700 }}>
                  🎮 Keyboard
                </button>
              )}
            </div>
            <button onClick={handleSubmit} disabled={submitStatus === 'pending'} style={{ ...btnP, width: "100%", fontSize: 14, padding: "10px", opacity: submitStatus === 'pending' ? 0.6 : 1 }}>
              {submitStatus === 'pending' ? 'SUBMITTING...' : 'SUBMIT SCORE'}
            </button>
          </div>
        ) : submitStatus === 'online' ? (
          <div style={{ ...card, marginBottom: 12, border: "1px solid rgba(0,255,0,0.2)", background: "rgba(0,255,0,0.03)" }}>
            <div style={{ color: "#0F0", fontSize: 14, fontWeight: 700 }}>✅ Score submitted!</div>
            {globalRank && (
              <div style={{ color: "#FFD700", fontSize: 13, fontWeight: 900, marginTop: 6, letterSpacing: 1 }}>
                🌍 Global Rank: <span style={{ color: "#FFF" }}>#{globalRank.toLocaleString()}</span>
              </div>
            )}
            <div style={{ color: "#CCC", fontSize: 11, marginTop: 4 }}>Your shame is now public knowledge.</div>
          </div>
        ) : (
          <div style={{ ...card, marginBottom: 12, border: "1px solid rgba(255,180,0,0.3)", background: "rgba(255,140,0,0.05)" }}>
            <div style={{ color: "#FFA500", fontSize: 14, fontWeight: 700 }}>Saved locally</div>
            <div style={{ color: "#CCC", fontSize: 11, marginTop: 4 }}>Couldn't reach the server — score saved on this device.</div>
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

        {/* Highlight GIF */}
        {(gifEncoding || highlightGifUrl) && (
          <div style={{ marginBottom: 12, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>🎬 BEST MOMENT</div>
            {gifEncoding ? (
              <div style={{ width: "100%", maxWidth: 320, height: 90, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,107,53,0.25)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#aaa", margin: "0 auto", fontFamily: "'Courier New',monospace" }}>
                ⏳ encoding highlight...
              </div>
            ) : (
              <>
                <img src={highlightGifUrl} alt="Best moment" style={{ maxWidth: "100%", width: 320, borderRadius: 6, border: "1px solid rgba(255,107,53,0.35)", display: "block", margin: "0 auto" }} />
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(highlightGifUrl);
                      const blob = await res.blob();
                      const file = new File([blob], "cod-highlight.gif", { type: "image/gif" });
                      if (navigator.canShare?.({ files: [file] })) {
                        await navigator.share({ files: [file], title: "Call of Doodie Best Moment", text: `Check out my highlight — Score: ${score.toLocaleString()} on wave ${wave}! 🎮` });
                      } else {
                        const a = document.createElement("a"); a.href = highlightGifUrl; a.download = "cod-highlight.gif"; a.click();
                      }
                    } catch {}
                  }}
                  style={{ marginTop: 7, padding: "7px 18px", background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.45)", color: "#FF6B35", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Courier New',monospace" }}
                >📤 SHARE BEST MOMENT</button>
              </>
            )}
          </div>
        )}

        {runSeed > 0 && (
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#aaa", letterSpacing: 1 }}>SEED #{runSeed}</span>
            <button
              aria-label="Copy seed to clipboard"
              onClick={() => navigator.clipboard?.writeText?.(String(runSeed))}
              style={{ padding: "3px 8px", fontSize: 9, fontFamily: "'Courier New',monospace", background: "rgba(255,255,255,0.05)", border: "1px solid #555", borderRadius: 4, color: "#aaa", cursor: "pointer", letterSpacing: 1 }}
            >📋 COPY</button>
            <button
              onClick={() => {
                const params = new URLSearchParams({ seed: runSeed, diff: difficulty, vs: score });
                if (username) params.set("vsName", username);
                const url = `${location.origin}${location.pathname}?${params.toString()}`;
                navigator.clipboard?.writeText?.(url);
                setCopiedChallenge(true);
                setTimeout(() => setCopiedChallenge(false), 1500);
              }}
              style={{ padding: "3px 8px", fontSize: 9, fontFamily: "'Courier New',monospace", background: copiedChallenge ? "rgba(0,255,136,0.1)" : "rgba(255,107,53,0.08)", border: copiedChallenge ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,107,53,0.35)", borderRadius: 4, color: copiedChallenge ? "#00FF88" : "#FF6B35", cursor: "pointer", letterSpacing: 1, transition: "all 0.2s" }}
            >{copiedChallenge ? "✓ COPIED!" : "⚔️ COPY CHALLENGE LINK"}</button>
            <button
              aria-label="Show QR code for challenge link"
              onClick={() => setShowQR(true)}
              style={{ padding: "3px 8px", fontSize: 9, fontFamily: "'Courier New',monospace", background: "rgba(255,255,255,0.05)", border: "1px solid #555", borderRadius: 4, color: "#aaa", cursor: "pointer", letterSpacing: 1 }}
            >📷 QR</button>
          </div>
        )}

        {onInstallApp && (
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={onInstallApp}
              style={{ ...btnS, width: "100%", fontSize: 14, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.35)", color: "#00E5FF" }}
            >📲 INSTALL APP</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button aria-label="Play again — start a new run" onClick={onStartGame} style={{ ...btnP, minWidth: 110, fontSize: 15 }}>PLAY AGAIN</button>
          {runSeed > 0 && (
            <button aria-label={`Replay seed ${runSeed} — same map`} onClick={() => onStartGame(runSeed)} style={{ ...btnS, minWidth: 130, fontSize: 13 }}>🔄 REPLAY #{runSeed}</button>
          )}
          <button aria-label="View leaderboard" onClick={() => { onRefreshLeaderboard(); setShowLeaderboard(true); }} style={{ ...btnS, minWidth: 130, fontSize: 15 }}>LEADERBOARD</button>
          <button aria-label="Return to main menu" onClick={onMenu} style={{ ...btnS, minWidth: 110, fontSize: 15 }}>RAGE QUIT</button>
        </div>
      </div>
      </div>

      {/* QR Code modal */}
      {showQR && challengeUrl && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowQR(false)}>
          <div style={{ background: "#111", border: "1px solid #333", borderRadius: 12, padding: 24, textAlign: "center", maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, marginBottom: 12, fontFamily: "'Courier New',monospace" }}>SCAN TO CHALLENGE</div>
            {qrError ? (
              <div style={{ padding: "12px 0" }}>
                <div style={{ fontSize: 11, color: "#FF4444", marginBottom: 8 }}>QR generation failed</div>
                <div style={{ fontSize: 9, color: "#888", wordBreak: "break-all", fontFamily: "'Courier New',monospace", userSelect: "all" }}>{challengeUrl}</div>
              </div>
            ) : (
              <canvas ref={qrCanvasRef} style={{ imageRendering: "pixelated" }} />
            )}
            <div style={{ fontSize: 10, color: "#555", marginTop: 10 }}>tap outside to close</div>
          </div>
        </div>
      )}
    </div>
  );
}
