import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useGamepadNav } from "../hooks/useGamepadNav.js";
import { WEAPONS, ENEMY_TYPES, DIFFICULTIES, STARTER_LOADOUTS, NEW_FEATURES, getWeeklyMutation, getWeeklyGauntlet } from "../constants.js";
import {
  loadCareerStats, getDailyMissions, loadMissionProgress, loadMetaProgress,
  getAccountLevel, getDailyChallengeSeed, hasDailyChallengeSubmitted, requestStudioEventSync, saveStudioGameEvent,
  loadRunHistory, loadRivalryHistory, loadStudioGameEvents, getDailyChampion, getMissionStreak,
  countIncompleteMissions,
} from "../storage.js";
import { buildCommandBrief, buildFrontDoorActionStack } from "../utils/menuGuidance.js";
import { buildMenuIntelligence, buildStudioGameEvent } from "../utils/runIntelligence.js";
import { getAnalyticsStatus, track } from "../utils/analytics.js";
import { summarizeStudioEvents } from "../utils/studioEventOps.js";
import { isSupporter } from "../utils/supporter.js";
import { encodeReplayCode, decodeReplayCode, isValidReplayCode } from "../utils/replayCode.js";
import { getDifficultyBriefing, getMutationDifficultyBrief, suggestDifficulty } from "../utils/runBrain.js";
import { loadControllerProfile } from "../utils/gamepad.js";
import { buildInputCalibrationNudge, buildInputCalibrationRecord, buildInputQaReceipt, loadInputCalibration, saveInputCalibration } from "../utils/inputCalibration.js";
import { pointerAimBucket } from "../systems/gameStep.js";
import { buildPwaInstallReceipt, detectServiceWorkerReady, detectStandaloneDisplay, loadPwaInstallAttempt } from "../utils/pwaInstallReadiness.js";
import { SIGNATURE_VISUAL_ASSETS } from "../utils/visualAssetLibrary.js";
import { buildPlayerJourney } from "../utils/playerJourney.js";
import { buildLocalBalanceLab } from "../utils/balanceLab.js";

const DemoCanvas = lazy(() => import("./DemoCanvas.jsx"));
const LeaderboardPanel = lazy(() => import("./LeaderboardPanel.jsx"));
const AchievementsPanel = lazy(() => import("./AchievementsPanel.jsx"));
const SettingsPanel = lazy(() => import("./SettingsPanel.jsx"));
const MetaTreePanel = lazy(() => import("./MetaTreePanel.jsx"));
const SupporterModal = lazy(() => import("./SupporterModal.jsx"));
const MP_Rules          = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.RulesPanel })));
const MP_Controls       = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.ControlsPanel })));
const MP_MostWanted     = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.MostWantedPanel })));
const MP_RunHistory     = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.RunHistoryPanel })));
const MP_LoadoutBuilder = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.LoadoutBuilderPanel })));
const MP_CareerStats    = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.CareerStatsPanel })));
const MP_Missions       = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.MissionsPanel })));
const MP_Upgrades       = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.UpgradesPanel })));
const MP_NewFeatures    = lazy(() => import("./MenuPanels.jsx").then(m => ({ default: m.NewFeaturesPanel })));

const PANEL = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "max(12px, env(safe-area-inset-top)) 12px max(18px, env(safe-area-inset-bottom))", overflowY: "auto", WebkitOverflowScrolling: "touch", backdropFilter: "blur(4px)" };

const MODE_DEFS = [
  { id: "standard",        label: "NORMAL",        emoji: "🎯", color: "#FFD700", blurb: "Survive as long as you can" },
  { id: "score_attack",    label: "SCORE ATTACK",  emoji: "⏱",  color: "#FF6600", blurb: "5 min · faster spawns · max score" },
  { id: "daily_challenge", label: "DAILY",         emoji: "📅", color: "#00E5FF", blurb: "Same seed · global ranking" },
  { id: "cursed",          label: "CURSED",        emoji: "☠",  color: "#CC00FF", blurb: "All cursed perks · 3× score" },
  { id: "boss_rush",       label: "BOSS RUSH",     emoji: "☠",  color: "#FF3333", blurb: "Every wave is a boss" },
  { id: "speedrun",        label: "SPEEDRUN",      emoji: "⏱",  color: "#00FF80", blurb: "Race the clock · live timer" },
  { id: "gauntlet",        label: "GAUNTLET",      emoji: "🏆", color: "#FFC800", blurb: "Weekly fixed challenge · no shop" },
];

function currentModeId({ scoreAttackMode, dailyChallengeMode, cursedRunMode, bossRushMode, speedrunMode, gauntletMode }) {
  if (bossRushMode) return "boss_rush";
  if (cursedRunMode) return "cursed";
  if (scoreAttackMode) return "score_attack";
  if (dailyChallengeMode) return "daily_challenge";
  if (speedrunMode) return "speedrun";
  if (gauntletMode) return "gauntlet";
  return "standard";
}

export default function HomeV2(props) {
  const {
    username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, lbHasMore, onLoadMore,
    onStart, onRefreshLeaderboard, onChangeUsername,
    starterLoadout, setStarterLoadout,
    gameSettings, onSaveSettings,
    gamepadConnected, controllerType,
    scoreAttackMode, onSetScoreAttackMode,
    dailyChallengeMode, onSetDailyChallengeMode,
    cursedRunMode, onSetCursedRunMode,
    bossRushMode, onSetBossRushMode,
    speedrunMode, onSetSpeedrunMode,
    gauntletMode, onSetGauntletMode,
    assistAvailable, onApplyAssist,
    onInstallApp,
    pwaInstallPromptReady = false,
  } = props;

  const modeId = currentModeId({ scoreAttackMode, dailyChallengeMode, cursedRunMode, bossRushMode, speedrunMode, gauntletMode });
  const selectedMode = MODE_DEFS.find(m => m.id === modeId) || MODE_DEFS[0];
  const selectedLoadout = STARTER_LOADOUTS.find(l => l.id === starterLoadout) || STARTER_LOADOUTS[0];
  const selectedDiff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;

  const [career, setCareer] = useState(null);
  const [meta, setMeta] = useState(null);
  const [missions, setMissions] = useState([]);
  const [missionProgress, setMissionProgress] = useState({});
  const [runHistory, setRunHistory] = useState([]);
  const [rivalryHistory, setRivalryHistory] = useState([]);
  const [studioEvents, setStudioEvents] = useState([]);
  const [customSeed, setCustomSeed] = useState("");
  const [challengeMode, setChallengeMode] = useState(null);
  const [tab, setTab] = useState("career");
  const [deployOpen, setDeployOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMetaTree, setShowMetaTree] = useState(false);
  const [showSupporter, setShowSupporter] = useState(false);
  const [showAimCheck, setShowAimCheck] = useState(false);
  const [tickerDismissed, setTickerDismissed] = useState(() => sessionStorage.getItem("cod-ticker-dismissed") === "1");
  const [mutationDismissed, setMutationDismissed] = useState(() => sessionStorage.getItem("cod-mutation-dismissed") === "1");
  const [insightDismissed, setInsightDismissed] = useState(() => sessionStorage.getItem("cod-insight-dismissed") === "1");
  const [showCareerStats, setShowCareerStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showMostWanted, setShowMostWanted] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [showLoadoutBuilder, setShowLoadoutBuilder] = useState(false);
  const [showNewFeatures, setShowNewFeatures] = useState(false);
  const [cmdCenterExpanded, setCmdCenterExpanded] = useState(false);
  const [dailyChampion, setDailyChampion] = useState(null);
  const [missionStreak, setMissionStreak] = useState(0);
  const [replayInput, setReplayInput] = useState("");
  const [replayCopied, setReplayCopied] = useState(false);
  const [inputDebugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "input"
      || localStorage.getItem("cod-debug-input") === "1";
  });
  const [opsDebugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "ops"
      || localStorage.getItem("cod-debug-ops") === "1";
  });
  const [inputCalibration, setInputCalibration] = useState(() => loadInputCalibration());
  const [controllerProfile] = useState(() => loadControllerProfile());
  const [pwaInstallAttempt] = useState(() => loadPwaInstallAttempt());
  const effectiveControllerType = gamepadConnected ? controllerType : (controllerProfile?.type || controllerType);

  useEffect(() => {
    const loaded = loadCareerStats();
    setCareer(loaded);
    setMissions(getDailyMissions());
    setMissionProgress(loadMissionProgress());
    setMeta(loadMetaProgress());
    setRunHistory(loadRunHistory());
    setRivalryHistory(loadRivalryHistory());
    setStudioEvents(loadStudioGameEvents());
    setMissionStreak(getMissionStreak().streak || 0);
    track("home_v2_view");
    const params = new URLSearchParams(window.location.search);
    const urlReplay = params.get("replay");
    if (urlReplay && isValidReplayCode(urlReplay)) {
      const r = decodeReplayCode(urlReplay);
      if (r) {
        setCustomSeed(String(r.seed));
        setDifficulty(r.difficulty);
        setStarterLoadout?.(r.starterLoadout);
        selectMode(r.mode);
        setDeployOpen(true);
      }
    } else {
      const urlSeed = params.get("seed");
      if (urlSeed && !isNaN(parseInt(urlSeed))) {
        setCustomSeed(urlSeed);
        const urlDiff = params.get("diff");
        if (urlDiff && Object.keys(DIFFICULTIES).includes(urlDiff)) setDifficulty(urlDiff);
        setChallengeMode({
          seed: urlSeed, diff: urlDiff || null,
          vs: params.get("vs") ? parseInt(params.get("vs")) : null,
          vsName: params.get("vsName") || null,
        });
      }
    }
    requestStudioEventSync({ limit: 25 }).catch(() => {});
    getDailyChampion().then(c => { if (c) setDailyChampion(c); }).catch(() => {});
    // Replay/challenge URL bootstrap is intentionally one-shot on first menu mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDifficulty]);

  const accountLevel = career ? getAccountLevel(career.totalKills) : 1;
  const prestige = meta?.prestige || 0;
  const todaySeedStr = String(getDailyChallengeSeed());
  const dailyAlreadyPlayed = hasDailyChallengeSubmitted();
  const weeklyMutation = getWeeklyMutation();

  const commandBrief = useMemo(
    () => buildCommandBrief({ mode: modeId, selectedLoadout, weeklyMutation }),
    [modeId, selectedLoadout, weeklyMutation],
  );
  const runIntel = useMemo(
    () => buildMenuIntelligence({
      mode: modeId, selectedLoadout, missions, missionProgress, meta, career,
      challenge: challengeMode?.vs ? { seed: challengeMode.seed, vsScore: challengeMode.vs, vsName: challengeMode.vsName } : null,
      dailyAlreadyPlayed, todaySeed: todaySeedStr, runHistory, rivalryHistory,
    }),
    [modeId, selectedLoadout, missions, missionProgress, meta, career, challengeMode, dailyAlreadyPlayed, todaySeedStr, runHistory, rivalryHistory],
  );
  const canSpendMeta = (meta?.careerPoints || 0) >= 10;
  const incompleteMissionCount = countIncompleteMissions(missions, missionProgress);
  const actionStack = useMemo(
    () => buildFrontDoorActionStack({
      challenge: challengeMode?.vs ? { seed: challengeMode.seed, vsScore: challengeMode.vs, vsName: challengeMode.vsName } : null,
      dailyAlreadyPlayed,
      canSpendMeta,
      incompleteMissionCount,
      selectedLoadout,
      currentModeLabel: selectedMode.label,
      todaySeed: todaySeedStr,
      totalRuns: career?.totalRuns || 0,
      unlocked: meta?.unlocked || [],
      meta,
      career: career || {},
    }),
    [challengeMode, dailyAlreadyPlayed, canSpendMeta, incompleteMissionCount, meta, selectedLoadout, selectedMode.label, todaySeedStr, career],
  );
  const recommendedAction = actionStack[0];
  const analyticsStatus = getAnalyticsStatus();
  const telemetrySummary = useMemo(() => summarizeStudioEvents(studioEvents), [studioEvents]);
  const balanceLab = useMemo(
    () => buildLocalBalanceLab({ runHistory, studioEvents, career: career || {} }),
    [runHistory, studioEvents, career],
  );
  const aimCheck = useMemo(
    () => buildInputCalibrationNudge(inputCalibration, { debugEnabled: inputDebugEnabled }),
    [inputCalibration, inputDebugEnabled],
  );
  const inputQaReceipt = useMemo(
    () => buildInputQaReceipt({
      calibration: inputCalibration,
      controllerProfile,
      gamepadConnected,
      controllerType: effectiveControllerType,
    }),
    [controllerProfile, effectiveControllerType, gamepadConnected, inputCalibration],
  );
  const pwaInstallReceipt = useMemo(
    () => buildPwaInstallReceipt({
      promptReady: pwaInstallPromptReady || Boolean(onInstallApp),
      standalone: detectStandaloneDisplay(),
      serviceWorkerReady: detectServiceWorkerReady(),
      manifestLinked: true,
      lastAttempt: pwaInstallAttempt,
      mobile: isMobile,
    }),
    [isMobile, onInstallApp, pwaInstallAttempt, pwaInstallPromptReady],
  );
  const journey = useMemo(
    () => buildPlayerJourney({
      totalRuns: career?.totalRuns || 0,
      challengeActive: Boolean(challengeMode?.vs),
      hasVerifiedInput: aimCheck.status === "verified",
      dailyAlreadyPlayed,
      canSpendMeta,
      incompleteMissionCount,
      accountLevel,
      prestige,
    }),
    [career?.totalRuns, challengeMode?.vs, aimCheck.status, dailyAlreadyPlayed, canSpendMeta, incompleteMissionCount, accountLevel, prestige],
  );
  const onboarding = useMemo(() => {
    const runs = career?.totalRuns || 0;
    if (runs >= 3) return null;
    const steps = [
      { label: "RUN 1", title: "Survive", text: "Use WASD or left stick to keep space. Aim in a full circle and fire only when lanes open." },
      { label: "CHECK", title: "Calibrate", text: "Sweep aim around the player once. If any direction feels dead, open diagnostics before a serious run." },
      { label: "RUN 2", title: "Prove It", text: "Try the Daily seed. Fixed conditions make every dodge, perk, and mistake easier to read." },
      { label: "RUN 3", title: "Build", text: "Spend upgrades, replay a seed, then compare whether your build actually changed the run." },
    ];
    return { current: runs + 1, steps };
  }, [career?.totalRuns]);

  const recordFrontDoorAction = useCallback((actionId, extra = {}) => {
    const studioEvent = buildStudioGameEvent("front_door_action", {
      surface: "home_v2",
      actionId,
      mode: modeId,
      difficulty,
      loadout: selectedLoadout.id,
      focus: runIntel.focus,
      challengeActive: Boolean(challengeMode?.vs),
      dailyAlreadyPlayed,
      ...runIntel.telemetry,
      ...extra,
    });
    saveStudioGameEvent(studioEvent);
    return studioEvent;
  }, [challengeMode?.vs, dailyAlreadyPlayed, difficulty, modeId, runIntel.focus, runIntel.telemetry, selectedLoadout.id]);

  const selectMode = useCallback((id) => {
    const setters = {
      standard:        () => { onSetScoreAttackMode?.(false); onSetDailyChallengeMode?.(false); onSetCursedRunMode?.(false); onSetBossRushMode?.(false); onSetSpeedrunMode?.(false); onSetGauntletMode?.(false); },
      score_attack:    () => onSetScoreAttackMode?.(true),
      daily_challenge: () => onSetDailyChallengeMode?.(true),
      cursed:          () => onSetCursedRunMode?.(true),
      boss_rush:       () => onSetBossRushMode?.(true),
      speedrun:        () => onSetSpeedrunMode?.(true),
      gauntlet:        () => onSetGauntletMode?.(true),
    };
    (setters[id] || setters.standard)();
  }, [onSetScoreAttackMode, onSetDailyChallengeMode, onSetCursedRunMode, onSetBossRushMode, onSetSpeedrunMode, onSetGauntletMode]);

  const deploy = useCallback(() => {
    const seed = dailyChallengeMode ? todaySeedStr : (customSeed || undefined);
    const challenge = challengeMode?.vs ? { vs: challengeMode.vs, vsName: challengeMode.vsName } : {};
    const studioEvent = recordFrontDoorAction("deploy", { source: "deploy_button", seed: seed || null });
    track("front_door_action", { actionId: "deploy", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
    track("home_v2_deploy", { mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
    onStart(seed, challenge);
  }, [challengeMode, customSeed, dailyChallengeMode, difficulty, modeId, onStart, recordFrontDoorAction, runIntel.focus, selectedLoadout.id, todaySeedStr]);

  const switchTab = useCallback((t) => { setTab(t); track("home_v2_tab", { tab: t }); }, []);
  const handleJourneySecondary = useCallback(() => {
    const action = journey.secondary?.action;
    recordFrontDoorAction(`journey_${action || "secondary"}`, { source: "journey_card", stage: journey.stage });
    if (action === "aim_check") {
      setShowAimCheck(true);
      return;
    }
    if (action === "daily") {
      onSetDailyChallengeMode?.(true);
      onStart(todaySeedStr, {});
      return;
    }
    if (action === "upgrades") {
      setMeta(loadMetaProgress());
      setShowUpgrades(true);
      return;
    }
    if (action === "missions") {
      setMissions(getDailyMissions());
      setMissionProgress(loadMissionProgress());
      setShowMissions(true);
      return;
    }
    if (action === "challenge") {
      setDeployOpen(true);
      return;
    }
    switchTab("codex");
  }, [journey.secondary?.action, journey.stage, onSetDailyChallengeMode, onStart, recordFrontDoorAction, switchTab, todaySeedStr]);
  const completeAimCheck = useCallback((buckets = ["east", "north", "south", "west"]) => {
    const record = saveInputCalibration(buildInputCalibrationRecord({
      source: gamepadConnected ? (effectiveControllerType || "controller") : "mouse",
      controllerType: effectiveControllerType || "none",
      buckets,
    }));
    setInputCalibration(record);
    recordFrontDoorAction("aim_check_verified", { source: "aim_check_panel", inputSource: record.source, complete: record.complete });
    setShowAimCheck(false);
  }, [effectiveControllerType, gamepadConnected, recordFrontDoorAction]);
  const launchHistorySeed = useCallback((seed, challenge = {}) => {
    if (!seed) return;
    const studioEvent = recordFrontDoorAction("history_replay", {
      source: "run_history",
      seed,
      challengeActive: Boolean(challenge?.vs),
    });
    track("front_door_action", {
      actionId: "history_replay",
      surface: "home_v2",
      mode: modeId,
      difficulty,
      loadout: selectedLoadout.id,
      intelligenceFocus: runIntel.focus,
      studioEvent,
    });
    onStart(String(seed), challenge);
  }, [difficulty, modeId, onStart, recordFrontDoorAction, runIntel.focus, selectedLoadout.id]);

  const CMD_ACTIONS = useMemo(() => [
    () => { recordFrontDoorAction("open_career_stats", { source: "command_center" }); setCareer(loadCareerStats()); setMeta(loadMetaProgress()); setShowCareerStats(true); },
    () => { recordFrontDoorAction("open_missions", { source: "command_center" }); setMissions(getDailyMissions()); setMissionProgress(loadMissionProgress()); setShowMissions(true); },
    () => { recordFrontDoorAction("open_upgrades", { source: "command_center" }); setMeta(loadMetaProgress()); setShowUpgrades(true); },
    () => { recordFrontDoorAction("open_meta_tree", { source: "command_center" }); setShowMetaTree(true); },
    () => { recordFrontDoorAction("open_run_history", { source: "command_center" }); setRunHistory(loadRunHistory()); setRivalryHistory(loadRivalryHistory()); setStudioEvents(loadStudioGameEvents()); setShowRunHistory(true); },
    () => { recordFrontDoorAction("open_loadouts", { source: "command_center" }); setShowLoadoutBuilder(true); },
    () => { recordFrontDoorAction("open_rules", { source: "command_center" }); setShowRules(true); },
    () => { recordFrontDoorAction("open_controls", { source: "command_center" }); setShowControls(true); },
    () => { recordFrontDoorAction("open_most_wanted", { source: "command_center" }); setShowMostWanted(true); },
    () => { recordFrontDoorAction("open_whats_new", { source: "command_center" }); setShowNewFeatures(true); },
  ], [recordFrontDoorAction]);

  const cmdBtnRefs = useRef([]);
  const cmdFocusIdx = useGamepadNav({
    count: CMD_ACTIONS.length,
    cols: 5,
    enabled: !!gamepadConnected,
    onConfirm: (i) => CMD_ACTIONS[i]?.(),
  });

  useEffect(() => {
    if (gamepadConnected) cmdBtnRefs.current[cmdFocusIdx]?.focus();
  }, [cmdFocusIdx, gamepadConnected]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const page = {
    width: "100%", minHeight: "100dvh", height: "100dvh", margin: 0, overflowY: "auto", overflowX: "hidden",
    background: "radial-gradient(ellipse at top, #1a0a05 0%, #0a0a0a 55%, #050505 100%)",
    fontFamily: "'Courier New', monospace", color: "#EEE", position: "relative",
    WebkitUserSelect: "none", userSelect: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
  };
  const gridBg = { position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,0.025) 49px,rgba(255,255,255,0.025) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(255,255,255,0.025) 49px,rgba(255,255,255,0.025) 50px)", pointerEvents: "none" };
  const wrap = { position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "max(14px, env(safe-area-inset-top)) 16px max(32px, env(safe-area-inset-bottom))" };
  const topBar = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 };
  const brandRow = { display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: 3, color: "#888", fontWeight: 700 };
  const chip = { padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#CCC", cursor: "pointer", fontFamily: "inherit" };
  const iconBtn = { ...chip, padding: "4px 8px", fontSize: 14 };
  const hero = { textAlign: "center", marginBottom: 14 };
  const title = { fontSize: "clamp(40px,10vw,72px)", fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: -2, background: "linear-gradient(180deg,#FFD700,#FF6B00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 24px rgba(255,107,0,0.45))" };
  const tag = { marginTop: 4, fontSize: "clamp(11px,2.4vw,15px)", color: "#FF6B35", letterSpacing: 4, fontWeight: 700 };
  const deployRow = { display: "flex", justifyContent: "center", alignItems: "stretch", gap: 0, margin: "18px auto 8px", maxWidth: 540 };
  const deployBtn = {
    flex: 1, padding: "18px 22px", fontSize: 22, fontWeight: 900, fontFamily: "'Courier New',monospace",
    background: "linear-gradient(180deg,#FF8A3D,#CC4400)", color: "#FFF",
    border: "none", borderRadius: "10px 0 0 10px", cursor: "pointer", letterSpacing: 3,
    boxShadow: "0 0 28px rgba(255,107,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
  };
  const deployDropdownBtn = {
    padding: "18px 18px", fontSize: 14, fontWeight: 900, fontFamily: "'Courier New',monospace",
    background: "linear-gradient(180deg,#3a2012,#1a0f08)", color: selectedMode.color,
    border: "none", borderLeft: "1px solid rgba(255,255,255,0.14)", borderRadius: "0 10px 10px 0",
    cursor: "pointer", letterSpacing: 1, minWidth: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
  };
  const dropdownPanel = {
    position: "relative", margin: "6px auto 0", maxWidth: 540,
    background: "rgba(15,10,5,0.98)", border: "1px solid rgba(255,107,53,0.35)",
    borderRadius: 10, padding: 12, boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
  };
  const modeGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 6 };
  const modeCell = (active, color) => ({
    padding: "8px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
    background: active ? `${color}22` : "rgba(255,255,255,0.03)",
    border: active ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
    color: "#FFF",
  });
  const diffGrid = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 };
  const diffCell = (active, color) => ({
    padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center", fontFamily: "inherit",
    background: active ? `${color}22` : "rgba(255,255,255,0.03)",
    border: active ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
    color: "#FFF", fontWeight: 900, fontSize: 12,
  });
  const quickRow = { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 10 };
  const quickBtn = { ...chip, padding: "8px 14px", fontSize: 12, fontWeight: 900, letterSpacing: 1, color: "#EEE" };
  const tickerCard = {
    margin: "14px auto 0", maxWidth: 640, padding: "10px 14px",
    background: "linear-gradient(180deg,rgba(0,229,255,0.08),rgba(255,255,255,0.03))",
    border: "1px solid rgba(0,229,255,0.25)", borderRadius: 10,
    display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#DDEFFF", lineHeight: 1.4,
  };
  const journeyCard = {
    margin: "12px auto 0", maxWidth: 640, padding: "10px 12px",
    background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center",
  };
  const tabsRow = { display: "flex", gap: 4, justifyContent: "center", marginTop: 22, flexWrap: "wrap" };
  const tabBtn = (active) => ({
    padding: "8px 16px", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, fontFamily: "inherit", cursor: "pointer",
    background: active ? "rgba(255,107,53,0.12)" : "transparent",
    border: active ? "1px solid rgba(255,107,53,0.5)" : "1px solid rgba(255,255,255,0.1)",
    color: active ? "#FF9960" : "#AAA", borderRadius: 8,
  });
  const tabBody = { marginTop: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 };
  const footer = { marginTop: 22, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "center", gap: 14, fontSize: 10, color: "#777", letterSpacing: 1, flexWrap: "wrap" };
  const linkBtn = { background: "none", border: "none", color: isSupporter() ? "#FFD700" : "#888", fontSize: 10, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline dotted", letterSpacing: 1 };

  const intelLine = !tickerDismissed && runIntel?.directive ? runIntel.directive : null;

  return (
    <div style={page}>
      <div style={gridBg} />
      <Suspense fallback={null}>
        <DemoCanvas opacity={0.28} />
      </Suspense>
      <div style={wrap}>

        {/* Top bar */}
        <div style={topBar}>
          <div style={brandRow}>
            <span aria-hidden>💩</span>
            <span>VAULTSPARK · CALL OF DOODIE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={chip} onClick={onChangeUsername} title="Change callsign">
              @{username} <span style={{ color: "#888" }}>▾</span>
            </span>
            <span style={{ ...chip, cursor: "default", background: prestige > 0 ? "rgba(255,215,0,0.15)" : chip.background, borderColor: prestige > 0 ? "rgba(255,215,0,0.45)" : chip.border, color: prestige > 0 ? "#FFD700" : "#CCC" }}>
              {prestige > 0 ? `P${prestige} · ` : ""}LVL {accountLevel}
            </span>
            {gamepadConnected && (
              <span style={{ ...chip, color: controllerType === "xbox" ? "#4DBD61" : controllerType === "ps" ? "#6699FF" : "#CCC" }} title="Controller connected">🎮</span>
            )}
            <button style={iconBtn} onClick={() => setShowSettings(true)} aria-label="Settings">⚙</button>
            <button style={iconBtn} onClick={() => switchTab("codex")} aria-label="Help / Codex">❓</button>
          </div>
        </div>

        {/* Hero */}
        <div style={hero}>
          <h1 style={title}>CALL OF DOODIE</h1>
          <div style={tag}>MODERN WARFARE ON MOM'S WIFI</div>
          {dailyChampion && (
            <div
              title={`Today's Daily Challenge #1 — score ${dailyChampion.score.toLocaleString()}, wave ${dailyChampion.wave}`}
              style={{
                marginTop: 8, padding: "4px 10px", display: "inline-block",
                fontSize: 11, letterSpacing: 1.5, fontWeight: 800,
                color: "#FFD700", background: "rgba(255,215,0,0.08)",
                border: "1px solid rgba(255,215,0,0.45)", borderRadius: 999,
              }}
            >
              👑 TODAY'S CHAMPION: {dailyChampion.name.toUpperCase()} · {dailyChampion.score.toLocaleString()}
            </div>
          )}
        </div>

        <SignatureAssetStrip />

        <div style={journeyCard}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#888", fontSize: 9, fontWeight: 900, letterSpacing: 2 }}>JOURNEY · {journey.label.toUpperCase()}</div>
            <div style={{ color: "#EEE", fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>{journey.detail}</div>
            <div style={{ color: journey.secondary.accent, fontSize: 11, fontWeight: 900, marginTop: 6 }}>
              NEXT: {journey.secondary.title}
            </div>
            <div style={{ color: "#AAA", fontSize: 10, lineHeight: 1.35, marginTop: 2 }}>{journey.secondary.detail}</div>
          </div>
          <button
            onClick={handleJourneySecondary}
            style={{ ...quickBtn, color: journey.secondary.accent, borderColor: `${journey.secondary.accent}66`, background: `${journey.secondary.accent}12`, whiteSpace: "nowrap" }}
          >
            {journey.secondary.cta.toUpperCase()}
          </button>
        </div>

        {onboarding && (
          <div style={{ margin: "0 auto 12px", maxWidth: 720, border: "1px solid rgba(255,107,53,0.18)", borderRadius: 10, background: "rgba(0,0,0,0.22)", padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 7, flexWrap: "wrap" }}>
              <div style={{ color: "#FFB36B", fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>FIRST 3 RUNS</div>
              <div style={{ color: "#AAA", fontSize: 10 }}>Aim test: rotate around your soldier once before the first wave closes in.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 6 }}>
            {onboarding.steps.map((step, index) => {
              const active = index + 1 === onboarding.current;
              const done = index + 1 < onboarding.current;
              return (
                <div key={step.label} style={{ minHeight: 74, padding: "9px 10px", borderRadius: 8, background: active ? "rgba(255,107,53,0.13)" : done ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.035)", border: `1px solid ${active ? "rgba(255,107,53,0.4)" : done ? "rgba(0,255,136,0.22)" : "rgba(255,255,255,0.08)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                    <div style={{ color: active ? "#FFB36B" : done ? "#8CFFB8" : "#888", fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>{done ? "DONE" : step.label}</div>
                    <div style={{ color: active ? "#FFF" : "#AAA", fontSize: 10, fontWeight: 900 }}>{step.title}</div>
                  </div>
                  <div style={{ color: "#DDD", fontSize: 10, lineHeight: 1.35, marginTop: 5 }}>{step.text}</div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* DEPLOY split-button */}
        <div style={deployRow}>
          <button
            onClick={deploy}
            aria-label={`Deploy — ${selectedMode.label}, ${selectedDiff.label}`}
            style={deployBtn}
          >
            ▶ DEPLOY
          </button>
          <button
            onClick={() => setDeployOpen(o => !o)}
            aria-label="Change mode or difficulty"
            aria-expanded={deployOpen}
            style={deployDropdownBtn}
          >
            <span style={{ fontSize: 11, color: selectedMode.color, letterSpacing: 1 }}>
              {selectedMode.emoji} {selectedMode.label}
            </span>
            <span style={{ fontSize: 10, color: selectedDiff.color }}>
              {selectedDiff.emoji} {selectedDiff.label} {deployOpen ? "▴" : "▾"}
            </span>
          </button>
        </div>

        {/* Deploy dropdown */}
        {deployOpen && (
          <div style={dropdownPanel}>
            <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 6 }}>MODE</div>
            <div style={modeGrid}>
              {MODE_DEFS.map(m => (
                <button key={m.id} onClick={() => selectMode(m.id)} style={modeCell(modeId === m.id, m.color)}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: m.color }}>{m.emoji} {m.label}</div>
                  <div style={{ fontSize: 9, color: "#AAA", marginTop: 2 }}>{m.blurb}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, margin: "12px 0 6px" }}>DIFFICULTY</div>
            <div style={diffGrid}>
              {Object.entries(DIFFICULTIES).map(([k, d]) => (
                <button key={k} onClick={() => setDifficulty(k)} style={diffCell(difficulty === k, d.color)}>
                  <div style={{ color: d.color }}>{d.emoji}</div>
                  <div>{d.label}</div>
                </button>
              ))}
            </div>
            {(() => { const brief = getDifficultyBriefing(difficulty, runHistory); return brief ? <div style={{ fontSize: 10, color: "#999", marginTop: 5, textAlign: "center", letterSpacing: 0.5 }}>{brief}</div> : null; })()}
            {(() => { const s = suggestDifficulty(runHistory, difficulty); return s ? <div style={{ fontSize: 10, color: s.direction === "up" ? "#00FF88" : "#FFBB44", marginTop: 3, textAlign: "center", fontStyle: "italic", letterSpacing: 0.3 }}>{s.reason}</div> : null; })()}
            {(() => { const mb = getMutationDifficultyBrief(weeklyMutation, difficulty, runHistory); return mb ? <div style={{ fontSize: 10, color: "#FFBB44", marginTop: 3, textAlign: "center", fontStyle: "italic", letterSpacing: 0.3 }}>⚠ {mb}</div> : null; })()}
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>SEED</label>
              <input
                value={customSeed}
                onChange={e => setCustomSeed(e.target.value.replace(/\D/g, ""))}
                placeholder="optional"
                maxLength={6}
                style={{ width: 120, padding: "5px 8px", fontSize: 11, fontFamily: "monospace", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 6, color: "#EEE", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>Loadout: <strong style={{ color: selectedLoadout.color }}>{selectedLoadout.emoji} {selectedLoadout.name}</strong></span>
            </div>
            {/* Replay code share + paste */}
            <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <label style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>REPLAY</label>
              <input
                value={replayInput}
                onChange={e => setReplayInput(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 12))}
                placeholder="paste 12-char code"
                maxLength={12}
                style={{ width: 140, padding: "5px 8px", fontSize: 11, fontFamily: "monospace", background: "rgba(0,0,0,0.4)", border: `1px solid ${isValidReplayCode(replayInput) ? "rgba(0,255,136,0.5)" : "rgba(255,255,255,0.14)"}`, borderRadius: 6, color: "#EEE", outline: "none", textAlign: "center", letterSpacing: 1.5 }}
              />
              <button
                disabled={!isValidReplayCode(replayInput)}
                onClick={() => {
                  const r = decodeReplayCode(replayInput);
                  if (!r) return;
                  selectMode(r.mode);
                  setDifficulty(r.difficulty);
                  setStarterLoadout?.(r.starterLoadout);
                  setCustomSeed(String(r.seed));
                  track("front_door_action", { actionId: "replay_code_apply", surface: "home_v2" });
                }}
                style={{ padding: "5px 10px", fontSize: 10, fontWeight: 800, letterSpacing: 1, color: isValidReplayCode(replayInput) ? "#00FF88" : "#666", background: isValidReplayCode(replayInput) ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${isValidReplayCode(replayInput) ? "rgba(0,255,136,0.45)" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, cursor: isValidReplayCode(replayInput) ? "pointer" : "default" }}
              >LOAD</button>
              <button
                onClick={() => {
                  const code = encodeReplayCode({
                    seed: parseInt(customSeed || todaySeedStr, 10) || 0,
                    mode: modeId, difficulty, weaponIdx: 0, starterLoadout: selectedLoadout.id,
                  });
                  const url = `${location.origin}${location.pathname}?replay=${code}`;
                  navigator.clipboard?.writeText?.(url);
                  setReplayCopied(true);
                  setTimeout(() => setReplayCopied(false), 1500);
                  track("front_door_action", { actionId: "replay_code_share", surface: "home_v2", code });
                }}
                title="Copy a shareable link that auto-loads this run configuration"
                style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 10, fontWeight: 800, letterSpacing: 1, color: replayCopied ? "#00FF88" : "#FFD700", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.4)", borderRadius: 6, cursor: "pointer" }}
              >{replayCopied ? "✓ LINK COPIED" : "🔗 SHARE LINK"}</button>
            </div>
          </div>
        )}

        {/* Quick chips */}
        <div style={quickRow}>
          <button style={{ ...quickBtn, borderColor: "rgba(0,229,255,0.4)", color: "#00E5FF" }} onClick={() => {
            const studioEvent = recordFrontDoorAction("daily_challenge", { source: "quick_chip", seed: todaySeedStr });
            track("front_door_action", { actionId: "daily_challenge", surface: "home_v2", mode: "daily_challenge", difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onSetDailyChallengeMode?.(true);
            onStart(todaySeedStr, {});
          }}>
            📅 {dailyAlreadyPlayed ? "DAILY (REPLAY)" : `DAILY #${todaySeedStr}`}
          </button>
          <button style={{ ...quickBtn, borderColor: "rgba(255,200,0,0.4)", color: "#FFC800" }} onClick={() => {
            const studioEvent = recordFrontDoorAction("gauntlet_focus", { source: "quick_chip" });
            track("front_door_action", { actionId: "gauntlet_focus", surface: "home_v2", mode: "gauntlet", difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onSetGauntletMode?.(true);
            getWeeklyGauntlet();
          }}>
            🏆 GAUNTLET
          </button>
          <button style={quickBtn} onClick={() => {
            const studioEvent = recordFrontDoorAction("open_leaderboard", { source: "quick_chip" });
            track("front_door_action", { actionId: "open_leaderboard", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onRefreshLeaderboard();
            setShowLeaderboard(true);
          }}>
            ⚔️ LEADERBOARD
          </button>
          <button style={quickBtn} onClick={() => {
            const studioEvent = recordFrontDoorAction("open_achievements", { source: "quick_chip" });
            track("front_door_action", { actionId: "open_achievements", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            setShowAchievements(true);
          }}>
            🏅 ACHIEVEMENTS
          </button>
          {assistAvailable && (
            <button style={{ ...quickBtn, borderColor: "rgba(68,255,136,0.5)", color: "#44FF88" }} onClick={onApplyAssist}>
              🛡️ ASSIST +50HP
            </button>
          )}
          {onInstallApp && (
            <button
              style={{ ...quickBtn, borderColor: "rgba(0,229,255,0.45)", color: "#7FE6FF" }}
              onClick={() => {
                track("front_door_action", { actionId: "install_app", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id });
                onInstallApp();
              }}
            >
              📲 INSTALL APP
            </button>
          )}
          <span
            title={pwaInstallReceipt.summary}
            style={{
              ...quickBtn,
              display: "inline-flex",
              alignItems: "center",
              borderColor: pwaInstallReceipt.status === "needs-browser" ? "rgba(255,215,0,0.28)" : "rgba(0,229,255,0.3)",
              color: pwaInstallReceipt.status === "needs-browser" ? "#FFE29A" : "#B9F3FF",
              cursor: "default",
            }}
          >
            {pwaInstallReceipt.label} · {pwaInstallReceipt.readySignals}/4
          </span>
          {inputDebugEnabled && (
            <button
              style={{ ...quickBtn, borderColor: "rgba(0,229,255,0.45)", color: "#7FE6FF" }}
              onClick={() => {
                localStorage.setItem("cod-debug-input", "1");
                recordFrontDoorAction("open_input_diagnostics", { source: "quick_chip" });
                setDeployOpen(true);
              }}
            >
              DEBUG INPUT
            </button>
          )}
          {(inputDebugEnabled || onboarding || aimCheck.status !== "verified") && (
            <button
              style={{
                ...quickBtn,
                borderColor: aimCheck.status === "verified" ? "rgba(0,255,136,0.4)" : "rgba(255,211,77,0.48)",
                color: aimCheck.status === "verified" ? "#00FF88" : "#FFD34D",
              }}
              onClick={() => {
                recordFrontDoorAction("aim_check_chip", { source: "quick_chip", status: aimCheck.status });
                setShowAimCheck(true);
              }}
            >
              {aimCheck.label} · {aimCheck.detail.toUpperCase()}
            </button>
          )}
          {(inputCalibration || controllerProfile) && (
            <span
              style={{
                ...quickBtn,
                display: "inline-flex",
                alignItems: "center",
                borderColor: "rgba(127,230,255,0.3)",
                color: "#B9F3FF",
                cursor: "default",
              }}
            >
              {inputQaReceipt.label} · {inputQaReceipt.summary.toUpperCase()}
              {inputQaReceipt.deviceIndex != null ? ` · #${inputQaReceipt.deviceIndex}` : ""}
            </span>
          )}
        </div>

        {/* Command Center — full panel access */}
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: cmdCenterExpanded ? 8 : 0 }}>
            <button
              onClick={() => setCmdCenterExpanded(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: "#888", letterSpacing: 2, fontWeight: 900, fontFamily: "inherit", padding: 0 }}
              aria-expanded={cmdCenterExpanded}
            >
              ⚙ COMMAND CENTER {cmdCenterExpanded ? "▴" : "▾"}
            </button>
            {missionStreak >= 2 && (
              <span style={{ fontSize: 10, color: "#FF8C00", fontWeight: 900, letterSpacing: 1 }}>
                🔥 {missionStreak}-DAY STREAK
              </span>
            )}
          </div>
          {cmdCenterExpanded && <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              ["📊 STATS",       CMD_ACTIONS[0]],
              ["📋 MISSIONS",    CMD_ACTIONS[1]],
              ["🎖️ UPGRADES",   CMD_ACTIONS[2]],
              ["🌳 META TREE",   CMD_ACTIONS[3]],
              ["📜 HISTORY",     CMD_ACTIONS[4]],
              ["⚙️ LOADOUTS",   CMD_ACTIONS[5]],
              ["📜 RULES",       CMD_ACTIONS[6]],
              ["⌨ CONTROLS",    CMD_ACTIONS[7]],
              ["👾 MOST WANTED", CMD_ACTIONS[8]],
              ["✦ WHAT'S NEW",   CMD_ACTIONS[9]],
            ].map(([label, action], i) => (
              <button
                key={label}
                ref={el => { cmdBtnRefs.current[i] = el; }}
                style={{
                  ...quickBtn,
                  ...(gamepadConnected && cmdFocusIdx === i ? { borderColor: "rgba(0,229,255,0.7)", outline: "2px solid rgba(0,229,255,0.5)", outlineOffset: 1 } : {}),
                }}
                onClick={action}
              >
                {label}
              </button>
            ))}
          </div>}
        </div>

        {/* Intel Ticker — merges Command Brief + Run Intel + Recommended Action */}
        {intelLine && (
          <div style={tickerCard} role="status" aria-live="polite">
            <span style={{ fontSize: 14 }}>💡</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#7FE6FF" }}>{runIntel.focus.replace(/_/g, " ").toUpperCase()}:</strong>{" "}
              {runIntel.directive}
              {recommendedAction?.title && (
                <span style={{ color: "#AAA" }}> · <em>{recommendedAction.title}</em></span>
              )}
            </span>
            <details style={{ fontSize: 10, color: "#7FE6FF", cursor: "pointer" }}>
              <summary style={{ outline: "none" }}>(?)</summary>
              <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(0,0,0,0.4)", borderRadius: 6, color: "#CCC", fontSize: 11, maxWidth: 340 }}>
                <div style={{ fontWeight: 900, color: "#FFB36B", marginBottom: 4 }}>COMMAND BRIEF</div>
                {commandBrief.map((l, i) => <div key={i}>{i + 1}. {l}</div>)}
                {runIntel.recommendation && <div style={{ marginTop: 6, color: "#8FEFFF" }}>{runIntel.recommendation}</div>}
              </div>
            </details>
            <button onClick={() => { sessionStorage.setItem("cod-ticker-dismissed", "1"); setTickerDismissed(true); }} aria-label="Dismiss intel" style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Challenge link banner */}
        {challengeMode && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.45)", color: "#FFD7B8" }}>
            <span style={{ fontSize: 14 }}>⚔️</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#FF6B35" }}>CHALLENGE:</strong> Seed #{challengeMode.seed}
              {challengeMode.vs && (<> · Beat {challengeMode.vsName ? `@${challengeMode.vsName}` : "rival"}: <strong>{challengeMode.vs.toLocaleString()}</strong></>)}
            </span>
            <button onClick={() => { setCustomSeed(""); setChallengeMode(null); }} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Weekly mutation banner */}
        {weeklyMutation && !mutationDismissed && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(255,180,0,0.06)", borderColor: "rgba(255,180,0,0.3)", color: "#FFE8B3" }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#FFB300" }}>THIS WEEK'S MUTATION:</strong> {weeklyMutation.emoji} {weeklyMutation.name} — <span style={{ color: "#CCC" }}>{weeklyMutation.desc}</span>
            </span>
            <button onClick={() => { sessionStorage.setItem("cod-mutation-dismissed", "1"); setMutationDismissed(true); }} aria-label="Dismiss mutation banner" style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}
        {/* Local balance insight — player-facing single-line surface (S112). Full lab table stays debug-gated below. */}
        {!insightDismissed && balanceLab.status === "signals-found" && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(180,140,255,0.06)", borderColor: "rgba(180,140,255,0.3)", color: "#E8DFFF" }}>
            <span style={{ fontSize: 14 }}>🧠</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#B48CFF" }}>PATTERN SPOTTED:</strong> {balanceLab.topInsight.title} — <span style={{ color: "#CCC" }}>{balanceLab.topInsight.detail}</span>
            </span>
            <button onClick={() => { sessionStorage.setItem("cod-insight-dismissed", "1"); setInsightDismissed(true); }} aria-label="Dismiss pattern insight" style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}
        {opsDebugEnabled && (!analyticsStatus.enabled || telemetrySummary.pendingSyncCount > 0 || telemetrySummary.failedSyncCount > 0) && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(127,230,255,0.05)", borderColor: "rgba(127,230,255,0.22)", color: "#D9F8FF" }}>
            <span style={{ fontSize: 14 }}>📈</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#7FE6FF" }}>MEASUREMENT STATUS:</strong>{" "}
              {analyticsStatus.enabled ? "PostHog armed" : "PostHog key missing"}
              {" · "}
              {telemetrySummary.failedSyncCount > 0
                ? `${telemetrySummary.failedSyncCount} event sync retr${telemetrySummary.failedSyncCount === 1 ? "y" : "ies"} needed`
                : telemetrySummary.pendingSyncCount > 0
                  ? `${telemetrySummary.pendingSyncCount} local event${telemetrySummary.pendingSyncCount === 1 ? "" : "s"} queued for mirror sync`
                  : telemetrySummary.syncedCount > 0
                    ? `${telemetrySummary.syncedCount} recent event${telemetrySummary.syncedCount === 1 ? "" : "s"} mirrored`
                    : "local Studio events ready but no recent mirror confirmations yet"}
            </span>
          </div>
        )}
        {opsDebugEnabled && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(255,215,0,0.05)", borderColor: "rgba(255,215,0,0.22)", color: "#FFF2C2" }}>
            <span style={{ fontSize: 14 }}>LAB</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#FFD700" }}>BALANCE LAB:</strong>{" "}
              {balanceLab.topInsight.title} — <span style={{ color: "#CCC" }}>{balanceLab.topInsight.detail}</span>
              <span style={{ color: "#888" }}> · {balanceLab.inspected.runs} runs / {balanceLab.inspected.events} events inspected</span>
            </span>
          </div>
        )}

        {/* Tabbed nav */}
        <div style={tabsRow}>
          {["career", "codex", "settings", "support"].map(t => (
            <button key={t} style={tabBtn(tab === t)} onClick={() => switchTab(t)}>
              {t === "career" && "📊 CAREER"}
              {t === "codex" && "📖 CODEX"}
              {t === "settings" && "⚙ SETTINGS"}
              {t === "support" && "❤️ SUPPORT"}
            </button>
          ))}
        </div>
        <div style={tabBody}>
          {tab === "career" && <CareerTab career={career} meta={meta} missions={missions} missionProgress={missionProgress} onOpenMetaTree={() => setShowMetaTree(true)} />}
          {tab === "codex" && <CodexTab />}
          {tab === "settings" && (
            <div style={{ textAlign: "center" }}>
              <button style={{ ...quickBtn, padding: "10px 20px" }} onClick={() => setShowSettings(true)}>⚙ OPEN SETTINGS PANEL</button>
              <div style={{ fontSize: 10, color: "#888", marginTop: 10 }}>Audio, visuals, accessibility, controls, colorblind + reduced-motion modes</div>
            </div>
          )}
          {tab === "support" && (
            <SupportTab onOpen={() => setShowSupporter(true)} />
          )}
        </div>

        {/* Footer */}
        <div style={footer}>
          <span>A <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{ color: "#999", textDecoration: "none" }}>VaultSpark Studios</a> Game</span>
          <button style={linkBtn} onClick={() => setShowSupporter(true)}>{isSupporter() ? "⭐ SUPPORTER" : "❤️ SUPPORT THE DEV"}</button>
          <span style={{ color: "#555" }}>© 2026 VaultSpark Studios</span>
        </div>
        <div style={{ marginTop: 6, padding: "0 8px", fontSize: 9, lineHeight: 1.5, color: "#666", textAlign: "center", maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
          Call of Doodie is an independent comedy parody and is not affiliated with, endorsed by, sponsored by, or associated with Activision Publishing, Inc. or the Call of Duty&reg; franchise. All trademarks are property of their respective owners.
        </div>
      </div>

      {/* Modals (lazy) */}
      {showLeaderboard && (
        <div style={PANEL}>
          <Suspense fallback={null}>
            <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLeaderboard(false)} />
          </Suspense>
        </div>
      )}
      {showAchievements && (
        <div style={PANEL}>
          <Suspense fallback={null}>
            <AchievementsPanel achievementsUnlocked={career?.achievementsEver || []} onClose={() => setShowAchievements(false)} />
          </Suspense>
        </div>
      )}
      {showSettings && (
        <Suspense fallback={null}>
          <SettingsPanel settings={gameSettings} onSave={onSaveSettings} onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
      {showMetaTree && (
        <div style={PANEL}>
          <Suspense fallback={null}>
            <MetaTreePanel onClose={() => setShowMetaTree(false)} />
          </Suspense>
        </div>
      )}
      {showSupporter && (
        <Suspense fallback={null}>
          <SupporterModal onClose={() => setShowSupporter(false)} />
        </Suspense>
      )}
      {showAimCheck && (
        <AimCheckPanel
          controllerType={effectiveControllerType}
          onVerify={completeAimCheck}
          onDiagnostics={() => {
            localStorage.setItem("cod-debug-input", "1");
            recordFrontDoorAction("aim_check_diagnostics", { source: "aim_check_panel" });
            setShowAimCheck(false);
            setDeployOpen(true);
          }}
          onClose={() => setShowAimCheck(false)}
        />
      )}
      {showCareerStats && (
        <Suspense fallback={null}>
          <MP_CareerStats career={career} meta={meta} onClose={() => setShowCareerStats(false)} />
        </Suspense>
      )}
      {showRules && (
        <Suspense fallback={null}>
          <MP_Rules onClose={() => setShowRules(false)} />
        </Suspense>
      )}
      {showControls && (
        <Suspense fallback={null}>
          <MP_Controls isMobile={isMobile} controllerType={effectiveControllerType} onClose={() => setShowControls(false)} />
        </Suspense>
      )}
      {showMostWanted && (
        <Suspense fallback={null}>
          <MP_MostWanted onClose={() => setShowMostWanted(false)} />
        </Suspense>
      )}
      {showMissions && (
        <Suspense fallback={null}>
          <MP_Missions missions={missions} missionProgress={missionProgress} onClose={() => setShowMissions(false)} />
        </Suspense>
      )}
      {showUpgrades && (
        <Suspense fallback={null}>
          <MP_Upgrades meta={meta} accountLevel={accountLevel} onClose={() => { setMeta(loadMetaProgress()); setShowUpgrades(false); }} />
        </Suspense>
      )}
      {showRunHistory && (
        <Suspense fallback={null}>
          <MP_RunHistory
            runHistory={runHistory}
            rivalryHistory={rivalryHistory}
            studioEvents={studioEvents}
            dailyChampion={dailyChampion}
            username={username}
            onLaunchSeed={launchHistorySeed}
            onClose={() => setShowRunHistory(false)}
          />
        </Suspense>
      )}
      {showLoadoutBuilder && (
        <Suspense fallback={null}>
          <MP_LoadoutBuilder onClose={() => setShowLoadoutBuilder(false)} />
        </Suspense>
      )}
      {showNewFeatures && (
        <Suspense fallback={null}>
          <MP_NewFeatures onClose={() => setShowNewFeatures(false)} />
        </Suspense>
      )}
    </div>
  );
}

const AIM_DIRS = ["north", "east", "south", "west"];
const AIM_TARGET_POS = { north: [0, -90], east: [90, 0], south: [0, 90], west: [-90, 0] };

function AimCheckPanel({ controllerType, onVerify, onDiagnostics, onClose }) {
  const [hit, setHit] = useState(new Set());
  const [done, setDone] = useState(false);
  const zoneRef = useRef(null);
  const doneRef = useRef(false);

  const markBucket = useCallback((bucket) => {
    if (doneRef.current) return;
    setHit(prev => {
      if (prev.has(bucket)) return prev;
      const next = new Set(prev);
      next.add(bucket);
      if (next.size === 4) {
        doneRef.current = true;
        setDone(true);
        const verified = Array.from(next);
        setTimeout(() => onVerify(verified), 500);
      }
      return next;
    });
  }, [onVerify]);

  const trackPointer = useCallback((clientX, clientY) => {
    const zone = zoneRef.current;
    if (!zone || doneRef.current) return;
    const rect = zone.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.14) return;
    markBucket(pointerAimBucket(Math.atan2(dy, dx)));
  }, [markBucket]);

  const onPointerMove = useCallback((e) => trackPointer(e.clientX, e.clientY), [trackPointer]);
  const onTouchMove = useCallback((e) => {
    const t = e.touches[0];
    if (t) trackPointer(t.clientX, t.clientY);
  }, [trackPointer]);

  useEffect(() => {
    if (!navigator.getGamepads) return;
    const id = setInterval(() => {
      const gp = Array.from(navigator.getGamepads() || []).find(g => g?.connected);
      if (!gp) return;
      const rx = gp.axes[2] ?? 0;
      const ry = gp.axes[3] ?? 0;
      if (Math.hypot(rx, ry) < 0.5) return;
      markBucket(pointerAimBucket(Math.atan2(ry, rx)));
    }, 80);
    return () => clearInterval(id);
  }, [markBucket]);

  const device = controllerType && controllerType !== "controller"
    ? controllerType.toUpperCase()
    : "MOUSE / TOUCH / STICK";

  return (
    <div style={PANEL}>
      <div style={{ width: "min(420px,100%)", margin: "auto 0", padding: 20, borderRadius: 12, background: "rgba(8,12,18,0.98)", border: `1px solid ${done ? "rgba(0,255,136,0.45)" : "rgba(0,229,255,0.32)"}`, color: "#EEE", textAlign: "center", boxShadow: "0 14px 40px rgba(0,0,0,0.65)", transition: "border-color 0.4s" }}>
        <div style={{ color: "#7FE6FF", fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>AIM CHECK</div>
        <h2 style={{ margin: "8px 0 6px", fontSize: 20, color: "#FFF", letterSpacing: 1 }}>Verify Full-Circle Control</h2>
        <p style={{ margin: "0 auto 16px", maxWidth: 340, color: "#BFC9D8", fontSize: 12, lineHeight: 1.5 }}>
          {done
            ? <strong style={{ color: "#00FF88" }}>✓ All four directions verified!</strong>
            : <>Move {controllerType === "gamepad" ? "the right stick" : "your cursor or finger"} to each target for <strong style={{ color: "#7FE6FF" }}>{device}</strong>.</>}
        </p>

        {/* Interactive aim zone */}
        <div
          ref={zoneRef}
          onPointerMove={onPointerMove}
          onTouchMove={onTouchMove}
          style={{
            position: "relative", margin: "0 auto 16px",
            width: 220, height: 220, borderRadius: "50%",
            background: done ? "rgba(0,255,136,0.05)" : "rgba(0,12,24,0.55)",
            border: `2px solid ${done ? "rgba(0,255,136,0.4)" : "rgba(0,229,255,0.18)"}`,
            cursor: done ? "default" : "crosshair",
            touchAction: "none",
            transition: "background 0.35s, border-color 0.35s",
            userSelect: "none",
          }}
        >
          {/* Center player dot */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,107,53,0.22)", border: "2px solid #FF6B35",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 7, fontWeight: 900, color: "#FFB36B", letterSpacing: 1,
            pointerEvents: "none",
          }}>YOU</div>

          {/* Directional targets */}
          {AIM_DIRS.map(dir => {
            const [tx, ty] = AIM_TARGET_POS[dir];
            const isHit = hit.has(dir);
            return (
              <div key={dir} style={{
                position: "absolute",
                top: `calc(50% + ${ty}px)`, left: `calc(50% + ${tx}px)`,
                transform: "translate(-50%,-50%)",
                width: 44, height: 44, borderRadius: "50%",
                background: isHit ? "rgba(0,255,136,0.2)" : "rgba(0,229,255,0.07)",
                border: `2px solid ${isHit ? "#00FF88" : "rgba(0,229,255,0.45)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isHit ? 18 : 9, fontWeight: 900,
                color: isHit ? "#00FF88" : "#7FE6FF",
                letterSpacing: isHit ? 0 : 0.5,
                transition: "all 0.15s",
                pointerEvents: "none",
                boxShadow: isHit ? "0 0 14px rgba(0,255,136,0.45)" : "none",
              }}>
                {isHit ? "✓" : dir[0].toUpperCase()}
              </div>
            );
          })}
        </div>

        {/* Direction progress dots */}
        <div style={{ marginBottom: 16, fontSize: 11, display: "flex", justifyContent: "center", gap: 14 }}>
          {AIM_DIRS.map(dir => (
            <span key={dir} style={{ color: hit.has(dir) ? "#00FF88" : "#444", transition: "color 0.15s" }}>
              {hit.has(dir) ? "●" : "○"} {dir[0].toUpperCase()}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {!done && (
            <button
              onClick={() => onVerify(["east", "north", "south", "west"])}
              style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "#999", fontSize: 11, fontWeight: 900, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}
            >SKIP</button>
          )}
          <button
            onClick={onDiagnostics}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.06)", color: "#7FE6FF", fontSize: 12, fontWeight: 900, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}
          >INPUT LAB</button>
          <button
            onClick={onClose}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#888", fontSize: 12, fontWeight: 900, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}
          >{done ? "CLOSE" : "LATER"}</button>
        </div>
      </div>
    </div>
  );
}

function CareerTab({ career, meta, missions, missionProgress, onOpenMetaTree }) {
  if (!career) return <div style={{ color: "#888", textAlign: "center" }}>Loading…</div>;
  const incomplete = countIncompleteMissions(missions, missionProgress);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
        <StatChip label="TOTAL KILLS" value={(career.totalKills || 0).toLocaleString()} />
        <StatChip label="BEST WAVE" value={career.bestWave || 0} />
        <StatChip label="BEST SCORE" value={(career.bestScore || 0).toLocaleString()} />
        <StatChip label="CAREER PTS" value={(meta?.careerPoints || 0).toLocaleString()} />
        <StatChip label="PRESTIGE" value={`P${meta?.prestige || 0}`} />
        <StatChip label="MISSIONS" value={`${(missions?.length || 0) - incomplete}/${missions?.length || 0}`} />
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onOpenMetaTree} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.35)", color: "#FFD700", borderRadius: 8 }}>🌳 META TREE</button>
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: "#888", textAlign: "center" }}>
        Daily missions: <strong style={{ color: incomplete > 0 ? "#FFD700" : "#00FF88" }}>{incomplete}</strong> incomplete
      </div>
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 9, color: "#888", letterSpacing: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#EEE", marginTop: 3 }}>{value}</div>
    </div>
  );
}

function CodexTab() {
  const [section, setSection] = useState("assets");
  const btn = (active) => ({ padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: active ? "rgba(255,107,53,0.14)" : "transparent", border: "1px solid " + (active ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.12)"), color: active ? "#FF9960" : "#AAA", borderRadius: 6 });
  return (
    <div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <button style={btn(section === "assets")}  onClick={() => setSection("assets")}>🖼 ASSETS</button>
        <button style={btn(section === "arsenal")}  onClick={() => setSection("arsenal")}>🔫 ARSENAL</button>
        <button style={btn(section === "mostwanted")} onClick={() => setSection("mostwanted")}>👾 MOST WANTED</button>
        <button style={btn(section === "rules")}    onClick={() => setSection("rules")}>📜 RULES</button>
        <button style={btn(section === "news")}     onClick={() => setSection("news")}>✦ WHAT'S NEW</button>
      </div>
      {section === "assets" && <SignatureAssetGrid />}
      {section === "arsenal" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6 }}>
          {WEAPONS.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 11, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
              <span style={{ width: 20, textAlign: "center" }}>{w.emoji}</span>
              <span style={{ fontWeight: 800, color: w.color, minWidth: 80 }}>{w.name}</span>
              <span style={{ color: "#888", fontSize: 9 }}>[{i + 1}]</span>
              <span style={{ color: "#AAA", fontSize: 10, fontStyle: "italic", marginLeft: "auto", textAlign: "right" }}>{w.desc}</span>
            </div>
          ))}
        </div>
      )}
      {section === "mostwanted" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }}>
          {ENEMY_TYPES.map((e, i) => (
            <div key={i} style={{ padding: "6px 8px", fontSize: 11, background: "rgba(255,255,255,0.03)", borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{e.emoji}</div>
              <div style={{ fontWeight: 800, color: e.color, fontSize: 11 }}>{e.name}</div>
              <div style={{ color: "#888", fontSize: 9 }}>HP {e.hp} · SPD {e.speed}</div>
            </div>
          ))}
        </div>
      )}
      {section === "rules" && (
        <div style={{ fontSize: 12, color: "#CCC", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          <p>🎯 <strong>Move</strong> with WASD / left stick · <strong>Aim</strong> with mouse / right stick.</p>
          <p>💨 <strong>Dash</strong> (Shift / A button) — Invincible dodge. <strong>Grenade</strong> (Space / B) — AOE.</p>
          <p>🔢 <strong>Weapon keys 1–9</strong> swap · <strong>R</strong> reloads · <strong>Esc</strong> pauses.</p>
          <p>⚠️ Boss every 5 waves. Perks unlock on level-up. Wave shop between waves.</p>
          <p>💩 Earn Doodie Coins for streaks — spend in the wave shop.</p>
        </div>
      )}
      {section === "news" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {NEW_FEATURES.slice().reverse().slice(0, 20).map((f, i) => {
            const parts = f.split(" — ");
            const head = parts[0];
            const rest = parts.slice(1);
            return (
              <div key={i} style={{ padding: "8px 10px", fontSize: 11, background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 6 }}>
                <strong style={{ color: "#FF9960" }}>{head}</strong>
                {rest.length > 0 && <span style={{ color: "#BBB" }}> — {rest.join(" — ")}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SignatureAssetStrip() {
  return (
    <div style={{ margin: "10px auto 0", maxWidth: 650, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 8 }}>
      {SIGNATURE_VISUAL_ASSETS.map((asset) => (
        <div key={asset.id} style={{ minWidth: 0, border: `1px solid ${asset.accent}55`, background: "rgba(0,0,0,0.34)", borderRadius: 8, padding: 7, boxShadow: `0 0 18px ${asset.accent}18` }}>
          <img src={asset.src} alt={asset.label} loading="eager" width="96" height="96" style={{ width: "100%", maxWidth: 92, aspectRatio: "1 / 1", objectFit: "contain", display: "block", margin: "0 auto" }} />
          <div style={{ marginTop: 4, color: asset.accent, fontSize: 9, fontWeight: 900, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.label.toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
}

function SignatureAssetGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
      {SIGNATURE_VISUAL_ASSETS.map((asset) => (
        <div key={asset.id} style={{ padding: 10, borderRadius: 8, border: `1px solid ${asset.accent}55`, background: "rgba(255,255,255,0.035)", textAlign: "center" }}>
          <img src={asset.src} alt={asset.label} loading="lazy" width="128" height="128" style={{ width: 108, maxWidth: "100%", aspectRatio: "1 / 1", objectFit: "contain", filter: `drop-shadow(0 0 14px ${asset.accent}44)` }} />
          <div style={{ color: asset.accent, fontSize: 12, fontWeight: 900, marginTop: 6 }}>{asset.label}</div>
          <div style={{ color: "#999", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 3 }}>{asset.role}</div>
        </div>
      ))}
    </div>
  );
}

function SupportTab({ onOpen }) {
  return (
    <div style={{ textAlign: "center", fontSize: 12, color: "#CCC", lineHeight: 1.7 }}>
      <div style={{ fontSize: 32 }}>❤️</div>
      <p>Call of Doodie is free. Always will be.</p>
      <p style={{ fontSize: 11, color: "#AAA" }}>If you want to see more — a cosmetic ⭐ badge on the leaderboard helps keep the servers running.</p>
      <button onClick={onOpen} style={{ marginTop: 8, padding: "10px 22px", fontSize: 12, fontWeight: 900, fontFamily: "inherit", cursor: "pointer", background: "linear-gradient(180deg,#FF6B35,#CC4400)", color: "#FFF", border: "none", borderRadius: 8, letterSpacing: 1 }}>
        ☕ KO-FI · SUPPORT
      </button>
    </div>
  );
}
