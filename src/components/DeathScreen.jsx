import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { ACHIEVEMENTS, ENEMY_TYPES, RANK_NAMES, WEAPONS } from "../constants.js";
import VirtualKeyboard from "./VirtualKeyboard.jsx";
import { qrEncode } from "../utils/qrEncode.js";
import { buildRunDebrief } from "../utils/runDebrief.js";
import { buildRunNarrative } from "../utils/runNarrative.js";
import { buildRunCoach } from "../utils/runCoach.js";
import { buildPostRunIntelligence, buildRunEventDigest, buildStudioGameEvent } from "../utils/runIntelligence.js";
import { track } from "../utils/analytics.js";
import { buildChallengeUrl, copyChallengeUrl } from "../utils/challengeLinks.js";
import { encodeReplayCode } from "../utils/replayCode.js";
import { buildReplayProofPresenter } from "../utils/replayProofPresenter.js";
import { buildWeeklyContract, buildWeeklyContractProgressPayload } from "../utils/socialRetention.js";
import { computeBuildGrade } from "../utils/buildReport.js";
import { buildGhostDeathReadout, buildGhostKillerMarker } from "../utils/ghostPath.js";
import { buildRunDnaSharePayload } from "../utils/runDnaShareCard.js";
import { CANONICAL_SITE_HOST, CANONICAL_SITE_URL } from "../config/site.js";
import { recordRivalryResult, requestStudioEventSync, saveStudioGameEvent, loadCareerStats, loadMetaProgress, loadRunHistory, loadRivalryHistory, loadStudioGameEvents, saveExperimentIntent } from "../storage.js";

const LeaderboardPanel = lazy(() => import("./LeaderboardPanel.jsx"));

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
  weaponKills, bestPrecisionStreak = 0, starterLoadout = "standard", scoreAttackMode, playerSkin,
  dailyChallengeMode, bossRushMode, cursedRunMode, vsScore, vsName,
  ghostKey, cosmeticUnlocks = [], objectivesSummary = null,
  experimentMatched = null,
  gsSnapshot = null, activeSynergiesData = [],
  traceEvidence = null, precisionPeakFrame = 0, precisionPeakStreak = 0,
  proximityRivals = [],
  nearDeathEvents = [], flowStateFired = 0, bossKillCount = 0, weaponMilestones = [],
  speedrunMode = false, gauntletMode = false,
  controllerType = null,
}) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastWords, setLastWords] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'pending' | 'online' | 'local'
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [globalRank, setGlobalRank] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showLastWordsKeyboard, setShowLastWordsKeyboard] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [showAllWeapons, setShowAllWeapons] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);
  const [replayMode, setReplayMode] = useState("full"); // "full" | "best_shot"
  const qrCanvasRef = useRef(null);
  const weeklyContractEventKeyRef = useRef(null);

  // ── Ghost path visualization ───────────────────────────────────────────────
  const [ghostData, setGhostData] = useState(null);
  const ghostCanvasRef = useRef(null);
  const [shareCardBusy, setShareCardBusy] = useState(false);

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
    let rafId = 0;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    ghostData.forEach(pt => { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y); });
    const rangeX = Math.max(maxX - minX, 100), rangeY = Math.max(maxY - minY, 100);
    const toC = (x, y) => [(x - minX) / rangeX * (W - 20) + 10, (y - minY) / rangeY * (H - 20) + 10];
    const total = ghostData.length;
    // Draw path in color-coded segments: green → yellow → red (early → mid → final)
    for (let i = 1; i < total; i++) {
      const t = i / total; // 0=start, 1=end
      // Interpolate color: green(0) → yellow(0.5) → red(1)
      let r, g, b;
      if (t < 0.5) { const s = t * 2; r = Math.round(s * 255); g = Math.round(180 + (1 - s) * 55); b = Math.round((1 - s) * 80); }
      else { const s = (t - 0.5) * 2; r = 255; g = Math.round(180 * (1 - s)); b = 0; }
      const alpha = 0.45 + t * 0.45;
      const [px1, py1] = toC(ghostData[i - 1].x, ghostData[i - 1].y);
      const [px2, py2] = toC(ghostData[i].x, ghostData[i].y);
      ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.5 + t; // path gets slightly thicker toward end
      ctx.stroke();
    }
    // Start marker (green dot)
    const [stx, sty] = toC(ghostData[0].x, ghostData[0].y);
    ctx.fillStyle = "#00FF88"; ctx.beginPath(); ctx.arc(stx, sty, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#002200"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
    ctx.fillText("▶", stx, sty + 3);
    // End marker (skull)
    const [ex, ey] = toC(ghostData[ghostData.length - 1].x, ghostData[ghostData.length - 1].y);
    ctx.fillStyle = "#FF2222"; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
    ctx.fillText("☠", ex, ey + 3);
    const killerMarker = buildGhostKillerMarker(ghostData, ENEMY_TYPES, { width: W, height: H });
    if (killerMarker) {
      const labelX = Math.max(66, Math.min(W - 66, killerMarker.x));
      const labelY = killerMarker.y < 28 ? killerMarker.y + 22 : killerMarker.y - 16;
      ctx.strokeStyle = killerMarker.color + "AA";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(killerMarker.x, killerMarker.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "#FFF";
      ctx.fillText(killerMarker.emoji, Math.min(W - 12, killerMarker.x + 12), Math.max(14, killerMarker.y - 8));
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(labelX - 58, labelY - 9, 116, 16);
      ctx.strokeStyle = killerMarker.color + "88";
      ctx.strokeRect(labelX - 58, labelY - 9, 116, 16);
      ctx.fillStyle = killerMarker.color;
      ctx.font = "bold 8px monospace";
      ctx.fillText(killerMarker.label.toUpperCase().slice(0, 18), labelX, labelY + 3);
      ctx.shadowBlur = 0;
    }
    // Legend
    ctx.globalAlpha = 0.65; ctx.font = "7px monospace"; ctx.textAlign = "left";
    const legend = [["#00B450","EARLY"],["#FFB000","MID"],["#FF2222","FINAL"]];
    legend.forEach(([col, label], i) => {
      ctx.fillStyle = col; ctx.fillRect(4, H - 22 + i * 8, 10, 5);
      ctx.fillStyle = "#CCC"; ctx.fillText(label, 17, H - 17 + i * 8);
    });
    ctx.globalAlpha = 1;
    let replayFrames;
    if (replayMode === "best_shot" && precisionPeakFrame > 0) {
      const targetFrame = Math.max(0, precisionPeakFrame - 90);
      let startIdx = 0;
      for (let i = 0; i < ghostData.length; i++) {
        if ((ghostData[i].f || 0) >= targetFrame) { startIdx = i; break; }
      }
      replayFrames = ghostData.slice(startIdx, startIdx + 300);
    } else {
      replayFrames = ghostData.slice(-Math.min(480, ghostData.length));
    }
    if (replayFrames.length >= 2) {
      const replayStart = performance.now();
      const drawReplay = (now) => {
        const progress = Math.min(1, (now - replayStart) / 4000);
        const frameIndex = Math.min(replayFrames.length - 1, Math.floor(progress * (replayFrames.length - 1)));
        const startIndex = Math.max(0, frameIndex - 45);
        for (let i = startIndex + 1; i <= frameIndex; i++) {
          const t = (i - startIndex) / Math.max(1, frameIndex - startIndex);
          const [x1, y1] = toC(replayFrames[i - 1].x, replayFrames[i - 1].y);
          const [x2, y2] = toC(replayFrames[i].x, replayFrames[i].y);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(0,229,255,${(0.08 + t * 0.45).toFixed(2)})`;
          ctx.lineWidth = 1 + t * 2.5;
          ctx.stroke();
        }
        const pt = replayFrames[frameIndex];
        const [px, py] = toC(pt.x, pt.y);
        ctx.fillStyle = progress >= 0.98 ? "#FF2222" : "#00E5FF";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, progress >= 0.98 ? 6 : 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (progress < 1) rafId = requestAnimationFrame(drawReplay);
      };
      rafId = requestAnimationFrame(drawReplay);
    }
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [ghostData, replayNonce, replayMode, precisionPeakFrame]);

  // ── QR code rendering ─────────────────────────────────────────────────────
  const challengeUrl = buildChallengeUrl({
    seed: runSeed,
    difficulty,
    vsScore: score,
    vsName: username,
  });

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
    c.fillStyle = "#888"; c.fillText(CANONICAL_SITE_HOST, W - 18, 38);

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

    if (replayProofReceipt) {
      c.fillStyle = "rgba(0,0,0,0.72)";
      c.beginPath(); c.roundRect(314, 478, 572, 38, 6); c.fill();
      c.strokeStyle = replayProofReceipt.color + "AA"; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(314, 478, 572, 38, 6); c.stroke();
      c.textAlign = "center";
      c.font = "bold 13px 'Courier New', monospace";
      c.fillStyle = replayProofReceipt.color;
      c.fillText(replayProofPresenter.shareStamp, W / 2, 502);
    }

    // ── Bottom bar: CTA ───────────────────────────────────────────────────────
    c.fillStyle = "rgba(0,0,0,0.8)"; c.fillRect(0, H - 72, W, 72);
    const ctaGrad = c.createLinearGradient(0, 0, W, 0);
    ctaGrad.addColorStop(0, "#FF6B35"); ctaGrad.addColorStop(0.5, "#FFD700"); ctaGrad.addColorStop(1, "#FF6B35");
    c.fillStyle = ctaGrad; c.fillRect(0, H - 72, W, 4);
    c.font = "bold 24px 'Courier New', monospace"; c.fillStyle = "#FFF";
    c.fillText("💀  CAN YOU BEAT " + username.toUpperCase() + "?  ·  " + CANONICAL_SITE_HOST + "  💀", W / 2, H - 32);
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
      const shareUrl = CANONICAL_SITE_URL;
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
  const ghostDeathReadout = buildGhostDeathReadout(ghostData, ENEMY_TYPES);
  const rankIndex = Math.min(Math.floor(kills / 10), RANK_NAMES.length - 1);
  const mode = bossRushMode ? "boss_rush"
    : cursedRunMode ? "cursed"
      : scoreAttackMode ? "score_attack"
        : dailyChallengeMode ? "daily_challenge"
          : "standard";
  const debrief = buildRunDebrief({
    score,
    kills,
    wave,
    level,
    bestStreak,
    timeSurvived,
    totalDamage,
    crits,
    grenades,
    activePerks,
    missionsSummary,
    weaponKills,
    scoreAttackMode,
    dailyChallengeMode,
    bossRushMode,
    cursedRunMode,
    vsScore,
    runSeed,
  });
  const runNarrative = buildRunNarrative({ wave, score, kills, bestStreak, nearDeathEvents, precisionPeakStreak, bossKillCount, flowStateFired, timeSurvived });
  const _topWpn = (() => {
    const wk = weaponKills || [];
    const total = wk.reduce((s, v) => s + (v || 0), 0);
    if (!total) return null;
    let bi = 0;
    for (let i = 1; i < wk.length; i++) if ((wk[i] || 0) > (wk[bi] || 0)) bi = i;
    return { weapon: WEAPONS[bi], kills: wk[bi], share: (wk[bi] || 0) / total };
  })();
  const runHistory = loadRunHistory();
  const replayProofPresenter = buildReplayProofPresenter({ traceEvidence, runHistory });
  const replayProofReceipt = replayProofPresenter.receipt;
  const proofTrend = replayProofPresenter.trend;
  const submitProofPresenter = submitFeedback
    ? buildReplayProofPresenter({ traceEvidence: submitFeedback.traceEvidence || traceEvidence, runHistory })
    : null;
  const rivalryHistory = loadRivalryHistory();
  const studioEvents = loadStudioGameEvents();
  const nextContract = buildWeeklyContract(runHistory, rivalryHistory, studioEvents);
  const nextContractId = nextContract.id;
  const nextContractProgress = nextContract.progress;
  const runCoach = buildRunCoach({
    career: loadCareerStats(),
    meta: loadMetaProgress(),
    runSummary: { wave, kills, bestStreak, crits, topWeapon: _topWpn, weaponKills: weaponKills || [], bestPrecisionStreak },
    runHistory,
    studioEvents,
  });
  // Persist the next experiment so the followthrough loop can check it on the next run start
  if (runCoach?.brain?.nextExperiment) saveExperimentIntent(runCoach.brain.nextExperiment);
  const postRunIntel = buildPostRunIntelligence({
    score,
    kills,
    wave,
    bestStreak,
    grenades,
    crits,
    timeSurvived,
    vsScore,
    runSeed,
    mode,
  });
  const eventDigest = buildRunEventDigest({
    mode,
    difficulty,
    seed: runSeed ?? null,
    wave,
    score,
    kills,
    level,
    bestStreak,
    totalDamage,
    time: fmtTime(timeSurvived),
    perkCount: activePerks?.length || 0,
    achievementCount: achievementsUnlocked?.length || 0,
    cause: postRunIntel.cause,
    actionCount: debrief.actions.length,
  });
  const buildGrade = computeBuildGrade({
    activeSynergies: activeSynergiesData,
    weaponKills: weaponKills || [],
    weaponAmmos: gsSnapshot?.weaponAmmos || [],
    wave,
    level,
    kills,
  });

  useEffect(() => {
    const studioEvent = buildStudioGameEvent("debrief_intelligence", postRunIntel.telemetry);
    saveStudioGameEvent(studioEvent);
    const contractProgress = buildWeeklyContractProgressPayload({
      id: nextContractId,
      progress: nextContractProgress,
    }, {
      runSeed,
      mode,
      score,
      wave,
    });
    if (contractProgress) {
      const progressKey = `${contractProgress.contractId}:${contractProgress.seed ?? "none"}:${contractProgress.score}:${contractProgress.wave}`;
      if (weeklyContractEventKeyRef.current !== progressKey) {
        weeklyContractEventKeyRef.current = progressKey;
        saveStudioGameEvent(buildStudioGameEvent("weekly_contract_progress", {
          surface: "death_screen",
          ...contractProgress,
        }));
      }
    }
    if (runSeed > 0) {
      const rivalryResult = recordRivalryResult({
        seed: runSeed,
        vsScore,
        vsName,
        score,
        wave,
        mode,
        difficulty,
      });
      if (rivalryResult) {
        saveStudioGameEvent(buildStudioGameEvent("rivalry_result", {
          surface: "death_screen",
          ...rivalryResult,
        }));
      }
    }
    track("debrief_intelligence_view", {
      ...postRunIntel.telemetry,
      digestVersion: eventDigest.v,
      studioEvent,
    });
    requestStudioEventSync({ limit: 30, force: true }).catch(() => {});
  }, [difficulty, eventDigest.v, mode, nextContractId, nextContractProgress, postRunIntel.telemetry, runSeed, score, vsName, vsScore, wave]);

  const handleSubmit = async () => {
    const words = lastWords.trim().split(/\s+/).filter(Boolean);
    if (words.length > 5) { setLastWords(words.slice(0, 5).join(" ")); return; }
    setSubmitStatus('pending');
    setSubmitFeedback(null);
    try {
      const result = await onSubmitScore({ lastWords: lastWords.trim() || "...", rank: RANK_NAMES[rankIndex], eventDigest });
      setSubmitStatus(result?.submission || (result?.online ? "online" : "local"));
      setSubmitFeedback(result || null);
      if (result?.globalRank) setGlobalRank(result.globalRank);
      saveStudioGameEvent(buildStudioGameEvent(result?.submission === "rejected" ? "submission_rejected" : "score_submit_result", {
        surface: "death_screen",
        mode,
        difficulty,
        score,
        wave,
        seed: runSeed,
        submission: result?.submission || null,
        globalRank: result?.globalRank || null,
        digestVersion: eventDigest?.v || null,
        reason: result?.rejectionReason || null,
        reasons: result?.rejectionReasons || [],
        traceEvidence: result?.traceEvidence || null,
      }));
      requestStudioEventSync({ limit: 30, force: true }).catch(() => {});
    } catch {
      setSubmitStatus('local');
      setSubmitFeedback(null);
      saveStudioGameEvent(buildStudioGameEvent("score_submit_result", {
        surface: "death_screen",
        mode,
        difficulty,
        score,
        wave,
        seed: runSeed,
        submission: "local",
      }));
      requestStudioEventSync({ limit: 30, force: true }).catch(() => {});
    }
  };

  return (
    <div style={{ ...base, touchAction: "pan-y", overflowY: "auto", overflowX: "hidden", color: "#fff", background: "linear-gradient(135deg,#1a0000 0%,#2a0808 50%,#1a0000 100%)", boxSizing: "border-box" }}>
      {showLeaderboard && (
        <Suspense fallback={null}>
          <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLeaderboard(false)} />
        </Suspense>
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

        <div style={{ ...card, marginBottom: 12, padding: "10px 12px", border: "1px solid rgba(255,215,0,0.24)", background: "linear-gradient(180deg,rgba(255,215,0,0.09),rgba(255,255,255,0.035))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 9, color: "#777", letterSpacing: 3 }}>BUILD GRADE</div>
              <div style={{ fontSize: 13, color: "#EEE", fontWeight: 900 }}>{buildGrade.label}</div>
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 6, display: "grid", placeItems: "center", color: "#111", background: buildGrade.grade === "A" ? "#FFD700" : buildGrade.grade === "B" ? "#00E5FF" : "#FF6B35", fontSize: 32, fontWeight: 900, boxShadow: "0 0 18px rgba(255,215,0,0.22)" }}>
              {buildGrade.grade}
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {buildGrade.breakdown.map(row => (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "88px 1fr 28px", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 8, color: "#999", textAlign: "left", letterSpacing: 1 }}>{row.label}</div>
                <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(6, Math.min(100, row.value))}%`, height: "100%", background: row.value >= 75 ? "#00FF88" : row.value >= 45 ? "#FFD700" : "#FF4444" }} />
                </div>
                <div style={{ fontSize: 9, color: "#CCC", textAlign: "right" }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RUN DNA — weapon kill-distribution fingerprint */}
        {weaponKills && weaponKills.some(k => k > 0) && (() => {
          const _total = weaponKills.reduce((s, k) => s + (k || 0), 0);
          const _used = weaponKills.map((k, i) => ({ k: k || 0, i })).filter(w => w.k > 0).sort((a, b) => b.k - a.k);
          const _doShareCard = () => {
            if (shareCardBusy) return;
            setShareCardBusy(true);
            try {
              const worker = new Worker(new URL("../workers/shareCard.worker.js", import.meta.url), { type: "module" });
              worker.onmessage = (ev) => {
                worker.terminate();
                setShareCardBusy(false);
                if (ev.data?.blob) {
                  const url = URL.createObjectURL(ev.data.blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "run-dna.png"; a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 5000);
                }
              };
              worker.onerror = () => { worker.terminate(); setShareCardBusy(false); };
              worker.postMessage(buildRunDnaSharePayload({
                weaponKills: weaponKills || [],
                weapons: WEAPONS,
                leaderboard,
                wave, score, kills,
                runNarrative,
                buildGrade,
                replayProofPresenter,
              }));
            } catch { setShareCardBusy(false); }
          };
          return (
            <div style={{ ...card, marginBottom: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 8, fontFamily: "'Courier New',monospace", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>── RUN DNA ──</span>
                <button onClick={_doShareCard} disabled={shareCardBusy} style={{ fontSize: 8, background: "none", border: "1px solid #333", borderRadius: 4, color: shareCardBusy ? "#555" : "#AAA", padding: "2px 6px", cursor: "pointer" }}>
                  {shareCardBusy ? "…" : "📸 SAVE CARD"}
                </button>
              </div>
              <div style={{ height: 14, borderRadius: 7, overflow: "hidden", display: "flex", marginBottom: 8 }} title="Weapon kill distribution">
                {_used.map(({ k, i }) => (
                  <div key={i} style={{ width: `${(k / _total) * 100}%`, height: "100%", background: WEAPONS[i]?.color || "#888", opacity: 0.9 }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {_used.slice(0, 4).map(({ k, i }) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: WEAPONS[i]?.color || "#888", flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: "#AAA" }}>{WEAPONS[i]?.emoji} {Math.round((k / _total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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

        {/* AI Run Coach — 3-line verdict */}
        <div style={{ ...card, marginBottom: 8, textAlign: "left", border: "1px solid rgba(0,229,255,0.25)", background: "linear-gradient(180deg,rgba(0,229,255,0.06),rgba(255,255,255,0.03))" }}>
          <div style={{ fontSize: 10, color: "#5CE6FF", letterSpacing: 2, fontWeight: 900, marginBottom: 6 }}>🧠 AI RUN COACH</div>
          <div style={{ fontSize: 11, color: "#FFB3B3", lineHeight: 1.45, marginBottom: 4 }}>
            <span style={{ color: "#FF6B6B", fontWeight: 700 }}>Killed by:</span> {runCoach.killedBy}
          </div>
          <div style={{ fontSize: 11, color: "#FFE5B3", lineHeight: 1.45, marginBottom: 4 }}>
            <span style={{ color: "#FFC800", fontWeight: 700 }}>Try next:</span> {runCoach.tryNext}
          </div>
          <div style={{ fontSize: 11, color: "#B3FFB3", lineHeight: 1.45, marginBottom: runCoach.weaponTip ? 4 : 0 }}>
            <span style={{ color: "#00FF88", fontWeight: 700 }}>Working:</span> {runCoach.working}
          </div>
          {runCoach.weaponTip && (
            <div style={{ fontSize: 11, color: "#E0D0FF", lineHeight: 1.45 }}>
              <span style={{ color: "#CC88FF", fontWeight: 700 }}>Weapon:</span> {runCoach.weaponTip}
            </div>
          )}
          {runCoach.precisionTip && (
            <div style={{ fontSize: 11, color: "#FFD8FF", lineHeight: 1.45, marginTop: runCoach.weaponTip ? 4 : 0 }}>
              <span style={{ color: "#FF88FF", fontWeight: 700 }}>Precision:</span> {runCoach.precisionTip}
            </div>
          )}
          {runCoach.crossRunTip && (
            <div style={{ fontSize: 11, color: "#FFE0A0", lineHeight: 1.45, marginTop: 4 }}>
              <span style={{ color: "#FF9900", fontWeight: 700 }}>Pattern:</span> {runCoach.crossRunTip}
            </div>
          )}
          {runCoach.enemyLab && (
            <div style={{ marginTop: 7, padding: "8px 9px", borderRadius: 6, border: "1px solid rgba(255,107,53,0.28)", background: "rgba(255,107,53,0.07)" }}>
              <div style={{ fontSize: 9, color: "#FFB38A", letterSpacing: 2, fontWeight: 900, marginBottom: 4 }}>
                ENEMY LAB · {runCoach.enemyLab.pressure.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: "#FFE1D5", lineHeight: 1.45 }}>
                <strong>{runCoach.enemyLab.emoji} {runCoach.enemyLab.name}</strong> ended {runCoach.enemyLab.deaths} of your last {runCoach.enemyLab.lookback} runs.
              </div>
              <div style={{ fontSize: 10, color: "#FFD0A6", lineHeight: 1.45, marginTop: 3 }}>
                {runCoach.enemyLab.drill}
              </div>
              <div style={{ fontSize: 10, color: "#BCA08E", lineHeight: 1.45, marginTop: 3 }}>
                {runCoach.enemyLab.nextRunCue}
              </div>
            </div>
          )}
          <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "#C8D7FF", lineHeight: 1.45 }}>
            <span style={{ color: "#9CB8FF", fontWeight: 700 }}>Run Brain:</span> {runCoach.brain.nextExperiment}
            {experimentMatched && (
              <div style={{ color: experimentMatched === "matched" ? "#88FF99" : "#FF9966", marginTop: 2 }}>
                🧪 Experiment {experimentMatched === "matched" ? "followed ✓" : "diverged — try it next run"}
              </div>
            )}
            <div style={{ color: "#88A", marginTop: 2 }}>Follow-through: {runCoach.brain.followThrough}</div>
          </div>
          <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "#FFE4B8", lineHeight: 1.45 }}>
            <span style={{ color: "#FFB36B", fontWeight: 800 }}>Next Contract:</span> {nextContract.title}
            <div style={{ color: "#C9A26F", marginTop: 2 }}>{nextContract.progress}</div>
          </div>
        </div>

        <div style={{ ...card, marginBottom: 12, textAlign: "left", border: "1px solid rgba(255,107,53,0.18)", background: "linear-gradient(180deg,rgba(255,107,53,0.08),rgba(255,255,255,0.04))" }}>
          <div style={{ fontSize: 10, color: "#FFB36B", letterSpacing: 2, fontWeight: 900, marginBottom: 6 }}>TACTICAL DEBRIEF</div>
          <div style={{ fontSize: 18, color: "#FFF", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>
            {debrief.verdict}
          </div>
          <div style={{ fontSize: 12, color: "#FFD7B8", marginTop: 4, marginBottom: 10 }}>
            Build identity: <span style={{ color: "#FFF", fontWeight: 700 }}>{debrief.identity}</span>
          </div>

          <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>WHAT WORKED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {debrief.strengths.map((line, index) => (
              <div key={`strength-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                ✓ {line}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>NEXT BEST MOVES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {debrief.actions.map((line, index) => (
              <div key={`action-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                {index + 1}. {line}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginTop: 10, marginBottom: 5 }}>CAUSE OF COLLAPSE</div>
          <div style={{ fontSize: 11, color: "#DDD", lineHeight: 1.5, marginBottom: 10 }}>
            {debrief.collapseReason}
          </div>

          {debrief.missedValue.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>MISSED VALUE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {debrief.missedValue.map((line, index) => (
                  <div key={`missed-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                    • {line}
                  </div>
                ))}
              </div>
            </>
          )}

          {debrief.rematchPlan.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 5 }}>CORRECTIVE REMATCH</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {debrief.rematchPlan.map((line, index) => (
                  <div key={`rematch-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                    {index + 1}. {line}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ ...card, marginBottom: 12, textAlign: "left", border: "1px solid rgba(0,229,255,0.18)", background: "linear-gradient(180deg,rgba(0,229,255,0.07),rgba(255,255,255,0.035))" }}>
          <div style={{ fontSize: 10, color: "#00E5FF", letterSpacing: 2, fontWeight: 900, marginBottom: 6 }}>RUN INTELLIGENCE</div>
          <div style={{ fontSize: 12, color: "#EAFBFF", lineHeight: 1.5 }}>
            Diagnosis: <span style={{ color: "#FFF", fontWeight: 700 }}>{postRunIntel.cause.replace(/_/g, " ")}</span>
          </div>
          <div style={{ fontSize: 11, color: "#DDD", lineHeight: 1.5, marginTop: 5 }}>
            {postRunIntel.drill}
          </div>
          <div style={{ fontSize: 11, color: "#FFB36B", lineHeight: 1.5, marginTop: 6, fontStyle: "italic" }}>
            "{postRunIntel.callout}"
          </div>
          {postRunIntel.rivalry && (
            <div style={{ fontSize: 11, color: "#8FEFFF", lineHeight: 1.5, marginTop: 6 }}>
              {postRunIntel.rivalry.prompt}
            </div>
          )}
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

        {/* Objective summary */}
        {objectivesSummary && (objectivesSummary.completed.length > 0 || objectivesSummary.failed.length > 0) && (
          <div style={{ ...card, marginBottom: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 2, fontWeight: 900, marginBottom: 5 }}>OBJECTIVES</div>
            {objectivesSummary.completed.map((o, i) => (
              <div key={`oc-${i}`} style={{ fontSize: 11, color: "#00FF88", marginBottom: 2 }}>✓ {o.label}</div>
            ))}
            {objectivesSummary.failed.map((o, i) => (
              <div key={`of-${i}`} style={{ fontSize: 11, color: "#FF6666", marginBottom: 2 }}>✗ {o.label} — not completed</div>
            ))}
          </div>
        )}

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

        {/* Doodie Pass cosmetic unlocks */}
        {cosmeticUnlocks && cosmeticUnlocks.length > 0 && (
          <div style={{ ...card, marginBottom: 10, padding: "10px 12px", border: "1px solid rgba(255,180,0,0.35)", background: "rgba(255,180,0,0.07)" }}>
            <div style={{ fontSize: 10, color: "#FFD700", letterSpacing: 2, fontWeight: 900, marginBottom: 6 }}>🎖 DOODIE PASS UNLOCKED</div>
            {cosmeticUnlocks.map((c) => (
              <div key={c.id} style={{ fontSize: 12, color: "#FFE082", marginBottom: 3 }}>
                {c.emoji} <strong>{c.name}</strong> — {c.desc}
              </div>
            ))}
          </div>
        )}

        {replayProofReceipt && (
          <div style={{ ...card, marginBottom: 12, border: `1px solid ${replayProofReceipt.color}44`, background: `${replayProofReceipt.color}0D` }}>
            <div style={{ fontSize: 9, color: replayProofReceipt.color, letterSpacing: 3, marginBottom: 8, fontFamily: "'Courier New',monospace" }}>── REPLAY PROOF ──</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: "#EEE", fontWeight: 900, letterSpacing: 1.5 }}>{replayProofReceipt.label}</div>
              <div style={{ fontSize: 16, color: replayProofReceipt.color, fontWeight: 900, fontFamily: "'Courier New',monospace" }}>{replayProofReceipt.score}%</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
              {replayProofReceipt.proofLines.map((line, i) => (
                <div key={i} style={{ fontSize: 10, color: "#AAA", lineHeight: 1.35 }}>{line}</div>
              ))}
              <div style={{ fontSize: 10, color: "#DDD", lineHeight: 1.35, marginTop: 3 }}>{replayProofReceipt.nextAction}</div>
              {proofTrend.sampleSize > 1 && (
                <div style={{ fontSize: 9, color: proofTrend.color, lineHeight: 1.35, marginTop: 5, letterSpacing: 1 }}>
                  {proofTrend.label.toUpperCase()} · {proofTrend.detail}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ghost path visualization */}
        {ghostData && ghostData.length > 10 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 10, fontFamily: "'Courier New',monospace", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>── GHOST RACE — YOUR PATH ──</span>
              {traceEvidence?.evidenceLevel === "rich" && (
                <span style={{ fontSize: 8, color: "#FFD700", background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.35)", borderRadius: 4, padding: "1px 6px", letterSpacing: 1.5, fontWeight: 700 }}>⭐ VERIFIED RUN</span>
              )}
            </div>
            <canvas ref={ghostCanvasRef} width={280} height={140} style={{ borderRadius: 6, border: "1px solid #1A1A1A", display: "block", margin: "0 auto" }} />
            <div style={{ fontSize: 9, color: "#444", marginTop: 6, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              <span>🟢 START  🔴 DEATH  — {ghostData.length} position samples</span>
              <button
                onClick={() => { setReplayMode("full"); setReplayNonce(n => n + 1); }}
                style={{ padding: "3px 8px", fontSize: 9, fontFamily: "'Courier New',monospace", background: replayMode === "full" ? "rgba(0,229,255,0.15)" : "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.35)", borderRadius: 4, color: "#8DEBFF", cursor: "pointer", letterSpacing: 1 }}
              >REPLAY</button>
              {precisionPeakStreak >= 3 && (
                <button
                  onClick={() => { setReplayMode("best_shot"); setReplayNonce(n => n + 1); }}
                  style={{ padding: "3px 8px", fontSize: 9, fontFamily: "'Courier New',monospace", background: replayMode === "best_shot" ? "rgba(255,136,255,0.18)" : "rgba(255,136,255,0.06)", border: "1px solid rgba(255,136,255,0.4)", borderRadius: 4, color: "#FF88FF", cursor: "pointer", letterSpacing: 1 }}
                >🎯 BEST SHOT ×{precisionPeakStreak}</button>
              )}
            </div>
            {ghostDeathReadout && (
              <div style={{ margin: "8px auto 0", maxWidth: 260, padding: "7px 9px", borderRadius: 6, background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.18)", textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#8DEBFF", fontWeight: 900, letterSpacing: 1 }}>{ghostDeathReadout.headline.toUpperCase()}</div>
                <div style={{ fontSize: 10, color: "#BFD8DD", marginTop: 3, lineHeight: 1.35 }}>{ghostDeathReadout.detail}</div>
              </div>
            )}
          </div>
        )}

        {/* Run narrative arc card */}
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 8, fontFamily: "'Courier New',monospace" }}>── RUN ARC ──</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#EEE", letterSpacing: 2, marginBottom: 4 }}>{runNarrative.act}</div>
          <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5, marginBottom: runNarrative.moments.length > 0 ? 10 : 0 }}>{runNarrative.actDesc}</div>
          {runNarrative.moments.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0", borderTop: "1px solid #1A1A1A" }}>
              <div style={{ fontSize: 8, color: "#FFD700", letterSpacing: 2, fontFamily: "'Courier New',monospace", whiteSpace: "nowrap", marginTop: 2 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: "#AAA", lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Weapon legend milestones crossed this run */}
        {weaponMilestones.length > 0 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 8, fontFamily: "'Courier New',monospace" }}>── WEAPON MILESTONES ──</div>
            {weaponMilestones.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", borderTop: i > 0 ? "1px solid #1A1A1A" : "none" }}>
                <span style={{ fontSize: 16 }}>{WEAPONS[m.weaponIdx]?.emoji || "🔫"}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: "#EEE", fontWeight: 700 }}>{WEAPONS[m.weaponIdx]?.name || "Weapon"}</div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: m.color, fontFamily: "'Courier New',monospace" }}>{m.label} REACHED</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Proximity rivals: up to 3 nearby leaderboard players to beat */}
        {proximityRivals.length > 0 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 3, marginBottom: 8, fontFamily: "'Courier New',monospace" }}>── RIVALRY LADDER ──</div>
            {proximityRivals.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: i < proximityRivals.length - 1 ? "1px solid #1A1A1A" : "none" }}>
                <span style={{ fontSize: 11, color: r.diff > 0 ? "#FF8866" : "#66FFAA", fontFamily: "'Courier New',monospace", letterSpacing: 1 }}>{r.diff > 0 ? "▲" : "▼"} {r.name}</span>
                <span style={{ fontSize: 10, color: "#777", fontFamily: "'Courier New',monospace" }}>{r.diff > 0 ? "+" : ""}{r.diff.toLocaleString()} pts</span>
              </div>
            ))}
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
            {submitProofPresenter?.receipt && (
              <div style={{ color: submitProofPresenter.receipt.color, fontSize: 10, marginTop: 6, letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>
                {submitProofPresenter.shareStamp}
              </div>
            )}
          </div>
        ) : submitStatus === "rejected" ? (
          <div style={{ ...card, marginBottom: 12, border: "1px solid rgba(255,90,90,0.35)", background: "rgba(255,70,70,0.05)" }}>
            <div style={{ color: "#FF8888", fontSize: 14, fontWeight: 700 }}>Submission rejected</div>
            <div style={{ color: "#DDD", fontSize: 11, marginTop: 4 }}>
              {submitFeedback?.rejectionReason || "The server rejected this run."}
            </div>
            {submitFeedback?.rejectionReasons?.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {submitFeedback.rejectionReasons.map((reason, index) => (
                  <div key={`reject-${index}`} style={{ color: "#FFB5B5", fontSize: 10, lineHeight: 1.4 }}>
                    • {reason}
                  </div>
                ))}
              </div>
            )}
            <div style={{ color: "#999", fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
              Local fallback skipped — this was a server-side validity check, not a network outage. Common causes: impossibly high kill/damage ratio for the reported wave, or a corrupted run token. Your career stats are still updated locally.
            </div>
            {submitProofPresenter?.receipt && (
              <div style={{ color: submitProofPresenter.receipt.color, fontSize: 10, marginTop: 8, lineHeight: 1.4, fontFamily: "'Courier New',monospace" }}>
                {submitProofPresenter.receipt.label.toUpperCase()} · {submitProofPresenter.receipt.nextAction}
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...card, marginBottom: 12, border: "1px solid rgba(255,180,0,0.3)", background: "rgba(255,140,0,0.05)" }}>
            <div style={{ color: "#FFA500", fontSize: 14, fontWeight: 700 }}>📡 Saved locally</div>
            <div style={{ color: "#CCC", fontSize: 11, marginTop: 4 }}>Couldn't reach the server — score saved on this device only.</div>
            <div style={{ color: "#999", fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>
              This usually means a network blip. Your score will <em>not</em> appear on the global leaderboard, but it counts toward your local career stats. Try submitting again next session — the game keeps your run data.
            </div>
            {submitProofPresenter?.receipt && (
              <div style={{ color: submitProofPresenter.receipt.color, fontSize: 10, marginTop: 8, letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>
                {submitProofPresenter.shareStamp}
              </div>
            )}
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
              onClick={() => {
                track("debrief_copy_seed", { seed: runSeed, score, wave });
                navigator.clipboard?.writeText?.(String(runSeed));
              }}
              style={{ padding: "3px 8px", fontSize: 9, fontFamily: "'Courier New',monospace", background: "rgba(255,255,255,0.05)", border: "1px solid #555", borderRadius: 4, color: "#aaa", cursor: "pointer", letterSpacing: 1 }}
            >📋 COPY</button>
            <button
              onClick={() => {
                track("debrief_copy_challenge", { seed: runSeed, score, wave, difficulty });
                copyChallengeUrl({ seed: runSeed, difficulty, vsScore: score, vsName: username }).then((url) => {
                  if (!url) return;
                  setCopiedChallenge(true);
                  setTimeout(() => setCopiedChallenge(false), 1500);
                });
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
          <button aria-label="Play again — start a new run" onClick={() => { track("debrief_play_again", { score, wave, runSeed, intelligenceCause: postRunIntel.cause }); onStartGame(); }} style={{ ...btnP, minWidth: 110, fontSize: 15 }}>PLAY AGAIN</button>
          {runSeed > 0 && (
            <button aria-label={`Replay seed ${runSeed} — same map`} onClick={() => { track("debrief_replay_seed", { seed: runSeed, score, wave, intelligenceCause: postRunIntel.cause }); onStartGame(runSeed); }} style={{ ...btnS, minWidth: 130, fontSize: 13 }}>🔄 REPLAY #{runSeed}</button>
          )}
          {runSeed > 0 && (
            <button
              aria-label="Copy shareable link for this run"
              onClick={() => {
                const code = encodeReplayCode({ seed: runSeed, mode, difficulty, weaponIdx: 0, starterLoadout });
                const url = `${location.origin}${location.pathname}?replay=${code}`;
                navigator.clipboard?.writeText?.(url);
                track("debrief_share_replay_link", { seed: runSeed, score, wave, mode });
              }}
              style={{ ...btnS, minWidth: 130, fontSize: 13 }}
            >🔗 SHARE RUN</button>
          )}
          <button aria-label="View leaderboard" onClick={() => { track("debrief_view_leaderboard", { score, wave, intelligenceCause: postRunIntel.cause }); onRefreshLeaderboard(); setShowLeaderboard(true); }} style={{ ...btnS, minWidth: 130, fontSize: 15 }}>LEADERBOARD</button>
          <button aria-label="Return to main menu" onClick={() => { track("debrief_menu", { score, wave, intelligenceCause: postRunIntel.cause }); onMenu(); }} style={{ ...btnS, minWidth: 110, fontSize: 15 }}>RAGE QUIT</button>
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
