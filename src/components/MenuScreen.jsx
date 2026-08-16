import { useState, useEffect, useCallback, useRef, lazy } from "react";
import AsyncPanelBoundary from "./AsyncPanelBoundary.jsx";
import SiteFooter from "./SiteFooter.jsx";
import { WEAPONS, DIFFICULTIES, ACHIEVEMENTS, STARTER_LOADOUTS, NEW_FEATURES, getWeeklyMutation, getWeeklyGauntlet } from "../constants.js";
import { loadCareerStats, getDailyMissions, loadMissionProgress, loadMetaProgress, prestigeAccount, getAccountLevel, getDailyChallengeSeed, hasDailyChallengeSubmitted, loadRunHistory, requestStudioEventSync, loadRivalryHistory, saveStudioGameEvent, countIncompleteMissions } from "../storage.js";
import { getSupabaseClient } from "../supabase.js";
import { buildCommandBrief, buildFrontDoorActionStack } from "../utils/menuGuidance.js";
import { buildMenuIntelligence, buildStudioGameEvent } from "../utils/runIntelligence.js";
import { track } from "../utils/analytics.js";
import { useGamepadNav } from "../hooks/useGamepadNav.js";
import { isSupporter } from "../utils/supporter.js";
import { CANONICAL_SITE_URL } from "../config/site.js";
import { getMode, resolveSelectedModeId } from "../config/modeCatalog.js";
import {
  ControlsPanel,
  LoadoutBuilderPanel,
  MissionsPanel,
  MostWantedPanel,
  NewFeaturesPanel,
  RulesPanel,
  RunHistoryPanel,
  UpgradesPanel,
} from "./MenuPanels.jsx";

const LeaderboardPanel = lazy(() => import("./LeaderboardPanel.jsx"));
const AchievementsPanel = lazy(() => import("./AchievementsPanel.jsx"));
const SettingsPanel = lazy(() => import("./SettingsPanel.jsx"));
const MetaTreePanel = lazy(() => import("./MetaTreePanel.jsx"));
const SupporterModal = lazy(() => import("./SupporterModal.jsx"));

function LazyPanel({ children }) {
  return <AsyncPanelBoundary>{children}</AsyncPanelBoundary>;
}

// (S155: tier/skin lookup tables removed with the dead modal JSX that
// consumed them — the live implementations render via MenuPanels.jsx.)

function canUseRealtimePresence() {
  if (typeof window === "undefined") return false;

  const { protocol, hostname } = window.location;
  if (protocol === "https:") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  return false;
}

export default function MenuScreen({ username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, lbHasMore, onLoadMore, onStart, onRefreshLeaderboard, onChangeUsername, starterLoadout, setStarterLoadout, gameSettings, onSaveSettings, gamepadConnected, controllerType, scoreAttackMode, onSetScoreAttackMode, dailyChallengeMode, onSetDailyChallengeMode, cursedRunMode, onSetCursedRunMode, bossRushMode, onSetBossRushMode, speedrunMode, onSetSpeedrunMode, gauntletMode, onSetGauntletMode, zombiesMode, onSetZombiesMode, assistAvailable, onApplyAssist }) {
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
  const [runHistory, setRunHistory] = useState(() => loadRunHistory());
  const [rivalryHistory, setRivalryHistory] = useState(() => loadRivalryHistory());
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
    if (!canUseRealtimePresence()) {
      setOnlinePlayers(null);
      return;
    }

    let channel = null;
    let supabase = null;
    let disposed = false;

    void getSupabaseClient().then((client) => {
      if (!client || disposed) return;
      supabase = client;
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
    });

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
    requestStudioEventSync({ limit: 25 }).catch(() => {});
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
  const weeklyMutation = getWeeklyMutation();
  const selectedLoadout = STARTER_LOADOUTS.find(loadout => loadout.id === starterLoadout) || STARTER_LOADOUTS[0];
  // S155: shared mode catalog fixes the legacy omission where Zombies mode
  // read as "Standard" on this screen.
  const _selectedModeId = resolveSelectedModeId({ scoreAttackMode, dailyChallengeMode, cursedRunMode, bossRushMode, speedrunMode, gauntletMode, zombiesMode });
  const currentModeLabel = getMode(_selectedModeId).label;
  const deployArgs = {
    seed: dailyChallengeMode ? String(getDailyChallengeSeed()) : (customSeed || undefined),
    challenge: challengeMode?.vs ? { vs: challengeMode.vs, vsName: challengeMode.vsName } : {},
  };
  const todaySeedStr = String(getDailyChallengeSeed());
  const dailyAlreadyPlayed = hasDailyChallengeSubmitted();
  const modeId = _selectedModeId;
  const commandBrief = buildCommandBrief({
    mode: modeId,
    selectedLoadout,
    weeklyMutation,
  });
  const incompleteMissionCount = countIncompleteMissions(missions, missionProgress);
  const canSpendMeta = (meta?.careerPoints || 0) >= 10;
  const actionStack = buildFrontDoorActionStack({
    challenge: challengeMode?.vs ? { seed: challengeMode.seed, vsScore: challengeMode.vs, vsName: challengeMode.vsName } : null,
    dailyAlreadyPlayed,
    canSpendMeta,
    incompleteMissionCount,
    selectedLoadout,
    currentModeLabel,
    todaySeed: todaySeedStr,
    totalRuns: career?.totalRuns || 0,
    unlocked: meta?.unlocked || [],
    meta,
    career: career || {},
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
      surface: "menu_v1",
      actionId: actionId || "play_now",
      mode: modeId,
      difficulty,
      loadout: selectedLoadout.id,
      challengeActive: Boolean(challengeMode?.vs),
      dailyAlreadyPlayed,
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
  }, [challengeMode?.vs, dailyAlreadyPlayed, deployArgs.challenge, deployArgs.seed, difficulty, handleCopyChallengeLink, modeId, onSetDailyChallengeMode, onStart, runIntel.focus, runIntel.telemetry, selectedLoadout.id, todaySeedStr]);

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
      const shareUrl = CANONICAL_SITE_URL;
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
      {showRules && (
        <LazyPanel>
          <RulesPanel onClose={() => setShowRules(false)} />
        </LazyPanel>
      )}
      {showControls && (
        <LazyPanel>
          <ControlsPanel onClose={() => setShowControls(false)} isMobile={isMobile} controllerType={controllerType} />
        </LazyPanel>
      )}
      {showBestiary && (
        <LazyPanel>
          <MostWantedPanel onClose={() => setShowBestiary(false)} />
        </LazyPanel>
      )}
      {showRunHistory && (
        <LazyPanel>
          <RunHistoryPanel
            onClose={() => setShowRunHistory(false)}
            runHistory={runHistory}
            rivalryHistory={rivalryHistory}
            username={username}
            onLaunchSeed={(seed, challenge = {}) => onStart(seed, challenge)}
          />
        </LazyPanel>
      )}
      {showLoadoutBuilder && (
        <LazyPanel>
          <LoadoutBuilderPanel onClose={() => setShowLoadoutBuilder(false)} />
        </LazyPanel>
      )}
      {showMissions && (
        <LazyPanel>
          <MissionsPanel missions={missions} missionProgress={missionProgress} onClose={() => setShowMissions(false)} />
        </LazyPanel>
      )}
      {showUpgrades && meta && (
        <LazyPanel>
          <UpgradesPanel meta={meta} accountLevel={accountLevel} onClose={() => setShowUpgrades(false)} />
        </LazyPanel>
      )}
      {showNewFeatures && (
        <LazyPanel>
          <NewFeaturesPanel onClose={() => setShowNewFeatures(false)} />
        </LazyPanel>
      )}

      {/* Rules Modal */}

      {/* Controls Modal */}

      {/* Most Wanted List Modal */}

      {/* Run History Modal */}

      {/* Custom Loadout Builder Modal */}

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

      {/* New Features Modal */}

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }}>
            <button
              onClick={() => onSetScoreAttackMode?.(false)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: !scoreAttackMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                border: !scoreAttackMode ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FFD700" }}>🎯 NORMAL</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Survive as long as you can</div>
            </button>
            <button
              onClick={() => onSetScoreAttackMode?.(true)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: scoreAttackMode ? "rgba(255,100,0,0.15)" : "rgba(255,255,255,0.03)",
                border: scoreAttackMode ? "2px solid #FF6600" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FF6600" }}>⏱ SCORE ATTACK</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>5 min · faster spawns · max score</div>
            </button>
            <button
              onClick={() => onSetDailyChallengeMode?.(true)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: dailyChallengeMode ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.03)",
                border: dailyChallengeMode ? "2px solid #00E5FF" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#00E5FF" }}>📅 DAILY</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Same seed · global ranking</div>
              {hasDailyChallengeSubmitted() && <div style={{ fontSize: 8, color: "#00E5FF", marginTop: 1 }}>✓ PLAYED TODAY</div>}
            </button>
            <button
              onClick={() => onSetCursedRunMode?.(!cursedRunMode)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: cursedRunMode ? "rgba(180,0,255,0.15)" : "rgba(255,255,255,0.03)",
                border: cursedRunMode ? "2px solid #CC00FF" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#CC00FF" }}>☠ CURSED</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>All cursed perks · 3× score</div>
            </button>
            <button
              onClick={() => onSetBossRushMode?.(!bossRushMode)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: bossRushMode ? "rgba(255,50,50,0.15)" : "rgba(255,255,255,0.03)",
                border: bossRushMode ? "2px solid #FF3333" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FF3333" }}>☠ BOSS RUSH</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Every wave is a boss · chaos</div>
            </button>
            <button
              onClick={() => onSetSpeedrunMode?.(!speedrunMode)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: speedrunMode ? "rgba(0,255,128,0.12)" : "rgba(255,255,255,0.03)",
                border: speedrunMode ? "2px solid #00FF80" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#00FF80" }}>⏱ SPEEDRUN</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Race the clock · live timer</div>
            </button>
            <button
              onClick={() => { const _g = getWeeklyGauntlet(); onSetGauntletMode?.(!gauntletMode); }}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: gauntletMode ? "rgba(255,200,0,0.12)" : "rgba(255,255,255,0.03)",
                border: gauntletMode ? "2px solid #FFC800" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FFC800" }}>🏆 GAUNTLET</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Weekly fixed opening kit · no shop</div>
            </button>
            <button
              onClick={() => onSetZombiesMode?.(!zombiesMode)}
              style={{ padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "'Courier New',monospace", textAlign: "left",
                background: zombiesMode ? "rgba(141,255,103,0.12)" : "rgba(255,255,255,0.03)",
                border: zombiesMode ? "2px solid #8DFF67" : "1px solid rgba(255,255,255,0.1)", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#8DFF67" }}>🧟 ZOMBIES</div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>Escalating undead hordes · surge every 3rd wave</div>
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

        <SiteFooter
          onSupporterClick={() => setShowSupporter(true)}
          isSupporterActive={isSupporter(username)}
          onlinePlayers={onlinePlayers}
          style={{ fontFamily: "'Courier New',monospace" }}
        />
      </div>
      </div>
      {showSupporter && (
        <LazyPanel>
          <SupporterModal callsign={username} onClose={() => setShowSupporter(false)} />
        </LazyPanel>
      )}
    </div>
  );
}
