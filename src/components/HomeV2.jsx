import { describeModeDifficulty } from "../config/difficultyPolicy.js";
import { useState, useEffect, useMemo, useCallback, useRef, lazy, startTransition } from "react";
import AsyncPanelBoundary from "./AsyncPanelBoundary.jsx";
import DialogShell from "./DialogShell.jsx";
import SiteFooter from "./SiteFooter.jsx";
import { useGamepadNav } from "../hooks/useGamepadNav.js";
import { WEAPONS, ENEMY_TYPES, DIFFICULTIES, STARTER_LOADOUTS, NEW_FEATURES, getWeeklyMutation, getWeeklyGauntlet } from "../constants.js";
import {
  loadCareerStats, getDailyMissions, loadMissionProgress, loadMetaProgress,
  getAccountLevel, getDailyChallengeSeed, hasDailyChallengeSubmitted, requestStudioEventSync, saveStudioGameEvent,
  loadRunHistory, loadRivalryHistory, loadStudioGameEvents, getDailyChampion, getMissionStreak,
  countIncompleteMissions,
} from "../storage.js";
import { clearHash, navigateHash, watchHash } from "../utils/hashRoute.js";
import { duelHoursLeft, duelStatus, isDuelId, loadDuel } from "../utils/duels.js";
import { parseChallengeInvite } from "../utils/challengePayload.js";
import ModePicker from "./ModePicker.jsx";
import { FULL_MODE_CATALOG as MODE_CATALOG, resolveSelectedModeId } from "../config/modeCatalog.js";
import { QUICK_RULES } from "../config/quickRules.js";
import { isOpsDebug } from "../utils/debugFlags.js";
import { buildCommandBrief, buildFrontDoorActionStack } from "../utils/menuGuidance.js";
import { buildMenuIntelligence, buildStudioGameEvent } from "../utils/runIntelligence.js";
import { getAnalyticsStatus, track } from "../utils/analytics.js";
import { summarizeStudioEvents } from "../utils/studioEventOps.js";
import { isSupporter } from "../utils/supporter.js";
import { decodeReplayCode, isValidReplayCode } from "../utils/replayCode.js";
import { getDifficultyBriefing, getMutationDifficultyBrief, suggestDifficulty } from "../utils/runBrain.js";
import { loadControllerProfile } from "../utils/gamepad.js";
import { AIM_CALIBRATION_BUCKETS, aimBucketFromKey, aimBucketFromVector, buildInputCalibrationNudge, buildInputCalibrationRecord, buildInputQaReceipt, loadInputCalibration, mergeAimCalibrationEvidence, resolveAimCalibrationSource, saveInputCalibration } from "../utils/inputCalibration.js";
import { buildPwaInstallReceipt, detectStandaloneDisplay, loadPwaInstallAttempt, readServiceWorkerLifecycle, SERVICE_WORKER_LIFECYCLE_EVENT } from "../utils/pwaInstallReadiness.js";
import { buildWeaponMasteryProjection } from "../utils/arsenalMastery.js";
import { sanitizeCarriedRunDrill } from "../systems/runDrill.js";
import { buildPlayerJourney } from "../utils/playerJourney.js";
import { buildWeeklyGauntletLaunch } from "../utils/gauntletLaunch.js";
import { buildLocalBalanceLab } from "../utils/balanceLab.js";
import { applyTheme, nextTheme, readTheme, THEMES } from "../utils/theme.js";
import { getStorageHealth, probeLocalStorage, STORAGE_HEALTH_EVENT } from "../utils/storageHealth.js";
import { readPreference, writePreference } from "../utils/gamePreferences.js";
import { resetTutorialProgress } from "../utils/tutorialProgress.js";
import { buildScenarioCartridge, buildSewerRelayUrl, decodeScenarioCartridge } from "../utils/scenarioCartridge.js";
import { parseLaunchIntent } from "../utils/launchIntent.js";
import { buildNemesisChronicle } from "../utils/nemesisChronicle.js";
import { buildFieldManualTruth } from "../utils/fieldManualTruth.js";
import { isPlaytestMode, loadPlaytestPulse } from "../utils/playtestFlightRecorder.js";
import { buildFirstRunsJourney } from "../utils/firstRunsJourney.js";
import { buildCommandersOrder } from "../utils/commandersOrders.js";
import { PrimaryWeaponSelector } from "./WeaponDock.jsx";
import CommunityStatsPanel from "./CommunityStatsPanel.jsx";
import CommandersOrders from "./CommandersOrders.jsx";
import PlaytestPulsePanel from "./PlaytestPulsePanel.jsx";
import MobileDeployConfig from "./MobileDeployConfig.jsx";
import PrimaryNavigation from "./PrimaryNavigation.jsx";
import OperationCommandDeck, { getOperationLaunch } from "./OperationCommandDeck.jsx";
import "./home-arcade.css";

const DemoCanvas = lazy(() => import("./DemoCanvas.jsx"));
const LeaderboardPanel = lazy(() => import("./LeaderboardPanel.jsx"));
const AchievementsPanel = lazy(() => import("./AchievementsPanel.jsx"));
const ProfilePanel = lazy(() => import("./ProfilePanel.jsx"));
const BuildPanel = lazy(() => import("./BuildPanel.jsx"));
const SettingsPanel = lazy(() => import("./SettingsPanel.jsx"));
const ZombiePractice = lazy(() => import("./ZombiePractice.jsx"));
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


// Mode identity comes from the shared catalog (S155) — this view uses the
// arcade-caps label variant.
const MODE_DEFS = MODE_CATALOG.map(m => ({ ...m, label: m.arcadeLabel }));
const currentModeId = resolveSelectedModeId;
const rememberedArcadeMode = () => {
  const id = readPreference("cod-arcade-mode-v1", "zombies", "local", "home");
  return MODE_DEFS.some((mode) => mode.id === id && id !== "standard") ? id : "zombies";
};

export default function HomeV2(props) {
  const {
    username, difficulty, setDifficulty, isMobile, leaderboard, lbLoading, lbHasMore, onLoadMore,
    onStart, onRefreshLeaderboard, onChangeUsername,
    starterLoadout, setStarterLoadout,
    gameSettings, onSaveSettings, onSetVisualPack,
    gamepadConnected, controllerType,
    scoreAttackMode, onSetScoreAttackMode,
    dailyChallengeMode, onSetDailyChallengeMode,
    cursedRunMode, onSetCursedRunMode,
    bossRushMode, onSetBossRushMode,
    speedrunMode, onSetSpeedrunMode,
    gauntletMode, onSetGauntletMode,
    zombiesMode, onSetZombiesMode,
    gameModeId: _gameModeId = "standard", onSetGameModeId,
    assistAvailable, onApplyAssist,
    onInstallApp,
    onReplayTraining,
    pwaInstallPromptReady = false,
    primaryWeaponIndex = 0,
    onSelectPrimaryWeapon = () => {},
    pendingNextRunContract = null,
    onConsumeNextRunContract = () => {},
  } = props;

  const modeId = MODE_DEFS.some(m => m.id === _gameModeId && m.isNew) ? _gameModeId : currentModeId({ scoreAttackMode, dailyChallengeMode, cursedRunMode, bossRushMode, speedrunMode, gauntletMode, zombiesMode });
  const [pendingModeId, setPendingModeId] = useState(null);
  const modeSwitching = pendingModeId !== null && pendingModeId !== modeId;
  const selectedMode = MODE_DEFS.find(m => m.id === (modeSwitching ? pendingModeId : modeId)) || MODE_DEFS[0];
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
  const [inviteState, setInviteState] = useState(() => new URLSearchParams(window.location.search).has("cv") ? "validating" : "none");
  const [playIntent, setPlayIntent] = useState(() => {
    if (modeId !== "standard") return "arcade";
    const remembered = readPreference("cod-play-intent-v1", "classic", "local", "home");
    return ["classic", "operations", "arcade"].includes(remembered) ? remembered : "classic";
  });
  const [operationLaunch, setOperationLaunch] = useState(() => getOperationLaunch("blacksite-flush"));
  const restoredPlayIntent = useRef(false);
  const [tab, setTab] = useState("field_manual");
  const deployDetailsRef = useRef(null);
  const deployToggleRef = useRef(null);
  const setDeployPanelOpen = useCallback((open) => {
    const panel = deployDetailsRef.current;
    if (panel) {
      const expanded = Boolean(open);
      const nativePopover = panel.hasAttribute("popover") && panel.showPopover;
      const isOpen = nativePopover ? panel.matches(":popover-open") : panel.dataset.open === "true";
      if (nativePopover) {
        if (expanded && !isOpen) panel.showPopover();
        else if (!expanded && isOpen) panel.hidePopover();
      } else {
        panel.dataset.open = String(expanded);
        panel.setAttribute("aria-hidden", String(!expanded));
        panel.inert = !expanded;
        panel.style.opacity = expanded ? "1" : "0.001";
        panel.style.pointerEvents = expanded ? "auto" : "none";
      }
    }
    deployToggleRef.current?.setAttribute("aria-expanded", String(Boolean(open)));
  }, []);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState("overview");
  const [showBuild, setShowBuild] = useState(false);
  const [buildTab, setBuildTab] = useState("earned");
  const [returnToRecord, setReturnToRecord] = useState(null);
  const [returnToBuild, setReturnToBuild] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showZombiePractice, setShowZombiePractice] = useState(false);
  const [showMetaTree, setShowMetaTree] = useState(false);
  const [showSupporter, setShowSupporter] = useState(false);
  const [showAimCheck, setShowAimCheck] = useState(false);
  const [mutationDismissed, setMutationDismissed] = useState(() => readPreference("cod-mutation-dismissed", "0", "session", "home") === "1");
  const [insightDismissed, setInsightDismissed] = useState(() => readPreference("cod-insight-dismissed", "0", "session", "home") === "1");
  const [showCareerStats, setShowCareerStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showMostWanted, setShowMostWanted] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [showLoadoutBuilder, setShowLoadoutBuilder] = useState(false);
  const [showNewFeatures, setShowNewFeatures] = useState(false);
  const [theme, setTheme] = useState(() => readTheme());
  const [cmdCenterExpanded, setCmdCenterExpanded] = useState(false);
  const [trainingNotice, setTrainingNotice] = useState("");
  const [dailyChampion, setDailyChampion] = useState(null);
  const [missionStreak, setMissionStreak] = useState(0);
  const [replayInput, setReplayInput] = useState("");
  const [replayCopied, setReplayCopied] = useState(false);
  const [scenarioInput, setScenarioInput] = useState("");
  const [scenarioNotice, setScenarioNotice] = useState("");
  const [playtestPulseEnabled] = useState(() => isPlaytestMode());
  const [playtestPulse] = useState(() => loadPlaytestPulse());
  const [inputDebugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "input"
      || readPreference("cod-debug-input", "0", "local", "home") === "1";
  });
  const [opsDebugEnabled] = useState(() => isOpsDebug());
  const [inputCalibration, setInputCalibration] = useState(() => loadInputCalibration());
  const [controllerProfile] = useState(() => loadControllerProfile());
  const [pwaInstallAttempt] = useState(() => loadPwaInstallAttempt());
  const [serviceWorkerLifecycle, setServiceWorkerLifecycle] = useState(() => readServiceWorkerLifecycle());
  const [storageHealth, setStorageHealth] = useState(() => getStorageHealth());
  const effectiveControllerType = gamepadConnected ? controllerType : (controllerProfile?.type || controllerType);
  const themePalette = THEMES[theme];

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onLifecycle = (event) => setServiceWorkerLifecycle(event?.detail || readServiceWorkerLifecycle());
    window.addEventListener(SERVICE_WORKER_LIFECYCLE_EVENT, onLifecycle);
    setServiceWorkerLifecycle(readServiceWorkerLifecycle());
    return () => window.removeEventListener(SERVICE_WORKER_LIFECYCLE_EVENT, onLifecycle);
  }, []);

  useEffect(() => {
    const onStorageHealth = (event) => setStorageHealth(event?.detail || getStorageHealth());
    window.addEventListener(STORAGE_HEALTH_EVENT, onStorageHealth);
    setStorageHealth(probeLocalStorage().receipt);
    return () => window.removeEventListener(STORAGE_HEALTH_EVENT, onStorageHealth);
  }, []);

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
    const inviteAttempt = params.has("cv") ? parseChallengeInvite(params.toString()) : null;
    if (inviteAttempt) {
      if (!inviteAttempt.ok) {
        setInviteState("rejected");
        setScenarioNotice(`${inviteAttempt.reason} Challenge not loaded.`);
      }
      else {
        const invite = inviteAttempt.invite;
        const applyInvite = (duel = null) => {
          setInviteState("ready");
          setCustomSeed(String(invite.seed));
          setDifficulty(invite.difficulty);
          setStarterLoadout?.(invite.loadout);
          selectMode(invite.mode);
          setChallengeMode({ seed: String(invite.seed), diff: invite.difficulty, vs: invite.vsScore, vsName: invite.vsName, duelId: invite.duelId, expiresAt: invite.expiresAt,
            ...(duel ? { duelStatus: "open", duelHoursLeft: duelHoursLeft(duel) } : {}) });
          setDeployPanelOpen(true);
          setScenarioNotice("Friendly challenge checked. Review the setup before starting.");
        };
        if (!invite.duelId) applyInvite();
        else loadDuel(invite.duelId).then((duel) => {
          if (duel && duelStatus(duel) === "open" && Number(duel.seed) === invite.seed && duel.mode === invite.mode && duel.difficulty === invite.difficulty && Number(duel.challenger_score) === invite.vsScore && duel.challenger_name === invite.vsName && Math.abs(Date.parse(duel.expires_at) - Date.parse(invite.expiresAt)) < 1000) applyInvite(duel);
          else { setInviteState("rejected"); setScenarioNotice("Saved duel is expired, answered or mismatched. Challenge not loaded."); }
        }).catch(() => { setInviteState("rejected"); setScenarioNotice("Saved duel could not be confirmed. Challenge not loaded."); });
      }
    }
    const launchIntent = parseLaunchIntent(window.location.search);
    if (!inviteAttempt && launchIntent) {
      if (launchIntent.seed !== undefined) setCustomSeed(String(launchIntent.seed));
      if (launchIntent.difficulty) setDifficulty(launchIntent.difficulty);
    }
    if (!inviteAttempt && launchIntent?.kind === "mode") selectMode(launchIntent.id);
    if (!inviteAttempt && launchIntent?.kind === "operation") {
      const launch = getOperationLaunch(launchIntent.id, launchIntent.route);
      if (launch) {
        setOperationLaunch(launch);
        setPlayIntent("operations");
        writePreference("cod-play-intent-v1", "operations", "local", "home");
      }
    }
    const scenario = decodeScenarioCartridge(params.get("scenario"));
    if (!inviteAttempt && scenario) {
      setCustomSeed(String(scenario.seed));
      setDifficulty(scenario.difficulty);
      setStarterLoadout?.(scenario.loadout);
      selectMode(scenario.mode);
      setChallengeMode(scenario.targetScore ? { seed: String(scenario.seed), diff: scenario.difficulty, vs: scenario.targetScore, vsName: scenario.rival } : null);
      setDeployPanelOpen(true);
      setScenarioNotice("Scenario Cartridge verified and loaded.");
    }
    const urlReplay = params.get("replay");
    if (!inviteAttempt && !scenario && urlReplay && isValidReplayCode(urlReplay)) {
      const r = decodeReplayCode(urlReplay);
      if (r) {
        setCustomSeed(String(r.seed));
        setDifficulty(r.difficulty);
        setStarterLoadout?.(r.starterLoadout);
        selectMode(r.mode);
        setDeployPanelOpen(true);
      }
    } else if (!inviteAttempt && !scenario && !urlReplay && !params.has("scenario")) {
      const urlSeed = params.get("seed");
      if (urlSeed && /^[1-9]\d{0,8}$/.test(urlSeed)) {
        setCustomSeed(urlSeed);
        const urlDiff = params.get("diff");
        if (urlDiff && Object.keys(DIFFICULTIES).includes(urlDiff)) setDifficulty(urlDiff);
        const duelParam = params.get("duel");
        setChallengeMode({
          seed: urlSeed, diff: urlDiff || null,
          vs: params.get("vs") ? parseInt(params.get("vs")) : null,
          vsName: params.get("vsName") || null,
          duelId: isDuelId(duelParam) ? duelParam : null,
        });
        // S163 seed duel: hydrate the card from the server row (24-hour window).
        if (isDuelId(duelParam)) {
          loadDuel(duelParam).then((duel) => {
            if (!duel) return;
            const status = duelStatus(duel);
            setChallengeMode((current) => current ? { ...current, vs: duel.challenger_score, vsName: duel.challenger_name, duelStatus: status, duelHoursLeft: duelHoursLeft(duel), duelResponder: duel.responder_name || null, duelResponderScore: duel.responder_score ?? null } : current);
          }).catch(() => {});
        }
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
  const weeklyGauntletLaunch = useMemo(() => buildWeeklyGauntletLaunch(getWeeklyGauntlet()), []);

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
  const aimCheck = useMemo(
    () => buildInputCalibrationNudge(inputCalibration, { debugEnabled: inputDebugEnabled }),
    [inputCalibration, inputDebugEnabled],
  );
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
      hasVerifiedInput: aimCheck.status === "verified",
      unlocked: meta?.unlocked || [],
      meta,
      career: career || {},
    }),
    [challengeMode, dailyAlreadyPlayed, canSpendMeta, incompleteMissionCount, meta, selectedLoadout, selectedMode.label, todaySeedStr, career, aimCheck.status],
  );
  const recommendedAction = actionStack[0];
  const analyticsStatus = getAnalyticsStatus();
  const telemetrySummary = useMemo(() => summarizeStudioEvents(studioEvents), [studioEvents]);
  const balanceLab = useMemo(
    () => buildLocalBalanceLab({ runHistory, studioEvents, career: career || {}, meta: meta || {} }),
    [runHistory, studioEvents, career, meta],
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
      serviceWorkerLifecycle,
      manifestLinked: true,
      lastAttempt: pwaInstallAttempt,
      mobile: isMobile,
    }),
    [isMobile, onInstallApp, pwaInstallAttempt, pwaInstallPromptReady, serviceWorkerLifecycle],
  );
  const journey = useMemo(
    () => buildPlayerJourney({
      totalRuns: career?.totalRuns || 0,
      accountLevel,
      prestige,
      recommendedAction,
    }),
    [career?.totalRuns, accountLevel, prestige, recommendedAction],
  );
  const nemesisChronicle = useMemo(
    () => buildNemesisChronicle({ career: career || {}, rivalryHistory, enemyTypes: ENEMY_TYPES }),
    [career, rivalryHistory],
  );
  const truthGraph = useMemo(
    () => buildFieldManualTruth({ weapons: WEAPONS, enemies: ENEMY_TYPES, modes: MODE_DEFS }),
    [],
  );
  const onboarding = useMemo(
    () => buildFirstRunsJourney({ totalRuns: career?.totalRuns || 0 }),
    [career?.totalRuns],
  );
  const commandersOrder = useMemo(
    () => buildCommandersOrder({
      aimCheck,
      onboarding,
      pendingNextRunContract,
      journey,
      runIntel,
      commandBrief,
      masteryProjection: buildWeaponMasteryProjection(career?.weaponLegendKills),
    }),
    [aimCheck, onboarding, pendingNextRunContract, journey, runIntel, commandBrief, career?.weaponLegendKills],
  );

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
    setPendingModeId(id);
    setPlayIntent(id === "standard" ? "classic" : "arcade");
    writePreference("cod-play-intent-v1", id === "standard" ? "classic" : "arcade", "local", "home");
    if (id !== "standard") writePreference("cod-arcade-mode-v1", id, "local", "home");
    const setters = {
      standard:        () => { onSetScoreAttackMode?.(false); onSetDailyChallengeMode?.(false); onSetCursedRunMode?.(false); onSetBossRushMode?.(false); onSetSpeedrunMode?.(false); onSetGauntletMode?.(false); onSetZombiesMode?.(false); },
      score_attack:    () => onSetScoreAttackMode?.(true),
      daily_challenge: () => onSetDailyChallengeMode?.(true),
      cursed:          () => onSetCursedRunMode?.(true),
      boss_rush:       () => onSetBossRushMode?.(true),
      speedrun:        () => onSetSpeedrunMode?.(true),
      gauntlet:        () => onSetGauntletMode?.(true),
      zombies:         () => onSetZombiesMode?.(true),
    };
    // Mode changes fan out to App-level state; keep the select interaction
    // responsive on narrow viewports (S142 INP evidence) by deferring the fan-out.
    // S163: new modes clear every legacy ruleset flag and select by id.
    startTransition(() => { (setters[id] || setters.standard)(); onSetGameModeId?.(id); });
  }, [onSetScoreAttackMode, onSetDailyChallengeMode, onSetCursedRunMode, onSetBossRushMode, onSetSpeedrunMode, onSetGauntletMode, onSetZombiesMode, onSetGameModeId]);

  useEffect(() => {
    if (restoredPlayIntent.current) return;
    restoredPlayIntent.current = true;
    if (modeId !== "standard" || playIntent !== "arcade") return;
    const params = new URLSearchParams(window.location.search);
    if (["scenario", "replay", "seed", "mode", "operation"].some((key) => params.has(key))) return;
    selectMode(rememberedArcadeMode());
  }, [modeId, playIntent, selectMode]);

  const deploy = useCallback(() => {
    const carriedDrill = sanitizeCarriedRunDrill(pendingNextRunContract);
    const seed = carriedDrill?.seed || (dailyChallengeMode ? todaySeedStr : (customSeed || undefined));
    const challenge = {
      ...(challengeMode?.vs ? { vs: challengeMode.vs, vsName: challengeMode.vsName } : {}),
      ...(challengeMode?.duelId && challengeMode?.duelStatus === "open" ? { duelId: challengeMode.duelId } : {}),
      ...(carriedDrill ? { drill: carriedDrill } : {}),
    };
    const studioEvent = recordFrontDoorAction("deploy", { source: "deploy_button", seed: seed || null });
    track("front_door_action", { actionId: "deploy", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
    track("home_v2_deploy", { mode: modeId, difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
    onConsumeNextRunContract();
    onStart(seed, challenge);
  }, [challengeMode, customSeed, dailyChallengeMode, difficulty, modeId, onConsumeNextRunContract, onStart, pendingNextRunContract, recordFrontDoorAction, runIntel.focus, selectedLoadout.id, todaySeedStr]);

  const choosePlayIntent = useCallback((intent) => {
    setPlayIntent(intent);
    writePreference("cod-play-intent-v1", intent, "local", "home");
    if (intent === "classic" && modeId !== "standard") selectMode("standard");
    if (intent === "arcade" && modeId === "standard") selectMode(rememberedArcadeMode());
    track("play_console_intent", { intent });
  }, [modeId, selectMode]);

  const startSelectedPlay = useCallback(() => {
    if (inviteState === "validating" || inviteState === "rejected") return;
    if (challengeMode?.expiresAt && Date.parse(challengeMode.expiresAt) <= Date.now()) {
      setInviteState("rejected");
      setScenarioNotice("This invite has expired. Challenge not loaded.");
      setChallengeMode(null);
      return;
    }
    if (playIntent !== "operations" && modeSwitching) return;
    track("play_console_start", { intent: playIntent, mode: playIntent === "operations" ? "operation" : modeId, operationId: playIntent === "operations" ? operationLaunch?.challenge.operationId : undefined });
    if (playIntent === "operations") {
      if (!operationLaunch) return;
      onConsumeNextRunContract();
      onStart(operationLaunch.seed, operationLaunch.challenge);
      return;
    }
    deploy();
  }, [challengeMode, deploy, inviteState, modeId, modeSwitching, onConsumeNextRunContract, onStart, operationLaunch, playIntent]);

  const switchTab = useCallback((t) => { setTab(t); track("home_v2_tab", { tab: t }); }, []);
  const handleContinuationAction = useCallback((plan = journey.secondary, source = "journey_card") => {
    const action = plan?.action;
    if (!action) return;
    const studioEvent = recordFrontDoorAction(plan.id || action, {
      source,
      stage: journey.stage,
      reasonCode: plan.reasonCode || plan.id || action,
      payload: plan.payload || {},
    });
    track("front_door_action", {
      actionId: plan.id || action,
      execution: action,
      reasonCode: plan.reasonCode || plan.id || action,
      source,
      surface: "home_v2",
      mode: modeId,
      difficulty,
      loadout: selectedLoadout.id,
      studioEvent,
    });
    if (action === "aim_check") {
      setShowAimCheck(true);
      return;
    }
    if (action === "daily") {
      onSetDailyChallengeMode?.(true);
      onStart(plan.payload?.seed || todaySeedStr, {});
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
      const seed = plan.payload?.seed || challengeMode?.seed;
      onStart(seed, {
        vs: plan.payload?.vsScore ?? challengeMode?.vs,
        vsName: plan.payload?.vsName ?? challengeMode?.vsName,
      });
      return;
    }
    if (action === "deploy") {
      deploy();
      return;
    }
    if (action === "challenge_share") {
      const seed = Number(customSeed) || Number(todaySeedStr);
      copyChallengeUrl({ seed, difficulty }).then((url) => {
        track("challenge_link_copied", { source, success: Boolean(url), seed });
      });
      return;
    }
    switchTab("field_manual");
  }, [challengeMode, customSeed, deploy, difficulty, journey.secondary, journey.stage, modeId, onSetDailyChallengeMode, onStart, recordFrontDoorAction, selectedLoadout.id, switchTab, todaySeedStr]);
  const completeAimCheck = useCallback((evidence = {}) => {
    const record = buildInputCalibrationRecord({
      source: resolveAimCalibrationSource(evidence.sources),
      controllerType: effectiveControllerType || "none",
      buckets: evidence.buckets,
    });
    if (!record.complete) return false;
    saveInputCalibration(record);
    setInputCalibration(record);
    recordFrontDoorAction("aim_check_verified", {
      source: "aim_check_panel",
      inputSource: record.source,
      observedBuckets: record.buckets,
    });
    setShowAimCheck(false);
    return true;
  }, [effectiveControllerType, recordFrontDoorAction]);
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

  // Player screens keep their tab in the URL so direct links and history work.
  useEffect(() => watchHash((route) => {
    const { id, arg } = route || {};
    setShowProfile(id === "profile");
    setShowBuild(id === "build");
    setShowSettings(id === "settings");
    if (id === "profile") setProfileTab(["overview", "runs", "collection", "save"].includes(arg) ? arg : "overview");
    else if (id === "build") setBuildTab(["earned", "setup"].includes(arg) ? arg : "earned");
    else if (id === "board" || id === "leaderboard") { onRefreshLeaderboard?.(); setShowLeaderboard(true); }
    else if (id === "field-manual") setShowRules(true);
    else if (id === "changelog") setShowNewFeatures(true);
    else if (id === "modes") { setDeployPanelOpen(true); document.getElementById("deploy")?.scrollIntoView({ block: "start" }); }
  }), [onRefreshLeaderboard, setDeployPanelOpen]);
  const closeProfile = useCallback(() => { setShowProfile(false); clearHash(); }, []);
  const closeBuild = useCallback(() => { setShowBuild(false); clearHash(); }, []);
  const openRecordDetail = useCallback((tab, open) => { setReturnToRecord(tab); setShowProfile(false); clearHash(); open(); }, []);
  const openBuildDetail = useCallback((tab, open) => { setReturnToBuild(tab); setShowBuild(false); clearHash(); open(); }, []);
  const finishRecordDetail = useCallback((close) => { close(); if (returnToRecord) { navigateHash("profile", returnToRecord); setReturnToRecord(null); } }, [returnToRecord]);
  const finishBuildDetail = useCallback((close) => { close(); if (returnToBuild) { navigateHash("build", returnToBuild); setReturnToBuild(null); } }, [returnToBuild]);

  const CMD_ACTIONS = useMemo(() => [
    () => { recordFrontDoorAction("open_profile", { source: "command_center" }); navigateHash("profile"); },
    () => { recordFrontDoorAction("open_build", { source: "command_center" }); navigateHash("build"); },
    () => { onRefreshLeaderboard?.(); setShowLeaderboard(true); },
    () => { location.href = `${import.meta.env.BASE_URL}board/`; },
    () => { recordFrontDoorAction("open_rules", { source: "command_center" }); setShowRules(true); },
    () => { recordFrontDoorAction("open_controls", { source: "command_center" }); setShowControls(true); },
    () => { recordFrontDoorAction("open_most_wanted", { source: "command_center" }); setShowMostWanted(true); },
    () => { recordFrontDoorAction("open_whats_new", { source: "command_center" }); setShowNewFeatures(true); },
  ], [onRefreshLeaderboard, recordFrontDoorAction]);

  const cmdBtnRefs = useRef([]);
  const cmdFocusIdx = useGamepadNav({
    count: CMD_ACTIONS.length,
    cols: 4,
    enabled: !!gamepadConnected,
    onConfirm: (i) => CMD_ACTIONS[i]?.(),
  });

  useEffect(() => {
    if (gamepadConnected) cmdBtnRefs.current[cmdFocusIdx]?.focus();
  }, [cmdFocusIdx, gamepadConnected]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const page = {
    width: "100%", minHeight: "100dvh", height: "100dvh", margin: 0, overflowY: "auto", overflowX: "hidden",
    background: themePalette.page,
    fontFamily: "'Courier New', monospace", color: themePalette.ink, position: "relative",
    WebkitUserSelect: "none", userSelect: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
  };
  const gridBg = { position: "fixed", inset: 0, backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 49px,${themePalette.grid} 49px,${themePalette.grid} 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,${themePalette.grid} 49px,${themePalette.grid} 50px)`, pointerEvents: "none" };
  const wrap = { position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "max(14px, env(safe-area-inset-top)) 16px max(32px, env(safe-area-inset-bottom))" };
  const topBar = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 };
  const brandRow = { display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: 3, color: themePalette.quiet, fontWeight: 700 };
  const chip = { padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: themePalette.panel, border: `1px solid ${themePalette.line}`, color: themePalette.muted, cursor: "pointer", fontFamily: "inherit" };
  const iconBtn = { ...chip, width: 44, minWidth: 44, minHeight: 44, padding: 0, display: "inline-grid", placeItems: "center", fontSize: 16 };
  const hero = { textAlign: "center", marginBottom: 14 };
  const title = { fontSize: "clamp(40px,10vw,72px)", fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: -2, background: "linear-gradient(180deg,var(--cod-gold),#FF6B00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 24px rgba(255,107,0,0.45))" };
  const tag = { marginTop: 4, fontSize: "clamp(11px,2.4vw,15px)", color: "var(--cod-orange)", letterSpacing: 4, fontWeight: 700 };
  const deployBtn = {
    flex: 1, padding: "18px 22px", fontSize: 22, fontWeight: 900, fontFamily: "'Courier New',monospace",
    background: "linear-gradient(180deg,#FF8A3D,#CC4400)", color: "#FFF",
    border: "none", borderRadius: 10, cursor: "pointer", letterSpacing: 2,
    boxShadow: "0 0 28px rgba(255,107,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
  };
  const dropdownPanel = {
    position: "fixed", inset: "auto", top: "50%", left: "50%", width: "min(540px, calc(100vw - 32px))",
    transform: "translate(-50%, -50%)", maxHeight: "min(78dvh, 720px)", overflowY: "auto", margin: 0,
    background: theme === "porcelain-day" ? "#fff7ed" : "#141014", border: "1px solid rgba(255,107,53,0.42)",
    borderRadius: 10, padding: 12, boxShadow: `0 12px 36px ${themePalette.shadow}`, zIndex: 40,
    contain: "layout paint style",
  };
  const diffGrid = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 };
  const diffCell = (active, color) => ({
    padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center", fontFamily: "inherit",
    background: active ? `${color}22` : themePalette.panel,
    border: active ? `2px solid ${color}` : `1px solid ${themePalette.line}`,
    color: themePalette.ink, fontWeight: 900, fontSize: 12,
  });
  const quickRow = { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 10 };
  const quickBtn = { ...chip, padding: "8px 14px", fontSize: 12, fontWeight: 900, letterSpacing: 1, color: themePalette.ink };
  const tickerCard = {
    margin: "14px auto 0", maxWidth: 640, padding: "10px 14px",
    background: "linear-gradient(180deg,rgba(0,229,255,0.08),rgba(255,255,255,0.03))",
    border: "1px solid rgba(0,229,255,0.25)", borderRadius: 10,
    display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#DDEFFF", lineHeight: 1.4,
  };
  const tabsRow = { display: "flex", gap: 4, justifyContent: "center", marginTop: 22, flexWrap: "wrap" };
  const tabBtn = (active) => ({
    padding: "8px 16px", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, fontFamily: "inherit", cursor: "pointer",
    background: active ? "rgba(255,107,53,0.12)" : "transparent",
    border: active ? "1px solid rgba(255,107,53,0.58)" : `1px solid ${themePalette.line}`,
    color: active ? themePalette.accent : themePalette.muted, borderRadius: 8,
  });
  const tabBody = { marginTop: 12, background: themePalette.panel, border: `1px solid ${themePalette.line}`, borderRadius: 10, padding: 14 };

  return (
    <div className="arcade-home" style={page} data-theme={theme} data-testid="home-v2-shell">
      <div className="arcade-home__grid" style={gridBg} />
      <AsyncPanelBoundary>
        <DemoCanvas opacity={0.28} />
      </AsyncPanelBoundary>
      <div className="arcade-home__cabinet" style={wrap} data-readable-ui>

        <PrimaryNavigation
          palette={themePalette}
          onOpenProgress={() => navigateHash("profile")}
          onOpenLoadout={() => navigateHash("build", "setup")}
        />

        {/* Top bar */}
        <div style={topBar}>
          <div style={brandRow}>
            <span>PLAYER PROFILE</span>
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
            <button
              style={iconBtn}
              onClick={() => setTheme(current => nextTheme(current))}
              aria-label={`Switch to ${THEMES[nextTheme(theme)].label} theme`}
              aria-pressed={theme === "porcelain-day"}
              title={`Theme: ${themePalette.label}`}
              data-theme-toggle
            >{themePalette.icon}</button>
            <button style={iconBtn} onClick={() => navigateHash("settings")} aria-label="Settings">⚙</button>
            <button style={iconBtn} onClick={() => switchTab("field_manual")} aria-label="Open Field Manual">❓</button>
          </div>
        </div>

        {/* Hero */}
        <div className="arcade-home__hero" style={hero}>
          <div className="arcade-home__portrait arcade-home__portrait--operative" aria-hidden="true">
            <img src="/visual-assets/cod-doodie-operative-v3.png" alt="" />
            <span>OPERATIVE READY</span>
          </div>
          <div className="arcade-home__portrait arcade-home__portrait--nemesis" aria-hidden="true">
            <img src="/visual-assets/cod-karen-nemesis-v2.png" alt="" />
            <span>THREAT DETECTED</span>
          </div>
          <div className="arcade-home__insert-coin" aria-hidden="true">● INSERT COURAGE ●</div>
          <h1 className="arcade-home__title" style={title}>CALL OF DOODIE</h1>
          <div style={tag}>MODERN WARFARE ON MOM'S WIFI</div>
          {dailyChampion && (
            <div
              title={`Today's Daily Challenge #1 — score ${dailyChampion.score.toLocaleString()}, wave ${dailyChampion.wave}`}
              style={{
                marginTop: 8, padding: "4px 10px", display: "inline-block",
                fontSize: 11, letterSpacing: 1.5, fontWeight: 800,
                color: "var(--cod-gold)", background: "rgba(255,215,0,0.08)",
                border: "1px solid rgba(255,215,0,0.45)", borderRadius: 999,
              }}
            >
              👑 TODAY'S CHAMPION: {dailyChampion.name.toUpperCase()} · {dailyChampion.score.toLocaleString()}
            </div>
          )}
        </div>

        <section id="deploy" className="play-console" aria-label="Choose your play" style={{ color: themePalette.ink, background: themePalette.panelStrong, borderColor: themePalette.line }}>
          <div className="play-console__proof">
            <img src="/visual-assets/play-console-gameplay.webp" alt="A real Call of Doodie survival run inside the sewer arena" width="720" height="405" loading="eager" />
            <p>One run becomes your story. Survive the chaos, learn the arena, and bring back a better plan.</p>
          </div>
          <div className="play-console__controls">
            <span className="play-console__eyebrow" style={{ color: themePalette.accent }}>YOUR NEXT RUN</span>
            <h2>Where do you want to drop?</h2>
            <div className="play-console__intents" role="group" aria-label="Choose play style">
              {[
                ["classic", "CLASSIC", "Endless survival"],
                ["operations", "OPERATIONS", "Story missions"],
                ["arcade", "ARCADE", "Modes & challenges"],
              ].map(([id, label, hint]) => <button key={id} type="button" aria-pressed={playIntent === id} onClick={() => choosePlayIntent(id)} style={{ borderColor: playIntent === id ? themePalette.accent : themePalette.line, background: playIntent === id ? `${themePalette.accent}22` : themePalette.panel, color: themePalette.ink }}><strong>{label}</strong><span>{hint}</span></button>)}
            </div>
            <p className="play-console__summary" role="status">
              {playIntent === "classic" ? "Fight endless waves. One optional build choice every four waves keeps the action moving." : playIntent === "operations" ? `${operationLaunch?.title || "Choose an operation"} · ${operationLaunch?.routeLabel || "Verified route"} · ${operationLaunch?.duration || "12–18 MIN"}` : `${selectedMode.label} · ${selectedMode.blurb}`}
            </p>
            {inviteState !== "none" && <div className={`play-console__invite play-console__invite--${inviteState}`} role="status" data-testid="challenge-invite-status">
              <strong>{inviteState === "ready" ? "FRIENDLY INVITE READY" : inviteState === "validating" ? "CHECKING SAVED INVITE" : "INVITE REJECTED"}</strong>
              <span>{inviteState === "validating" ? "Checking the saved run before you can start." : scenarioNotice}</span>
              {inviteState === "rejected" && <button type="button" onClick={() => { window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`); setInviteState("none"); setScenarioNotice(""); setChallengeMode(null); setCustomSeed(""); }}>Continue without challenge</button>}
            </div>}
            {playIntent === "operations" && <p data-testid="operation-difficulty" style={{ color: "var(--cod-muted)", fontSize: 12, margin: "6px 0" }}>{describeModeDifficulty("operation", difficulty)}</p>}
            {playIntent === "operations" && <details className="play-console__choice-details"><summary>Choose mission and route</summary><OperationCommandDeck selectionOnly selectedOperationId={operationLaunch?.challenge.operationId} selectedRouteId={operationLaunch?.challenge.operationRoute} onSelect={setOperationLaunch} palette={themePalette} /></details>}
            <button type="button" data-testid="front-door-deploy" className="arcade-home__deploy-button play-console__start" onClick={startSelectedPlay} disabled={inviteState === "validating" || inviteState === "rejected" || (playIntent === "operations" && !operationLaunch) || (playIntent !== "operations" && modeSwitching)} aria-busy={inviteState === "validating" || (playIntent !== "operations" && modeSwitching)} aria-label={`Start ${playIntent === "operations" ? operationLaunch?.title || "operation" : playIntent === "classic" ? "Classic Survival" : selectedMode.label}`} style={deployBtn}>
              ▶ START {playIntent === "operations" ? operationLaunch?.title || "OPERATION" : playIntent === "classic" ? "CLASSIC SURVIVAL" : selectedMode.label.toUpperCase()}
            </button>
            <div className="play-console__setup">
              <span>{playIntent === "operations" ? "Authored mission · route choices" : `${selectedDiff.label} difficulty · ${selectedLoadout.name} loadout`}</span>
              {playIntent !== "operations" && <button type="button" ref={deployToggleRef} popoverTarget="deploy-config-panel" aria-expanded="false" aria-controls="deploy-config-panel">Change setup &amp; run codes</button>}
            </div>
          </div>
        </section>

        <CommandersOrders order={commandersOrder} palette={themePalette} onAction={(action) => handleContinuationAction(action, "commanders_orders")} onDismiss={onConsumeNextRunContract} />

        <details className="play-console__extras"><summary>Character visuals</summary>
        <div data-testid="visual-pack-selector" aria-label="Character visual pack" style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ color: themePalette.muted, fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>CHARACTER VISUALS</span>
          {[{ id: "modern", label: "MODERN ATLAS" }, { id: "retro", label: "RETRO ORIGINAL" }].map(pack => {
            const selected = (gameSettings?.visualPack || "modern") === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSetVisualPack?.(pack.id)}
                style={{ padding: "5px 9px", borderRadius: 6, border: `1px solid ${selected ? (theme === "porcelain-day" ? themePalette.accent : "rgba(255,215,0,0.65)") : themePalette.line}`, background: selected ? (theme === "porcelain-day" ? "rgba(184,60,0,0.10)" : "rgba(255,215,0,0.12)") : themePalette.panel, color: selected ? (theme === "porcelain-day" ? themePalette.accent : "#FFD700") : themePalette.muted, fontSize: 9, fontWeight: 900, letterSpacing: 0.8, cursor: "pointer" }}
              >{pack.label}</button>
            );
          })}
        </div>

        </details>

        {/* Run setup stays reachable from the play console on every viewport. */}
        <div style={isMobile ? { position: "relative", zIndex: 4, marginTop: 8 } : { position: "relative", height: 0, zIndex: 40 }}>
          <div
            ref={deployDetailsRef}
            id="deploy-config-panel"
            popover="auto"
            data-open="false"
            onToggle={(event) => deployToggleRef.current?.setAttribute("aria-expanded", String(event.currentTarget.matches(":popover-open")))}
            style={dropdownPanel}
          >
            {isMobile && (
              <MobileDeployConfig
                modes={MODE_DEFS}
                modeId={modeId}
                onSelectMode={selectMode}
                difficulties={DIFFICULTIES}
                difficulty={difficulty}
                onSelectDifficulty={(value) => startTransition(() => setDifficulty(value))}
                palette={themePalette}
              />
            )}
            {!isMobile && <>
            <ModePicker modes={MODE_DEFS} modeId={modeId} onSelectMode={selectMode} palette={themePalette} />
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
            </>}
            {!isMobile && <p data-testid="mode-difficulty" style={{ color: "var(--cod-muted)", fontSize: 11 }}>{describeModeDifficulty(modeId, difficulty)}</p>}
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor="run-seed" style={{ fontSize: 10, color: "var(--cod-muted)", letterSpacing: 1 }}>SEED</label>
              <input
                id="run-seed"
                value={customSeed}
                onChange={e => setCustomSeed(e.target.value.replace(/\D/g, ""))}
                placeholder="optional"
                maxLength={9}
                style={{ width: 120, padding: "5px 8px", fontSize: 11, fontFamily: "monospace", background: "var(--cod-panel-soft)", border: "1px solid var(--cod-line)", borderRadius: 6, color: "var(--cod-ink)", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>Loadout: <strong style={{ color: selectedLoadout.color }}>{selectedLoadout.emoji} {selectedLoadout.name}</strong></span>
            </div>
            {/* Replay code share + paste */}
            <details style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <summary style={{ cursor: "pointer", color: "var(--cod-cyan)", fontSize: 10, fontWeight: 900, letterSpacing: 1.2 }}>ADVANCED RUN CODES &amp; RELAYS</summary>
            <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <label htmlFor="run-replay" style={{ fontSize: 10, color: "var(--cod-muted)", letterSpacing: 1 }}>REPLAY</label>
              <input
                id="run-replay"
                value={replayInput}
                onChange={e => setReplayInput(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 12))}
                placeholder="paste 12-char code"
                maxLength={12}
                style={{ width: 140, padding: "5px 8px", fontSize: 11, fontFamily: "monospace", background: "var(--cod-panel-soft)", border: `1px solid ${isValidReplayCode(replayInput) ? "var(--cod-cyan)" : "var(--cod-line)"}`, borderRadius: 6, color: "var(--cod-ink)", outline: "none", textAlign: "center", letterSpacing: 1.5 }}
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
                  const cartridge = buildScenarioCartridge({ seed: Number(customSeed || todaySeedStr), mode: modeId, difficulty, loadout: selectedLoadout.id });
                  const url = buildSewerRelayUrl(cartridge);
                  if (!url) { setScenarioNotice("Run link rejected: unsupported setup."); return; }
                  navigator.clipboard?.writeText?.(url);
                  setReplayCopied(true);
                  setTimeout(() => setReplayCopied(false), 1500);
                  track("front_door_action", { actionId: "scenario_share", surface: "home_v2" });
                }}
                title="Copy a shareable link that auto-loads this run configuration"
                style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "var(--cod-gold)", background: "rgba(255,215,0,0.08)", border: "1px solid var(--cod-line)", borderRadius: 6, cursor: "pointer" }}
              >{replayCopied ? "✓ LINK COPIED" : "🔗 SHARE LINK"}</button>
            </div>
            <div data-testid="scenario-cartridge" style={{ marginTop: 10, display: "grid", gap: 7, paddingTop: 9, borderTop: "1px solid rgba(127,230,255,0.18)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <strong style={{ color: "var(--cod-cyan)", fontSize: 10, letterSpacing: 1.4 }}>SCENARIO CARTRIDGE</strong>
                <span style={{ color: "var(--cod-muted)", fontSize: 9 }}>seed + mode + difficulty + loadout + optional rival</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input value={scenarioInput} onChange={(event) => setScenarioInput(event.target.value.trim())} placeholder="paste cartridge code" aria-label="Scenario Cartridge code" style={{ flex: "1 1 190px", minWidth: 0, padding: "6px 8px", fontSize: 10, fontFamily: "monospace", background: "var(--cod-panel-soft)", border: "1px solid var(--cod-line)", borderRadius: 6, color: "var(--cod-ink)" }} />
                <button type="button" style={quickBtn} onClick={() => {
                  const cartridge = decodeScenarioCartridge(scenarioInput);
                  if (!cartridge) { setScenarioNotice("Cartridge rejected: schema or integrity check failed."); return; }
                  setCustomSeed(String(cartridge.seed)); setDifficulty(cartridge.difficulty); setStarterLoadout?.(cartridge.loadout); selectMode(cartridge.mode);
                  setChallengeMode(cartridge.targetScore ? { seed: String(cartridge.seed), diff: cartridge.difficulty, vs: cartridge.targetScore, vsName: cartridge.rival } : null);
                  setScenarioNotice("Scenario Cartridge verified and loaded.");
                }}>LOAD</button>
                <button type="button" style={{ ...quickBtn, color: "var(--cod-cyan)", borderColor: "rgba(127,230,255,0.4)" }} onClick={async () => {
                  const cartridge = buildScenarioCartridge({ seed: Number(customSeed || todaySeedStr), mode: modeId, difficulty, loadout: selectedLoadout.id, targetScore: challengeMode?.vs, rival: challengeMode?.vsName });
                  const url = buildSewerRelayUrl(cartridge);
                  if (!url) { setScenarioNotice("Relay rejected: unsupported setup."); return; }
                  try { await navigator.clipboard?.writeText?.(url); setScenarioNotice("Sewer Relay copied — asynchronous, deterministic, and account-free."); }
                  catch { setScenarioNotice("Relay built; clipboard access was unavailable."); }
                }}>SEWER RELAY</button>
              </div>
              {scenarioNotice && <div role="status" style={{ color: "var(--cod-ink)", fontSize: 10 }}>{scenarioNotice}</div>}
            </div>
            </details>
          </div>
        </div>

        <details className="play-console__extras"><summary>Choose primary weapon</summary>
        <PrimaryWeaponSelector selectedIndex={primaryWeaponIndex} onSelect={onSelectPrimaryWeapon} />
        </details>

        <div id="live-stats" style={{ marginTop: 18, scrollMarginTop: 86 }}>
          <CommunityStatsPanel career={career} runHistory={runHistory} compact defaultTab="live" showcase />
        </div>

        <h2 className="home-section-label">PLAY NEXT</h2>
        {/* Quick actions are grouped by player intent instead of mixing play,
            navigation, installation, and diagnostic receipts in one strip. */}
        <div style={quickRow}>
          <button style={{ ...quickBtn, borderColor: "rgba(0,229,255,0.4)", color: "var(--cod-cyan)" }} onClick={() => {
            const studioEvent = recordFrontDoorAction("daily_challenge", { source: "quick_chip", seed: todaySeedStr });
            track("front_door_action", { actionId: "daily_challenge", surface: "home_v2", mode: "daily_challenge", difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onSetDailyChallengeMode?.(true);
            onStart(todaySeedStr, {});
          }}>
            📅 {dailyAlreadyPlayed ? "DAILY (REPLAY)" : `DAILY #${todaySeedStr}`}
          </button>
          <button aria-label="Launch weekly Gauntlet" title={weeklyGauntletLaunch.doctrineTagName ? `This week's contract: ${weeklyGauntletLaunch.doctrineTagName}` : undefined} style={{ ...quickBtn, borderColor: "rgba(255,200,0,0.4)", color: "var(--cod-gold)" }} onClick={() => {
            const studioEvent = recordFrontDoorAction("gauntlet_focus", { source: "quick_chip" });
            track("front_door_action", { actionId: "gauntlet_focus", surface: "home_v2", mode: "gauntlet", difficulty, loadout: selectedLoadout.id, intelligenceFocus: runIntel.focus, studioEvent });
            onSetGauntletMode?.(true);
            const launch = buildWeeklyGauntletLaunch(getWeeklyGauntlet());
            onStart(launch.seed, { gauntletWeek: launch.week });
          }}>
            🏆 GAUNTLET
          </button>
          {assistAvailable && (
            <button style={{ ...quickBtn, borderColor: "rgba(68,255,136,0.5)", color: "#44FF88" }} onClick={onApplyAssist}>
              🛡️ ASSIST +50HP
            </button>
          )}
          <div aria-hidden="true" style={{ flexBasis: "100%", height: 0 }} />
          <h2 className="home-section-label" style={{ flexBasis: "100%" }}>QUICK TOOLS</h2>
          <button style={quickBtn} onClick={() => {
            resetTutorialProgress();
            track("front_door_action", { actionId: "reset_training", surface: "home_v2" });
            setTrainingNotice(onReplayTraining ? "Launching guided training…" : "Training reset. Deploy a run to begin.");
            onReplayTraining?.();
          }}>
            🎓 REPLAY TRAINING
          </button>
          {onInstallApp && (
            <button
              style={{ ...quickBtn, borderColor: "rgba(0,229,255,0.45)", color: "var(--cod-cyan)" }}
              onClick={() => {
                track("front_door_action", { actionId: "install_app", surface: "home_v2", mode: modeId, difficulty, loadout: selectedLoadout.id });
                onInstallApp();
              }}
            >
              📲 INSTALL APP
            </button>
          )}
          {/* S155: device diagnostics are operator/debug detail — shown to
              players only when storage is actually degraded (they need the
              warning), otherwise behind ?debug=ops. */}
          {(storageHealth.status === "degraded" || opsDebugEnabled) && (
          <details style={{ flexBasis: "100%", maxWidth: 560, margin: "2px auto 0", padding: "8px 10px", borderRadius: 8, border: `1px solid ${themePalette.line}`, background: themePalette.panel, textAlign: "left" }}>
            <summary style={{ cursor: "pointer", color: themePalette.ink, fontSize: 10, fontWeight: 900, letterSpacing: 1.5 }}>DEVICE &amp; SAVE STATUS</summary>
            <div style={{ display: "grid", gap: 8, marginTop: 10, fontSize: 11, lineHeight: 1.45 }}>
              <div>
                <strong style={{ color: "var(--cod-cyan)" }}>{pwaInstallReceipt.playerLabel}</strong>
                <div style={{ color: themePalette.muted }}>{pwaInstallReceipt.detail}</div>
              </div>
              <div>
                <strong style={{ color: storageHealth.status === "degraded" ? "#FF9C88" : "#9BFFBD" }}>
                  {storageHealth.status === "degraded" ? "PROGRESS MAY NOT SAVE" : "PROGRESS SAVES ON THIS DEVICE"}
                </strong>
                <div style={{ color: themePalette.muted }}>
                  {storageHealth.status === "degraded"
                    ? "Your browser rejected a local save. Free space or allow site storage, then test again."
                    : "Career progress stays in this browser. It is not a cloud-sync claim."}
                </div>
              </div>
              <button type="button" onClick={() => setStorageHealth(probeLocalStorage().receipt)} style={{ ...quickBtn, justifySelf: "start", padding: "6px 10px", fontSize: 10 }}>TEST LOCAL SAVE</button>
            </div>
          </details>
          )}
          {trainingNotice && <div role="status" style={{ flexBasis: "100%", color: "#9BFFBD", fontSize: 10, textAlign: "center" }}>{trainingNotice}</div>}
          {inputDebugEnabled && (
            <button
              style={{ ...quickBtn, borderColor: "rgba(0,229,255,0.45)", color: "var(--cod-cyan)" }}
              onClick={() => {
                writePreference("cod-debug-input", "1", "local", "home");
                recordFrontDoorAction("open_input_diagnostics", { source: "quick_chip" });
                setDeployPanelOpen(true);
              }}
            >
              DEBUG INPUT
            </button>
          )}
          {inputDebugEnabled && (
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
              OPEN AIM DIAGNOSTICS · {aimCheck.status.toUpperCase()}
            </button>
          )}
          {opsDebugEnabled && (inputCalibration || controllerProfile) && (
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
        {/* S155 (founder decision): the Playtest Pulse opt-in toggle moved to
            Settings; the raw sample readout is operator detail (?debug=ops). */}
        {playtestPulseEnabled && opsDebugEnabled && <PlaytestPulsePanel pulse={playtestPulse} palette={themePalette} />}

        {/* Progress and reference systems stay one layer below the play loop. */}
        <div id="player-tools" style={{ marginTop: 18, padding: "14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", scrollMarginTop: 86 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: cmdCenterExpanded ? 8 : 0 }}>
            <button
              onClick={() => setCmdCenterExpanded(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: "#888", letterSpacing: 2, fontWeight: 900, fontFamily: "inherit", padding: 0 }}
              aria-expanded={cmdCenterExpanded}
            >
              ALL PLAYER TOOLS {cmdCenterExpanded ? "▴" : "▾"}
            </button>
            {missionStreak >= 2 && (
              <span style={{ fontSize: 10, color: "#FF8C00", fontWeight: 900, letterSpacing: 1 }}>
                🔥 {missionStreak}-DAY STREAK
              </span>
            )}
          </div>
          {cmdCenterExpanded && <div className="home-tool-groups">
            {[
              ["Progress", [["👤 YOUR RECORD", CMD_ACTIONS[0], 0]]],
              ["Build", [["⚙️ YOUR BUILD", CMD_ACTIONS[1], 1]]],
              ["Community", [["⚔️ LEADERBOARD", CMD_ACTIONS[2], 2], ["📊 COMMUNITY STATS", CMD_ACTIONS[3], 3]]],
              ["Learn", [["📜 RULES", CMD_ACTIONS[4], 4], ["⌨ CONTROLS", CMD_ACTIONS[5], 5], ["👾 MOST WANTED", CMD_ACTIONS[6], 6], ["✦ WHAT'S NEW", CMD_ACTIONS[7], 7], ["CREATURE PRACTICE", () => setShowZombiePractice(true), null]]],
            ].map(([group, items]) => (
              <section key={group} className="home-tool-group">
                <h3>{group}</h3>
                {items.map(([label, action, i]) => (
              <button
                key={label}
                ref={el => { if (i != null) cmdBtnRefs.current[i] = el; }}
                style={{
                  ...quickBtn,
                  ...(i != null && gamepadConnected && cmdFocusIdx === i ? { borderColor: "rgba(0,229,255,0.7)", outline: "2px solid rgba(0,229,255,0.5)", outlineOffset: 1 } : {}),
                }}
                onClick={action}
              >
                {label}
              </button>
                ))}
              </section>
            ))}
          </div>}
        </div>

        {/* Challenge link banner */}
        {challengeMode && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.45)", color: "var(--cod-ink)" }}>
            <span style={{ fontSize: 14 }}>⚔️</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "var(--cod-orange)" }}>{challengeMode.duelId ? "DUEL:" : "CHALLENGE:"}</strong> Seed #{challengeMode.seed}
              {challengeMode.duelId && challengeMode.duelStatus === "open" && <> · <span style={{ color: "var(--cod-cyan)" }}>{challengeMode.duelHoursLeft}h left · friendly, unverified</span></>}
              {challengeMode.duelId && challengeMode.duelStatus === "expired" && <> · <span style={{ color: "var(--cod-danger)" }}>duel expired · play it anyway</span></>}
              {challengeMode.duelId && (challengeMode.duelStatus === "responder_won" || challengeMode.duelStatus === "challenger_won") && <> · <span style={{ color: "var(--cod-gold)" }}>answered by @{challengeMode.duelResponder} with {Number(challengeMode.duelResponderScore || 0).toLocaleString()}</span></>}
              {challengeMode.vs && (<> · Beat {challengeMode.vsName ? `@${challengeMode.vsName}` : "rival"}: <strong>{challengeMode.vs.toLocaleString()}</strong></>)}
            </span>
            <button onClick={() => { setCustomSeed(""); setChallengeMode(null); }} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Weekly mutation banner */}
        {weeklyMutation && !mutationDismissed && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(255,180,0,0.06)", borderColor: "rgba(255,180,0,0.3)", color: "var(--cod-ink)" }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "var(--cod-orange)" }}>THIS WEEK'S MUTATION:</strong> {weeklyMutation.emoji} {weeklyMutation.name} — <span style={{ color: "var(--cod-ink)" }}>{weeklyMutation.desc}</span>
            </span>
            <button onClick={() => { writePreference("cod-mutation-dismissed", "1", "session", "home"); setMutationDismissed(true); }} aria-label="Dismiss mutation banner" style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}
        {/* Local balance insight — player-facing single-line surface (S112). Full lab table stays debug-gated below. */}
        {!insightDismissed && balanceLab.status === "signals-found" && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(180,140,255,0.06)", borderColor: "rgba(180,140,255,0.3)", color: "#E8DFFF" }}>
            <span style={{ fontSize: 14 }}>🧠</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "#B48CFF" }}>PATTERN SPOTTED:</strong> {balanceLab.topInsight.title} — <span style={{ color: "#CCC" }}>{balanceLab.topInsight.detail}</span>
            </span>
            <button onClick={() => { writePreference("cod-insight-dismissed", "1", "session", "home"); setInsightDismissed(true); }} aria-label="Dismiss pattern insight" style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}
        {opsDebugEnabled && (!analyticsStatus.enabled || telemetrySummary.pendingSyncCount > 0 || telemetrySummary.failedSyncCount > 0) && (
          <div style={{ ...tickerCard, marginTop: 8, background: "rgba(127,230,255,0.05)", borderColor: "rgba(127,230,255,0.22)", color: "#D9F8FF" }}>
            <span style={{ fontSize: 14 }}>📈</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: "var(--cod-cyan)" }}>MEASUREMENT STATUS:</strong>{" "}
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
              <strong style={{ color: "var(--cod-gold)" }}>BALANCE LAB:</strong>{" "}
              {balanceLab.topInsight.title} — <span style={{ color: "#CCC" }}>{balanceLab.topInsight.detail}</span>
              <span style={{ color: "#888" }}> · {balanceLab.inspected.runs} runs / {balanceLab.inspected.events} events inspected</span>
            </span>
          </div>
        )}

        {/* Secondary detail area */}
        <div className="arcade-home__tabs" style={tabsRow}>
          {["field_manual", "support"].map(t => (
            <button key={t} style={tabBtn(tab === t)} onClick={() => switchTab(t)}>
              {t === "field_manual" && "📖 FIELD MANUAL"}
              {t === "support" && "❤️ SUPPORT"}
            </button>
          ))}
        </div>
        <div style={tabBody}>
          {tab === "field_manual" && <CodexTab truthGraph={truthGraph} />}
          {tab === "support" && (
            <SupportTab onOpen={() => setShowSupporter(true)} />
          )}
        </div>

        <SiteFooter
          onSupporterClick={() => setShowSupporter(true)}
          isSupporterActive={isSupporter(username)}
          palette={{ line: themePalette.line, quiet: themePalette.quiet }}
        />
      </div>

      {/* Modals (lazy) */}
      {showLeaderboard && (
        <AsyncPanelBoundary>
          <LeaderboardPanel leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={onLoadMore} username={username} onClose={() => setShowLeaderboard(false)} />
        </AsyncPanelBoundary>
      )}
      {showProfile && (
        <AsyncPanelBoundary>
          <ProfilePanel username={username} nemesisChronicle={nemesisChronicle} activeTab={profileTab} onTabChange={(next) => navigateHash("profile", next)} onClose={closeProfile}
            onOpenCareerStats={() => openRecordDetail("overview", () => { setCareer(loadCareerStats()); setMeta(loadMetaProgress()); setShowCareerStats(true); })}
            onOpenRuns={() => openRecordDetail("runs", () => { setRunHistory(loadRunHistory()); setRivalryHistory(loadRivalryHistory()); setStudioEvents(loadStudioGameEvents()); setShowRunHistory(true); })}
            onOpenAchievements={() => openRecordDetail("collection", () => setShowAchievements(true))}
            onOpenMissions={() => openRecordDetail("collection", () => { setMissions(getDailyMissions()); setMissionProgress(loadMissionProgress()); setShowMissions(true); })}
            onOpenBuild={() => navigateHash("build", "earned")}
          />
        </AsyncPanelBoundary>
      )}
      {showBuild && (
        <AsyncPanelBoundary>
          <BuildPanel activeTab={buildTab} onTabChange={(next) => navigateHash("build", next)} onClose={closeBuild} meta={meta} accountLevel={accountLevel} starterLoadout={starterLoadout} primaryWeaponIndex={primaryWeaponIndex}
            onOpenUpgrades={() => openBuildDetail("earned", () => { setMeta(loadMetaProgress()); setShowUpgrades(true); })}
            onOpenMetaTree={() => openBuildDetail("earned", () => setShowMetaTree(true))}
            onOpenLoadouts={() => openBuildDetail("setup", () => setShowLoadoutBuilder(true))}
          />
        </AsyncPanelBoundary>
      )}
      {showAchievements && (
        <AsyncPanelBoundary>
          <AchievementsPanel achievementsUnlocked={career?.achievementsEver || []} onClose={() => finishRecordDetail(() => setShowAchievements(false))} />
        </AsyncPanelBoundary>
      )}
      {showSettings && (
        <AsyncPanelBoundary>
          <SettingsPanel settings={gameSettings} onSave={onSaveSettings} onClose={() => { setShowSettings(false); clearHash(); }} />
        </AsyncPanelBoundary>
      )}
      {showZombiePractice && <AsyncPanelBoundary><ZombiePractice reducedMotion={gameSettings?.reducedMotion === true || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches} onClose={() => setShowZombiePractice(false)} /></AsyncPanelBoundary>}
      {showMetaTree && (
        <AsyncPanelBoundary>
          <MetaTreePanel onClose={() => finishBuildDetail(() => setShowMetaTree(false))} />
        </AsyncPanelBoundary>
      )}
      {showSupporter && (
        <AsyncPanelBoundary>
          <SupporterModal callsign={username} onClose={() => setShowSupporter(false)} />
        </AsyncPanelBoundary>
      )}
      {showAimCheck && (
        <AimCheckPanel
          controllerType={effectiveControllerType}
          onVerify={completeAimCheck}
          onDiagnostics={() => {
            writePreference("cod-debug-input", "1", "local", "home");
            recordFrontDoorAction("aim_check_diagnostics", { source: "aim_check_panel" });
            setShowAimCheck(false);
            setDeployPanelOpen(true);
          }}
          onClose={() => setShowAimCheck(false)}
        />
      )}
      {showCareerStats && (
        <AsyncPanelBoundary>
          <MP_CareerStats career={career} meta={meta} onClose={() => finishRecordDetail(() => setShowCareerStats(false))} />
        </AsyncPanelBoundary>
      )}
      {showRules && (
        <AsyncPanelBoundary>
          <MP_Rules onClose={() => setShowRules(false)} />
        </AsyncPanelBoundary>
      )}
      {showControls && (
        <AsyncPanelBoundary>
          <MP_Controls isMobile={isMobile} controllerType={effectiveControllerType} onClose={() => setShowControls(false)} />
        </AsyncPanelBoundary>
      )}
      {showMostWanted && (
        <AsyncPanelBoundary>
          <MP_MostWanted onClose={() => setShowMostWanted(false)} />
        </AsyncPanelBoundary>
      )}
      {showMissions && (
        <AsyncPanelBoundary>
          <MP_Missions missions={missions} missionProgress={missionProgress} onClose={() => finishRecordDetail(() => setShowMissions(false))} />
        </AsyncPanelBoundary>
      )}
      {showUpgrades && (
        <AsyncPanelBoundary>
          <MP_Upgrades meta={meta} accountLevel={accountLevel} onClose={() => finishBuildDetail(() => { setMeta(loadMetaProgress()); setShowUpgrades(false); })} />
        </AsyncPanelBoundary>
      )}
      {showRunHistory && (
        <AsyncPanelBoundary>
          <MP_RunHistory
            runHistory={runHistory}
            rivalryHistory={rivalryHistory}
            studioEvents={studioEvents}
            dailyChampion={dailyChampion}
            username={username}
            onLaunchSeed={launchHistorySeed}
            onClose={(reason) => {
              if (reason?.launched) { setReturnToRecord(null); setShowRunHistory(false); return; }
              finishRecordDetail(() => setShowRunHistory(false));
            }}
          />
        </AsyncPanelBoundary>
      )}
      {showLoadoutBuilder && (
        <AsyncPanelBoundary>
          <MP_LoadoutBuilder onClose={() => finishBuildDetail(() => setShowLoadoutBuilder(false))} />
        </AsyncPanelBoundary>
      )}
      {showNewFeatures && (
        <AsyncPanelBoundary>
          <MP_NewFeatures onClose={() => setShowNewFeatures(false)} />
        </AsyncPanelBoundary>
      )}
    </div>
  );
}

function AimCheckPanel({ controllerType, onVerify, onDiagnostics, onClose }) {
  const [evidence, setEvidence] = useState(() => ({ buckets: [], sources: [], complete: false }));
  const arenaRef = useRef(null);
  const capture = useCallback((bucket, source) => {
    if (!bucket) return;
    setEvidence((current) => mergeAimCalibrationEvidence(current, bucket, source));
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const bucket = aimBucketFromKey(event.key);
      if (!bucket) return;
      event.preventDefault();
      capture(bucket, "keyboard");
    };
    window.addEventListener("keydown", onKeyDown);

    let frame = null;
    const pollGamepad = () => {
      const pads = navigator.getGamepads?.() || [];
      const pad = [...pads].find(Boolean);
      if (pad) {
        const aimX = pad.axes?.length >= 4 ? pad.axes[2] : pad.axes?.[0];
        const aimY = pad.axes?.length >= 4 ? pad.axes[3] : pad.axes?.[1];
        capture(aimBucketFromVector(aimX, aimY, 0.55), "gamepad");
      }
      frame = requestAnimationFrame(pollGamepad);
    };
    if (typeof navigator.getGamepads === "function" && typeof requestAnimationFrame === "function") {
      frame = requestAnimationFrame(pollGamepad);
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (frame != null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
    };
  }, [capture]);

  const capturePointer = (event) => {
    const rect = arenaRef.current?.getBoundingClientRect?.();
    if (!rect?.width || !rect?.height) return;
    const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    capture(aimBucketFromVector(x, y, 0.35), event.pointerType || "mouse");
  };

  const targetStyle = (bucket) => {
    const observed = evidence.buckets.includes(bucket);
    return {
      minHeight: 64,
      borderRadius: 8,
      border: observed ? "1px solid rgba(0,255,136,0.78)" : "1px solid rgba(0,229,255,0.28)",
      background: observed ? "rgba(0,255,136,0.14)" : "rgba(0,229,255,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: observed ? "#7CFFBE" : "#B9F3FF",
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 1,
      textAlign: "center",
    };
  };
  const device = controllerType && controllerType !== "controller"
    ? controllerType.toUpperCase()
    : "MOUSE / TOUCH / KEYBOARD / CONTROLLER";
  const remaining = AIM_CALIBRATION_BUCKETS.length - evidence.buckets.length;
  return (
    <DialogShell titleId="aim-check-title" onClose={onClose}>
      <div style={{ width: "min(460px, 100%)", margin: "auto 0", padding: 18, borderRadius: 10, background: "var(--cod-panel-strong)", border: "1px solid rgba(0,229,255,0.32)", color: "var(--cod-ink)", textAlign: "center", boxShadow: "0 14px 40px rgba(0,0,0,0.65)" }}>
        <div style={{ color: "var(--cod-cyan)", fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>EVIDENCE-BACKED AIM CHECK</div>
        <h2 id="aim-check-title" style={{ margin: "8px 0 6px", fontSize: 22, color: "var(--cod-ink)", letterSpacing: 1 }}>Verify Full-Circle Control</h2>
        <p style={{ margin: "0 auto 14px", maxWidth: 380, color: "var(--cod-muted)", fontSize: 12, lineHeight: 1.55 }}>
          Aim through all four directions inside the target, press W/A/S/D or arrow keys, or sweep a controller stick. A receipt is saved only from observed input for {device}.
        </p>
        <div
          ref={arenaRef}
          data-testid="aim-check-arena"
          onPointerDown={capturePointer}
          onPointerMove={capturePointer}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, alignItems: "center", margin: "0 auto 12px", maxWidth: 300, touchAction: "none" }}
        >
          <div />
          <div style={targetStyle("north")}>NORTH {evidence.buckets.includes("north") ? "✓" : ""}</div>
          <div />
          <div style={targetStyle("west")}>WEST {evidence.buckets.includes("west") ? "✓" : ""}</div>
          <div style={{ ...targetStyle("center"), minHeight: 76, borderColor: "rgba(255,107,53,0.4)", background: "rgba(255,107,53,0.08)", color: "#FFB36B" }}>PLAYER</div>
          <div style={targetStyle("east")}>EAST {evidence.buckets.includes("east") ? "✓" : ""}</div>
          <div />
          <div style={targetStyle("south")}>SOUTH {evidence.buckets.includes("south") ? "✓" : ""}</div>
          <div />
        </div>
        <div aria-live="polite" style={{ color: evidence.complete ? "#7CFFBE" : "#FFD34D", fontSize: 11, fontWeight: 900, marginBottom: 10 }}>
          {evidence.complete ? `4/4 observed · ${resolveAimCalibrationSource(evidence.sources).toUpperCase()}` : `${evidence.buckets.length}/4 observed · ${remaining} direction${remaining === 1 ? "" : "s"} left`}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            disabled={!evidence.complete}
            onClick={() => onVerify(evidence)}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: evidence.complete ? "linear-gradient(180deg,#00E5FF,#007A99)" : "#27313A", color: evidence.complete ? "#001018" : "#BFC9D4", fontSize: 12, fontWeight: 900, letterSpacing: 1, cursor: evidence.complete ? "pointer" : "not-allowed", fontFamily: "inherit" }}
          >
            VERIFY CONTROLS
          </button>
          <button onClick={onDiagnostics} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "#DDD", fontSize: 12, fontWeight: 900, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}>
            OPEN DIAGNOSTICS
          </button>
          <button onClick={onClose} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#C5C5C5", fontSize: 12, fontWeight: 900, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}>
            LATER
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
function CodexTab({ truthGraph }) {
  const [section, setSection] = useState("truth");
  const btn = (active) => ({ padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: active ? "rgba(255,107,53,0.14)" : "transparent", border: "1px solid " + (active ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.12)"), color: active ? "var(--cod-orange)" : "var(--cod-muted)", borderRadius: 6 });
  return (
    <div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <button style={btn(section === "truth")} onClick={() => setSection("truth")}>◎ LIVE TRUTH</button>
        <button style={btn(section === "arsenal")}  onClick={() => setSection("arsenal")}>🔫 ARSENAL</button>
        <button style={btn(section === "mostwanted")} onClick={() => setSection("mostwanted")}>👾 MOST WANTED</button>
        <button style={btn(section === "rules")}    onClick={() => setSection("rules")}>📜 RULES</button>
        <button style={btn(section === "news")}     onClick={() => setSection("news")}>✦ WHAT'S NEW</button>
      </div>
      {section === "truth" && (
        <div data-testid="field-manual-truth" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8 }}>
          {truthGraph.claims.map((claim) => (
            <a key={claim.id} href={claim.source} style={{ display: "block", padding: "10px 11px", borderRadius: 8, border: "1px solid rgba(127,230,255,0.16)", background: "rgba(127,230,255,0.04)", color: "inherit", textDecoration: "none" }}>
              <div style={{ color: "var(--cod-cyan)", fontSize: 9, letterSpacing: 1.4, fontWeight: 900 }}>{claim.label.toUpperCase()} · {claim.effectiveDate}</div>
              <div style={{ color: "var(--cod-ink)", fontSize: 13, fontWeight: 900, marginTop: 4 }}>{claim.value}</div>
              <div style={{ color: "var(--cod-muted)", fontSize: 10, lineHeight: 1.45, marginTop: 4 }}>{claim.evidence}</div>
            </a>
          ))}
        </div>
      )}
      {section === "arsenal" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6 }}>
          {WEAPONS.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 11, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
              <span style={{ width: 20, textAlign: "center" }}>{w.emoji}</span>
              <span style={{ fontWeight: 800, color: "var(--cod-ink)", minWidth: 80 }}>{w.name}</span>
              <span style={{ color: "var(--cod-muted)", fontSize: 9 }}>[{i + 1}]</span>
              <span style={{ color: "var(--cod-muted)", fontSize: 10, fontStyle: "italic", marginLeft: "auto", textAlign: "right" }}>{w.desc}</span>
            </div>
          ))}
        </div>
      )}
      {section === "mostwanted" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }}>
          {ENEMY_TYPES.map((e, i) => (
            <div key={i} style={{ padding: "6px 8px", fontSize: 11, background: "rgba(255,255,255,0.03)", borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{e.emoji}</div>
              <div style={{ fontWeight: 800, color: "var(--cod-ink)", fontSize: 11 }}>{e.name}</div>
              <div style={{ color: "var(--cod-muted)", fontSize: 9 }}>HP {e.health} · SPD {e.speed}</div>
            </div>
          ))}
        </div>
      )}
      {section === "rules" && (
        <div style={{ fontSize: 12, color: "var(--cod-muted)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          {QUICK_RULES.map(([emoji, strong1, mid, strong2, tail], i) => (
            <p key={i}>{emoji} <strong>{strong1}</strong>{mid}{strong2 && <strong>{strong2}</strong>}{tail}</p>
          ))}
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
                <strong style={{ color: "var(--cod-orange)" }}>{head}</strong>
                {rest.length > 0 && <span style={{ color: "var(--cod-muted)" }}> — {rest.join(" — ")}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupportTab({ onOpen }) {
  return (
    <div style={{ textAlign: "center", fontSize: 12, color: "var(--cod-muted)", lineHeight: 1.7 }}>
      <div style={{ fontSize: 32 }}>❤️</div>
      <p>Call of Doodie is free. Always will be.</p>
      <p style={{ fontSize: 11, color: "var(--cod-muted)" }}>If you want to see more — a cosmetic ⭐ badge on the leaderboard helps keep the servers running.</p>
      <button onClick={onOpen} style={{ marginTop: 8, padding: "10px 22px", fontSize: 12, fontWeight: 900, fontFamily: "inherit", cursor: "pointer", background: "var(--cod-orange)", color: "var(--cod-orange-ink)", border: "none", borderRadius: 8, letterSpacing: 1 }}>
        ☕ KO-FI · SUPPORT
      </button>
    </div>
  );
}
