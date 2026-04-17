import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { WEAPONS, ENEMY_TYPES, DIFFICULTIES, ACHIEVEMENTS, META_UPGRADES, STARTER_LOADOUTS, NEW_FEATURES, getWeeklyMutation, getWeeklyGauntlet } from "../constants.js";
import { loadCareerStats, getDailyMissions, loadMissionProgress, loadMetaProgress, saveMetaProgress, purchaseMetaUpgrade, prestigeAccount, getAccountLevel, getDailyChallengeSeed, hasDailyChallengeSubmitted, loadRunHistory, loadCustomLoadouts, saveCustomLoadout, loadRivalryHistory, saveStudioGameEvent } from "../storage.js";
import { supabase } from "../supabase.js";
import { encodeLoadout, decodeLoadout, isValidLoadoutCode } from "../utils/loadoutCode.js";
import { buildCommandBrief, buildFrontDoorActionStack } from "../utils/menuGuidance.js";
import { buildMenuIntelligence, buildStudioGameEvent } from "../utils/runIntelligence.js";
import { track } from "../utils/analytics.js";
import { useGamepadNav } from "../hooks/useGamepadNav.js";
import { isSupporter } from "../utils/supporter.js";

const LeaderboardPanel = lazy(() => import("./LeaderboardPanel.jsx"));
const AchievementsPanel = lazy(() => import("./AchievementsPanel.jsx"));
const SettingsPanel = lazy(() => import("./SettingsPanel.jsx"));
const MetaTreePanel = lazy(() => import("./MetaTreePanel.jsx"));
const SupporterModal = lazy(() => import("./SupporterModal.jsx"));

function LazyPanel({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

const TIER_LABELS = ["", "Ⅰ", "Ⅱ", "Ⅲ"];
const TIER_COLORS = ["#555", "#CD7F32", "#C0C0C0", "#FFD700"];
const PLAYER_SKINS = [
  { emoji: "",   label: "Soldier",  required: 0 },
  { emoji: "🤖", label: "Robot",    required: 1 },
  { emoji: "👾", label: "Alien",    required: 2 },
  { emoji: "🐸", label: "Frog",     required: 3 },
  { emoji: "🦊", label: "Fox",      required: 4 },
  { emoji: "🐉", label: "Dragon",   required: 5 },
];

function canUseRealtimePresence() {
  if (typeof window === "undefined") return false;

  const { protocol, hostname } = window.location;
  if (protocol === "https:") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  return false;
}

export default function MenuScreen({ username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, lbHasMore, onLoadMore, onStart, onRefreshLeaderboard, onChangeUsername, starterLoadout, setStarterLoadout, gameSettings, onSaveSettings, gamepadConnected, controllerType, scoreAttackMode, onSetScoreAttackMode, dailyChallengeMode, onSetDailyChallengeMode, cursedRunMode, onSetCursedRunMode, bossRushMode, onSetBossRushMode, speedrunMode, onSetSpeedrunMode, gauntletMode, onSetGauntletMode, assistAvailable, onApplyAssist }) {
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
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [showLoadoutBuilder, setShowLoadoutBuilder] = useState(false);
  const [showMetaTree, setShowMetaTree] = useState(false);
  const [showSupporter, setShowSupporter] = useState(false);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [loadoutCodeInput, setLoadoutCodeInput] = useState("");
  const [loadoutCodeError, setLoadoutCodeError] = useState("");
  const [customLoadouts, setCustomLoadouts] = useState(() => loadCustomLoadouts());
  const [runHistory, setRunHistory] = useState(() => loadRunHistory());
  const [rivalryHistory, setRivalryHistory] = useState(() => loadRivalryHistory());
  const [editingSlot, setEditingSlot] = useState(null); // null or slot index 0-2
  const [editName, setEditName] = useState("");
  const [editWeaponIdx, setEditWeaponIdx] = useState(0);
  const [editStarterLoadout, setEditStarterLoadout] = useState("standard");
  const [customSeed, setCustomSeed] = useState("");
  const [career, setCareer] = useState(null);
  const [missions, setMissions] = useState([]);
  const [missionProgress, setMissionProgress] = useState({});
  const [meta, setMeta] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [challengeMode, setChallengeMode] = useState(null); // { seed, diff, vs, vsName } if via challenge link
  const [onlinePlayers, setOnlinePlayers] = useState(null);
  const [copiedChallengeLink, setCopiedChallengeLink] = useState(false);

  // ── Live player count via Supabase Realtime presence ──────────────────────
  useEffect(() => {
    if (!supabase) return;
    if (!canUseRealtimePresence()) {
      setOnlinePlayers(null);
      return;
    }

    let channel = null;
    let disposed = false;

    try {
      channel = supabase.channel("cod-presence", {
        config: { presence: { key: Math.random().toString(36).slice(2) } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (disposed) return;
          const state = channel.presenceState();
          setOnlinePlayers(Object.keys(state).length);
        })
        .subscribe(async (status) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({ t: Date.now() });
            } catch (error) {
              console.warn("[MenuScreen] Presence tracking unavailable:", error);
              setOnlinePlayers(null);
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setOnlinePlayers(null);
          }
        });
    } catch (error) {
      console.warn("[MenuScreen] Presence subscription unavailable:", error);
      setOnlinePlayers(null);
    }

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const c = loadCareerStats();
    setCareer(c);
    setMissions(getDailyMissions());
    setMissionProgress(loadMissionProgress());
    setMeta(loadMetaProgress());
    setRunHistory(loadRunHistory());
    setRivalryHistory(loadRivalryHistory());

    // Parse challenge link URL params (?seed=XXXXX&diff=normal&vs=12345&vsName=Player)
    const params = new URLSearchParams(window.location.search);
    const urlSeed   = params.get("seed");
    const urlDiff   = params.get("diff");
    const urlVs     = params.get("vs");
    const urlVsName = params.get("vsName");
    if (urlSeed && !isNaN(parseInt(urlSeed))) {
      setCustomSeed(urlSeed);
      if (urlDiff && Object.keys(DIFFICULTIES).includes(urlDiff)) {
        setDifficulty(urlDiff);
      }
      setChallengeMode({
        seed: urlSeed, diff: urlDiff || null,
        vs: urlVs ? parseInt(urlVs) : null,
        vsName: urlVsName || null,
      });
    }
  }, [setDifficulty]);

  // ── Gamepad menu navigation ──────────────────────────────────────────────
  const anyModalOpen = showLeaderboard || showAchievements || showCareer || showRules ||
    showControls || showBestiary || showMissions || showUpgrades || showNewFeatures ||
    showPrestigeConfirm || showSettings || showRunHistory || showLoadoutBuilder || showMetaTree;

  // Ordered flat list of main-menu actions (indices used for focus tracking)
  const diffKeys     = Object.keys(DIFFICULTIES);                          // 0-3
  const loadoutKeys  = STARTER_LOADOUTS.map(l => l.id);                   // 4-7
  // Primary buttons: 8-9, secondary 10-15, tertiary 16
  const NAV_ITEMS = [
    ...diffKeys.map(k => ({ key: `diff_${k}`,    action: () => setDifficulty(k) })),
    ...loadoutKeys.map(k => ({ key: `lo_${k}`,   action: () => setStarterLoadout?.(k) })),
    { key: "deploy",      action: () => onStart(dailyChallengeMode ? String(getDailyChallengeSeed()) : (customSeed || undefined), challengeMode?.vs ? { vs: challengeMode.vs, vsName: challengeMode.vsName } : {}) },
    { key: "leaderboard", action: () => { onRefreshLeaderboard(); setShowLeaderboard(true); } },
    { key: "career",      action: () => { setCareer(loadCareerStats()); setMeta(loadMetaProgress()); setShowCareer(true); } },
    { key: "achievements",action: () => { setCareer(loadCareerStats()); setShowAchievements(true); } },
    { key: "missions",    action: () => { setMissions(getDailyMissions()); setMissionProgress(loadMissionProgress()); setShowMissions(true); } },
    { key: "upgrades",    action: () => { setMeta(loadMetaProgress()); setShowUpgrades(true); } },
    { key: "rules",       action: () => setShowRules(true) },
    { key: "controls",    action: () => setShowControls(true) },
    { key: "bestiary",    action: () => setShowBestiary(true) },
    { key: "settings",    action: () => setShowSettings(true) },
  ];

  const actionsRef = useRef(NAV_ITEMS);
  actionsRef.current = NAV_ITEMS;
  const mainScrollRef = useRef(null);

  const navFocusIdx = useGamepadNav({
    count:     NAV_ITEMS.length,
    cols:      1,
    enabled:   !anyModalOpen,
    disableLR: false,
    onConfirm: (idx) => actionsRef.current[idx]?.action(),
    onBack:    undefined,
  });

  // Scroll focused main-menu item into view when gamepad navigates
  useEffect(() => {
    if (anyModalOpen || !mainScrollRef.current) return;
    const el = mainScrollRef.current.querySelector('[data-gp-focused]');
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [navFocusIdx, anyModalOpen]);

  // Modal scroll via left stick Y / D-pad when any modal is open
  useEffect(() => {
    if (!anyModalOpen) return;
    const DEAD = 0.22;
    let lastDU = false, lastDD = false;
    const id = setInterval(() => {
      const gp = navigator.getGamepads?.()[0];
      if (!gp) return;
      const ly = gp.axes[1] ?? 0;
      const dU = gp.buttons[12]?.pressed;
      const dD = gp.buttons[13]?.pressed;
      // Edge-trigger for D-pad, continuous for analog stick
      const delta = Math.abs(ly) > DEAD ? ly * 18
        : (dU && !lastDU) ? -60
        : (dD && !lastDD) ? 60 : 0;
      if (delta !== 0) {
        const el = document.querySelector('[data-gamepad-scroll]');
        if (el) el.scrollTop += delta;
      }
      lastDU = !!dU; lastDD = !!dD;
    }, 50);
    return () => clearInterval(id);
  }, [anyModalOpen]);

  // B button closes any open modal
  useEffect(() => {
    if (!anyModalOpen) return;
    let lastB = false;
    const id = setInterval(() => {
      const gp = navigator.getGamepads?.()[0];
      if (!gp) return;
      const bNow = gp.buttons[1]?.pressed;
      if (bNow && !lastB) {
        setShowLeaderboard(false); setShowAchievements(false); setShowCareer(false);
        setShowRules(false); setShowControls(false); setShowBestiary(false);
        setShowMissions(false); setShowUpgrades(false); setShowNewFeatures(false);
        setShowPrestigeConfirm(false); setShowRunHistory(false); setShowLoadoutBuilder(false);
        // Don't close SettingsPanel — it handles its own B button
      }
      lastB = !!bNow;
    }, 80);
    return () => clearInterval(id);
  }, [anyModalOpen]);

  const gfocus = (key) => {
    const idx = NAV_ITEMS.findIndex(i => i.key === key);
    return navFocusIdx === idx && !anyModalOpen;
  };
  const focusRing = { outline: "2px solid #FF6B35", outlineOffset: 2, boxShadow: "0 0 12px rgba(255,107,53,0.45)" };

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
  const weeklyMutation = getWeeklyMutation();
  const selectedLoadout = STARTER_LOADOUTS.find(loadout => loadout.id === starterLoadout) || STARTER_LOADOUTS[0];
  const currentModeLabel = bossRushMode ? "Boss Rush" : cursedRunMode ? "Cursed" : scoreAttackMode ? "Score Attack" : dailyChallengeMode ? "Daily Challenge" : speedrunMode ? "Speedrun" : gauntletMode ? "Gauntlet" : "Standard";
  const deployArgs = {
    seed: dailyChallengeMode ? String(getDailyChallengeSeed()) : (customSeed || undefined),
    challenge: challengeMode?.vs ? { vs: challengeMode.vs, vsName: challengeMode.vsName } : {},
  };
  const todaySeedStr = String(getDailyChallengeSeed());
  const dailyAlreadyPlayed = hasDailyChallengeSubmitted();
  const modeId = bossRushMode ? "boss_rush"
    : cursedRunMode ? "cursed"
      : scoreAttackMode ? "score_attack"
        : dailyChallengeMode ? "daily_challenge"
          : speedrunMode ? "speedrun"
            : gauntletMode ? "gauntlet"
              : "standard";
  const commandBrief = buildCommandBrief({
    mode: modeId,
    selectedLoadout,
    weeklyMutation,
  });
  const incompleteMissionCount = missions.filter(m => !missionProgress[m.id]).length;
  const canSpendMeta = (meta?.careerPoints || 0) >= 10;
  const actionStack = buildFrontDoorActionStack({
    challenge: challengeMode?.vs ? { seed: challengeMode.seed, vsScore: challengeMode.vs, vsName: challengeMode.vsName } : null,
    dailyAlreadyPlayed,
    canSpendMeta,
    incompleteMissionCount,
    selectedLoadout,
    currentModeLabel,
    todaySeed: todaySeedStr,
  });
  const runIntel = buildMenuIntelligence({
    mode: modeId,
    selectedLoadout,
    missions,
    missionProgress,
    meta,
    career,
    challenge: challengeMode?.vs ? { seed: challengeMode.seed, vsScore: challengeMode.vs, vsName: challengeMode.vsName } : null,
    dailyAlreadyPlayed,
    todaySeed: todaySeedStr,
    runHistory,
    rivalryHistory,
  });
  const recommendedAction = actionStack[0];

  const handleCopyChallengeLink = useCallback(async () => {
    try {
      const seed = customSeed || todaySeedStr;
      const params = new URLSearchParams({ seed, diff: difficulty });
      if (challengeMode?.vs) params.set("vs", String(challengeMode.vs));
      if (challengeMode?.vsName) params.set("vsName", challengeMode.vsName);
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      await navigator.clipboard?.writeText?.(url);
      setCopiedChallengeLink(true);
      setTimeout(() => setCopiedChallengeLink(false), 1500);
    } catch {
      setCopiedChallengeLink(false);
    }
  }, [challengeMode?.vs, challengeMode?.vsName, customSeed, difficulty, todaySeedStr]);

  const runFrontDoorAction = useCallback((actionId) => {
    const studioEvent = buildStudioGameEvent("front_door_action", {
      actionId: actionId || "play_now",
      ...runIntel.telemetry,
    });
    saveStudioGameEvent(studioEvent);
    track("front_door_action", {
      actionId: actionId || "play_now",
      mode: modeId,
      loadout: selectedLoadout.id,
      dailyAlreadyPlayed,
      challengeActive: Boolean(challengeMode?.vs),
      intelligenceFocus: runIntel.focus,
      studioEvent,
    });
    switch (actionId) {
      case "accept_challenge":
      case "play_now":
        onStart(deployArgs.seed, deployArgs.challenge);
        break;
      case "daily_challenge":
        onSetDailyChallengeMode?.(true);
        onStart(todaySeedStr, {});
        break;
      case "best_next_upgrade":
        setMeta(loadMetaProgress());
        setShowUpgrades(true);
        break;
      case "mission_cleanup":
        setMissions(getDailyMissions());
        setMissionProgress(loadMissionProgress());
        setShowMissions(true);
        break;
      case "challenge_friend":
        handleCopyChallengeLink();
        break;
      default:
        onStart(deployArgs.seed, deployArgs.challenge);
    }
  }, [challengeMode?.vs, dailyAlreadyPlayed, deployArgs.challenge, deployArgs.seed, handleCopyChallengeLink, modeId, onSetDailyChallengeMode, onStart, runIntel.focus, runIntel.telemetry, selectedLoadout.id, todaySeedStr]);

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
      const shareText = "Call of Doodie is live: a free browser roguelite shooter with doctrine builds, daily challenges, boss telegraphs, tactical debriefs, and leaderboard rivalry. Play free:";
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
      <div ref={mainScrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: 20, boxSizing: "border-box" }}>
      {showLeaderboard && (
        <LazyPanel>
          <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLeaderboard(false)} />
        </LazyPanel>
      )}
      {showAchievements && (
        <LazyPanel>
          <AchievementsPanel achievementsUnlocked={career?.achievementsEver || []} onClose={() => setShowAchievements(false)} />
        </LazyPanel>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
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
              <div>🌱 <strong style={{ color: "#FF6B35" }}>Seeds:</strong> Each run uses a unique seed (0–999998) controlling map layout, walls, terrain, and theme. Enter a custom seed on the menu to replay any run!</div>
              <div>🔄 <strong style={{ color: "#FF6B35" }}>Replay:</strong> After death, hit 🔄 REPLAY to rerun the exact same map with the same seed</div>
            </div>
            <button onClick={() => setShowRules(false)} style={{ ...btnP, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
          </div>
        </div>
      )}

      {/* Controls Modal */}
      {showControls && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
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
            {/* Controller section */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 12, color: "#FFD700", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                🎮 CONTROLLER
                {controllerType === "xbox" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(16,124,16,0.2)", border: "1px solid #107C10", color: "#4DBD61", fontWeight: 900 }}>Xbox</span>}
                {controllerType === "ps" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(0,55,145,0.22)", border: "1px solid #2255BB", color: "#6699FF", fontWeight: 900 }}>PS</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12, color: "#EEE", lineHeight: 2 }}>
                <div>🕹️ <span style={{ color: "#FF6B35", fontWeight: 800 }}>Left Stick</span> — Move</div>
                <div>🎯 <span style={{ color: "#FF6B35", fontWeight: 800 }}>Right Stick</span> — Aim</div>
                <div>🔫 <span style={{ color: "#FF6B35", fontWeight: 800 }}>RT / R2</span> — Shoot</div>
                <div>💨 <span style={{ color: "#00E5FF", fontWeight: 800 }}>R3 (click stick)</span> — Dash</div>
                <div>💣 <span style={{ color: "#FF4500", fontWeight: 800 }}>B / Circle</span> — Grenade</div>
                <div>🔄 <span style={{ color: "#FFD700", fontWeight: 800 }}>X / Square</span> — Reload</div>
                <div>◀ <span style={{ color: "#FFD700", fontWeight: 800 }}>LB / L1</span> — Prev weapon</div>
                <div>▶ <span style={{ color: "#FFD700", fontWeight: 800 }}>RB / R1</span> — Next weapon</div>
                <div>⏸ <span style={{ color: "#FFD700", fontWeight: 800 }}>Start / Options</span> — Pause</div>
                <div>✅ <span style={{ color: "#AAA", fontWeight: 800 }}>A / Cross</span> — Confirm (menus)</div>
                <div>❌ <span style={{ color: "#AAA", fontWeight: 800 }}>B / Circle</span> — Back (menus)</div>
                <div>⬆ <span style={{ color: "#AAA", fontWeight: 800 }}>D-pad</span> — Navigate menus</div>
              </div>
            </div>
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
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FFD700", margin: "0 0 12px", fontSize: 18 }}>👾 MOST WANTED LIST</h3>
            {ENEMY_TYPES.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 6, marginBottom: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 24 }}>{e.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: e.color }}>{e.name}</div>
                  <div style={{ fontSize: 10, color: "#CCC" }}>HP: {e.health} · Speed: {e.speed} · Points: {e.points}{e.ranged ? " · RANGED ⚡" : ""}</div>
                  <div style={{ fontSize: 10, color: "#FF69B4", fontStyle: "italic" }}>"{Array.isArray(e.deathQuotes) ? e.deathQuotes[Math.floor(Math.random() * e.deathQuotes.length)] : (e.deathQuote || "...")}"</div>
                </div>
              </div>
            ))}
            <button onClick={() => setShowBestiary(false)} style={{ ...btnP, marginTop: 16, width: "100%", maxWidth: 300 }}>← BACK</button>
          </div>
        </div>
      )}

      {/* Run History Modal */}
      {showRunHistory && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 480, width: "100%", position: "relative", border: "1px solid rgba(255,107,53,0.3)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowRunHistory(false)} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
            <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18, letterSpacing: 2 }}>📜 RUN HISTORY</h3>
            <p style={{ color: "#bbb", fontSize: 11, margin: "0 0 14px" }}>Last 10 runs — saved locally on your device</p>
            {(() => {
              const history = loadRunHistory();
              if (history.length === 0) {
                return <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 20 }}>No runs yet — get out there!</p>;
              }
              const MODE_LABELS = { score_attack: "⏱ SA", daily_challenge: "📅 DC", cursed: "☠ CU", boss_rush: "☠ BR" };
              const DIFF_COLORS = { easy: "#44CC44", normal: "#FFD700", hard: "#FF4444", insane: "#FF00FF" };
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map((run, i) => {
                    const date = new Date(run.ts);
                    const dateStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
                    const timeFmt = run.time != null ? (run.time >= 3600 ? `${Math.floor(run.time/3600)}h${Math.floor((run.time%3600)/60)}m` : `${Math.floor(run.time/60)}:${String(run.time%60).padStart(2,"0")}`) : "--:--";
                    const modeLabel = run.mode ? MODE_LABELS[run.mode] : null;
                    const diffColor = DIFF_COLORS[run.difficulty] || "#AAA";
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ background: "rgba(255,107,53,0.18)", border: "1px solid rgba(255,107,53,0.4)", borderRadius: 6, padding: "4px 8px", textAlign: "center", flexShrink: 0, minWidth: 38 }}>
                          <div style={{ fontSize: 9, color: "#FF6B35", fontWeight: 700 }}>W</div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: "#FF6B35", lineHeight: 1 }}>{run.wave ?? "?"}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: "#FFD700" }}>{(run.score || 0).toLocaleString()}</span>
                            <span style={{ fontSize: 11, color: "#00FF88" }}>☠ {run.kills ?? 0}</span>
                            {modeLabel && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: "rgba(255,51,51,0.18)", border: "1px solid rgba(255,51,51,0.4)", color: "#FF6666", fontWeight: 900 }}>{modeLabel}</span>}
                            <span style={{ fontSize: 9, fontWeight: 700, color: diffColor }}>{(run.difficulty || "normal").toUpperCase()}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 9, color: "#888" }}>
                            <span>⏱ {timeFmt}</span>
                            {run.modifier && <span>🎲 {run.modifier}</span>}
                            <span style={{ marginLeft: "auto" }}>{dateStr}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <button onClick={() => setShowRunHistory(false)} style={{ ...btnP, marginTop: 16, width: "100%" }}>← CLOSE</button>
          </div>
        </div>
      )}

      {/* Custom Loadout Builder Modal */}
      {showLoadoutBuilder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 500, width: "100%", position: "relative", border: "1px solid rgba(255,107,53,0.35)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => { setShowLoadoutBuilder(false); setEditingSlot(null); }} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
            <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18, letterSpacing: 2 }}>⚙️ CUSTOM LOADOUTS</h3>
            <p style={{ color: "#bbb", fontSize: 11, margin: "0 0 16px" }}>Save up to 3 custom weapon + loadout presets.</p>

            {editingSlot !== null ? (
              /* ── Create/Edit form ── */
              <div>
                <div style={{ fontSize: 11, color: "#FFD700", marginBottom: 12, fontWeight: 900 }}>SLOT {editingSlot + 1} — CONFIGURE</div>
                {/* Name */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4, letterSpacing: 1 }}>LOADOUT NAME (max 20 chars)</div>
                  <input
                    value={editName} maxLength={20}
                    onChange={e => setEditName(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,107,53,0.4)", borderRadius: 6, padding: "8px 10px", color: "#fff", fontFamily: "'Courier New',monospace", fontSize: 13, outline: "none" }}
                    placeholder="e.g. Glass Cannon Speedrun"
                  />
                </div>
                {/* Weapon selector */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 6, letterSpacing: 1 }}>STARTING WEAPON</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {WEAPONS.map((w, i) => (
                      <button key={i} onClick={() => setEditWeaponIdx(i)} style={{
                        padding: "6px 10px", fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6,
                        background: editWeaponIdx === i ? "rgba(255,107,53,0.25)" : "rgba(255,255,255,0.05)",
                        border: editWeaponIdx === i ? "1px solid #FF6B35" : "1px solid rgba(255,255,255,0.1)",
                        color: editWeaponIdx === i ? "#FF6B35" : "#CCC",
                      }}>
                        {w.emoji} {w.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Starter loadout selector */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 6, letterSpacing: 1 }}>STARTER LOADOUT</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {STARTER_LOADOUTS.map(lo => (
                      <button key={lo.id} onClick={() => setEditStarterLoadout(lo.id)} style={{
                        padding: "6px 10px", fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6,
                        background: editStarterLoadout === lo.id ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.05)",
                        border: editStarterLoadout === lo.id ? "1px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
                        color: editStarterLoadout === lo.id ? "#FFD700" : "#CCC",
                      }}>
                        {lo.emoji} {lo.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => {
                    if (!editName.trim()) return;
                    const lo = { name: editName.trim(), weaponIdx: editWeaponIdx, starterLoadout: editStarterLoadout };
                    saveCustomLoadout(editingSlot, lo);
                    setCustomLoadouts(loadCustomLoadouts());
                    setEditingSlot(null);
                  }} style={{ ...btnP, flex: 1, fontSize: 13, padding: "10px 16px" }}>
                    💾 SAVE
                  </button>
                  <button onClick={() => setEditingSlot(null)} style={{ ...btnS, flex: 1, fontSize: 13, padding: "10px 16px" }}>
                    ✕ CANCEL
                  </button>
                </div>
              </div>
            ) : (
              /* ── Slot list + Code I/O ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Loadout Code import/export */}
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.2)" }}>
                  <div style={{ fontSize: 10, color: "#FFD700", letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>LOADOUT CODE SHARE</div>
                  <div style={{ fontSize: 9, color: "#888", marginBottom: 8 }}>Share a 3-char code to export your current weapon + starter selection.</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <input
                      value={loadoutCodeInput}
                      onChange={e => { setLoadoutCodeInput(e.target.value.toUpperCase()); setLoadoutCodeError(""); }}
                      placeholder="e.g. 02B"
                      maxLength={3}
                      style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${loadoutCodeError ? "#FF6666" : "rgba(255,215,0,0.35)"}`, borderRadius: 6, padding: "6px 10px", color: "#fff", fontFamily: "'Courier New',monospace", fontSize: 14, outline: "none", textTransform: "uppercase", letterSpacing: 3 }}
                    />
                    <button onClick={() => {
                      if (!isValidLoadoutCode(loadoutCodeInput)) { setLoadoutCodeError("Invalid code"); return; }
                      const decoded = decodeLoadout(loadoutCodeInput);
                      setEditWeaponIdx(decoded.weaponIdx);
                      setEditStarterLoadout(decoded.starterLoadout);
                      setLoadoutCodeError("");
                      setLoadoutCodeInput("");
                    }} style={{ padding: "6px 12px", fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 6, background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700", whiteSpace: "nowrap" }}>
                      IMPORT
                    </button>
                  </div>
                  {loadoutCodeError && <div style={{ fontSize: 10, color: "#FF6666", marginBottom: 4 }}>{loadoutCodeError}</div>}
                  <div style={{ fontSize: 10, color: "#888" }}>
                    Your current: <span style={{ color: "#FFD700", letterSpacing: 2, fontFamily: "monospace" }}>{encodeLoadout({ weaponIdx: editWeaponIdx, starterLoadout: editStarterLoadout })}</span>
                  </div>
                </div>
                {customLoadouts.map((lo, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: lo ? "1px solid rgba(255,107,53,0.25)" : "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ background: "rgba(255,107,53,0.16)", border: "1px solid rgba(255,107,53,0.35)", borderRadius: 6, padding: "4px 8px", textAlign: "center", flexShrink: 0, minWidth: 32 }}>
                      <div style={{ fontSize: 9, color: "#FF6B35", fontWeight: 700 }}>#{i + 1}</div>
                    </div>
                    {lo ? (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#FF6B35", marginBottom: 2 }}>{lo.name}</div>
                        <div style={{ fontSize: 10, color: "#AAA" }}>
                          {WEAPONS[lo.weaponIdx]?.emoji} {WEAPONS[lo.weaponIdx]?.name}
                          {" · "}
                          {STARTER_LOADOUTS.find(sl => sl.id === lo.starterLoadout)?.emoji} {STARTER_LOADOUTS.find(sl => sl.id === lo.starterLoadout)?.name}
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, fontSize: 12, color: "#555", fontStyle: "italic" }}>Empty slot</div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {lo && (
                        <button onClick={() => {
                          saveCustomLoadout(i, null);
                          setCustomLoadouts(loadCustomLoadouts());
                        }} style={{ padding: "4px 10px", fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 5, background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.3)", color: "#FF6666" }}>
                          DEL
                        </button>
                      )}
                      <button onClick={() => {
                        setEditingSlot(i);
                        setEditName(lo?.name || "");
                        setEditWeaponIdx(lo?.weaponIdx ?? 0);
                        setEditStarterLoadout(lo?.starterLoadout || "standard");
                      }} style={{ padding: "4px 10px", fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", borderRadius: 5, background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.3)", color: "#FF6B35" }}>
                        {lo ? "EDIT" : "CREATE"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Career Stats Modal */}
      {showCareer && career && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 420, width: "100%", position: "relative", border: "1px solid rgba(0,229,255,0.25)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowCareer(false)} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#CCC", fontSize: 20, cursor: "pointer", fontFamily: "monospace" }}>X</button>
            <h3 style={{ color: "#00E5FF", margin: "0 0 8px", fontSize: 18, letterSpacing: 2 }}>📊 CAREER STATS</h3>
            {meta && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "7px 12px", borderRadius: 6, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)" }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <span style={{ color: "#FFD700", fontWeight: 900, fontSize: 14 }}>{meta.careerPoints || 0}</span>
                <span style={{ color: "#CCC", fontSize: 11 }}>career points · spend in 🎖️ UPGRADES</span>
              </div>
            )}
            {career.totalRuns === 0 ? (
              <p style={{ color: "#aaa", fontSize: 12, textAlign: "center", marginTop: 12 }}>No runs yet. Get out there and die!</p>
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
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 460, width: "100%", position: "relative", border: "1px solid rgba(255,215,0,0.3)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FFD700", margin: "0 0 4px", fontSize: 18 }}>📋 DAILY MISSIONS</h3>
            <p style={{ color: "#bbb", fontSize: 11, margin: "0 0 14px" }}>
              {(() => {
                const now = new Date();
                const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
                const msLeft = midnight - now;
                const h = Math.floor(msLeft / 3600000);
                const m = Math.floor((msLeft % 3600000) / 60000);
                return `Resets in ${h}h ${m}m · Complete for career point bonuses`;
              })()}
            </p>
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
                      <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>Reward: +{m.goal} career pts on completion</div>
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
          <div style={{ ...card, maxWidth: 400, width: "100%", border: "1px solid rgba(255,50,50,0.5)", padding: "28px 20px", color: "#fff", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>⭐</div>
            <h2 style={{ color: "#FFD700", margin: "0 0 6px", fontSize: 22, letterSpacing: 2 }}>PRESTIGE {prestige + 1}</h2>
            <div style={{ fontSize: 12, color: "#FF6B35", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>CURRENT LEVEL: {accountLevel}</div>
            <div style={{ fontSize: 12, color: "#FF9999", lineHeight: 1.7, marginBottom: 14, padding: "10px 14px", background: "rgba(255,50,50,0.08)", border: "1px solid rgba(255,50,50,0.2)", borderRadius: 8 }}>
              This will reset all career points and meta upgrades. Your callsign, kills record, and prestige count will be preserved.
            </div>
            <div style={{ fontSize: 13, color: "#CCC", lineHeight: 1.9, marginBottom: 16 }}>
              <div style={{ color: "#FF4444" }}>✗ All meta upgrades reset</div>
              <div style={{ color: "#FF4444" }}>✗ Career points reset to 0</div>
              <div style={{ color: "#00FF88", marginTop: 4 }}>✓ Prestige {prestige + 1} badge earned</div>
              <div style={{ color: "#00FF88" }}>✓ All difficulties +{(prestige + 1) * 10}% harder (more glory)</div>
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 20 }}>Kill records & achievements are preserved forever.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setShowPrestigeConfirm(false)} style={{ ...btnS, padding: "10px 24px", fontSize: 14 }}>CANCEL</button>
              <button onClick={handlePrestige} style={{ ...btnP, padding: "10px 24px", fontSize: 14, background: "linear-gradient(180deg,#FF3333,#AA0000)", color: "#FFF", border: "1px solid rgba(255,50,50,0.6)" }}>
                CONFIRM PRESTIGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meta Upgrades Modal */}
      {showUpgrades && meta && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, backdropFilter: "blur(4px)" }}>
          <div data-gamepad-scroll="" style={{ ...card, maxWidth: 520, width: "100%", position: "relative", border: "1px solid rgba(255,107,53,0.3)", padding: "20px 16px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#FF6B35", margin: "0 0 4px", fontSize: 18 }}>🎖️ META UPGRADES</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ color: "#bbb", fontSize: 11, margin: 0 }}>Permanent bonuses · 3 tiers each · sequential purchase required</p>
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
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
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
                    color: canPrestige ? "#000" : "#aaa", border: "none",
                    fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 900,
                  }}
                >
                  PRESTIGE ★
                </button>
              </div>
            </div>

            {/* Player Skin selector */}
            <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#EEE", marginBottom: 8 }}>🎨 PLAYER SKIN</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PLAYER_SKINS.map(s => {
                  const unlocked = prestige >= s.required;
                  const selected = (meta.playerSkin || "") === s.emoji;
                  return (
                    <button
                      key={s.emoji || "default"}
                      disabled={!unlocked}
                      onClick={() => {
                        if (!unlocked) return;
                        const updated = { ...meta, playerSkin: s.emoji };
                        saveMetaProgress(updated);
                        setMeta(updated);
                      }}
                      title={unlocked ? s.label : `Requires Prestige ${s.required}`}
                      style={{ padding: "8px 14px", borderRadius: 8, cursor: unlocked ? "pointer" : "not-allowed",
                        background: selected ? "rgba(255,215,0,0.15)" : unlocked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                        border: selected ? "2px solid #FFD700" : unlocked ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.06)",
                        color: unlocked ? "#FFF" : "#444", fontFamily: "'Courier New',monospace" }}>
                      <div style={{ fontSize: 20, marginBottom: 3 }}>{s.emoji || "🪖"}</div>
                      <div style={{ fontSize: 9, color: unlocked ? "#AAA" : "#444" }}>
                        {unlocked ? s.label : `P${s.required}`}
                      </div>
                    </button>
                  );
                })}
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
                          : <span style={{ color: "#bbb" }}>{u.tiers[0].desc}</span>
                        }
                      </div>
                      {!isMaxed && ownedTier > 0 && (
                        <div style={{ fontSize: 9, color: "#bbb", marginTop: 1 }}>▲ Next: {u.tiers[nextTier - 1].desc}</div>
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
              <div data-gamepad-scroll="" className="wnscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 16px" }}>
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
                  style={{ ...btnP, width: "100%", fontSize: 14, padding: "12px 20px", background: sharing ? "rgba(255,255,255,0.05)" : "linear-gradient(180deg,#FF6B35,#CC4400)", color: sharing ? "#aaa" : "#FFF" }}
                >
                  {sharing ? "GENERATING..." : "📤 SHARE THIS UPDATE"}
                </button>
                <div style={{ fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 8 }}>Generates a shareable image card · no login required</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Panel */}
      {showSettings && gameSettings && (
        <LazyPanel>
          <SettingsPanel
            settings={gameSettings}
            onSave={s => { onSaveSettings(s); }}
            onClose={() => setShowSettings(false)}
          />
        </LazyPanel>
      )}

      {/* Meta Tree Panel */}
      {showMetaTree && (
        <LazyPanel>
          <MetaTreePanel onClose={() => setShowMetaTree(false)} />
        </LazyPanel>
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

        {/* Controller indicator */}
        {gamepadConnected && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6, fontSize: 10, color: "#AAA" }}>
            <span>🎮</span>
            <span>
              {controllerType === "xbox" && <span style={{ color: "#4DBD61", fontWeight: 700 }}>Xbox Controller</span>}
              {controllerType === "ps" && <span style={{ color: "#6699FF", fontWeight: 700 }}>PlayStation Controller</span>}
              {controllerType !== "xbox" && controllerType !== "ps" && <span style={{ color: "#CCC", fontWeight: 700 }}>Controller</span>}
              {" "}connected · D-pad/stick navigates · A confirm · B back · stick scrolls modals
            </span>
          </div>
        )}

        {/* New Features banner */}
        <div
          onClick={() => setShowNewFeatures(true)}
          style={{ ...card, margin: "6px 0 10px", padding: "9px 14px", cursor: "pointer", border: "1px solid rgba(255,107,53,0.35)", background: "rgba(255,107,53,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 900, letterSpacing: 2 }}>✦ WHAT'S NEW</div>
            <div style={{ fontSize: 10, color: "#AAA", marginTop: 2 }}>{NEW_FEATURES.slice(-4).map(f => f.split(" — ")[0]).join(" · ")}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleShareFeatures(); }}
              disabled={sharing}
              style={{ padding: "4px 9px", borderRadius: 4, cursor: "pointer", background: "rgba(255,107,53,0.18)", border: "1px solid rgba(255,107,53,0.45)", color: "#FF6B35", fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}
            >
              {sharing ? "..." : "📤 SHARE"}
            </button>
            <span style={{ color: "#aaa", fontSize: 13 }}>›</span>
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
              <button key={key} onClick={() => setDifficulty(key)}
                {...(gfocus(`diff_${key}`) ? { "data-gp-focused": "" } : {})}
                style={{
                  padding: "10px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                  fontFamily: "'Courier New',monospace",
                  background: difficulty === key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                  border: difficulty === key ? `2px solid ${d.color}` : "1px solid rgba(255,255,255,0.1)",
                  color: "#FFF", transition: "all 0.15s",
                  ...(gfocus(`diff_${key}`) ? focusRing : {}),
                }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: d.color }}>{d.emoji} {d.label}</div>
                <div style={{ fontSize: 10, color: "#CCC", marginTop: 2 }}>{d.desc}</div>
                <div style={{ fontSize: 9, color: "#bbb", marginTop: 3 }}>
                  HP: {d.playerHP} · Enemy HP: {prestige > 0 ? (d.healthMult * (1 + prestige * 0.1)).toFixed(2) : d.healthMult}x · Speed: {prestige > 0 ? (d.speedMult * (1 + prestige * 0.1)).toFixed(2) : d.speedMult}x
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode */}
        <div style={{ ...card, margin: "0 0 10px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#DDD", marginBottom: 8, letterSpacing: 2, fontWeight: 700 }}>GAME MODE</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            <button
              onClick={() => onSetScoreAttackMode?.(false)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace",
                background: !scoreAttackMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                border: !scoreAttackMode ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FFD700" }}>🎯 NORMAL</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Survive as long as you can</div>
            </button>
            <button
              onClick={() => onSetScoreAttackMode?.(true)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace",
                background: scoreAttackMode ? "rgba(255,100,0,0.15)" : "rgba(255,255,255,0.03)",
                border: scoreAttackMode ? "2px solid #FF6600" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FF6600" }}>⏱ SCORE ATTACK</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>5 min · faster spawns · max score</div>
            </button>
            <button
              onClick={() => onSetDailyChallengeMode?.(true)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace",
                background: dailyChallengeMode ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.03)",
                border: dailyChallengeMode ? "2px solid #00E5FF" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#00E5FF" }}>📅 DAILY</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Same seed · global ranking</div>
              {hasDailyChallengeSubmitted() && <div style={{ fontSize: 8, color: "#00E5FF", marginTop: 1 }}>✓ PLAYED TODAY</div>}
            </button>
            <button
              onClick={() => onSetCursedRunMode?.(!cursedRunMode)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace",
                background: cursedRunMode ? "rgba(180,0,255,0.15)" : "rgba(255,255,255,0.03)",
                border: cursedRunMode ? "2px solid #CC00FF" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#CC00FF" }}>☠ CURSED</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>All cursed perks · 3× score</div>
            </button>
            <button
              onClick={() => onSetBossRushMode?.(!bossRushMode)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace",
                background: bossRushMode ? "rgba(255,50,50,0.15)" : "rgba(255,255,255,0.03)",
                border: bossRushMode ? "2px solid #FF3333" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FF3333" }}>☠ BOSS RUSH</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Every wave is a boss · chaos</div>
            </button>
            <button
              onClick={() => onSetSpeedrunMode?.(!speedrunMode)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace",
                background: speedrunMode ? "rgba(0,255,128,0.12)" : "rgba(255,255,255,0.03)",
                border: speedrunMode ? "2px solid #00FF80" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#00FF80" }}>⏱ SPEEDRUN</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Race the clock · live timer</div>
            </button>
            <button
              onClick={() => { const _g = getWeeklyGauntlet(); onSetGauntletMode?.(!gauntletMode); }}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace",
                background: gauntletMode ? "rgba(255,200,0,0.12)" : "rgba(255,255,255,0.03)",
                border: gauntletMode ? "2px solid #FFC800" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FFC800" }}>🏆 GAUNTLET</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Weekly fixed challenge · no shop</div>
            </button>
          </div>
        </div>

        {/* Weekly Mutation banner */}
        {(() => {
          const mut = getWeeklyMutation();
          if (!mut) return null;
          return (
            <div style={{ ...card, margin: "0 0 10px", background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.25)", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#FFB300", letterSpacing: 2, fontWeight: 900, marginBottom: 4 }}>⚡ THIS WEEK'S MUTATION</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FFF" }}>{mut.emoji} {mut.name}</div>
              <div style={{ fontSize: 10, color: "#CCC", marginTop: 3 }}>{mut.desc}</div>
            </div>
          );
        })()}

        {/* Starter Loadout */}
        <div style={{ ...card, margin: "0 0 10px", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#DDD", marginBottom: 8, letterSpacing: 2, textAlign: "center", fontWeight: 700 }}>STARTER LOADOUT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {STARTER_LOADOUTS.map((l) => (
              <button key={l.id} onClick={() => setStarterLoadout?.(l.id)}
                {...(gfocus(`lo_${l.id}`) ? { "data-gp-focused": "" } : {})}
                style={{
                  padding: "9px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                  fontFamily: "'Courier New',monospace",
                  background: starterLoadout === l.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                  border: starterLoadout === l.id ? `2px solid ${l.color}` : "1px solid rgba(255,255,255,0.1)",
                  color: "#FFF", transition: "all 0.15s",
                  ...(gfocus(`lo_${l.id}`) ? focusRing : {}),
                }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: l.color }}>{l.emoji} {l.name}</div>
                <div style={{ fontSize: 10, color: "#CCC", marginTop: 2 }}>{l.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Challenge link banner */}
        {challengeMode && (
          <div style={{ marginBottom: 8, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,107,53,0.5)", background: "rgba(255,107,53,0.08)", textAlign: "center" }}>
            <div style={{ color: "#FF6B35", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>⚔️ CHALLENGE LINK DETECTED</div>
            <div style={{ color: "#CCC", fontSize: 10, marginTop: 3 }}>
              Seed #{challengeMode.seed}{challengeMode.diff ? ` · ${challengeMode.diff.toUpperCase()}` : ""}
            </div>
            {challengeMode.vs && (
              <div style={{ color: "#FFD700", fontSize: 12, fontWeight: 900, marginTop: 4 }}>
                🎯 BEAT {challengeMode.vsName ? `@${challengeMode.vsName}` : "their score"}: {challengeMode.vs.toLocaleString()} pts
              </div>
            )}
            <button onClick={() => { setCustomSeed(""); setChallengeMode(null); setDifficulty("normal"); }} style={{ marginTop: 6, padding: "2px 10px", fontSize: 9, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#888", cursor: "pointer", fontFamily: "'Courier New',monospace" }}>✕ dismiss</button>
          </div>
        )}

        {/* Daily Challenge Hero Panel */}
        {(() => {
          const todaySeed = getDailyChallengeSeed();
          const todaySeedStr = String(todaySeed);
          const alreadyPlayed = hasDailyChallengeSubmitted();
          const topEntry = (leaderboard || [])
            .filter(e => e.mode === "daily_challenge" && e.seed === todaySeedStr)
            .sort((a, b) => b.score - a.score)[0] || null;
          const today = new Date();
          const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
          return (
            <div style={{ ...card, margin: "0 0 10px", background: "rgba(0,229,255,0.05)", border: `1px solid ${alreadyPlayed ? "rgba(0,229,255,0.2)" : "rgba(0,229,255,0.45)"}`, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#00E5FF", letterSpacing: 2, fontWeight: 900, marginBottom: 8 }}>
                📅 TODAY'S DAILY CHALLENGE · {dateStr}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#666", letterSpacing: 1 }}>SEED</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#00E5FF", letterSpacing: 2 }}>#{todaySeed}</div>
                </div>
                {topEntry && (
                  <div>
                    <div style={{ fontSize: 9, color: "#666", letterSpacing: 1 }}>TODAY'S BEST</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#FFD700" }}>{topEntry.score.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: "#aaa" }}>by {topEntry.name}</div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {alreadyPlayed && (
                    <div style={{ fontSize: 9, color: "#00E5FF", fontWeight: 700, letterSpacing: 1 }}>✓ PLAYED TODAY</div>
                  )}
                  <button
                    aria-label={alreadyPlayed ? "Play today's daily challenge again" : "Play today's daily challenge"}
                    onClick={() => { onSetDailyChallengeMode?.(true); onStart(todaySeedStr, {}); }}
                    style={{ padding: "8px 22px", fontSize: 13, fontWeight: 900, fontFamily: "'Courier New',monospace", background: "rgba(0,229,255,0.15)", color: "#00E5FF", border: "2px solid #00E5FF", borderRadius: 6, cursor: "pointer", letterSpacing: 1 }}
                  >
                    {alreadyPlayed ? "🔄 PLAY AGAIN" : "▶ PLAY TODAY"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ ...card, margin: "0 0 10px", textAlign: "left", border: "1px solid rgba(255,107,53,0.2)", background: "linear-gradient(180deg,rgba(255,107,53,0.08),rgba(255,255,255,0.04))" }}>
          <div style={{ fontSize: 9, color: "#FFB36B", letterSpacing: 2, fontWeight: 900, marginBottom: 8, textAlign: "center" }}>
            COMMAND BRIEF · {currentModeLabel.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: "#FFD7B8", marginBottom: 8, textAlign: "center" }}>
            Loadout locked: <span style={{ color: "#FFF", fontWeight: 700 }}>{selectedLoadout.emoji} {selectedLoadout.name}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {commandBrief.map((line, index) => (
              <div key={`brief-${index}`} style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>
                {index + 1}. {line}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, margin: "0 0 10px", textAlign: "left", border: "1px solid rgba(0,229,255,0.18)", background: "linear-gradient(180deg,rgba(0,229,255,0.07),rgba(255,255,255,0.035))" }}>
          <div style={{ fontSize: 9, color: "#00E5FF", letterSpacing: 2, fontWeight: 900, marginBottom: 6, textAlign: "center" }}>
            RUN INTEL · {runIntel.focus.replace(/_/g, " ").toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: "#EAFBFF", lineHeight: 1.45, textAlign: "center" }}>
            {runIntel.directive}
          </div>
          <div style={{ fontSize: 10, color: "#8FEFFF", lineHeight: 1.45, textAlign: "center", marginTop: 5 }}>
            {runIntel.recommendation}
          </div>
        </div>

        <div style={{ ...card, margin: "0 0 10px", border: `1px solid ${recommendedAction.accent}44`, background: `linear-gradient(180deg,${recommendedAction.accent}16,rgba(255,255,255,0.04))`, textAlign: "left" }}>
          <div style={{ fontSize: 9, color: recommendedAction.accent, letterSpacing: 2, fontWeight: 900, marginBottom: 8, textAlign: "center" }}>
            RECOMMENDED NEXT ACTION
          </div>
          <div style={{ fontSize: 18, color: "#FFF", fontWeight: 900, textAlign: "center", marginBottom: 6 }}>
            {recommendedAction?.title}
          </div>
          <div style={{ fontSize: 11, color: "#DDD", lineHeight: 1.5, textAlign: "center", marginBottom: 12 }}>
            {recommendedAction?.detail}
          </div>
          {recommendedAction?.whyNow && (
            <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 9, color: "#AAA", letterSpacing: 1, marginBottom: 4 }}>WHY THIS NOW</div>
              <div style={{ fontSize: 11, color: "#DDD", lineHeight: 1.45 }}>{recommendedAction.whyNow}</div>
              <div style={{ fontSize: 10, color: recommendedAction.accent, marginTop: 5 }}>{recommendedAction.urgency}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              aria-label={recommendedAction?.title || "Recommended action"}
              onClick={() => runFrontDoorAction(recommendedAction?.id)}
              {...(gfocus("deploy") ? { "data-gp-focused": "" } : {})}
              style={{ ...btnP, minWidth: 220, ...(gfocus("deploy") ? focusRing : {}) }}
            >
              {recommendedAction?.cta || "▶ DEPLOY"}
            </button>
            <button
              aria-label="View leaderboard"
              onClick={() => { onRefreshLeaderboard(); setShowLeaderboard(true); }}
              {...(gfocus("leaderboard") ? { "data-gp-focused": "" } : {})}
              style={{ ...btnS, minWidth: 170, ...(gfocus("leaderboard") ? focusRing : {}) }}
            >
              ⚔️ LEADERBOARD
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
            {actionStack.slice(1).map((action) => (
              <button
                key={action.id}
                onClick={() => runFrontDoorAction(action.id)}
                style={{
                  ...btnS,
                  minWidth: 170,
                  borderColor: action.id === "challenge_friend"
                    ? (copiedChallengeLink ? "rgba(0,255,136,0.45)" : `${action.accent}55`)
                    : `${action.accent}55`,
                  color: action.id === "challenge_friend"
                    ? (copiedChallengeLink ? "#00FF88" : action.accent)
                    : action.accent,
                }}
              >
                {action.id === "challenge_friend" && copiedChallengeLink ? "✓ LINK COPIED" : action.cta}
              </button>
            ))}
            <button
              onClick={() => setShowCommandCenter(v => !v)}
              style={{ ...btnS, minWidth: 170 }}
            >
              {showCommandCenter ? "▲ HIDE SYSTEMS" : "▼ OPEN COMMAND CENTER"}
            </button>
          </div>
        </div>

        {/* Seed + Settings row */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <input
            aria-label="Custom seed number (0–999998)"
            value={customSeed} onChange={e => setCustomSeed(e.target.value.replace(/\D/g, ""))}
            placeholder="Seed # (optional)"
            maxLength={6}
            style={{ width: 120, padding: "6px 10px", fontSize: 11, fontFamily: "monospace", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, color: "#EEE", outline: "none", textAlign: "center" }}
          />
          <button onClick={() => setShowSettings(true)} {...(gfocus("settings") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, padding: "6px 14px", fontSize: 11, ...(gfocus("settings") ? focusRing : {}) }}>⚙ SETTINGS</button>
        </div>
        {showCommandCenter && (
          <>
            <div style={{ ...card, margin: "0 0 10px", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 9, color: "#AAA", letterSpacing: 2, fontWeight: 900, marginBottom: 8, textAlign: "center" }}>
                COMMAND CENTER
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <button onClick={() => { setCareer(loadCareerStats()); setMeta(loadMetaProgress()); setShowCareer(true); }} {...(gfocus("career") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, minWidth: 150, ...(gfocus("career") ? focusRing : {}) }}>📊 CAREER STATS</button>
                <button onClick={() => { setCareer(loadCareerStats()); setShowAchievements(true); }} {...(gfocus("achievements") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, minWidth: 150, ...(gfocus("achievements") ? focusRing : {}) }}>🏅 ACHIEVEMENTS</button>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <button onClick={() => { setMissions(getDailyMissions()); setMissionProgress(loadMissionProgress()); setShowMissions(true); }} {...(gfocus("missions") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, minWidth: 150, ...(gfocus("missions") ? focusRing : {}) }}>📋 MISSIONS</button>
                <button onClick={() => { setMeta(loadMetaProgress()); setShowUpgrades(true); }} {...(gfocus("upgrades") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, minWidth: 150, ...(gfocus("upgrades") ? focusRing : {}) }}>🎖️ UPGRADES</button>
                <button onClick={() => setShowRunHistory(true)} style={{ ...btnS, minWidth: 150 }}>📜 HISTORY</button>
                <button onClick={() => setShowLoadoutBuilder(true)} style={{ ...btnS, minWidth: 150 }}>⚙️ LOADOUTS</button>
                <button onClick={() => setShowMetaTree(true)} style={{ ...btnS, minWidth: 150 }}>🌳 META TREE</button>
                {assistAvailable && (
                  <button onClick={onApplyAssist} style={{ ...btnS, minWidth: 150, borderColor: "#44FF88", color: "#44FF88" }}>🛡️ ASSIST +50HP</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 4 }}>
                <button onClick={() => setShowRules(true)} {...(gfocus("rules") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, minWidth: 150, ...(gfocus("rules") ? focusRing : {}) }}>📜 RULES</button>
                <button onClick={() => setShowControls(true)} {...(gfocus("controls") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, minWidth: 150, ...(gfocus("controls") ? focusRing : {}) }}>⌨ CONTROLS</button>
                <button onClick={() => setShowBestiary(true)} {...(gfocus("bestiary") ? { "data-gp-focused": "" } : {})} style={{ ...btnS, minWidth: 150, ...(gfocus("bestiary") ? focusRing : {}) }}>👾 MOST WANTED</button>
              </div>
            </div>
          </>
        )}

        <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>
          ✨ Perks on level-up · 🔧 Weapon upgrades · ⚠️ Boss waves every 5 waves
        </div>

        {/* Community footer */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#777", letterSpacing: 1 }}>
            A{" "}
            <a href="https://vaultsparkstudios.com/" rel="author" target="_blank"
              style={{ color: "#999", textDecoration: "none" }}>
              VaultSpark Studios
            </a>
            {" "}Game
          </span>
          {/* Add your Discord invite link here when ready */}
          {/* <a href="https://discord.gg/YOUR_INVITE" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: "#7289DA", textDecoration: "none", letterSpacing: 1, fontWeight: 700 }}>
            💬 JOIN DISCORD
          </a> */}
          {onlinePlayers !== null && (
            <span style={{ fontSize: 10, color: "#0F0", letterSpacing: 1 }}>
              ● {onlinePlayers} ONLINE
            </span>
          )}
          <button
            onClick={() => setShowSupporter(true)}
            aria-label="Support the developer"
            style={{ background: "none", border: "none", color: isSupporter() ? "#FFD700" : "#888", fontSize: 10, cursor: "pointer", padding: "2px 6px", letterSpacing: 1, fontFamily: "'Courier New',monospace", textDecoration: "underline dotted" }}
          >
            {isSupporter() ? "⭐ SUPPORTER" : "❤️ SUPPORT THE DEV"}
          </button>
          <span style={{ fontSize: 10, color: "#555" }}>© 2026 VaultSpark Studios</span>
        </div>
      </div>
      </div>
      {showSupporter && (
        <LazyPanel>
          <SupporterModal onClose={() => setShowSupporter(false)} />
        </LazyPanel>
      )}
    </div>
  );
}
