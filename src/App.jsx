import { useState, useEffect, useRef, useCallback, useMemo, lazy } from "react";
import AsyncPanelBoundary from "./components/AsyncPanelBoundary.jsx";
import { drawGame } from "./drawGame.js";
import {
  WEAPONS, ENEMY_TYPES, KILLSTREAKS, HITMARKERS, DEATH_MESSAGES, TIPS, PERKS,
  ACHIEVEMENTS, DIFFICULTIES, KILL_MILESTONES, META_UPGRADES,
  GRENADE_COOLDOWN, DASH_COOLDOWN, DASH_SPEED, DASH_DURATION,
  CRIT_CHANCE, CRIT_MULT, COMBO_TIMER_BASE, RUN_MODIFIERS, getWeeklyMutation, WEAPON_SYNERGIES,
  WAVE_CHALLENGE_MUTATIONS, WEAPON_MASTERY_LEVELS, BOSS_GRUDGE_QUOTES,
  getWeeklyGauntlet,
} from "./constants.js";
import { loadLeaderboard, saveToLeaderboard, updateCareerStats, loadCareerStats, getDailyMissions, loadMissionProgress, saveMissionProgress, advanceMissionStreak, loadMetaProgress, getLockedCallsign, lockCallsign, claimCallsign, getAccountLevel, markDailyChallengeSubmitted, getPlayerGlobalRank, saveRunToHistory, loadMetaTree, issueRunToken, saveStudioGameEvent, recordDeathByEnemy, loadRivalryHistory, loadTopGhosts, loadWeeklyTopGhost, loadExperimentIntent, getBossKillRecord, saveBossKillRecord, isNemesis, getAdaptiveSpawnMods, getProximityRivals, getWaveDeathCounts, getWeaponEvolutionState, getCommunityChokePoints, trackRhythmMasteryHit, updateEnemyCareerStatsBatch } from "./storage.js";
import { spawnEnemy as _spawnEnemy, spawnBoss as _spawnBoss, BOSS_ROTATION, applyEliteType, getRandomEliteType, getWaveSpawnRng } from "./gameHelpers.js";
import { preloadEnemyAtlasesForTypes } from "./utils/visualAssetLibrary.js";
import { cosmeticRandom, createNamedRunRng, getRunRng, shuffleWithRng } from "./systems/runRng.js";
import { loadSettings, saveSettings, SETTINGS_DEFAULTS, hudFlags } from "./settings.js";
import { addHeatOnKill, decayHeat, heatTier, resetHeat } from "./systems/heatMeter.js";
import { planEnemyCoinDrop, planEnemyDefeatScore } from "./systems/defeatEconomy.js";
import { applyEnemyDamage, collectQueuedEnemyDefeats, collectUnqueuedLethalEnemies, queueEnemyDefeat, retireEnemyWithoutDefeat, takeQueuedEnemyDefeat } from "./systems/enemyDefeatLifecycle.js";
import { pickObjective, pickWaveChallengeContract, resolveWaveChallengeContract, startWaveChallengeContract } from "./systems/objectiveDirector.js";
import { resolveObjectiveFrame } from "./systems/objectiveFrame.js";
import {
  bulletEnemyCollision,
  computeBulletDamage,
  computeJuggernautShieldDamage,
  findLightningChainTarget,
  resolveEnemyProjectilePlayerHit,
  resolveGrenadeEnemyDamage,
  resolveObstacleBounce,
  resolvePierce,
  rollCrit,
  isPrecisionHit,
} from "./systems/combatResolution.js";
import { identifyWeakness as _identifyWeakness } from "./utils/metaClarity.js";
import {
  soundShoot, soundHitAt, soundDeath, soundLevelUp, soundPickupAt, soundEnemyDeathAt,
  soundLastStand, soundHeartbeatPulse, soundBossFinale,
  soundGrenadeAt, soundBossWave, soundAchievement, soundReload,
  soundDash, soundBossKill, soundWaveClear, soundPerkSelect, soundPrecisionClick, soundPrecisionLock, soundChainEscalate,
  soundBossGrudge, soundComboTick, soundComboBreak,
  soundSummonDismissed,
  soundGamepadConnect, soundGamepadDisconnect,
  startMusic, stopMusic, setMusicIntensity, getMuted, setMuted,
  setMusicVibe, startAmbient, stopAmbient,
  setDangerIntensity, stopDangerDrone, setMusicTier,
  getMusicBPM,
} from "./sounds.js";
import { analyticsInit, track, identify, gameCtx, resolveMode } from "./utils/analytics.js";
import { getDominantArchetype, getNewlyUnlockedArchetypes } from "./utils/buildArchetypes.js";
import { getLevelXpNeeded, getNextPerkLevel, shouldAwardPerkChoice, getWaveSurvivalBonus } from "./utils/levelFlow.js";
import { buildSessionSubmission } from "./utils/runSubmission.js";
import { analyzeReplayCommandTrace, buildReplayProofReceipt, directionBucket, encodeReplayCommandTrace, recordReplayCommandEvent } from "./utils/replayCommandTrace.js";
import { detectControllerType, getPrimaryGamepad, readGamepadControls, rememberControllerProfile } from "./utils/gamepad.js";
import { getRandomPerks, getFullyCursedPerks } from "./utils/perkOptions.js";
import { buildWeeklyGauntletLaunch } from "./utils/gauntletLaunch.js";
import { scheduleIdleWork } from "./utils/deferredWork.js";
import { getRouteOptions } from "./utils/routeOptions.js";
import { resolveHomeVersion } from "./utils/homeVersion.js";
import { useGameLoop } from "./hooks/useGameLoop.js";
import DisplayNameScreen from "./components/DisplayNameScreen.jsx";
import HomeV2 from "./components/HomeV2.jsx";
const HomeV3 = lazy(() => import("./components/HomeV3.jsx"));
import HUD from "./components/HUD.jsx";
import InputDebugOverlay from "./components/InputDebugOverlay.jsx";
import { DesktopWeaponDock, MobileWeaponDock } from "./components/WeaponDock.jsx";
const MenuScreen     = lazy(() => import("./components/MenuScreen.jsx"));
const PauseMenu       = lazy(() => import("./components/PauseMenu.jsx"));
const PerkModal       = lazy(() => import("./components/PerkModal.jsx"));
const WaveShopModal   = lazy(() => import("./components/WaveShopModal.jsx"));
const RouteSelectModal = lazy(() => import("./components/RouteSelectModal.jsx"));
const TutorialOverlay = lazy(() => import("./components/TutorialOverlay.jsx"));
const DraftScreen     = lazy(() => import("./components/DraftScreen.jsx"));
import { getCoinShopOptions, getShopOptions } from "./systems/shopOptions.js";
import {
  consumeBankedPerkChoice,
  createWaveRewardPlan,
  resolveQueuedReward,
} from "./systems/progressionFlow.js";
import { applyArchetypeCapstone, applyPerkSynergies } from "./systems/perkResolution.js";
import { applyCoinShopEffect, applyShopOptionEffect } from "./systems/shopResolution.js";
import { acceptMutation as _acceptMutation } from "./systems/mutationResolution.js";
import { spawnPickup as _spawnPickup } from "./systems/pickupSpawning.js";
import { getBossRangedBurstCount, triggerBossPhaseTwoTransition } from "./systems/bossPhases.js";
import { applyPlayerMovement, buildPointerAimSweepReport, computePointerAimAngle, resolveMovementVector } from "./systems/gameStep.js";
import { buildInputCalibrationRecord, loadInputCalibration, saveInputCalibration, summarizeInputCalibration } from "./utils/inputCalibration.js";
import { buildPwaInstallAttempt, savePwaInstallAttempt } from "./utils/pwaInstallReadiness.js";
import { markTutorialAction, normalizeTutorialEvidence, shouldShowTutorial, TUTORIAL_ACTIONS } from "./utils/tutorialProgress.js";
import { isPlaytestMode, recordActivePlaytestMilestone, startActivePlaytestFlight } from "./utils/playtestFlightRecorder.js";
import { getRoastCallout } from "./utils/roastDirector.js";
import { interpolateBossQuote, getBossTone } from "./utils/bossDialogue.js";
import { getRunAct } from "./utils/runNarrative.js";
import { buildStudioGameEvent } from "./utils/runIntelligence.js";
import { buildFlowField, sampleFlowField } from "./systems/flowField.js";
import { applySergeantAura, buildEnemyFrameIndex, compactTruthyInPlace, countSummonsFor, createEnemyFrameIndex } from "./systems/frameIndex.js";
import { stepAndCompactInPlace, stepTransientEffectsInPlace } from "./systems/transientLifecycle.js";
import { addParticles, addText, MAX_PARTICLES } from "./systems/transientPresentation.js";
import { buildIntegrityLocalSubmissionResult, getRunIntegrityReceipt, recordRunIntegrityFault } from "./systems/runIntegrity.js";
import { planPauseTransition } from "./systems/pauseTransition.js";
import { getInputActivityAge, releaseInputState } from "./systems/inputLifecycle.js";
import { resolveRunEndAttempt, RUN_PHASE } from "./systems/runTermination.js";
import { normalizeVisualPack, VISUAL_PACKS } from "./utils/visualPack.js";
import { createPressureArc, finalizePressureArc, recordFormationExposure, recordPressureSnapshot } from "./systems/pressureArc.js";
import { createGhostRecorder, recordGhostSample } from "./systems/ghostRecorder.js";
import { readPreference, writePreference } from "./utils/gamePreferences.js";
import { loadGhostPlayback, persistGhostRecording } from "./utils/ghostStorage.js";
import { applyObservedPlayerDamage, createDamageSequence, finalizeDamageSequence } from "./systems/damageSequence.js";
import {
  buildWaveTelemetrySnapshot,
  computeWaveThreatRating,
  createWaveDirectorPlan,
  applySpawnFormation,
  getBossWaveGuidance,
  getGuaranteedEliteType,
  getNemesisWeaponRecommendation,
  getSpawnFormationPlan,
  getWaveDirectorState,
  getWaveSpawnRate,
  heatBiasedFormation,
} from "./systems/waveDirector.js";
import { createBossWavePlan } from "./systems/bossWaveFlow.js";
import { buildRematchKit, buildRematchDrillBrief, buildRematchMasteryReceipt, getMaxEnemiesForWave, estimateNonBossWaveCount } from "./systems/rematchDrill.js";
import { buildActiveRunDrill } from "./systems/runDrill.js";
import {
  createDeathStudioEvents,
  createRunHistoryEntry,
  createRunStartArtifacts,
  createScoreSubmitStudioEvents,
  buildScoreSubmitAnalyticsPayload,
  resolveRunModeFromFlags,
} from "./systems/runSession.js";
import { buildDeathScreenProps } from "./systems/deathFlow.js";
import { reconcileOwnership } from "./utils/cosmeticTrack.js";
import { matchesExperiment } from "./utils/runBrain.js";

const AchievementsPanel = lazy(() => import("./components/AchievementsPanel.jsx"));
const DeathScreen = lazy(() => import("./components/DeathScreen.jsx"));

// ── Controller helpers ────────────────────────────────────────────────────────
let _rumbleEnabled = true; // gated by settings.rumble

// Fires haptic feedback on the first connected gamepad if the Vibration Actuator
// API is available (Chrome 68+). Silently no-ops on unsupported browsers/devices.
function rumbleGamepad(weakMagnitude, strongMagnitude, durationMs) {
  if (!_rumbleEnabled) return;
  try {
    const gp = getPrimaryGamepad();
    if (gp?.vibrationActuator) {
      gp.vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: durationMs,
        weakMagnitude,
        strongMagnitude,
      });
    }
  } catch (_) { /* not supported */ }
}
// ── Performance caps ─────────────────────────────────────────────────────────
const MAX_DYING_ANIM  = 20;  // hard cap on death animation objects

export default function CallOfDoodie() {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef      = useRef(null);
  const containerRef   = useRef(null);
  const gsRef          = useRef(null);
  const keysRef        = useRef({});
  const mouseRef       = useRef({ x: 0, y: 0, down: false, moved: false });
  const lastShotRef    = useRef(0);
  const frameRef       = useRef(null);
  const frameMonitorRef = useRef(null);
  const drainEnemyDefeatsRef = useRef(() => 0);
  const joystickRef    = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null });
  const shootStickRef  = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null, shooting: false });
  const sizeRef        = useRef({ w: 800, h: 600 });

  const currentWeaponRef = useRef(Math.max(0, Math.min(WEAPONS.length - 1, Number(readPreference("cod-primary-weapon", "0")) || 0)));
  const isReloadingRef   = useRef(false);
  const comboRef         = useRef({ count: 0, timer: 0, max: 0 });
  const peakMomentRef    = useRef(null); // { wave, count, enemiesAlive, label } at run-best combo
  const killFeedRef      = useRef([]);
  const xpRef            = useRef({ xp: 0, level: 1 });
  const grenadeRef       = useRef({ ready: true, lastUse: 0 });
  const dashRef          = useRef({ ready: true, lastUse: 0, active: 0, dx: 0, dy: 0 });
  const statsRef         = useRef({ bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0, guardianAngels: 0, perksSelected: 0, weaponUpgradesCollected: 0, maxWeaponLevel: 0, bossWavesCleared: 0, dashKills: 0, grenadeKills: 0, noHitWaves: 0, weaponKills: new Array(WEAPONS.length).fill(0), objectiveChains: {}, bestPrecisionStreak: 0 });
  const achievedRef      = useRef(new Set());
  const startTimeRef     = useRef(0);
  const timerRef         = useRef(null);
  const pausedRef        = useRef(false);
  const extraLivesRef    = useRef(0);
  const difficultyRef    = useRef("normal");
  const perkModsRef      = useRef({});   // active perk multipliers
  const perkPendingRef   = useRef(false); // blocks game loop like pause
  const frameCountRef    = useRef(0);    // for throttling React state syncs
  const ctxRef           = useRef(null); // cached canvas 2D context
  const lastHitSoundRef  = useRef(0);    // throttle soundHit calls
  const achCheckRef      = useRef(false);// batch achievement checks to once/frame
  const dailyMissionsRef = useRef([]);   // today's 3 missions
  const missionDoneRef   = useRef(new Set()); // indices of completed missions this run
  const autoAimRef       = useRef(false); // mobile auto-aim toggle
  const starterLoadoutRef = useRef("standard");
  const shopPendingRef   = useRef(false); // blocks game loop like perkPending
  const settingsRef      = useRef(loadSettings()); // game settings
  const frameBufferRef   = useRef([]);    // rolling frame buffer for highlight GIF
  const bestMomentRef    = useRef({ ts: 0, score: 0 }); // highest-excitement timestamp
  const gifOffscreenRef  = useRef(null);  // reusable downscale canvas
  const highlightUrlRef  = useRef(null);  // current object URL (for revocation)
  const ghostRecordRef   = useRef(createGhostRecorder()); // bounded position samples for ghost race recording
  const commandTraceRef  = useRef([]);    // replay command trace events for trust submission
  const deathTraceEvidenceRef = useRef(null); // analyzeReplayCommandTrace result at moment of death
  const weaponMilestonesRef  = useRef([]);    // weapon legend milestones crossed this run
  const lastTraceMoveRef = useRef({ bucket: "neutral", frame: -999 });
  const lastTraceAimRef  = useRef({ bucket: "neutral", frame: -999 });
  const roastCooldowns   = useRef({});    // per-event wave cooldown state for roastDirector
  const waveDeathCountsRef = useRef({});  // {wave: N} — how many LB players died on each wave
  const weaponEvolutionsRef = useRef([]); // per-weapon evolution state loaded at game start
  const bossSessionDeathsRef = useRef({}); // {bossTypeIdx: N} — deaths to each boss this session
  const communityChokePointsRef = useRef(new Set()); // wave numbers that are community choke points
  const gamepadShootRef  = useRef(false); // gamepad RT fire signal
  const gamepadMoveRef   = useRef({ x: 0, y: 0, active: false }); // left-stick movement, kept separate from keyboard state
  const scoreAttackRef        = useRef(false); // synced with scoreAttackMode state for game loop
  const dailyChallengeRef     = useRef(false); // synced with dailyChallengeMode
  const cursedRunRef          = useRef(false); // synced with cursedRunMode
  const bossRushRef           = useRef(false); // synced with bossRushMode
  const runTokenRef           = useRef(null);  // server-issued one-time token for score submit
  const runSummarySigRef      = useRef("");
  const gamepadAngleRef  = useRef(null);  // gamepad right-stick aim angle (null = not active)
  const gamepadPollRef   = useRef(null);  // interval id for gamepad polling
  const gamepadMetaRef   = useRef({ connected: false, index: null, id: "", type: "controller" });
  const inputActivityRef = useRef({ keyboard: 0, mouse: 0, touch: 0, gamepad: 0 });
  const inputReleaseReceiptRef = useRef(null);
  const inputCalibrationRef = useRef(typeof window === "undefined" ? null : loadInputCalibration());
  const experimentMatchedRef = useRef(null); // "matched" | "diverged" | null — set at run start
  const controllerTypeRef = useRef("controller"); // "xbox" | "ps" | "controller"
  const inputDeviceRef   = useRef("mouse"); // "mouse" | "xbox" | "ps" | "controller" | "mobile"
  const playtestModeRef  = useRef(isPlaytestMode()); // query parsing stays off the input hot path
  const pwaPromptRef     = useRef(null);  // deferred beforeinstallprompt event
  const routePendingRef  = useRef(false); // blocks game loop like perkPending
  const bossCutsceneRef  = useRef(false); // blocks game loop during boss intro card
  const waveAnnouncePendingRef = useRef(false);
  const mutationPendingRef      = useRef(false); // blocks game loop during mutation offer
  const postMutationShopRef     = useRef(false); // whether to show shop after mutation resolves
  const bankedPerkChoicesRef    = useRef(0);
  const perksThisWaveRef        = useRef(0); // cap perk screens per wave
  const criticalHealthVisualRef = useRef(false);
  const bossFinalePlayedRef     = useRef(false);
  const heartbeatCounterRef     = useRef(0);
  const deferredMutationOptionsRef = useRef([]);
  const deferredMutationPendingRef = useRef(false);
  const deferredShopPendingRef     = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────────
  // Playing is never gated behind identity creation. New visitors enter the
  // menu as a local guest and choose a public display name only when needed.
  const [screen, setScreen]           = useState("menu");
  const [username, setUsername]       = useState(() => getLockedCallsign() || "Guest");
  const [score, setScore]             = useState(0);
  const [kills, setKills]             = useState(0);
  const [tutorialEvidence, setTutorialEvidence] = useState(() => normalizeTutorialEvidence());
  const tutorialEvidenceRef = useRef(tutorialEvidence);
  const [deaths, setDeaths]           = useState(0);
  const [wave, setWave]               = useState(1);
  const [currentWeapon, setCurrentWeapon] = useState(() => currentWeaponRef.current);
  const [ammo, setAmmo]               = useState(WEAPONS[0].ammo);
  const [health, setHealth]           = useState(100);
  const [killstreak, setKillstreak]   = useState(0);
  const [deathMessage, setDeathMessage] = useState("");
  const [isReloading, setIsReloading] = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [combo, setCombo]             = useState(0);
  const [comboTimer, setComboTimer]   = useState(0);
  const [xp, setXp]                   = useState(0);
  const [level, setLevel]             = useState(1);
  const [killFeed, setKillFeed]       = useState([]);
  const [grenadeReady, setGrenadeReady] = useState(true);
  const [bestStreak, setBestStreak]   = useState(0);
  const [lbLoading, setLbLoading]     = useState(false);
  const [lbHasMore, setLbHasMore]     = useState(true);
  const lbOffsetRef                   = useRef(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [dashReady, setDashReady]     = useState(true);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState([]);
  const [achievementPopup, setAchievementPopup]         = useState(null);
  const [timeSurvived, setTimeSurvived] = useState(0);
  const [tip, setTip]                 = useState("");
  const [paused, setPaused]           = useState(false);
  const [pauseReason, setPauseReason] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [extraLives, setExtraLives]   = useState(0);
  const [difficulty, setDifficulty]   = useState("normal");
  const [guardianAngelFlash, setGuardianAngelFlash] = useState(false);
  const [weaponUpgrades, setWeaponUpgrades] = useState(() => WEAPONS.map(() => 0));
  const [activePerks, setActivePerks] = useState([]);
  const [unlockedArchetypes, setUnlockedArchetypes] = useState([]);
  const [perkPending, setPerkPending] = useState(false);
  const [perkOptions, setPerkOptions] = useState([]);
  const [bossWaveActive, setBossWaveActive] = useState(false);
  const [bossWaveBanner, setBossWaveBanner] = useState(false);
  const [bossCutscene, setBossCutscene]     = useState(null); // { emoji, name, title, quote, wave }
  const [coins, setCoins]                   = useState(0);   // 💩 Doodie Coins per run
  const [starterLoadout, setStarterLoadout] = useState("standard");
  const [runSeed, setRunSeed]             = useState(0);
  const [runModifier, setRunModifier]     = useState(null);
  const [scoreAttackMode, setScoreAttackMode]       = useState(false);
  const [dailyChallengeMode, setDailyChallengeMode] = useState(false);
  const [cursedRunMode, setCursedRunMode]           = useState(false);
  const [bossRushMode, setBossRushMode]             = useState(false);
  const [speedrunMode, setSpeedrunMode]             = useState(false);
  const [gauntletMode, setGauntletMode]             = useState(false);
  const [assistAvailable, setAssistAvailable]       = useState(false);
  const [assistUsed, setAssistUsed]                 = useState(false);
  const speedrunRef  = useRef(false);
  const gauntletRef  = useRef(false);
  const perkOptionsRef        = useRef([]); // mirrors perkOptions state for analytics (no stale closure)
  const weaponSwitchTrackRef  = useRef(0);  // throttle weapon_switch analytics to once per 2s
  const [draftPending, setDraftPending]             = useState(false);
  const [draftOptions, setDraftOptions]             = useState([]);
  const draftShownRef  = useRef(false);
  const draftChosenRef = useRef(null);
  const [challengeVsScore, setChallengeVsScore]     = useState(null);
  const [challengeVsName, setChallengeVsName]       = useState(null);
  const [weaponKillsSnapshot, setWeaponKillsSnapshot] = useState([]);
  const [metaToast, setMetaToast]         = useState(null);
  const [missionsSummary, setMissionsSummary] = useState([]); // captured at death
  const [cosmeticUnlocks, setCosmeticUnlocks] = useState([]); // newly unlocked Doodie Pass items at death
  const [objectivesSummary, setObjectivesSummary] = useState(null); // captured at death: {completed, failed}
  const [shopPending, setShopPending]         = useState(false);
  const [shopOptions, setShopOptions]         = useState([]);
  const [coinShopOptions, setCoinShopOptions] = useState([]);
  const [shopHistory, setShopHistory]         = useState([]); // items bought this run
  const [musicMuted, setMusicMuted]           = useState(() => { const s = readPreference("cod-music-muted", "0") === "1"; setMuted(s); return s; });
  // Sync saved vibe to sounds module on first render
  useState(() => { const v = readPreference("cod-music-vibe"); if (v) setMusicVibe(v); });
  const [colorblindMode, setColorblindMode]   = useState(() => readPreference("cod-colorblind", "0") === "1");
  const [highlightGifUrl, setHighlightGifUrl] = useState(null);
  const [gifEncoding, setGifEncoding]         = useState(false);
  const [musicVibe, setMusicVibeState]        = useState(() => readPreference("cod-music-vibe", "action"));
  const [gameSettings, setGameSettings]       = useState(() => loadSettings());
  const [_showSettings, _setShowSettings]       = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [controllerType, setControllerType] = useState("controller");
  const [inputDebugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "input"
      || readPreference("cod-debug-input", "0") === "1";
  });
  const [inputDebug, setInputDebug] = useState(null);
  const [overclockedShots, setOverclockedShots] = useState(0);
  const [waveStreak, setWaveStreak]             = useState(0);
  const [berserkersKilled, setBerserkersKilled] = useState(0);
  const [pwaPromptReady, setPwaPromptReady]     = useState(false);
  const [mapTheme, setMapTheme]                 = useState(0);
  const [routePending, setRoutePending]         = useState(false);
  const [routeOptions, setRouteOptions]         = useState([]);
  const [bankedPerkChoices, setBankedPerkChoices] = useState(0);
  const [missionToast, setMissionToast]         = useState(null);
  const [waveAnnounce, setWaveAnnounce]         = useState(null);
  const [activeWaveContract, setActiveWaveContract] = useState(null);
  const [mutationPending, setMutationPending]   = useState(false);
  const [mutationOptions, setMutationOptions]   = useState([]);
  const [synergyChargeReady, setSynergyChargeReady] = useState(false);
  const [liveAnnounce, setLiveAnnounce]         = useState(""); // aria-live region for screen readers
  const synergyChargeCooldownRef = useRef(0);
  const archetypeUnlocksRef = useRef(new Set());

  // ── Sync refs to state ────────────────────────────────────────────────────
  useEffect(() => { currentWeaponRef.current = currentWeapon; }, [currentWeapon]);
  useEffect(() => { isReloadingRef.current = isReloading; }, [isReloading]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { extraLivesRef.current = extraLives; }, [extraLives]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => {
    const gs = gsRef.current;
    if (screen !== "game" || !gs?.player || health <= 0) return;
    const maxHealth = gs.player.maxHealth || 100;
    if (health > maxHealth * 0.2) return;
    const roast = getRoastCallout("near_death", roastCooldowns.current, gs.currentWave, 2);
    if (roast) addText(gs, gs.player.x, gs.player.y - 72, roast, "#FF7B9C", true);
  }, [health, screen]);

  // ── Analytics init ────────────────────────────────────────────────────────
  useEffect(() => { analyticsInit(); }, []);
  const dominantArchetype = getDominantArchetype(activePerks);

  // ── PWA install prompt ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); pwaPromptRef.current = e; setPwaPromptReady(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstallApp = useCallback(async () => {
    if (!pwaPromptRef.current) return;
    const promptEvent = pwaPromptRef.current;
    promptEvent.prompt();
    const result = await promptEvent.userChoice.catch(() => null);
    if (result?.outcome) {
      savePwaInstallAttempt(buildPwaInstallAttempt({ outcome: result.outcome }));
    }
    if (!result || result.outcome === "accepted" || result.outcome === "dismissed") {
      pwaPromptRef.current = null;
      setPwaPromptReady(false);
    }
  }, []);

  // ── Warn before accidental tab close / refresh during a run ───────────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    if (screen === "game") {
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [screen]);

  // ── Sync rumble flag from settings ────────────────────────────────────────
  useEffect(() => { _rumbleEnabled = gameSettings.rumble !== false; }, [gameSettings.rumble]);
  const hudFlagsMemo = useMemo(() => hudFlags(gameSettings.hudDensity || "standard"), [gameSettings.hudDensity]);

  // ── Gamepad connect/disconnect sounds ─────────────────────────────────────
  const isFirstGpMount = useRef(true);
  useEffect(() => {
    if (isFirstGpMount.current) { isFirstGpMount.current = false; return; }
    if (gamepadConnected) soundGamepadConnect();
    else soundGamepadDisconnect();
  }, [gamepadConnected]);

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 900 || "ontouchstart" in window;
      setIsMobile(mobile);
      if (mobile) inputDeviceRef.current = "mobile";
    };
    check(); window.addEventListener("resize", check);
    const saved = readPreference("cod-autoaim", "0") === "1";
    autoAimRef.current = saved;
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const actionBarHeight = isMobile ? 56 : 0;
        const h = Math.max(0, containerRef.current.clientHeight - actionBarHeight);
        sizeRef.current = { w, h };
        if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
      }
    };
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [screen, isMobile]);

  const GW = () => sizeRef.current.w;
  const GH = () => sizeRef.current.h;
  const fmtTime = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  // ── Music / colorblind toggles ─────────────────────────────────────────────
  const toggleMusicMuted = useCallback(() => {
    const next = !getMuted();
    setMuted(next);
    setMusicMuted(next);
    writePreference("cod-music-muted", next ? "1" : "0");
    if (next) { stopMusic(); stopAmbient(); } else if (gsRef.current) { startMusic(gsRef.current.bossWave); startAmbient(gsRef.current.mapTheme ?? 0); }
  }, []);

  const toggleColorblind = useCallback(() => {
    setColorblindMode(prev => {
      const next = !prev;
      writePreference("cod-colorblind", next ? "1" : "0");
      return next;
    });
  }, []);

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const refreshLeaderboard = useCallback(async () => {
    setLbLoading(true);
    lbOffsetRef.current = 0;
    const data = await loadLeaderboard(0, 50);
    setLeaderboard(data);
    setLbHasMore(data.length >= 50);
    setLbLoading(false);
  }, []);

  const loadMoreLeaderboard = useCallback(async () => {
    if (lbLoading) return;
    setLbLoading(true);
    const nextOffset = lbOffsetRef.current + 50;
    const data = await loadLeaderboard(nextOffset, 50);
    if (data.length > 0) {
      lbOffsetRef.current = nextOffset;
      setLeaderboard(prev => [...prev, ...data]);
    }
    setLbHasMore(data.length >= 50);
    setLbLoading(false);
  }, [lbLoading]);

  // Online rivalry warms after first paint; explicit leaderboard actions refresh immediately.
  useEffect(() => scheduleIdleWork(refreshLeaderboard), [refreshLeaderboard]);

  // ── Achievements ──────────────────────────────────────────────────────────
  const checkAchievements = useCallback((gs) => {
    if (gs.practiceRun) return; // REMATCH drills can't farm achievements
    const s = {
      kills: gs.kills, wave: gs.currentWave, maxCombo: comboRef.current.max,
      bestStreak: statsRef.current.bestStreak, nukes: statsRef.current.nukes,
      bossKills: statsRef.current.bossKills, dashes: statsRef.current.dashes,
      score: gs.score, grenades: statsRef.current.grenades,
      totalDamage: gs.totalDamage || 0, level: xpRef.current.level,
      crits: statsRef.current.crits, landlordKills: statsRef.current.landlordKills,
      cryptoKills: statsRef.current.cryptoKills,
      timeSurvived: Math.floor((Date.now() - startTimeRef.current) / 1000),
      guardianAngels: statsRef.current.guardianAngels, difficulty: difficultyRef.current,
      perksSelected: statsRef.current.perksSelected,
      weaponUpgradesCollected: statsRef.current.weaponUpgradesCollected,
      maxWeaponLevel: statsRef.current.maxWeaponLevel,
      bossWavesCleared: statsRef.current.bossWavesCleared,
      dashKills: statsRef.current.dashKills || 0,
      noHitWaves: statsRef.current.noHitWaves || 0,
      bossRushMode: gs.bossRushMode || false,
      cursedRunMode: gs.cursedRunMode || false,
      speedrunMode: gs.speedrunMode || false,
      gauntletMode: gs.gauntletMode || false,
      activeSynergies: (gs.activeSynergies || []).length,
      berserkersKilled: statsRef.current.berserkersKilled || 0,
      hotZoneStreak: statsRef.current.objectiveChains?.hotZoneStreak || 0,
      bountyKills: statsRef.current.objectiveChains?.bountyKills || 0,
      perfectEscorts: statsRef.current.objectiveChains?.perfectEscorts || 0,
      clutchLockdowns: statsRef.current.objectiveChains?.clutchLockdowns || 0,
    };
    ACHIEVEMENTS.forEach(a => {
      if (!achievedRef.current.has(a.id) && a.check(s)) {
        achievedRef.current.add(a.id);
        setAchievementsUnlocked(prev => [...prev, a.id]);
        setAchievementPopup(a);
        soundAchievement();
        setTimeout(() => setAchievementPopup(p => p?.id === a.id ? null : p), 3000);
      }
    });
  }, []);

  // ── Daily mission checking ─────────────────────────────────────────────────
  const checkDailyMissions = useCallback((gs) => {
    if (gs.practiceRun) return; // REMATCH drills can't farm daily missions
    const missions = dailyMissionsRef.current;
    if (!missions?.length) return;
    const s = {
      kills: gs.kills, wave: gs.currentWave, maxCombo: comboRef.current.max,
      totalDamage: gs.totalDamage, dashes: statsRef.current.dashes,
      timeSurvived: Math.floor((Date.now() - startTimeRef.current) / 1000),
      crits: statsRef.current.crits, grenadeKills: statsRef.current.grenadeKills || 0,
      bossKills: statsRef.current.bossKills || 0,
      bestStreak: statsRef.current.bestStreak || 0,
      dashKills: statsRef.current.dashKills || 0,
      perksSelected: statsRef.current.perksSelected || 0,
      nukes: statsRef.current.nukes || 0,
      score: gs.score || 0,
      weaponUpgradesCollected: statsRef.current.weaponUpgradesCollected || 0,
      noHitWaves: statsRef.current.noHitWaves || 0,
      singleWeaponKills: Math.max(...(statsRef.current.weaponKills || [0])),
      level: xpRef.current.level || 1,
      bossWavesCleared: statsRef.current.bossWavesCleared || 0,
      maxWeaponLevel: statsRef.current.maxWeaponLevel || 0,
      // Score Attack–specific tracking (only count when in SA mode)
      saScore: gs.scoreAttackMode ? (gs.score || 0) : 0,
      saKills: gs.scoreAttackMode ? (gs.kills || 0) : 0,
      saWave:  gs.scoreAttackMode ? (gs.currentWave || 1) : 0,
    };
    missions.forEach((m, idx) => {
      if (missionDoneRef.current.has(idx)) return;
      if ((s[m.track] || 0) >= m.goal) {
        missionDoneRef.current.add(idx);
        addText(gs, GW() / 2, GH() / 2 - 100, "📋 MISSION COMPLETE!", "#FFD700", true);
        addText(gs, GW() / 2, GH() / 2 - 70, m.text, "#FFF");
        soundAchievement();
        setMissionToast(m.text || m.name || "Mission Complete!");
        setTimeout(() => setMissionToast(null), 2500);
      }
    });
  }, []);

  // ── Init game ─────────────────────────────────────────────────────────────
  const initGame = useCallback((forceSeed, startWave, practiceDrill = null) => {
    const w = sizeRef.current.w, h = sizeRef.current.h;
    const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    // Seed creation is intentionally nondeterministic; once chosen, every
    // score-affecting branch uses a named stream derived from this value.
    const seed = (forceSeed && !isNaN(parseInt(forceSeed))) ? Math.abs(parseInt(forceSeed)) % 999999 : Math.floor(Math.random() * 999999);
    if (playtestModeRef.current) {
      startActivePlaytestFlight({
        meta: {
          difficulty: difficultyRef.current,
          seed,
          practice: Boolean(practiceDrill),
        },
      });
    }
    const career = loadCareerStats();
    gsRef.current = {
      runPhase: RUN_PHASE.PLAYING,
      runEndCause: null,
      visualPack: normalizeVisualPack(settingsRef.current.visualPack),
      player: { x: w / 2, y: h / 2, angle: 0, health: diff.playerHP, maxHealth: diff.playerHP, speed: 4, invincible: 0 },
      enemies: [], bullets: [], particles: [], pickups: [], grenades: [], enemyBullets: [],
      dyingEnemies: [], obstacles: [], terrain: [], floorZones: [], props: [], hazards: [], mapTheme: 0,
      spawnTimer: 0, enemiesThisWave: 0, maxEnemiesThisWave: 5,
      currentWave: 1, score: 0, kills: 0, killstreakCount: 0, damageThisWave: 0,
      floatingTexts: [], screenShake: 0, muzzleFlash: 0, ammoCount: WEAPONS[0].ammo,
      _waveKillsByType: {},
      weaponAmmos: WEAPONS.map(w => w.ammo), // per-weapon ammo state
      weaponMods: {},  // per-weapon curse/bless modifiers: { [idx]: { damageMult, fireRateMult, blessed, cursed } }
      damageFlash: 0, killFlash: 0, totalDamage: 0, trail: [],
      weaponUpgrades: WEAPONS.map(() => 0), bossWave: false,
      runSeed: seed,
      careerBest: { score: career.bestScore || 0, wave: career.bestWave || 0 },
      newBestScore: false, newBestWave: false,
      coinStreakKills: 0, coinStreakTimer: 0, coinMultActive: false, coinMultTimer: 0,
      waveDirector: null, waveDirectorStage: -1, waveTelemetryBand: null, pressureArc: createPressureArc(), damageSequence: createDamageSequence(),
      precisionStreak: 0,
      _adaptiveSpawnMods: getAdaptiveSpawnMods(career),
    };
    const gs0 = gsRef.current;
    if (practiceDrill) {
      gs0.activeRunDrill = buildActiveRunDrill({
        drill: practiceDrill,
        contract: practiceDrill.contract,
        baselineWave: practiceDrill.baselineWave,
        baselineScore: practiceDrill.baselineScore,
        seed,
        launchKind: practiceDrill.launchKind,
        acceptedAt: practiceDrill.acceptedAt,
      });
    }
    // ── REMATCH drill: start at the death wave on the same seed (S112) ──────
    const _rematchKit = buildRematchKit(startWave);
    if (_rematchKit) {
      const gs0 = gsRef.current;
      gs0.practiceRun = true;
      gs0.practiceDrill = buildRematchDrillBrief({ drill: practiceDrill, deathWave: practiceDrill?.deathWave || _rematchKit.startWave, startWave: _rematchKit.startWave });
      gs0.practiceMastery = buildRematchMasteryReceipt({ attempts: 1, wins: 0 });
      gs0.currentWave = _rematchKit.startWave;
      gs0.maxEnemiesThisWave = getMaxEnemiesForWave(_rematchKit.startWave);
      gs0._nonBossWaveCount = estimateNonBossWaveCount(_rematchKit.startWave);
      gs0.coins = (gs0.coins || 0) + _rematchKit.coins;
      gs0.player.maxHealth += _rematchKit.maxHealthBonus;
      gs0.player.health = gs0.player.maxHealth;
      gs0.waveDirector = createWaveDirectorPlan({
        wave: _rematchKit.startWave,
        maxEnemies: gs0.maxEnemiesThisWave,
        nonBossWaveCount: gs0._nonBossWaveCount,
        scoreAttackMode: false,
        gauntletMode: false,
        dailyChallengeMode: false,
        random: getWaveSpawnRng(gs0),
      });
    }
    setRunSeed(seed);
    comboRef.current = { count: 0, timer: 0, max: 0 };
    peakMomentRef.current = null;
    killFeedRef.current = [];
    frameBufferRef.current = [];
    bestMomentRef.current = { ts: 0, score: 0 };
    // Ghost race: load previous run's ghost for same mode, reset recorder
    ghostRecordRef.current = createGhostRecorder();
    commandTraceRef.current = []; // reset command trace for this run
    const _gKey = "cod-ghost-" + (bossRushRef.current ? "boss_rush" : cursedRunRef.current ? "cursed" : scoreAttackRef.current ? "score_attack" : "normal") + "-v1";
    gsRef.current._ghostKey = _gKey;
    gsRef.current.ghost = loadGhostPlayback(_gKey);
    // Persistent ghost leaderboard: load top-3 scores for this mode/difficulty as score targets
    loadTopGhosts(
      bossRushRef.current ? "boss_rush" : cursedRunRef.current ? "cursed" : scoreAttackRef.current ? "score_attack" : "standard",
      difficultyRef.current || "normal"
    ).then(ghosts => { if (gsRef.current) gsRef.current.topGhosts = ghosts; }).catch(() => {});
    loadWeeklyTopGhost(
      bossRushRef.current ? "boss_rush" : cursedRunRef.current ? "cursed" : scoreAttackRef.current ? "score_attack" : "standard",
      difficultyRef.current || "normal"
    ).then(ghost => { if (gsRef.current) gsRef.current.weeklyRival = ghost; }).catch(() => {});
    // Proximity rivals: 3 leaderboard players within ±10% of personal best — continuous rivalry ladder
    try {
      const _careerForRivals = loadCareerStats();
      if (_careerForRivals.bestScore > 0 && leaderboard.length > 0) {
        gsRef.current.proximityRivals = getProximityRivals(_careerForRivals.bestScore, leaderboard, 3);
      }
    } catch { gsRef.current.proximityRivals = []; }
    waveDeathCountsRef.current = getWaveDeathCounts();
    communityChokePointsRef.current = getCommunityChokePoints(waveDeathCountsRef.current);
    weaponEvolutionsRef.current = WEAPONS.map((_, i) => getWeaponEvolutionState(i));
    bossSessionDeathsRef.current = {};
    if (highlightUrlRef.current) { URL.revokeObjectURL(highlightUrlRef.current); highlightUrlRef.current = null; }
    setHighlightGifUrl(null);
    xpRef.current = { xp: 0, level: 1 };
    grenadeRef.current = { ready: true, lastUse: 0 };
    dashRef.current = { ready: true, lastUse: 0, active: 0, dx: 0, dy: 0 };
    statsRef.current = { bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0, guardianAngels: 0, perksSelected: 0, weaponUpgradesCollected: 0, maxWeaponLevel: 0, bossWavesCleared: 0, dashKills: 0, grenadeKills: 0, noHitWaves: 0, weaponKills: new Array(WEAPONS.length).fill(0), objectiveChains: {}, bestPrecisionStreak: 0, nemesisSlain: 0 };
    roastCooldowns.current = {};
    achievedRef.current = new Set();
    perkModsRef.current = {};
    perkPendingRef.current = false;
    ctxRef.current = null;
    startTimeRef.current = Date.now();
    statsRef.current.grenadeKills = 0;
    // Apply tiered meta upgrades
    const meta = loadMetaProgress();
    const ut = meta.upgradeTiers || {};
    gsRef.current.prestigeMult = 1 + (meta.prestige || 0) * 0.10;
    gsRef.current.blitzCount = 0;
    gsRef.current.hyperspeedActive = false;
    gsRef.current.scoreAttackMode = scoreAttackRef.current;
    gsRef.current.scoreAttackTimeLeft = scoreAttackRef.current ? 300 * 60 : 0;
    gsRef.current.cursedRunMode = cursedRunRef.current;
    if (cursedRunRef.current) gsRef.current.killScoreMult = (gsRef.current.killScoreMult || 1) * 3;
    gsRef.current.bossRushMode = bossRushRef.current;
    gsRef.current.developerBossSpawned = false;
    // Apply weekly mutation on top of normal game
    const _weeklyMut = getWeeklyMutation();
    if (_weeklyMut) _weeklyMut.apply(gsRef.current);
    gsRef.current.playerSkin = meta.playerSkin || "";

    // XP gain (veteran)
    const vtier = ut.veteran || 0;
    if (vtier >= 3) perkModsRef.current.xpMult = 1.75;
    else if (vtier >= 2) perkModsRef.current.xpMult = 1.45;
    else if (vtier >= 1) perkModsRef.current.xpMult = 1.20;

    // Dash cooldown (swift_boots)
    const btier = ut.swift_boots || 0;
    if (btier >= 3) perkModsRef.current.dashCDMult = 0.40;
    else if (btier >= 2) perkModsRef.current.dashCDMult = 0.60;
    else if (btier >= 1) perkModsRef.current.dashCDMult = 0.80;

    // Ammo (deep_mag)
    const atier = ut.deep_mag || 0;
    if (atier >= 3) perkModsRef.current.ammoMult = 2.00;
    else if (atier >= 2) perkModsRef.current.ammoMult = 1.60;
    else if (atier >= 1) perkModsRef.current.ammoMult = 1.25;

    // Damage (hardened)
    const htier = ut.hardened || 0;
    if (htier >= 3) perkModsRef.current.damageMult = 1.50;
    else if (htier >= 2) perkModsRef.current.damageMult = 1.30;
    else if (htier >= 1) perkModsRef.current.damageMult = 1.15;

    // Pickup range (scavenger)
    const stier = ut.scavenger || 0;
    if (stier >= 3) perkModsRef.current.pickupRange = 90;
    else if (stier >= 2) perkModsRef.current.pickupRange = 67;
    else if (stier >= 1) perkModsRef.current.pickupRange = 45;

    // HP (field_medic)
    const mtier = ut.field_medic || 0;
    const bonusHP = [0, 20, 50, 100][mtier] || 0;
    if (bonusHP > 0) {
      gsRef.current.player.health += bonusHP;
      gsRef.current.player.maxHealth += bonusHP;
    }

    // Grenade cooldown (grenadier)
    const gtier = ut.grenadier || 0;
    if (gtier >= 3) perkModsRef.current.grenadeCDMult = 0.35;
    else if (gtier >= 2) perkModsRef.current.grenadeCDMult = 0.55;
    else if (gtier >= 1) perkModsRef.current.grenadeCDMult = 0.75;

    // Crit chance (crit_master)
    const ctier = ut.crit_master || 0;
    if (ctier >= 3) perkModsRef.current.critBonus = 0.20;
    else if (ctier >= 2) perkModsRef.current.critBonus = 0.12;
    else if (ctier >= 1) perkModsRef.current.critBonus = 0.05;

    // Move speed (speedster)
    const sptier = ut.speedster || 0;
    if (sptier >= 1 && gsRef.current.player) {
      const smult = [1, 1.10, 1.22, 1.38][sptier];
      gsRef.current.player.speed *= smult;
    }

    // Lifesteal (vampire_bite)
    const vbtier = ut.vampire_bite || 0;
    if (vbtier >= 3) perkModsRef.current.lifesteal = 0.10;
    else if (vbtier >= 2) perkModsRef.current.lifesteal = 0.06;
    else if (vbtier >= 1) perkModsRef.current.lifesteal = 0.03;

    // ── META TREE bonuses ──────────────────────────────────────────────────
    const _treeUnlocked = loadMetaTree();
    if (_treeUnlocked.has("off1")) perkModsRef.current.damageMult = (perkModsRef.current.damageMult || 1) * 1.05;
    if (_treeUnlocked.has("off2")) perkModsRef.current.fireRateMult = (perkModsRef.current.fireRateMult || 1) * 1.10;
    if (_treeUnlocked.has("off3")) perkModsRef.current.critBonus = (perkModsRef.current.critBonus || 0) + 0.08;
    if (_treeUnlocked.has("off4")) gsRef.current._killFrenzyUnlocked = true;
    if (_treeUnlocked.has("def1")) { gsRef.current.player.health += 20; gsRef.current.player.maxHealth += 20; }
    if (_treeUnlocked.has("def2")) gsRef.current._treeArmorMult = 0.92; // 8% damage reduction applied at hit
    if (_treeUnlocked.has("def3")) gsRef.current._treeWaveHeal = 6;
    if (_treeUnlocked.has("def4")) gsRef.current._treeLastStand = true;
    if (_treeUnlocked.has("util1")) perkModsRef.current.ammoMult = (perkModsRef.current.ammoMult || 1) * 1.20;
    if (_treeUnlocked.has("util2")) perkModsRef.current.xpMult = (perkModsRef.current.xpMult || 1) * 1.25;
    if (_treeUnlocked.has("util3")) gsRef.current._treeCoinBonus = 1.30;
    if (_treeUnlocked.has("util4")) gsRef.current._treeFreeShopItem = true;
    if (_treeUnlocked.has("cha1")) gsRef.current._treeMutBoost = 1.25;
    if (_treeUnlocked.has("cha2")) gsRef.current._treeCoinBonus = (gsRef.current._treeCoinBonus || 1) * 1.40;
    if (_treeUnlocked.has("cha3")) gsRef.current._treeGauntletBonusPerk = true;
    if (_treeUnlocked.has("cha4") && gsRef.current.cursedRunMode) gsRef.current.killScoreMult = (gsRef.current.killScoreMult || 1) * 2;

    // Kill Frenzy base speed captured after all speed mods applied
    if (gsRef.current._killFrenzyUnlocked) gsRef.current._killFrenzyBaseSpeed = gsRef.current.player.speed;

    // ── Reduced motion sync ────────────────────────────────────────────────
    gsRef.current.reducedMotion = settingsRef.current.reducedMotion === true
      || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // ── Gauntlet mode init ─────────────────────────────────────────────────
    gsRef.current.gauntletMode = gauntletRef.current;
    gsRef.current.speedrunMode = speedrunRef.current;
    if (gauntletRef.current) {
      try {
        const _gt = getWeeklyGauntlet();
        if (_gt.theme?.statOverrides) {
          Object.assign(gsRef.current, _gt.theme.statOverrides);
          gsRef.current._weeklyThemeLabel = _gt.theme.label;
        }
      } catch {}
    }
    gsRef.current._waveDeaths = 0;   // per-wave death counter for adaptive assist

    // Load daily missions
    dailyMissionsRef.current = getDailyMissions();
    missionDoneRef.current = new Set(
      Object.keys(loadMissionProgress()).map(Number).filter(i => loadMissionProgress()[i])
    );
    // Apply starter loadout
    const loadout = starterLoadoutRef.current;
    if (loadout === "cannon") {
      perkModsRef.current.damageMult = (perkModsRef.current.damageMult || 1) * 1.50;
      gsRef.current.player.health = Math.max(20, Math.floor(gsRef.current.player.maxHealth * 0.60));
    } else if (loadout === "tank") {
      gsRef.current.player.health += 60; gsRef.current.player.maxHealth += 60;
      gsRef.current.player.speed = 3.2;
    } else if (loadout === "speedster") {
      gsRef.current.player.speed = 5.4;
      perkModsRef.current.dashCDMult = (perkModsRef.current.dashCDMult || 1) * 0.60;
    }
    // ── Apply run modifier (seeded, one per run) ──────────────────────────────
    const _mod = RUN_MODIFIERS[seed % RUN_MODIFIERS.length];
    gsRef.current.runModifier = _mod.id;
    setRunModifier(_mod.id);
    switch (_mod.id) {
      case "glass_cannon":
        perkModsRef.current.damageMult = (perkModsRef.current.damageMult || 1) * 2.0;
        gsRef.current.player.health = Math.max(10, Math.floor(gsRef.current.player.health * 0.5));
        gsRef.current.player.maxHealth = Math.max(10, Math.floor(gsRef.current.player.maxHealth * 0.5));
        break;
      case "vampire":
        gsRef.current.vampireMode = true;
        break;
      case "speed_freak":
        gsRef.current.player.speed *= 1.3;
        gsRef.current.enemySpeedMult = 1.2;
        break;
      case "double_trouble":
        gsRef.current.waveEnemyMult = 2;
        gsRef.current.killScoreMult = 1.5;
        break;
      case "lightweight":
        perkModsRef.current.dashCDMult = (perkModsRef.current.dashCDMult || 1) * 0.5;
        gsRef.current.player.speed *= 1.15;
        break;
      case "headhunter":
        gsRef.current.critBonus = 0.15;
        gsRef.current.critMultBonus = 1.0;
        break;
      case "ricochet_plus":
        gsRef.current.extraBounces = 10;
        break;
      case "blessed":
        gsRef.current.player.health = Math.floor(gsRef.current.player.health * 1.5);
        gsRef.current.player.maxHealth = Math.floor(gsRef.current.player.maxHealth * 1.5);
        gsRef.current.player.speed *= 1.10;
        break;
      default: break;
    }

    // Apply user settings to this run
    const sett = settingsRef.current;
    gsRef.current.player.speed *= sett.playerSpeedMult;
    gsRef.current.settSpawnMult       = sett.enemySpawnMult;
    gsRef.current.settEnemyHealthMult = sett.enemyHealthMult;
    gsRef.current.settEnemySpeedMult  = sett.enemySpeedMult;
    gsRef.current.settScreenShakeMult = sett.screenShakeMult;
    gsRef.current.settParticlesMult   = sett.particlesMult;
    gsRef.current.settGrenadeRadMult  = sett.grenadeRadiusMult;
    gsRef.current.settAutoReload            = sett.autoReload;
    gsRef.current.settShowDPS               = sett.showDPS;
    gsRef.current.settCrosshair             = sett.crosshair;
    gsRef.current.settShowEnemyHealthBars   = sett.showEnemyHealthBars ?? false;
    perkModsRef.current.xpMult        = (perkModsRef.current.xpMult || 1) * sett.xpGainMult;
    if (sett.pickupMagnet > 1) perkModsRef.current.pickupRange = Math.max(perkModsRef.current.pickupRange || 30, 30 * sett.pickupMagnet);

    // Generate seeded arena layout (4 named layouts, reproducible per seed)
    let _ws = seed;
    const _sr = () => { _ws = Math.abs((Math.imul(_ws, 1664525) + 1013904223) | 0); return (_ws >>> 0) / 0xFFFFFFFF; };
    const SPAWN_SAFE = 115;
    // ── Named arena layouts ──
    const _LAYOUT_NAMES = ["Pillars", "Corridors", "Cross-Rooms", "Bunker"];
    const _layouts = [
      // 0: Pillars — 8 square pillars in a loose grid
      () => {
        const pts = [[.18,.22],[.50,.12],[.82,.22],[.12,.50],[.88,.50],[.18,.78],[.50,.88],[.82,.78]];
        return pts.map(([rx,ry]) => ({ x: w*rx-15, y: h*ry-15, w:30, h:30 }))
          .filter(ob => Math.hypot(ob.x+15-w/2, ob.y+15-h/2) > SPAWN_SAFE);
      },
      // 1: Corridors — two long horizontal walls with center gaps, tri-lane arena
      () => [
        { x: w*.07, y: h*.34, w: w*.36, h: 18 },
        { x: w*.57, y: h*.34, w: w*.36, h: 18 },
        { x: w*.07, y: h*.63, w: w*.36, h: 18 },
        { x: w*.57, y: h*.63, w: w*.36, h: 18 },
        { x: w*.08, y: h*.10, w: 18, h: h*.22 },
        { x: w*.74, y: h*.10, w: 18, h: h*.22 },
        { x: w*.08, y: h*.68, w: 18, h: h*.22 },
        { x: w*.74, y: h*.68, w: 18, h: h*.22 },
      ],
      // 2: Cross-Rooms — L-shaped walls in each corner, open center
      () => [
        { x: w*.05, y: h*.05, w: w*.20, h: 14 }, { x: w*.05, y: h*.05, w: 14, h: h*.22 },
        { x: w*.75, y: h*.05, w: w*.20, h: 14 }, { x: w*.81, y: h*.05, w: 14, h: h*.22 },
        { x: w*.05, y: h*.81, w: w*.20, h: 14 }, { x: w*.05, y: h*.73, w: 14, h: h*.22 },
        { x: w*.75, y: h*.81, w: w*.20, h: 14 }, { x: w*.81, y: h*.73, w: 14, h: h*.22 },
      ],
      // 3: Bunker — central cover + flanking vertical walls
      () => [
        { x: w*.34, y: h*.28, w: w*.32, h: 18 },
        { x: w*.34, y: h*.54, w: w*.32, h: 18 },
        { x: w*.10, y: h*.18, w: 16, h: h*.28 },
        { x: w*.74, y: h*.18, w: 16, h: h*.28 },
        { x: w*.10, y: h*.54, w: 16, h: h*.28 },
        { x: w*.74, y: h*.54, w: 16, h: h*.28 },
      ],
    ];
    const layoutIdx = Math.floor(_sr() * _layouts.length);
    const walls = _layouts[layoutIdx]();
    gsRef.current._layoutName = _LAYOUT_NAMES[layoutIdx];
    gsRef.current.obstacles = walls;

    // Generate terrain decorations (visual only — no collision)
    const terrainCount = 22 + Math.floor(_sr() * 14); // 22–36 decorations
    const terrain = [];
    for (let _ti = 0; _ti < terrainCount; _ti++) {
      terrain.push({
        x: w * 0.03 + _sr() * w * 0.94,
        y: h * 0.03 + _sr() * h * 0.94,
        type: Math.floor(_sr() * 4), // 0=stain, 1=crack, 2=rubble, 3=worn tile
        size: 14 + _sr() * 40,
        rot: _sr() * Math.PI * 2,
      });
    }
    gsRef.current.terrain = terrain;

    // Map theme + floor zones + props
    const mapTheme = Math.floor(_sr() * 8); // 0=office 1=bunker 2=factory 3=ruins 4=desert 5=forest 6=space 7=arctic
    gsRef.current.mapTheme = mapTheme;
    const THEME_PROPS = [
      ["🪑","💻","☕","🌿","📋","📁","🗑️","🖥️","📎","🖨️","📞","🗃️"],            // office
      ["📦","🪖","🔦","⛽","🪝","🗝️","🧱","🪜","🪤","🔒","💣","🪃"],            // bunker
      ["⚙️","🔧","🔩","⛽","📦","🪛","🏭","🔌","🪚","🛢️","🔋","⚗️"],            // factory
      ["🪨","💀","🏚️","🪵","⚰️","🕸️","🌑","🦴","🧟","🕯️","📜","🗡️"],          // ruins
      ["🌵","🏜️","🦂","🪨","⛺","🐍","🦎","☀️","🌡️","🪬","🌾","🐪"],           // desert
      ["🌲","🌿","🍄","🦊","🐾","🌱","🪵","🦋","🐸","🌳","🍃","🦝"],            // forest
      ["🚀","🛸","🌙","⭐","🪐","🌌","👾","🌟","🛰️","🌠","🔭","👽"],            // space
      ["❄️","🏔️","🐧","🌨️","🦭","⛷️","🐻‍❄️","🧊","🌬️","🏂","🎿","🦌"],      // arctic
    ];
    // Floor zones: large irregular colored patches for visual variety
    const floorZones = [];
    for (let _fz = 0; _fz < 4 + Math.floor(_sr() * 4); _fz++) {
      floorZones.push({
        x: w * 0.04 + _sr() * w * 0.92,
        y: h * 0.04 + _sr() * h * 0.92,
        rx: 55 + _sr() * 120, ry: 35 + _sr() * 80,
        rot: _sr() * Math.PI,
        alpha: 0.04 + _sr() * 0.05,
      });
    }
    gsRef.current.floorZones = floorZones;
    // Props: themed decorative emoji on the floor (no collision)
    const propsPool = THEME_PROPS[mapTheme];
    const props = [];
    for (let _pi = 0; _pi < 12 + Math.floor(_sr() * 6); _pi++) {
      const px = w * 0.06 + _sr() * w * 0.88;
      const py = h * 0.06 + _sr() * h * 0.88;
      const onWall = walls.some(ob => px > ob.x - 10 && px < ob.x + ob.w + 10 && py > ob.y - 10 && py < ob.y + ob.h + 10);
      const nearCenter = Math.hypot(px - w / 2, py - h / 2) < 90;
      if (!onWall && !nearCenter) {
        props.push({ x: px, y: py, emoji: propsPool[Math.floor(_sr() * propsPool.length)], rot: _sr() * Math.PI * 2, scale: 0.7 + _sr() * 0.5 });
      }
    }
    gsRef.current.props = props;

    // Generate arena hazards (3-6 per map, seeded)
    const _hTypes = ["acid", "electro", "rubble"];
    const _hCount = 3 + Math.floor(_sr() * 4); // 3-6 hazards
    const hazards = [];
    for (let hi = 0; hi < _hCount; hi++) {
      const _hType = _hTypes[Math.floor(_sr() * _hTypes.length)];
      const _hx = 80 + _sr() * (w - 160);
      const _hy = 80 + _sr() * (h - 160);
      const _hr = 35 + _sr() * 30; // radius 35-65
      hazards.push({ x: _hx, y: _hy, radius: _hr, type: _hType, pulseTimer: Math.floor(_sr() * 120) });
    }
    gsRef.current.hazards = hazards;

    // Show meta toast if upgrades active
    const metaSnap = loadMetaProgress();
    const ut2 = metaSnap.upgradeTiers || {};
    const tierLabels = ["", "Ⅰ", "Ⅱ", "Ⅲ"];
    const metaActive = META_UPGRADES.filter(u => (ut2[u.id] || 0) > 0);
    if (metaActive.length > 0) {
      const toastParts = metaActive.map(u => `${u.emoji} ${u.name} ${tierLabels[ut2[u.id] || 0]}`);
      if ((metaSnap.prestige || 0) > 0) toastParts.unshift(`⭐ P${metaSnap.prestige}`);
      setMetaToast(toastParts.join("  ·  "));
      setTimeout(() => setMetaToast(null), 4000);
    }
    setTip(TIPS[Math.floor(cosmeticRandom() * TIPS.length)]);
    // Adaptive spawn: notify player if pressure types are being damped this run
    const _asmKeys = Object.keys(gsRef.current._adaptiveSpawnMods || {});
    if (_asmKeys.length > 0) {
      setTimeout(() => {
        const gs = gsRef.current;
        if (gs) addText(gs, sizeRef.current.w / 2, sizeRef.current.h / 2 - 40, "⚙ Adapted for you", "#88FF88", true);
      }, 800);
    }
    return seed;
  }, [leaderboard]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addKillFeed = (enemyName, weaponName) => {
    const entry = { enemy: enemyName, weapon: weaponName, id: Date.now() + cosmeticRandom() };
    killFeedRef.current = [entry, ...killFeedRef.current].slice(0, 5);
    setKillFeed([...killFeedRef.current]);
  };
  const markTutorialEvidence = useCallback((action) => {
    if (!TUTORIAL_ACTIONS.includes(action) || tutorialEvidenceRef.current[action]) return;
    const next = markTutorialAction(tutorialEvidenceRef.current, action);
    tutorialEvidenceRef.current = next;
    setTutorialEvidence(next);
  }, []);
  const recordCommandTrace = useCallback((action, value = "") => {
    markTutorialEvidence(action);
    if (playtestModeRef.current) recordActivePlaytestMilestone(action, { meta: { frame: frameCountRef.current } });
    recordReplayCommandEvent(commandTraceRef.current, {
      frame: frameCountRef.current,
      action,
      value,
    });
  }, [markTutorialEvidence]);
  useEffect(() => {
    if (kills > 0) {
      markTutorialEvidence("kill");
      if (playtestModeRef.current) recordActivePlaytestMilestone("kill", { meta: { kills } });
    }
  }, [kills, markTutorialEvidence]);
  const markInputActivity = useCallback((source) => {
    const key = ["keyboard", "mouse", "touch", "gamepad"].includes(source) ? source : "keyboard";
    inputActivityRef.current[key] = Date.now();
  }, []);
  const releaseAllInputs = useCallback((reason = "explicit", scopes) => {
    const receipt = releaseInputState({
      keysRef,
      mouseRef,
      joystickRef,
      shootStickRef,
      gamepadMoveRef,
      gamepadShootRef,
      gamepadAngleRef,
    }, { reason, scopes });
    inputReleaseReceiptRef.current = receipt;
    return receipt;
  }, []);
  const transitionPause = useCallback((nextPaused, reason = "explicit") => {
    const transition = planPauseTransition({
      paused: pausedRef.current,
      nextPaused,
      reason,
    });
    if (!transition.changed) return transition;
    pausedRef.current = transition.paused;
    if (transition.releaseInputs) {
      releaseAllInputs(`pause:${transition.reason}`);
    }
    setPaused(transition.paused);
    setPauseReason(transition.paused && transition.label ? {
      label: transition.label,
      detail: transition.detail,
    } : null);
    recordCommandTrace("pause", transition.traceValue);
    return transition;
  }, [recordCommandTrace, releaseAllInputs]);
  const sampleCommandTrace = useCallback((action, bucket, interval = 30) => {
    const state = action === "aim" ? lastTraceAimRef.current : lastTraceMoveRef.current;
    const frame = frameCountRef.current;
    if (bucket !== state.bucket || frame - state.frame >= interval) {
      state.bucket = bucket;
      state.frame = frame;
      recordCommandTrace(action, bucket);
    }
  }, [recordCommandTrace]);
  const openQueuedPerkSelection = useCallback(() => {
    const choiceRng = getRunRng(gsRef.current, "choices");
    const perkSelection = consumeBankedPerkChoice({
      bankedPerkChoices: bankedPerkChoicesRef.current,
      isCursedRun: cursedRunRef.current,
      getRandomPerks: (count) => getRandomPerks(count, choiceRng),
      getFullyCursedPerks: (count) => getFullyCursedPerks(count, choiceRng),
    });
    if (!perkSelection) return false;
    bankedPerkChoicesRef.current = perkSelection.bankedPerkChoices;
    setBankedPerkChoices(bankedPerkChoicesRef.current);
    setPerkOptions(perkSelection.perkOptions);
    perkOptionsRef.current = perkSelection.perkOptions;
    setPerkPending(true);
    perkPendingRef.current = true;
    return true;
  }, []);
  const resolveDeferredPerkFlow = useCallback(() => {
    const nextReward = resolveQueuedReward({
      hasBankedPerkChoices: bankedPerkChoicesRef.current > 0,
      deferredMutationPending: deferredMutationPendingRef.current,
      deferredMutationOptions: deferredMutationOptionsRef.current,
      deferredShopPending: deferredShopPendingRef.current,
    });
    if (nextReward.action === "perk") {
      openQueuedPerkSelection();
      return;
    }
    if (nextReward.action === "mutation") {
      deferredMutationPendingRef.current = false;
      setMutationOptions(nextReward.mutationOptions);
      setMutationPending(true);
      mutationPendingRef.current = true;
      deferredMutationOptionsRef.current = [];
      return;
    }
    if (nextReward.action === "shop") {
      deferredShopPendingRef.current = false;
      const gs = gsRef.current;
      if (!gs) return;
      const choiceRng = getRunRng(gs, "choices");
      const opts = getShopOptions(gs, currentWeaponRef.current, choiceRng);
      setShopOptions(opts);
      setCoinShopOptions(getCoinShopOptions(gs, choiceRng));
      setShopPending(true);
      shopPendingRef.current = true;
    }
  }, [openQueuedPerkSelection]);
  const addXp = useCallback((amount) => {
    const ref = xpRef.current;
    const gain = Math.floor(amount * (perkModsRef.current.xpMult || 1));
    ref.xp += gain;
    const needed = getLevelXpNeeded(ref.level);
    if (ref.xp >= needed) {
      ref.xp -= needed; ref.level++;
      setLevel(ref.level);
      soundLevelUp();
      if (gsRef.current) {
        addText(gsRef.current, GW() / 2, GH() / 2 - 60, "⬆ LEVEL " + ref.level + "!", "#00FF88", true);
        gsRef.current.player.speed += 0.12;
      }
      if (!gauntletRef.current && shouldAwardPerkChoice(ref.level) && perksThisWaveRef.current < 1) {
        bankedPerkChoicesRef.current += 1;
        perksThisWaveRef.current += 1;
        setBankedPerkChoices(bankedPerkChoicesRef.current);
        if (gsRef.current) {
          addText(gsRef.current, GW() / 2, GH() / 2 - 92, "✨ DOCTRINE READY", "#FFD700", true);
          addText(gsRef.current, GW() / 2, GH() / 2 - 66, `Next safe pause unlocks ${bankedPerkChoicesRef.current > 1 ? `${bankedPerkChoicesRef.current} perk picks` : "a perk pick"}.`, "#DDD");
        }
      }
    }
    setXp(ref.xp);
  }, []);

  // ── Perk application ─────────────────────────────────────────────────────
  const applyPerk = useCallback((perk) => {
    perk.apply(perkModsRef.current, gsRef.current);
    recordCommandTrace("perk", perk.id);
    // Calibrate Glass Jaw incoming-damage multiplier by difficulty (less brutal at Hard/Insane)
    if (gsRef.current?.glassjaw && !gsRef.current.glassjawMult) {
      const d = difficultyRef.current;
      gsRef.current.glassjawMult = d === "insane" ? 1.4 : d === "hard" ? 1.65 : 2.0;
    }
    const unlockedSynergies = applyPerkSynergies(perkModsRef.current);
    if (unlockedSynergies.length > 0 && gsRef.current) {
      unlockedSynergies.forEach((synergy, index) => {
        const yOffset = index === 0 ? -85 : -50 - ((index - 1) * 30);
        addText(gsRef.current, GW() / 2, GH() / 2 + yOffset, synergy.desc ? synergy.name : "🔗 SYNERGY: " + synergy.name + "!", "#FF88FF", true);
        if (synergy.desc) {
          addText(gsRef.current, GW() / 2, GH() / 2 + yOffset + 30, synergy.desc, "#CC88CC");
        }
        soundLevelUp();
      });
    }
    statsRef.current.perksSelected++;
    // ── Perk pick-rate analytics ──
    const _gs = gsRef.current;
    const _mode = resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current);
    track("perk_chosen", { perkId: perk.id, perkName: perk.name, perkTier: perk.tier, offeredIds: perkOptionsRef.current.map(p => p.id), wave: _gs?.currentWave, difficulty: difficultyRef.current, mode: _mode });
    saveStudioGameEvent(buildStudioGameEvent("perk_choice", {
      surface: "perk_modal",
      perkId: perk.id,
      perkTier: perk.tier,
      offeredIds: perkOptionsRef.current.map((p) => p.id),
      wave: _gs?.currentWave,
      mode: _mode,
      difficulty: difficultyRef.current,
    }));
    const perkRoast = getRoastCallout("perk_chosen", roastCooldowns.current, _gs?.currentWave || 1, 1);
    if (perkRoast && _gs) addText(_gs, GW() / 2, GH() / 2 - 16, perkRoast, "#FFE082");
    perkOptionsRef.current.filter(p => p.id !== perk.id).forEach(skipped => {
      track("perk_skipped", { perkId: skipped.id, perkTier: skipped.tier, chosenId: perk.id, wave: _gs?.currentWave, mode: _mode });
    });
    const nextActivePerks = [...activePerks, perk];
    setActivePerks(nextActivePerks);
    const newlyUnlockedArchetypes = getNewlyUnlockedArchetypes(nextActivePerks, [...archetypeUnlocksRef.current]);
    if (newlyUnlockedArchetypes.length > 0) {
      newlyUnlockedArchetypes.forEach(archetype => {
        archetypeUnlocksRef.current.add(archetype.id);
        track("build_capstone_unlock", {
          archetype: archetype.id,
          wave: _gs?.currentWave,
          mode: _mode,
          difficulty: difficultyRef.current,
          perksSelected: nextActivePerks.length,
        });
        applyArchetypeCapstone(archetype.id, perkModsRef.current, gsRef.current);
        if (gsRef.current) {
          addText(gsRef.current, GW() / 2, GH() / 2 - 112, `${archetype.emoji} CAPSTONE: ${archetype.capstoneName}!`, archetype.color, true);
          addText(gsRef.current, GW() / 2, GH() / 2 - 84, archetype.capstoneDesc, "#DDD");
        }
        soundLevelUp();
      });
      setUnlockedArchetypes([...archetypeUnlocksRef.current]);
    }
    setPerkPending(false);
    perkPendingRef.current = false;
    soundPerkSelect();
    if (gsRef.current) {
      addText(gsRef.current, GW() / 2, GH() / 2 - 40, perk.emoji + " " + perk.name + "!", "#00FF88", true);
    }
    resolveDeferredPerkFlow();
    checkAchievements(gsRef.current || {});
  }, [activePerks, checkAchievements, recordCommandTrace, resolveDeferredPerkFlow]);

  // ── Synergy charge burst ──────────────────────────────────────────────────
  const fireSynergyCharge = useCallback(() => {
    const gs = gsRef.current;
    if (!gs?.synergyChargeReady) return;
    synergyChargeCooldownRef.current = 300; // 5s cooldown at 60fps
    gs.synergyChargeReady = false;
    setSynergyChargeReady(false);
    const p = gs.player;
    if (!p) return;
    for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 6) {
      gs.bullets.push({
        x: p.x, y: p.y, vx: Math.cos(ang) * 12, vy: Math.sin(ang) * 12,
        damage: (WEAPONS[currentWeaponRef.current]?.damage || 20) * 3 * (perkModsRef.current.damageMult || 1),
        pierce: (perkModsRef.current.pierce || 0) + 2,
        life: 40, color: "#FF88FF", wpnIdx: currentWeaponRef.current,
        size: 8, bounces: 0, boomerang: false, bouncesLeft: 0,
      });
    }
    addText(gs, p.x, p.y - 40, "⚡ SYNERGY BURST!", "#FF88FF", true);
    gs.screenShake = 12;
  }, []);

  // ── Wave shop apply ───────────────────────────────────────────────────────
  const applyShopOption = useCallback((optionId) => {
    const gs = gsRef.current;
    if (!gs?.player) return;
    const resolution = applyShopOptionEffect({
      optionId,
      gameState: gs,
      weaponIndex: currentWeaponRef.current,
      weapons: WEAPONS,
      perkMods: perkModsRef.current,
    });
    if (!resolution) return;
    if (resolution.health != null) setHealth(resolution.health);
    if (resolution.ammo != null) setAmmo(resolution.ammo);
    if (resolution.weaponUpgrades) setWeaponUpgrades(resolution.weaponUpgrades);
    if (resolution.stats.weaponUpgradeCollected) {
      statsRef.current.weaponUpgradesCollected++;
    }
    if (resolution.stats.maxWeaponLevel != null) {
      statsRef.current.maxWeaponLevel = Math.max(statsRef.current.maxWeaponLevel, resolution.stats.maxWeaponLevel);
    }
    if (resolution.floatingText) {
      addText(gs, gs.player.x, gs.player.y - 60, resolution.floatingText.text, resolution.floatingText.color, true);
    }
    shopPendingRef.current = false;
    setShopPending(false);
    if (resolution.shopHistoryEntry) {
      setShopHistory(h => [...h, resolution.shopHistoryEntry]);
    }
    recordCommandTrace("shop", optionId);
    track("shop_buy", { itemId: optionId, wave: gs.currentWave, mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current), difficulty: difficultyRef.current });
  }, [recordCommandTrace]);

  // ── Coin shop apply ───────────────────────────────────────────────────────
  const applyCoinShopItem = useCallback((optionId, cost) => {
    const gs = gsRef.current;
    if (!gs?.player || (gs.coins || 0) < cost) return;
    const resolution = applyCoinShopEffect({
      optionId,
      cost,
      gameState: gs,
      weaponIndex: currentWeaponRef.current,
      weapons: WEAPONS,
      perkMods: perkModsRef.current,
      extraLives: extraLivesRef.current,
    });
    if (!resolution) return;
    setCoins(resolution.coins);
    if (resolution.defeatedEnemies?.length) {
      resolution.defeatedEnemies.forEach((en, ni) => { if (ni < 12) addParticles(gs, en.x, en.y, en.color, 8); });
    }
    if (resolution.health != null) setHealth(resolution.health);
    if (resolution.ammo != null) setAmmo(resolution.ammo);
    if (resolution.score != null) setScore(resolution.score);
    if (resolution.grenadeReady) {
      grenadeRef.current.ready = true;
      setGrenadeReady(true);
    }
    if (resolution.extraLives !== extraLivesRef.current) {
      extraLivesRef.current = resolution.extraLives;
      setExtraLives(extraLivesRef.current);
    }
    soundPerkSelect();
    recordCommandTrace("shop", `coin-${optionId}`);
    track("coin_shop_buy", { itemId: optionId, cost, wave: gs.currentWave, coinsAfter: resolution.coins, mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current), difficulty: difficultyRef.current });
  }, [recordCommandTrace]);

  // ── Wave mutation challenge: accept or skip ──────────────────────────────
  const _triggerShopIfNeeded = useCallback(() => {
    if (postMutationShopRef.current) {
      postMutationShopRef.current = false;
      const gs = gsRef.current;
      if (!gs) return;
      const choiceRng = getRunRng(gs, "choices");
      const opts = getShopOptions(gs, currentWeaponRef.current, choiceRng);
      setShopOptions(opts);
      setCoinShopOptions(getCoinShopOptions(gs, choiceRng));
      setShopPending(true);
      shopPendingRef.current = true;
    }
  }, []);

  const applyMutation = useCallback((mutation) => {
    const gs = gsRef.current;
    if (!gs) return;
    const delta = _acceptMutation(gs, mutation);
    if (!delta) return;
    gs.coins = delta.coins;
    setCoins(delta.coins);
    recordCommandTrace("route", `mutation-${mutation?.id || "accepted"}`);
    addText(gs, GW() / 2, GH() / 2 - 80, delta.floatingText.text, delta.floatingText.color, true);
    gs._mutationAcceptFlash = { label: (mutation?.emoji ? mutation.emoji + " " : "") + (mutation?.name || "MUTATION").toUpperCase(), framesLeft: 90 };
    mutationPendingRef.current = false;
    setMutationPending(false);
    setMutationOptions([]);
    _triggerShopIfNeeded();
  }, [_triggerShopIfNeeded, recordCommandTrace]);

  const skipMutation = useCallback(() => {
    mutationPendingRef.current = false;
    setMutationPending(false);
    setMutationOptions([]);
    _triggerShopIfNeeded();
  }, [_triggerShopIfNeeded]);

  // ── Wave route apply ──────────────────────────────────────────────────────
  const applyRoute = useCallback((route) => {
    const gs = gsRef.current;
    if (!gs) return;
    route.apply(gs, perkModsRef.current, getRunRng(gs, "choices"));
    recordCommandTrace("route", route.id);
    const mode = resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current);
    track("route_chosen", {
      routeId: route.id,
      wave: gs.currentWave,
      mode,
      difficulty: difficultyRef.current,
      hp: gs.player?.health,
      coins: gs.coins,
    });
    saveStudioGameEvent(buildStudioGameEvent("route_choice", {
      surface: "route_modal",
      routeId: route.id,
      wave: gs.currentWave,
      mode,
      difficulty: difficultyRef.current,
      hp: gs.player?.health,
      coins: gs.coins,
    }));
    routePendingRef.current = false;
    setRoutePending(false);
    setRouteOptions([]);
  }, [recordCommandTrace]);

  // ── Boss / enemy spawning (logic lives in gameHelpers.js) ────────────────
  const spawnBoss  = useCallback((gs, typeIndex) => _spawnBoss(gs, GW(), GH(), difficultyRef.current, typeIndex), []);
  const spawnEnemy = useCallback((gs) => {
    _spawnEnemy(gs, GW(), GH(), difficultyRef.current);
    const ne = gs.enemies[gs.enemies.length - 1];
    if (ne && gs.visualPack !== VISUAL_PACKS.RETRO) {
      const activeRoster = [ne.typeIndex, ...gs.enemies.slice(-12).map((enemy) => enemy.typeIndex)];
      preloadEnemyAtlasesForTypes(activeRoster);
    }
    // Proximity cluster: same-type enemies spawned within 3 frames get ±60px offset to form visible clusters
    if (gs.currentWave >= 15) {
      if (ne) {
        const _frame = frameCountRef.current;
        const _last = gs._lastSpawnByType?.[ne.typeIndex];
        if (_last && (_frame - _last.frame) < 3) {
          const _crng = getWaveSpawnRng(gs);
          ne.x = Math.max(20, Math.min(GW() - 20, _last.x + (_crng() < 0.5 ? 1 : -1) * (40 + _crng() * 40)));
          ne.y = Math.max(20, Math.min(GH() - 20, _last.y + (_crng() < 0.5 ? 1 : -1) * (40 + _crng() * 40)));
        }
        gs._lastSpawnByType = gs._lastSpawnByType || {};
        gs._lastSpawnByType[ne.typeIndex] = { x: ne.x, y: ne.y, frame: _frame };
      }
    }
  }, []);

  // ── Pickup spawning helper ────────────────────────────────────────────────
  const spawnPickup = useCallback((gs, ex, ey, isBoss) => {
    _spawnPickup(gs, ex, ey, isBoss, {
      ammoDropMult: perkModsRef.current.ammoDropMult || 1,
      rng: getRunRng(gs, "loot"),
    });
  }, []);

  // ── Reload ────────────────────────────────────────────────────────────────
  const doReload = useCallback((wpnIdx) => {
    if (isReloadingRef.current || pausedRef.current) return;
    setIsReloading(true); isReloadingRef.current = true;
    recordCommandTrace("reload", `w${wpnIdx}`);
    const gs = gsRef.current;
    if (gs?.player) {
      const nearbyEnemies = (gs.enemies || []).filter((enemy) => Math.hypot(enemy.x - gs.player.x, enemy.y - gs.player.y) < 220).length;
      if (nearbyEnemies >= 4) {
        const roast = getRoastCallout("reload_under_pressure", roastCooldowns.current, gs.currentWave, 1);
        if (roast) addText(gs, gs.player.x, gs.player.y - 64, roast, "#FFD166", true);
      }
    }
    soundReload();
    setTimeout(() => {
      if (gsRef.current) {
        const upgLevel = gsRef.current.weaponUpgrades?.[wpnIdx] || 0;
        const maxAmmo = Math.floor(WEAPONS[wpnIdx].maxAmmo * (1 + upgLevel * 0.25) * (perkModsRef.current.ammoMult || 1));
        gsRef.current.ammoCount = maxAmmo;
        gsRef.current.weaponAmmos[wpnIdx] = maxAmmo;
        setAmmo(maxAmmo);
      }
      setIsReloading(false); isReloadingRef.current = false;
      if (gsRef.current?.overclocked) { gsRef.current.overclockedShots = 0; setOverclockedShots(0); }
    }, WEAPONS[wpnIdx].reloadTime);
  }, [recordCommandTrace]);

  // ── Shoot ─────────────────────────────────────────────────────────────────
  const shoot = useCallback((gs, weaponIdx, angle) => {
    if (pausedRef.current || perkPendingRef.current) return;
    const weapon = WEAPONS[weaponIdx];
    const combatRng = getRunRng(gs, "combat");
    const lootRng = getRunRng(gs, "loot");
    const now = Date.now();
    const upgLevel = gs.weaponUpgrades?.[weaponIdx] || 0;
    const _wpnMod = gs.weaponMods?.[weaponIdx] || {};
    const fireRateMult = (1 - upgLevel * 0.10) * (perkModsRef.current.fireRateMult || 1) * (gs.synergyFireRateMult || 1) * (_wpnMod.fireRateMult || 1);
    if (now - lastShotRef.current < weapon.fireRate * fireRateMult || gs.ammoCount <= 0 || isReloadingRef.current) return;
    lastShotRef.current = now; gs.ammoCount--; gs.weaponAmmos[weaponIdx] = gs.ammoCount; setAmmo(gs.ammoCount);
    recordCommandTrace("shoot", `w${weaponIdx}`);
    // Overclocked perk: track shots, force reload every 20
    if (gs.overclocked) {
      gs.overclockedShots = (gs.overclockedShots || 0) + 1;
      setOverclockedShots(gs.overclockedShots);
      if (gs.overclockedShots >= 20) {
        gs.overclockedShots = 0;
        setOverclockedShots(0);
        addText(gs, gs.player.x, gs.player.y - 40, "🔧 OVERHEATED!", "#FF8800", true);
        doReload(weaponIdx);
        // Synergy: Overclocked + Scavenger → drop ammo crate on forced reload
        if (perkModsRef.current.reloadDropsAmmo) {
          gs.pickups.push({ x: gs.player.x + (lootRng()-0.5)*60, y: gs.player.y + (lootRng()-0.5)*60, type: "ammo", life: 300 });
          addText(gs, gs.player.x, gs.player.y - 70, "🎒 AMMO DROP!", "#00BFFF");
        }
        // Synergy: Grenade Chain + Overclocked → forced reload readies grenade
        if (perkModsRef.current.reloadFreesGrenade) {
          grenadeRef.current.ready = true;
          setGrenadeReady(true);
          addText(gs, gs.player.x, gs.player.y - 90, "💥 GRENADE READY!", "#FF4500");
        }
      }
    }
    soundShoot(weaponIdx);
    const p = gs.player;
    const maxAmmo = Math.floor(WEAPONS[weaponIdx].maxAmmo * (1 + upgLevel * 0.25) * (perkModsRef.current.ammoMult || 1));
    const lowAmmoThreshold = Math.max(1, Math.min(3, Math.floor(maxAmmo * 0.2)));
    if (gs.ammoCount > 0 && gs.ammoCount <= lowAmmoThreshold) {
      const lowAmmoRoast = getRoastCallout("low_ammo", roastCooldowns.current, gs.currentWave, 1);
      if (lowAmmoRoast) addText(gs, p.x, p.y - 68, lowAmmoRoast, "#FFE082", true);
    }
    const spread = (combatRng() - 0.5) * weapon.spread;
    const a = angle + spread;
    const _evoMult = weaponEvolutionsRef.current[weaponIdx]?.damageMult || 1;
    const damageMult = (perkModsRef.current.damageMult || 1) * (1 + upgLevel * 0.25) * (gs.synergyDamageMult || 1) * (_wpnMod.damageMult || 1) * _evoMult;
    const pierce = perkModsRef.current.pierce || 0;
    const bSize = weapon.bulletSize || (weaponIdx === 1 ? 8 : weaponIdx === 2 ? 2 : 4);
    const bLife = weapon.bulletLife || 60;
    const bSpeed = weapon.bulletSpeed || 12;
    const noRicochet = weaponIdx === 1; // RPG only
    const makeBullet = (ang) => ({
      x: p.x + Math.cos(angle) * 25, y: p.y + Math.sin(angle) * 25,
      vx: Math.cos(ang) * bSpeed, vy: Math.sin(ang) * bSpeed,
      damage: weapon.damage * damageMult, color: weapon.color,
      life: bLife, size: bSize,
      trail: weapon.bulletTrail || weaponIdx === 1, pierceLeft: pierce,
      bouncesLeft: noRicochet ? 0 : 10 + (gs.extraBounces || 0) + (gs.synergyExtraBounces || 0),
      wpnIdx: weaponIdx,
    });
    if (weapon.pellets) {
      // Shotgun — fire N pellets with independent spread (+ synergy extra)
      const totalPellets = weapon.pellets + (gs.synergyExtraPellets || 0);
      for (let pi = 0; pi < totalPellets; pi++) {
        const pa = angle + (combatRng() - 0.5) * weapon.spread;
        gs.bullets.push(makeBullet(pa));
      }
    } else if (weapon.burst) {
      // Burst fire — first shot immediate, rest scheduled
      gs.bullets.push(makeBullet(a));
      for (let bi = 1; bi < weapon.burst; bi++) {
        setTimeout(() => {
          if (!gsRef.current || pausedRef.current) return;
          const ba = angle + (combatRng() - 0.5) * weapon.spread;
          gsRef.current.bullets.push(makeBullet(ba));
        }, bi * (weapon.burstDelay || 90));
      }
    } else if (weapon.boomerang) {
      // Boomerang — curves, returns to player, pierces all enemies
      const bul = makeBullet(a);
      bul.pierceLeft = 99; bul.bouncesLeft = 0;
      bul.boomerang = true; bul.returning = false;
      bul.outboundLife = Math.floor(bLife * 0.45); // reverses at ~55% life remaining
      gs.bullets.push(bul);
    } else if (weapon.hitscan) {
      // Railgun — instant hitscan, queued for game loop processing this frame
      const cos = Math.cos(a), sin = Math.sin(a);
      const ox = p.x + cos * 25, oy = p.y + sin * 25;
      const maxT = Math.hypot(GW(), GH()) * 1.2;
      gs.pendingBeam = { ox, oy, cos, sin, maxT, weaponIdx, color: weapon.color };
      gs.beams = gs.beams || [];
      gs.beams.push({ x1: ox, y1: oy, x2: ox + cos * maxT, y2: oy + sin * maxT, life: 14, maxLife: 14, color: weapon.color });
    } else {
      gs.bullets.push(makeBullet(a));
    }
    gs.muzzleFlash = 4;
    gs.screenShake = Math.max(gs.screenShake, weaponIdx === 1 ? 12 : weaponIdx === 4 ? 18 : 3);
    if (gs.ammoCount <= 0) doReload(weaponIdx);
  }, [doReload, recordCommandTrace]);

  // ── Grenade ───────────────────────────────────────────────────────────────
  const throwGrenade = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || !grenadeRef.current.ready || pausedRef.current || perkPendingRef.current) return;
    grenadeRef.current.ready = false; setGrenadeReady(false);
    const p = gs.player;
    soundGrenadeAt(p.x, GW());
    gs.grenades.push({ x: p.x, y: p.y, vx: Math.cos(p.angle) * 8, vy: Math.sin(p.angle) * 8, life: 45, size: 8 });
    statsRef.current.grenades++;
    recordCommandTrace("grenade", directionBucket(Math.cos(p.angle), Math.sin(p.angle)));
    const cd = GRENADE_COOLDOWN * (perkModsRef.current.grenadeCDMult || 1);
    setTimeout(() => { grenadeRef.current.ready = true; setGrenadeReady(true); }, cd);
  }, [recordCommandTrace]);

  // ── Dash ──────────────────────────────────────────────────────────────────
  const doDash = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || !dashRef.current.ready || pausedRef.current || perkPendingRef.current) return;
    dashRef.current.ready = false; setDashReady(false);
    soundDash();
    const keys = keysRef.current, js = joystickRef.current;
    let ddx = 0, ddy = 0;
    if (keys["w"] || keys["arrowup"]) ddy -= 1;
    if (keys["s"] || keys["arrowdown"]) ddy += 1;
    if (keys["a"] || keys["arrowleft"]) ddx -= 1;
    if (keys["d"] || keys["arrowright"]) ddx += 1;
    if (js.active) { const dist = Math.hypot(js.dx, js.dy); if (dist > 5) { ddx += js.dx / dist; ddy += js.dy / dist; } }
    const gpMove = gamepadMoveRef.current;
    if (gpMove.active) { ddx += gpMove.x; ddy += gpMove.y; }
    const dlen = Math.hypot(ddx, ddy);
    if (dlen > 0) { ddx /= dlen; ddy /= dlen; } else { ddx = Math.cos(gs.player.angle); ddy = Math.sin(gs.player.angle); }
    recordCommandTrace("dash", directionBucket(ddx, ddy));
    dashRef.current.active = DASH_DURATION; dashRef.current.dx = ddx; dashRef.current.dy = ddy;
    gs.player.invincible = Math.max(gs.player.invincible, DASH_DURATION + 5);
    statsRef.current.dashes++;
    addParticles(gs, gs.player.x, gs.player.y, "#00FFFF", 12);
    const cd = DASH_COOLDOWN * (perkModsRef.current.dashCDMult || 1);
    setTimeout(() => { dashRef.current.ready = true; setDashReady(true); }, cd);
  }, [recordCommandTrace]);

  // ── Player death ──────────────────────────────────────────────────────────
  const handlePlayerDeath = useCallback((gs, {
    cause = "lethal_damage",
    allowRecovery = cause === "lethal_damage",
  } = {}) => {
    if (!gs) return false;
    if (gs.runPhase === RUN_PHASE.ENDING || gs.runPhase === RUN_PHASE.ENDED) return true;
    // Dead Man's Hand: massive AOE + grant a free guardian angel (once per run)
    if (allowRecovery && gs.deadMansHand && !gs.deadMansHandUsed) {
      gs.deadMansHandUsed = true;
      const dmhRadius = 250;
      (gs.enemies || []).forEach(e => {
        const d = Math.hypot(e.x - gs.player.x, e.y - gs.player.y);
        if (d < dmhRadius) {
          const result = applyEnemyDamage(e, Math.floor(200 * (1 - d / dmhRadius)), { source: "dead-mans-hand", weaponName: "DEAD MAN'S HAND" });
          if (result.applied > 0) { e.hitFlash = 15; gs.totalDamage += result.applied; }
        }
      });
      addParticles(gs, gs.player.x, gs.player.y, "#FFD700", 40);
      addParticles(gs, gs.player.x, gs.player.y, "#FF4400", 25);
      addParticles(gs, gs.player.x, gs.player.y, "#FFFFFF", 15);
      addText(gs, gs.player.x, gs.player.y - 50, "💀 DEAD MAN'S HAND!", "#FFD700", true);
      gs.screenShake = 25;
      if (extraLivesRef.current === 0) { extraLivesRef.current = 1; setExtraLives(1); }
    }
    const endAttempt = resolveRunEndAttempt({
      phase: gs.runPhase || RUN_PHASE.PLAYING,
      cause,
      allowRecovery,
      metaLastStandAvailable: !!gs._treeLastStand,
      metaLastStandUsed: !!gs._treeLastStandUsed,
      extraLives: extraLivesRef.current,
    });
    // META TREE def4: Last Stand — survive one recoverable lethal hit, restore 50 HP.
    if (endAttempt.kind === "recover" && endAttempt.recovery === "meta-last-stand") {
      gs._treeLastStandUsed = true;
      gs.player.health = endAttempt.health; gs.player.invincible = endAttempt.invincibleFrames;
      setHealth(endAttempt.health);
      addText(gs, gs.player.x, gs.player.y - 50, "👊 LAST STAND!", "#4488FF", true);
      addParticles(gs, gs.player.x, gs.player.y, "#4488FF", 25);
      gs.screenShake = 12;
      return false;
    }
    if (endAttempt.kind === "recover" && endAttempt.recovery === "guardian-angel") {
      extraLivesRef.current = endAttempt.remainingExtraLives;
      setExtraLives(extraLivesRef.current);
      const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
      gs.player.health = diff.playerHP; gs.player.invincible = endAttempt.invincibleFrames;
      setHealth(diff.playerHP);
      gs.enemies.forEach(e => {
        const result = applyEnemyDamage(e, 30, { source: "guardian-angel", weaponName: "GUARDIAN ANGEL" });
        if (result.applied > 0) { e.hitFlash = 10; gs.totalDamage += result.applied; }
      });
      gs.enemyBullets = []; gs.screenShake = 20;
      addText(gs, gs.player.x, gs.player.y - 50, "GUARDIAN ANGEL!", "#FFD700", true);
      addParticles(gs, gs.player.x, gs.player.y, "#FFD700", 30);
      addParticles(gs, gs.player.x, gs.player.y, "#FFFFFF", 20);
      setGuardianAngelFlash(true);
      setTimeout(() => setGuardianAngelFlash(false), 1500);
      return false;
    }
    if (endAttempt.kind === "duplicate") return true;

    // Claim the terminal transition before any storage, audio, analytics, or rendering finalizer.
    gs.runPhase = RUN_PHASE.ENDING;
    gs.runEndCause = endAttempt.cause;
    gs.runEndReceipt = endAttempt;
    releaseAllInputs(`run-ending:${endAttempt.cause}`);
    criticalHealthVisualRef.current = false;
    gs.criticalHealthVisualActive = false;
    setScreen("death");
    setDeathMessage(endAttempt.cause === "score_attack_timeout"
      ? "⏱ TIME's UP! Your final score stands."
      : endAttempt.cause === "runtime_fault"
        ? "The simulation recovered from an unexpected fault. Your run was safely closed."
        : DEATH_MESSAGES[Math.floor(cosmeticRandom() * DEATH_MESSAGES.length)]);
    try {
    if (gs) {
      gs.waveStreak = 0; // reset streak on death
      // Adaptive difficulty: track deaths on this wave — offer assist after 3
      gs._waveDeaths = (gs._waveDeaths || 0) + 1;
      if (gs._waveDeaths >= 2 && !gs._assistUsed) setAssistAvailable(true);
      // Adaptive telegraphing: record likely-killer (last damage source, fall back to nearest enemy)
      try {
        let killerType = gs._lastDamageBy;
        if (killerType == null && gs.enemies?.length && gs.player) {
          let best = null, bd = Infinity;
          for (const e of gs.enemies) {
            const d = Math.hypot(e.x - gs.player.x, e.y - gs.player.y);
            if (d < bd) { bd = d; best = e; }
          }
          if (best) killerType = best.type;
        }
        if (killerType != null) {
          gs._deathKillerType = killerType;
          recordDeathByEnemy(killerType);
          // Track boss deaths for nemesis detection and session escalation
          if (best?.isBossEnemy) {
            try {
              const _prevRec = getBossKillRecord(best.typeIndex);
              saveBossKillRecord(best.typeIndex, { kills: _prevRec.kills, deaths: _prevRec.deaths + 1 });
            } catch {}
            const _bsti = best.typeIndex ?? killerType;
            if (_bsti != null) bossSessionDeathsRef.current[_bsti] = (bossSessionDeathsRef.current[_bsti] || 0) + 1;
          }
        }
      } catch { /* non-fatal */ }
    }
    // Ghost race: persist this run's positions under mode-specific key
    const _gKey = gsRef.current?._ghostKey || "cod-ghost-normal-v1";
    const ghostFinal = persistGhostRecording(_gKey, ghostRecordRef.current, {
      killedByType: gs?._deathKillerType ?? gs?._lastDamageBy ?? null,
      practiceRun: gs?.practiceRun,
    });
    gs.ghostRecorderReceipt = ghostFinal.receipt;
    stopMusic(); stopAmbient(); stopDangerDrone(); setDangerIntensity(0);
    soundDeath();
    rumbleGamepad(0.7, 1.0, 600);
    setDeaths(dd => dd + 1);
    setTotalDamage(Math.floor(gs.totalDamage));
    setWeaponKillsSnapshot([...(statsRef.current.weaponKills || [])]);
    setBestStreak(statsRef.current.bestStreak);
    setTimeSurvived(Math.floor((Date.now() - startTimeRef.current) / 1000));
    // Save career stats + mission progress
    const _prevCareerKills = loadCareerStats().totalKills || 0;
    const _prevAcctLevel = getAccountLevel(_prevCareerKills);
    // Practice (REMATCH) runs keep only non-progression session bookkeeping.
    const _isPracticeRun = !!gs?.practiceRun;
    const _careerResult = updateCareerStats({
      kills: gs.kills, deaths: 1, score: _isPracticeRun ? 0 : gs.score, wave: _isPracticeRun ? 0 : gs.currentWave,
      streak: _isPracticeRun ? 0 : statsRef.current.bestStreak, damage: gs.totalDamage,
      playTime: (Date.now() - startTimeRef.current) / 1000,
      achievementIds: [...achievedRef.current],
      crits: statsRef.current.crits,
      grenades: statsRef.current.grenades,
      dashes: statsRef.current.dashes,
      level: _isPracticeRun ? 0 : xpRef.current.level,
      combo: _isPracticeRun ? 0 : comboRef.current.max,
      bossKills: statsRef.current.bossKills,
      weaponKills: statsRef.current.weaponKills,
      practiceRun: _isPracticeRun,
    });
    weaponMilestonesRef.current = _careerResult?.weaponMilestones || [];
    // Weapon unlock telemetry: emit per-weapon event when account level gates a new weapon
    try {
      const _newAcctLevel = getAccountLevel(loadCareerStats().totalKills || 0);
      if (_newAcctLevel > _prevAcctLevel) {
        for (let _wi = 0; _wi < WEAPON_MASTERY_LEVELS.length; _wi++) {
          const _req = WEAPON_MASTERY_LEVELS[_wi];
          if (_req > _prevAcctLevel && _req <= _newAcctLevel) {
            track("weapon_mastery_earned", { weaponIdx: _wi, masteryAccountLevel: _req, accountLevel: _newAcctLevel, prevLevel: _prevAcctLevel, wave: gs?.currentWave || 0 });
          }
        }
      }
    } catch {}
    const mProgress = {};
    missionDoneRef.current.forEach(i => { mProgress[i] = true; });
    saveMissionProgress(mProgress);
    // Advance daily mission streak if any mission was completed today
    if (missionDoneRef.current.size > 0) advanceMissionStreak();
    // Capture objective summary for death screen
    setObjectivesSummary({
      completed: gs?.objectivesCompleted || [],
      failed: gs?.objectivesFailed || [],
    });
    // Check Doodie Pass cosmetic unlocks against updated career stats
    try {
      const { newlyUnlocked } = reconcileOwnership(loadCareerStats(), username);
      setCosmeticUnlocks(newlyUnlocked);
    } catch { setCosmeticUnlocks([]); }
    // Capture missions summary for death screen (refs become stale after screen change)
    const _missions = dailyMissionsRef.current || [];
    const _done = missionDoneRef.current || new Set();
    setMissionsSummary(_missions.map((m, i) => ({ text: m.text, icon: m.icon, completed: _done.has(i) })));
    // Encode highlight GIF from rolling frame buffer (off-thread via Web Worker)
    setGifEncoding(true);
    (async () => {
      try {
        const buf = frameBufferRef.current;
        if (buf.length >= 8) {
          const oc = gifOffscreenRef.current;
          const gw = oc?.width || 320, gh = oc?.height || 180;
          const best = bestMomentRef.current;
          const midTs = best.score > 0 ? best.ts : (buf[buf.length - 1]?.ts || 0);
          let frames = buf.filter(f => f.ts >= midTs - 2000 && f.ts <= midTs + 4000);
          if (frames.length < 8) frames = buf.slice(-40);
          frames = frames.slice(0, 36);
          if (frames.length > 0) {
            const worker = new Worker(new URL("./workers/gifEncode.worker.js", import.meta.url), { type: "module" });
            const result = await new Promise((resolve, reject) => {
              const t = setTimeout(() => reject(new Error("encode timeout")), 15000);
              worker.onmessage = (ev) => { clearTimeout(t); resolve(ev.data); };
              worker.onerror = (err) => { clearTimeout(t); reject(err); };
              worker.postMessage({ frames, width: gw, height: gh, delay: 100 });
            });
            worker.terminate();
            if (result && result.ok && result.bytes) {
              const blob = new Blob([result.bytes], { type: "image/gif" });
              if (highlightUrlRef.current) URL.revokeObjectURL(highlightUrlRef.current);
              const objUrl = URL.createObjectURL(blob);
              highlightUrlRef.current = objUrl;
              setHighlightGifUrl(objUrl);
            }
          }
        }
      } catch (err) { console.warn("[GIF] encode failed:", err); }
      setGifEncoding(false);
    })();
    if (playtestModeRef.current) {
      recordActivePlaytestMilestone("death", {
        meta: {
          wave: gs.currentWave,
          score: gs.score,
          kills: gs.kills,
          difficulty: difficultyRef.current,
        },
      });
    }
    const runFlags = {
      scoreAttack: scoreAttackRef.current,
      dailyChallenge: dailyChallengeRef.current,
      cursed: cursedRunRef.current,
      bossRush: bossRushRef.current,
      speedrun: speedrunRef.current,
      gauntlet: gauntletRef.current,
    };
    let deathTraceEvidence = null;
    try { deathTraceEvidence = analyzeReplayCommandTrace(encodeReplayCommandTrace(commandTraceRef.current || [])); } catch { deathTraceEvidence = null; }
    deathTraceEvidenceRef.current = deathTraceEvidence;
    const deathTraceReceipt = deathTraceEvidence ? buildReplayProofReceipt(deathTraceEvidence) : null;
    const _killerType = gs?._deathKillerType ?? gs?._lastDamageBy ?? null;
    const _killerEnemy = _killerType != null ? (gs.enemies || []).find(e => e.type === _killerType) : null;
    saveRunToHistory(createRunHistoryEntry({
      score: gs.score,
      kills: gs.kills,
      wave: gs.currentWave,
      timeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      difficulty,
      flags: runFlags,
      runSeed,
      modifier: gs.runModifier || null,
      killedByType: _killerType,
      killedByName: _killerEnemy?.name || null,
      traceEvidence: deathTraceEvidence,
      traceReceipt: deathTraceReceipt,
      integrityReceipt: getRunIntegrityReceipt(gs),
      performanceReceipt: frameMonitorRef.current?.snapshot?.() || null,
      ghostRecorderReceipt: gs.ghostRecorderReceipt,
      pressureReceipt: finalizePressureArc(gs.pressureArc, { deathWave: gs.currentWave }),
      damageReceipt: finalizeDamageSequence(gs.damageSequence, { maxHealth: gs.player?.maxHealth, finalFrame: frameCountRef.current }),
    }));
    createDeathStudioEvents({
      score: gs.score,
      kills: gs.kills,
      wave: gs.currentWave,
      difficulty: difficultyRef.current,
      flags: runFlags,
      runSeed,
    }).forEach(saveStudioGameEvent);
    const deathRoast = getRoastCallout("death", roastCooldowns.current, gs.currentWave, 1);
    if (deathRoast) setTip(deathRoast);
    // ── Analytics: death ──
    track("death", { ...gameCtx({ difficulty: difficultyRef.current, mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current), wave: gs?.currentWave, score: gs?.score }), kills: gs?.kills, timeSurvived: Math.floor((Date.now() - startTimeRef.current) / 1000), bossKills: statsRef.current.bossKills, perksSelected: statsRef.current.perksSelected });
    gs.killstreakCount = 0; setKillstreak(0);
    } catch (error) {
      console.error("[RUN END] Non-critical finalizer failed after terminal transition:", error);
      gs.runEndFinalizerError = String(error?.message || error || "unknown finalizer error");
    } finally {
      gs.runPhase = RUN_PHASE.ENDED;
    }
    return true;
  }, [difficulty, releaseAllInputs, runSeed, username]);

  // enemy-defeat-pipeline:single-executor
  const finalizeEnemyDefeat = (gs, e) => {
    const defeatMeta = takeQueuedEnemyDefeat(e);
    if (!defeatMeta) return false;

    const p = gs.player;
    const W = GW();
    const H = GH();
    e.lastDmgSource = defeatMeta.source;
    (gs._wkbt = gs._wkbt || {})[e.typeIndex] = (gs._wkbt[e.typeIndex] || 0) + 1;

    const comboTimerDuration = Math.floor(COMBO_TIMER_BASE * (perkModsRef.current.comboTimerMult || 1));
    comboRef.current.count++;
    comboRef.current.timer = comboTimerDuration;
    if (comboRef.current.count > comboRef.current.max) {
      comboRef.current.max = comboRef.current.count;
      const peakLabel = comboRef.current.count >= 15 ? "UNSTOPPABLE" : comboRef.current.count >= 10 ? "GODLIKE" : comboRef.current.count >= 5 ? "RAMPAGE" : null;
      if (peakLabel) peakMomentRef.current = { wave: gs.currentWave, count: comboRef.current.count, enemiesAlive: gs.enemies.length, label: peakLabel };
    }
    setCombo(comboRef.current.count);
    if (comboRef.current.count === 5) { gs._comboCardTimer = 60; gs._comboCardTier = "rampage"; }
    else if (comboRef.current.count === 10) { gs._comboCardTimer = 60; gs._comboCardTier = "godlike"; }
    else if (comboRef.current.count === 15) { gs._comboCardTimer = 60; gs._comboCardTier = "unstoppable"; }

    const comboMult = 1 + Math.max(0, comboRef.current.count - 1) * 0.1;
    const defeat = planEnemyDefeatScore({
      enemy: e,
      comboMult,
      killScoreMult: gs.killScoreMult || 1,
      routeKillScoreMult: gs.routeKillScoreMult || 1,
      activeObjective: gs.activeObjective || null,
      playerPos: p,
    });
    const pts = defeat.points;
    gs.score += pts;
    gs.kills++;
    gs.killstreakCount++;
    addHeatOnKill(gs, { isBoss: !!e.isBossEnemy, killstreak: gs.killstreakCount });

    if (e.typeIndex != null) {
      const waveKills = gs._waveKillsByType || (gs._waveKillsByType = {});
      waveKills[e.typeIndex] = { count: (waveKills[e.typeIndex]?.count || 0) + 1, name: e.name || `TYPE${e.typeIndex}` };
    }

    if (defeatMeta.beatEligible) {
      try {
        const framesPerBeat = Math.round(60 / getMusicBPM() * 60);
        const beatPhase = frameCountRef.current % framesPerBeat;
        if (beatPhase < 4 || beatPhase > framesPerBeat - 4) {
          gs.coins = (gs.coins || 0) + 1;
          setCoins(gs.coins);
          addText(gs, e.x, e.y - e.size - 20, "🎵 BEAT KILL! +1💩", "#FF44FF");
          addParticles(gs, e.x, e.y, "#FF44FF", 4);
        }
      } catch {}
    }

    gs.coinStreakKills++;
    gs.coinStreakTimer = 180;
    if (gs.coinStreakKills >= 5 && !gs.coinMultActive) {
      gs.coinMultActive = true;
      gs.coinMultTimer = 600;
      gs.coinStreakKills = 0;
      addText(gs, p.x, p.y - 80, "💩×2 COIN FRENZY! 10s", "#C8A000", true);
    }

    if (dashRef.current.active > 0) statsRef.current.dashKills++;
    if (defeatMeta.weaponIdx != null) statsRef.current.weaponKills[defeatMeta.weaponIdx] = (statsRef.current.weaponKills[defeatMeta.weaponIdx] || 0) + 1;
    if (defeatMeta.source === "grenade") statsRef.current.grenadeKills = (statsRef.current.grenadeKills || 0) + 1;
    if (defeat.careerBoss) statsRef.current.bossKills++;
    if (e.typeIndex === 9) statsRef.current.landlordKills++;
    if (e.typeIndex === 10) statsRef.current.cryptoKills++;
    if (gs.killstreakCount > statsRef.current.bestStreak) {
      statsRef.current.bestStreak = gs.killstreakCount;
      bestMomentRef.current = { ts: Date.now(), score: gs.killstreakCount * 10 };
    }

    if (e.isBossEnemy) {
      soundBossKill();
      rumbleGamepad(0.5, 1.0, 500);
      gs.bossKillFlash = 22;
      gs.screenShake = Math.max(gs.screenShake, 30);
      addParticles(gs, e.x, e.y, e.color, 50);
      addParticles(gs, e.x, e.y, "#FFD700", 30);
      addParticles(gs, e.x, e.y, "#FFFFFF", 20);
      retainLastMatchingInPlace(gs.floatingTexts, (text) => text.big, 4);
      addText(gs, W / 2, H / 3, "☠ BOSS ELIMINATED ☠", "#FF0000", true);
      if (100 > bestMomentRef.current.score) bestMomentRef.current = { ts: Date.now(), score: 100 };
      if (e.typeIndex === 20) gs.algorithmSurge = false;
      const bossRoast = getRoastCallout("boss_kill", roastCooldowns.current, gs.currentWave, 3);
      if (bossRoast) addText(gs, W / 2, H / 3 + 36, bossRoast, "#FFD700");
      try {
        const wasNemesis = isNemesis(e.typeIndex);
        const previous = getBossKillRecord(e.typeIndex);
        saveBossKillRecord(e.typeIndex, { kills: previous.kills + 1, deaths: previous.deaths });
        if (wasNemesis) {
          gs.nemesisBossType = null;
          statsRef.current.nemesisSlain = (statsRef.current.nemesisSlain || 0) + 1;
          addText(gs, W / 2, H / 3 + 56, "🎯 NEMESIS SLAIN! +30💩", "#FF4400", true);
          gs.coins = (gs.coins || 0) + 30;
          setCoins(gs.coins);
        }
      } catch {}
    }

    const lootRng = getRunRng(gs, "loot");
    const coinDrop = planEnemyCoinDrop({ enemy: e, rng: lootRng, coinMultActive: gs.coinMultActive, treeCoinBonus: gs._treeCoinBonus || 1 }).amount;
    if (coinDrop > 0) {
      gs.coins = (gs.coins || 0) + coinDrop;
      setCoins(gs.coins);
      addText(gs, e.x, e.y - 50, `💩+${coinDrop}`, "#C8A000");
      if (!e.isBossEnemy && gs.coinMultActive && gs.floatingTexts.length < 28) {
        const emojiCount = 2 + Math.floor(Math.min(gs.coinStreakKills || 0, 15) / 5);
        for (let index = 0; index < emojiCount; index++) {
          gs.floatingTexts.push({ text: "💩", x: e.x + (cosmeticRandom() - 0.5) * 60, y: e.y - 20 - cosmeticRandom() * 40, vy: -1.2 - cosmeticRandom() * 0.8, life: 35 + Math.floor(cosmeticRandom() * 20), color: "#C8A000" });
        }
      }
      if (!e.isBossEnemy && Math.floor(gs.coins / 25) > Math.floor((gs.lastCoinRoastMilestone || 0) / 25)) {
        gs.lastCoinRoastMilestone = gs.coins;
        const coinRoast = getRoastCallout("coin_milestone", roastCooldowns.current, gs.currentWave, 1);
        if (coinRoast) addText(gs, e.x, e.y - 74, coinRoast, "#FFE082");
      }
    }

    if (gs._killFrenzyUnlocked) gs._killFrenzyTimer = 90;
    setScore(gs.score); setKills(gs.kills); setKillstreak(gs.killstreakCount);
    setBestStreak(statsRef.current.bestStreak); setTotalDamage(Math.floor(gs.totalDamage));
    if (!gs.newBestScore && gs.score > (gs.careerBest?.score || 0)) {
      gs.newBestScore = true;
      addText(gs, W / 2, H / 2 - 120, "🏆 NEW BEST SCORE!", "#FFD700", true);
      addParticles(gs, p.x, p.y - 60, "#FFD700", 25);
      addParticles(gs, p.x, p.y - 60, "#FF4400", 15);
      addParticles(gs, p.x, p.y - 60, "#FFFFFF", 10);
      gs.screenShake = Math.max(gs.screenShake, 8);
    }

    addParticles(gs, e.x, e.y, e.color, 20);
    addText(gs, e.x, e.y - 30, `+${pts}${comboRef.current.count > 1 ? ` (x${comboRef.current.count})` : ""}`, "#FFD700");
    if (!e.isBossEnemy) {
      const deathQuote = Array.isArray(e.deathQuotes) ? e.deathQuotes[Math.floor(cosmeticRandom() * e.deathQuotes.length)] : (e.deathQuote || "...");
      addText(gs, e.x, e.y - 54, `"${deathQuote}"`, "#FF88CC", "quote");
    }
    addKillFeed(e.name, defeatMeta.weaponName);
    if (!e.isBossEnemy) {
      if (e.summonedBy) {
        soundSummonDismissed();
        addText(gs, e.x, e.y - 38, "✨ SUMMON DISMISSED", "#CC88FF");
      } else if ((gs._deathSoundsThisFrame || 0) < 2) {
        gs._deathSoundsThisFrame = (gs._deathSoundsThisFrame || 0) + 1;
        soundEnemyDeathAt(e.typeIndex, e.x, W, comboRef.current.count);
      }
    }

    addXp(pts);
    gs.killFlash = 6;
    if (gs.vampireMode) { p.health = Math.min(p.maxHealth, p.health + 3); setHealth(Math.floor(p.health)); }
    if (perkModsRef.current.adrenalineRush && p.health > 0 && p.health < p.maxHealth * 0.30) {
      gs.adrenalineRushTimer = perkModsRef.current.adrenalineRushDuration || 120;
      addText(gs, p.x, p.y - 50, "⚡ ADRENALINE!", "#FF6600", true);
      addParticles(gs, p.x, p.y, "#FF6600", 12);
    }

    gs.dyingEnemies = gs.dyingEnemies || [];
    if (gs.dyingEnemies.length < MAX_DYING_ANIM) gs.dyingEnemies.push({ x: e.x, y: e.y, emoji: e.emoji, color: e.color, size: e.size, life: 22, maxLife: 22 });
    if (e.eliteType === "berserker") {
      statsRef.current.berserkersKilled = (statsRef.current.berserkersKilled || 0) + 1;
      setBerserkersKilled(statsRef.current.berserkersKilled);
    }
    if (e.eliteType === "explosive") {
      const explosionRadius = 85;
      addParticles(gs, e.x, e.y, "#FF6600", 20); addParticles(gs, e.x, e.y, "#FFAA00", 12);
      gs.screenShake = Math.max(gs.screenShake, 8);
      addText(gs, e.x, e.y - 40, "💥 CHAIN!", "#FF6600");
      gs.enemies.forEach((nearbyEnemy) => {
        if (nearbyEnemy === e || nearbyEnemy.health <= 0) return;
        const deltaX = nearbyEnemy.x - e.x, deltaY = nearbyEnemy.y - e.y;
        if (deltaX * deltaX + deltaY * deltaY < explosionRadius * explosionRadius) {
          const result = applyEnemyDamage(nearbyEnemy, 35, { source: "elite-chain", weaponName: "CHAIN REACTION" });
          if (result.applied > 0) nearbyEnemy.hitFlash = 10;
        }
      });
    }

    if (!e.isBossEnemy && KILL_MILESTONES[gs.kills]) {
      addText(gs, W / 2, H / 2 - 90, KILL_MILESTONES[gs.kills], "#FF44FF", true);
      addText(gs, W / 2, H / 2 - 65, `${gs.kills} KILLS!`, "#FFF", true);
      gs.screenShake = 10; addParticles(gs, W / 2, H / 2 - 80, "#FF44FF", 20);
    }
    if (gs.kills === 1) {
      const firstBloodRoast = getRoastCallout("first_blood", roastCooldowns.current, gs.currentWave, 1);
      if (firstBloodRoast) addText(gs, W / 2, 56, firstBloodRoast, "#FFB5C5", true);
    }
    if (!e.isBossEnemy && gs.killstreakCount % 5 === 0 && gs.killstreakCount > 0) {
      const streakIndex = Math.min(Math.floor(gs.killstreakCount / 5) - 1, KILLSTREAKS.length - 1);
      addText(gs, W / 2, 80, `${KILLSTREAKS[streakIndex]}!`, "#FF4500", true);
      const streakRoast = getRoastCallout("kill_streak", roastCooldowns.current, gs.currentWave);
      if (streakRoast) addText(gs, W / 2, 108, streakRoast, "#FF8855");
      gs.enemies.forEach((nearbyEnemy) => {
        const result = applyEnemyDamage(nearbyEnemy, 40, { source: "killstreak", weaponName: "KILLSTREAK" });
        if (result.applied > 0) nearbyEnemy.hitFlash = 15;
      });
      gs.screenShake = 12;
    }

    if (e.splitOnDeath && !e.splitDone) {
      e.splitDone = true;
      addText(gs, e.x, e.y - 50, "💔 SPLIT!", "#FF6688", true);
      for (let index = 0; index < 3; index++) {
        const angle = (index / 3) * Math.PI * 2 + 0.5;
        const shardHealth = e.maxHealth * 0.35;
        gs.enemies.push({ x: e.x + Math.cos(angle) * 55, y: e.y + Math.sin(angle) * 55, health: shardHealth, maxHealth: shardHealth, speed: e.speed * 1.4 * (gs.waveEventSpeedMult || 1), size: e.size * 0.58, color: "#FF8899", name: "Splitter Shard", points: Math.floor(e.points * 0.25), deathQuotes: ["..."], emoji: "💔", typeIndex: 16, wobble: getRunRng(gs, "hazards")() * Math.PI * 2, hitFlash: 0, ranged: false, projSpeed: 0, projRate: 999, shootTimer: 60, isBossEnemy: false, splitOnDeath: false });
      }
      addParticles(gs, e.x, e.y, "#FF6688", 30);
    }

    const isShard = e.typeIndex === 16 && !e.isBossEnemy;
    if (!isShard) {
      if (e.isBossEnemy && extraLivesRef.current === 0 && lootRng() < 0.18) gs.pickups.push({ x: e.x, y: e.y, type: "guardian_angel", life: 600 });
      else if ((e.isBossEnemy || lootRng() < 0.25) && !gs.siegeMode) spawnPickup(gs, e.x, e.y, e.isBossEnemy);
    }
    achCheckRef.current = true;
    return true;
  };

  const drainEnemyDefeats = (gs) => {
    const unattributed = collectUnqueuedLethalEnemies(gs.enemies);
    if (unattributed.length > 0) {
      for (const enemy of unattributed) queueEnemyDefeat(enemy, { source: "unattributed", weaponName: "UNATTRIBUTED" });
      recordRunIntegrityFault(gs, {
        stage: "enemy_defeat_unattributed",
        error: new Error(`${unattributed.length} lethal enemies bypassed defeat attribution`),
        wave: gs.currentWave,
      });
    }
    let processed = 0;
    while (true) {
      const pending = collectQueuedEnemyDefeats(gs.enemies);
      if (pending.length === 0) break;
      for (const enemy of pending) if (finalizeEnemyDefeat(gs, enemy)) processed++;
      if (processed > 2048) {
        recordRunIntegrityFault(gs, { stage: "enemy_defeat_pipeline", error: new Error("enemy defeat chain exceeded fixed safety bound"), wave: gs.currentWave });
        break;
      }
    }
    gs.enemies = stepAndCompactInPlace(gs.enemies, (enemy) => !enemy._defeatResolved);
    return processed;
  };
  drainEnemyDefeatsRef.current = drainEnemyDefeats;

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(async (forceSeed, challengeOpts = {}) => {
    const gauntletLaunch = gauntletRef.current ? buildWeeklyGauntletLaunch(getWeeklyGauntlet()) : null;
    if (gauntletLaunch) {
      forceSeed = gauntletLaunch.seed;
      difficultyRef.current = gauntletLaunch.difficulty; setDifficulty(gauntletLaunch.difficulty);
      currentWeaponRef.current = gauntletLaunch.weaponIndex; setCurrentWeapon(gauntletLaunch.weaponIndex);
      challengeOpts = { ...challengeOpts, gauntletWeek: gauntletLaunch.week };
    }
    // Show pre-deployment perk draft (skip in Daily Challenge to preserve seed fairness)
    if (!draftShownRef.current && !dailyChallengeMode && !gauntletLaunch) {
      const draftSeed = Number(forceSeed);
      const draftRng = Number.isFinite(draftSeed) && draftSeed > 0
        ? createNamedRunRng({ seed: draftSeed, wave: 1, name: "choices" })
        : Math.random;
      const opts = getRandomPerks(3, draftRng);
      setDraftOptions(opts);
      setDraftPending(true);
      draftShownRef.current = true;
      // Store args so applyDraftPerk can finish starting the game
      draftShownRef._forceSeed = forceSeed;
      draftShownRef._challengeOpts = challengeOpts;
      return;
    }
    // Reset draft gate for next run
    draftShownRef.current = false;
    releaseAllInputs("run-start");
    if (shouldShowTutorial()) {
      const resetEvidence = normalizeTutorialEvidence();
      tutorialEvidenceRef.current = resetEvidence;
      setTutorialEvidence(resetEvidence);
    }
    // Store challenge vs data for HUD + DeathScreen.
    // If no explicit challenge, auto-load the most recent unbeaten rivalry as a pressure target.
    let vsScore = challengeOpts.vs ?? null;
    let vsName = challengeOpts.vsName ?? null;
    if (vsScore == null) {
      try {
        const rivalry = loadRivalryHistory();
        const unbeaten = rivalry.find(r => r.vsScore != null && r.won === false);
        if (unbeaten) { vsScore = unbeaten.vsScore; vsName = unbeaten.vsName || null; }
      } catch {}
    }
    setChallengeVsScore(vsScore);
    setChallengeVsName(vsName);
    stopMusic(); stopAmbient();
    settingsRef.current = loadSettings(); // refresh settings at game start
    const seed = initGame(forceSeed, challengeOpts.startWave, challengeOpts.drill || null);
    // Adaptive telegraph: precompute per-enemy-type warning multiplier from
    // recent deaths. Read once per run; written by handlePlayerDeath.
    try {
      const career = loadCareerStats();
      const arr = Array.isArray(career.recentDeathsByEnemy) ? career.recentDeathsByEnemy : [];
      const counts = {};
      for (const d of arr) counts[d.t] = (counts[d.t] || 0) + 1;
      const tmap = {};
      for (const t of Object.keys(counts)) {
        tmap[t] = counts[t] >= 3 ? 2.0 : counts[t] >= 2 ? 1.5 : 1;
      }
      gsRef.current._telegraphMult = tmap;
    } catch { gsRef.current._telegraphMult = {}; }
    resetHeat(gsRef.current);
    gsRef.current._lastHeatTier = 0;
    setScreen("game"); setScore(0); setKills(0); setDeaths(0); setWave(gsRef.current.currentWave || 1);
    const starterWeapon = Math.max(0, Math.min(WEAPONS.length - 1, currentWeaponRef.current));
    gsRef.current.ammoCount = gsRef.current.weaponAmmos[starterWeapon] ?? WEAPONS[starterWeapon].ammo;
    setCurrentWeapon(starterWeapon); setAmmo(gsRef.current.ammoCount); setHealth(gsRef.current.player.health);
    setKillstreak(0); setIsReloading(false); setCombo(0); setComboTimer(0);
    setXp(0); setLevel(1); setKillFeed([]); setGrenadeReady(true); setDashReady(true);
    setBestStreak(0); setTotalDamage(0); setBerserkersKilled(0);
    setAchievementsUnlocked([]); setAchievementPopup(null); setTimeSurvived(0);
    pausedRef.current = false; setPaused(false); setPauseReason(null); setExtraLives(0); extraLivesRef.current = 0;
    setGuardianAngelFlash(false); setWeaponUpgrades(WEAPONS.map(() => 0));
    starterLoadoutRef.current = starterLoadout;
    // Check if this run follows the last RunBrain experiment suggestion
    try {
      const _intent = loadExperimentIntent();
      experimentMatchedRef.current = matchesExperiment({
        starterLoadout,
        mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current),
        difficulty: difficultyRef.current,
      }, _intent);
    } catch { experimentMatchedRef.current = null; }
    setActivePerks([]); setPerkPending(false); setPerkOptions([]); setBossWaveActive(false); setBossWaveBanner(false);
    archetypeUnlocksRef.current = new Set();
    setUnlockedArchetypes([]);
    // Apply draft perk if one was chosen — defer so applyPerk runs after state resets
    const _draftPerk = gauntletLaunch ? PERKS[gauntletLaunch.startPerkIndex] : draftChosenRef.current;
    draftChosenRef.current = null;
    if (_draftPerk) {
      setTimeout(() => applyPerk(_draftPerk), 80);
    }
    setShopPending(false); setShopOptions([]); setCoinShopOptions([]); shopPendingRef.current = false; setShopHistory([]);
    setRoutePending(false); setRouteOptions([]); routePendingRef.current = false;
    bankedPerkChoicesRef.current = 0;
    setBankedPerkChoices(0);
    perksThisWaveRef.current = 0;
    criticalHealthVisualRef.current = false;
    bossFinalePlayedRef.current = false;
    heartbeatCounterRef.current = 0;
    deferredMutationOptionsRef.current = [];
    deferredMutationPendingRef.current = false;
    deferredShopPendingRef.current = false;
    setBossCutscene(null); bossCutsceneRef.current = false;
    setCoins(gsRef.current?.coins || 0);
    setActiveWaveContract(null);
    runTokenRef.current = null;
    runSummarySigRef.current = "";
    currentWeaponRef.current = starterWeapon; isReloadingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { if (!pausedRef.current && !perkPendingRef.current && !shopPendingRef.current && !routePendingRef.current && !bossCutsceneRef.current && !waveAnnouncePendingRef.current && !mutationPendingRef.current) setTimeSurvived(t => t + 1); }, 1000);
    setTimeout(() => {
      startMusic(false);
      startAmbient(gsRef.current?.mapTheme ?? 0);
    }, 200); // small delay to let audio context resume
    // ── Analytics: game start ──
    const startArtifacts = createRunStartArtifacts({
      difficulty: difficultyRef.current,
      starterLoadout,
      seed,
      flags: {
        scoreAttack: scoreAttackRef.current,
        dailyChallenge: dailyChallengeRef.current,
        cursed: cursedRunRef.current,
        bossRush: bossRushRef.current,
        speedrun: speedrunRef.current,
        gauntlet: gauntletRef.current,
      },
    });
    const _startMode = startArtifacts.mode;
    const runClaim = startArtifacts.runClaim;
    issueRunToken(runClaim).then(runTicket => {
      runTokenRef.current = runTicket?.token || null;
      runSummarySigRef.current = runTicket?.summarySig || "";
    }).catch(() => {
      runTokenRef.current = null;
      runSummarySigRef.current = "";
    });
    track("game_start", { difficulty: difficultyRef.current, mode: _startMode, weapon: WEAPONS[starterWeapon]?.name, starterLoadout });
    if (_startMode !== "standard") track("mode_start", { mode: _startMode, difficulty: difficultyRef.current });
    if (gauntletLaunch) {
      gsRef.current._gauntletLaunch = gauntletLaunch;
      track("gauntlet_contract_start", gauntletLaunch);
    }
    try {
      const _acctLevel = getAccountLevel(loadCareerStats().totalKills || 0);
      const _masteredCount = WEAPON_MASTERY_LEVELS.filter((requiredLevel) => _acctLevel >= requiredLevel).length;
      if (_masteredCount < WEAPONS.length) {
        track("weapon_mastery_snapshot", { accountLevel: _acctLevel, masteredCount: _masteredCount, totalWeapons: WEAPONS.length, availability: "all-open" });
      }
    } catch {}
  }, [applyPerk, dailyChallengeMode, initGame, releaseAllInputs, starterLoadout]);

  // ── Draft perk selection ───────────────────────────────────────────────────
  const applyDraftPerk = useCallback((perk) => {
    setDraftPending(false);
    setDraftOptions([]);
    draftChosenRef.current = perk; // null = skip
    // Resume game start with the stored args
    const forceSeed = draftShownRef._forceSeed;
    const challengeOpts = draftShownRef._challengeOpts || {};
    draftShownRef._forceSeed = undefined;
    draftShownRef._challengeOpts = undefined;
    startGame(forceSeed, challengeOpts);
  }, [startGame]);

  useEffect(() => {
    if (screen !== "game" && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [screen]);

  // ── Weapon switch ─────────────────────────────────────────────────────────
  const switchWeapon = useCallback((idx) => {
    const gs = gsRef.current;
    if (gs) {
      // Save current ammo for the weapon being left
      gs.weaponAmmos[currentWeaponRef.current] = gs.ammoCount;
      // Load saved ammo for the new weapon (init to max if first equip)
      const upgLevel = gs.weaponUpgrades?.[idx] || 0;
      const maxAmmo = Math.floor(WEAPONS[idx].maxAmmo * (1 + upgLevel * 0.25) * (perkModsRef.current.ammoMult || 1));
      const savedAmmo = gs.weaponAmmos[idx] ?? maxAmmo;
      gs.ammoCount = savedAmmo;
      setAmmo(savedAmmo);
    }
    const prevIdx = currentWeaponRef.current;
    setCurrentWeapon(idx); currentWeaponRef.current = idx;
    setIsReloading(false); isReloadingRef.current = false;
    recordCommandTrace("swap", `w${idx}`);
    // ── Analytics: weapon switch (throttled to once per 2s) ──
    const _now = Date.now();
    if (_now - weaponSwitchTrackRef.current > 2000) {
      weaponSwitchTrackRef.current = _now;
      track("weapon_switch", { from: WEAPONS[prevIdx]?.name, to: WEAPONS[idx]?.name, wave: gsRef.current?.currentWave, mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current) });
    }
  }, [recordCommandTrace]);

  // ── Score submit ──────────────────────────────────────────────────────────
  const submitScore = useCallback(async ({ lastWords, rank, eventDigest = null }) => {
    // Practice runs never touch the leaderboard (UI hides the form; this is the backstop)
    if (gsRef.current?.practiceRun) return { submission: "skipped_practice", board: [] };
    const integrityReceipt = getRunIntegrityReceipt(gsRef.current);
    if (!integrityReceipt.onlineEligible) {
      track("score_submit_integrity_skip", {
        faultCount: integrityReceipt.faultCount,
        occurrenceCount: integrityReceipt.occurrenceCount,
        stages: integrityReceipt.stages,
      });
      return buildIntegrityLocalSubmissionResult(integrityReceipt, leaderboard);
    }
    const GAMEPLAY_KEYS = ["enemySpawnMult","enemyHealthMult","enemySpeedMult","playerSpeedMult","xpGainMult","pickupMagnet","grenadeRadiusMult"];
    const sett = settingsRef.current;
    const customSettings = GAMEPLAY_KEYS.some(k => sett[k] !== SETTINGS_DEFAULTS[k]);
    const mode = resolveRunModeFromFlags({
      scoreAttack: scoreAttackRef.current,
      dailyChallenge: dailyChallengeRef.current,
      cursed: cursedRunRef.current,
      bossRush: bossRushRef.current,
      speedrun: speedrunRef.current,
      gauntlet: gauntletRef.current,
    });
    const commandTrace = encodeReplayCommandTrace(commandTraceRef.current || []);
    const entry = buildSessionSubmission({
      username,
      score,
      kills,
      wave,
      lastWords,
      rank,
      bestStreak,
      totalDamage,
      level,
      time: fmtTime(timeSurvived),
      achievements: achievementsUnlocked.length,
      difficulty,
      starterLoadout,
      customSettings,
      inputDevice: inputDeviceRef.current,
      seed: runSeed,
      accountLevel: getAccountLevel(loadCareerStats().totalKills),
      prestige: loadMetaProgress()?.prestige || 0,
      mode,
      runToken: runTokenRef.current,
      summarySig: runSummarySigRef.current,
      eventDigest,
      commandTrace,
    });
    if (dailyChallengeRef.current) markDailyChallengeSubmitted();
    const result = await saveToLeaderboard(entry);
    runTokenRef.current = null;
    runSummarySigRef.current = "";
    setLeaderboard(result.board);
    const globalRank = result.submission === "online"
      ? await getPlayerGlobalRank(score, entry.mode || null, entry.time)
      : null;
    track("score_submit_result", buildScoreSubmitAnalyticsPayload({
      difficulty,
      mode,
      wave,
      score,
      result,
      eventDigest,
      traceEvidence: entry.traceEvidence,
    }));
    createScoreSubmitStudioEvents({
      difficulty,
      score,
      wave,
      runSeed,
      flags: {
        scoreAttack: scoreAttackRef.current,
        dailyChallenge: dailyChallengeRef.current,
        cursed: cursedRunRef.current,
        bossRush: bossRushRef.current,
        speedrun: speedrunRef.current,
        gauntlet: gauntletRef.current,
      },
      globalRank,
      result,
      eventDigest,
      traceEvidence: result.traceEvidence || entry.traceEvidence || null,
    }).events.forEach(saveStudioGameEvent);
    return { ...result, globalRank };
  }, [username, score, kills, wave, bestStreak, totalDamage, level, timeSurvived, achievementsUnlocked, difficulty, starterLoadout, runSeed, leaderboard]);

  // ── GAME LOOP ─────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    if ((gs.runPhase || RUN_PHASE.PLAYING) !== RUN_PHASE.PLAYING) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) ctxRef.current = canvas.getContext("2d");
    const ctx = ctxRef.current;
    if (!gs.player) return;
    gs.enemies = compactTruthyInPlace(gs.enemies);
    gs.enemyBullets = compactTruthyInPlace(gs.enemyBullets);
    gs.bullets = compactTruthyInPlace(gs.bullets);
    gs.grenades = compactTruthyInPlace(gs.grenades);
    gs.pickups = compactTruthyInPlace(gs.pickups);
    const W = GW(), H = GH(), p = gs.player, wpnIdx = currentWeaponRef.current;

    if (pausedRef.current || perkPendingRef.current || shopPendingRef.current || routePendingRef.current || bossCutsceneRef.current || waveAnnouncePendingRef.current || mutationPendingRef.current) {
      return;
    }

    // ── Dash movement ──
    if (dashRef.current.active > 0) {
      dashRef.current.active--;
      p.x += dashRef.current.dx * DASH_SPEED;
      p.y += dashRef.current.dy * DASH_SPEED;
      gs.trail.push({ x: p.x, y: p.y, life: 15 });
    }

    // ── Player movement ──
    const keys = keysRef.current;
    const js = joystickRef.current;
    const gpMove = gamepadMoveRef.current;
    const movement = resolveMovementVector({ keys, joystick: js, gamepad: gpMove });
    const { dx, dy } = movement;
    gs._movementReceipt = movement;
    applyPlayerMovement(p, movement, {
      dashActive: dashRef.current.active > 0,
      adrenalineRushTimer: gs.adrenalineRushTimer || 0,
      rubbleSlowed: !!gs._rubbleSlowed,
      W,
      H,
      obstacles: gs.obstacles || [],
    });
    sampleCommandTrace("move", Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1 ? directionBucket(dx, dy) : "neutral");
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) { if (cosmeticRandom() < 0.3) gs.trail.push({ x: p.x, y: p.y, life: 10 }); }
    gs.trail = stepAndCompactInPlace(gs.trail, t => { t.life--; return t.life > 0; });

    // ── Aim ──
    const ss = shootStickRef.current;
    if (ss.active && Math.hypot(ss.dx, ss.dy) > 10) { p.angle = Math.atan2(ss.dy, ss.dx); ss.shooting = true; }
    else if (ss.active) { ss.shooting = false; }
    if (gamepadAngleRef.current !== null) {
      // Aim assist: snap to nearest enemy within range when using right stick
      if (settingsRef.current.aimAssist && gs.enemies.length > 0) {
        let nearestAngle = gamepadAngleRef.current, nearestScore = Infinity;
        const ASSIST_RADIUS = 160;
        for (const e of gs.enemies) {
          const dist = Math.hypot(e.x - p.x, e.y - p.y);
          if (dist < ASSIST_RADIUS) {
            const eAngle = Math.atan2(e.y - p.y, e.x - p.x);
            let diff = Math.abs(eAngle - gamepadAngleRef.current);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            const score = dist * 0.5 + diff * 80;
            if (score < nearestScore) { nearestScore = score; nearestAngle = eAngle; }
          }
        }
        p.angle = nearestAngle;
      } else {
        p.angle = gamepadAngleRef.current;
      }
    }
    const mouse = mouseRef.current;
    if (!js.active && !ss.active && gamepadAngleRef.current === null && (mouse.down || mouse.moved)) {
      const rect = canvas.getBoundingClientRect();
      p.angle = computePointerAimAngle(mouse, rect, { w: W, h: H }, p);
      inputDeviceRef.current = "mouse";
    }
    if (autoAimRef.current && js.active && !ss.active && gs.enemies.length > 0) {
      let nearest = null, nd = Infinity;
      gs.enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; nearest = e; } });
      if (nearest) p.angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
    }
    sampleCommandTrace("aim", directionBucket(Math.cos(p.angle), Math.sin(p.angle)));
    if (inputDebugEnabled && frameCountRef.current % 15 === 0) {
      const gpMove = gamepadMoveRef.current;
      const mouse = mouseRef.current;
      const trace = commandTraceRef.current || [];
      const movementSources = gs._movementReceipt?.activeSources || [];
      const activeInputSource = movementSources.includes("keyboard")
        ? "keyboard"
        : movementSources.includes("touch")
          ? "touch"
          : movementSources.includes("gamepad")
            ? "gamepad"
            : inputDeviceRef.current === "mouse"
              ? "mouse"
              : inputDeviceRef.current;
      const releaseReceipt = inputReleaseReceiptRef.current;
      const debugNow = Date.now();
      let calibration = inputCalibrationRef.current;
      let pointerSweep = null;
      const rect = canvasRef.current?.getBoundingClientRect?.();
      if (rect && gs?.player) {
        const sweep = buildPointerAimSweepReport(rect, { w: W, h: H }, gs.player);
        pointerSweep = `${sweep.buckets.length}/4`;
        if (sweep.complete) {
          calibration = saveInputCalibration(buildInputCalibrationRecord({
            source: inputDeviceRef.current,
            controllerType: gamepadMetaRef.current.type || "none",
            buckets: sweep.buckets,
          }));
          inputCalibrationRef.current = calibration;
        }
      }
      setInputDebug({
        source: inputDeviceRef.current,
        movementSources,
        movementContention: gs._movementReceipt?.contention === true,
        connected: gamepadMetaRef.current.connected,
        controllerType: gamepadMetaRef.current.type,
        controllerIndex: gamepadMetaRef.current.index,
        controllerId: gamepadMetaRef.current.id,
        leftX: gpMove.x || 0,
        leftY: gpMove.y || 0,
        leftActive: !!gpMove.active,
        aimAngle: p.angle,
        gamepadAimAngle: gamepadAngleRef.current,
        shoot: !!gamepadShootRef.current || !!mouse.down || !!ss.shooting,
        dashReady: !!dashReady,
        grenadeReady: !!grenadeReady,
        reloading: !!isReloadingRef.current,
        pointerX: Math.round(mouse.x || 0),
        pointerY: Math.round(mouse.y || 0),
        pointerSweep,
        traceEvents: trace.length,
        traceAim: trace.filter(e => e.action === "aim").length,
        traceMove: trace.filter(e => e.action === "move").length,
        inputAgeMs: getInputActivityAge(inputActivityRef.current, activeInputSource, debugNow),
        lastReleaseReason: releaseReceipt?.reason || null,
        lastReleaseAgeMs: releaseReceipt ? Math.max(0, debugNow - releaseReceipt.at) : null,
        calibration: summarizeInputCalibration(calibration),
      });
    }
    const shouldShoot = mouse.down || ss.shooting || gamepadShootRef.current || (autoAimRef.current && js.active && !ss.active && gs.enemies.length > 0);
    if (shouldShoot && !isReloadingRef.current && gs.ammoCount > 0) shoot(gs, wpnIdx, p.angle);
    if (p.invincible > 0) p.invincible--;

    // ── Combo decay ──
    if (comboRef.current.timer > 0) {
      comboRef.current.timer--;
      if (comboRef.current.timer <= 0) {
        const _breakCount = comboRef.current.count;
        comboRef.current.count = 0; setCombo(0); setComboTimer(0);
        if (_breakCount >= 5) try { soundComboBreak(_breakCount); } catch {}
      } else {
        if (frameCountRef.current % 6 === 0) setComboTimer(comboRef.current.timer);
        if (comboRef.current.timer <= 30 && comboRef.current.count >= 10 && frameCountRef.current % 4 === 0) {
          try { soundComboTick(comboRef.current.timer); } catch {}
        }
      }
    }

    // Reactive soundtrack tier handled below by Heat Meter (#8); combo no longer drives music directly.

    // Kill-chain AI escalation: at UNSTOPPABLE (combo ≥15) enemies get faster + more aggressive
    {
      const _newEnrage = comboRef.current.count >= 35 ? 2 : comboRef.current.count >= 15 ? 1 : 0;
      if (_newEnrage !== (gs._chainEnrageLevel || 0)) {
        const _prev = gs._chainEnrageLevel || 0;
        gs._chainEnrageLevel = _newEnrage;
        if (_newEnrage > _prev) {
          if (_newEnrage === 1) {
            addText(gs, W / 2, H / 2 - 110, "🔴 ENEMIES ENRAGED", "#FF6644", true);
            try { soundChainEscalate(1); } catch {}
          } else if (_newEnrage === 2) {
            addText(gs, W / 2, H / 2 - 110, "🔥 ENEMIES FURIOUS", "#FF2200", true);
            try { soundChainEscalate(2); } catch {}
          }
        }
      }
    }

    // ── Kill Frenzy (META_TREE off4): +20% speed for 60f after kill ──
    if ((gs._killFrenzyTimer || 0) > 0) { gs._killFrenzyTimer--; gs.player.speed = gs._killFrenzyBaseSpeed * 1.20; }
    else if (gs._killFrenzyUnlocked && gs.player.speed === (gs._killFrenzyBaseSpeed || 0) * 1.20) {
      gs.player.speed = gs._killFrenzyBaseSpeed;
    }

    // ── Dynamic Objective tick + reward resolution ──
    const objectiveFrame = resolveObjectiveFrame(gs, statsRef.current.objectiveChains);
    if (objectiveFrame) {
      statsRef.current.objectiveChains = objectiveFrame.objectiveChains;
      if (objectiveFrame.coinsTotal != null) setCoins(objectiveFrame.coinsTotal);
      if (objectiveFrame.bankedPerkDelta) {
        bankedPerkChoicesRef.current += objectiveFrame.bankedPerkDelta;
        setBankedPerkChoices(bankedPerkChoicesRef.current);
      }
      addText(gs, GW() / 2, GH() / 2, objectiveFrame.message, objectiveFrame.color, objectiveFrame.kind === "completed");
      if (objectiveFrame.achievementCheck) achCheckRef.current = true;
    }
    // ── Frame capture for highlight GIF (~10fps) ──
    // Heat decay + adaptive music tier
    decayHeat(gs);
    const _ht = heatTier(gs.heat || 0);
    if (gs._lastHeatTier !== _ht) {
      gs._lastHeatTier = _ht;
      try { setMusicTier(_ht); } catch {}
    }
    // Auto-reload when ammo empty (setting)
    if (gs.ammoCount === 0 && !isReloadingRef.current && gs.settAutoReload) doReload(currentWeaponRef.current);

    // Capture frames for the highlight GIF. Skipped on mobile (too costly: full
    // canvas readback forces a CPU sync) and when adaptive quality has flagged
    // sustained frame drops. Capture every 10 frames (~6fps) instead of every 6.
    // Always capture frames into the rolling buffer when desktop + setting on.
    // Under sustained frame drops we widen the cadence so capture itself never
    // becomes the cause of drops — but never disable, or the death-screen GIF
    // is silently empty (the bug Session 57 fixed).
    const _captureGif = !isMobile && gs.settHighlightCapture !== false;
    const _captureCadence = window.__codReducedEffects ? 20 : 10; // ~3fps under load, ~6fps normal
    if (_captureGif && frameCountRef.current % _captureCadence === 0 && canvasRef.current) {
      const cv = canvasRef.current;
      if (!gifOffscreenRef.current) {
        const scale = Math.min(1, 240 / cv.width);
        const oc = document.createElement("canvas");
        oc.width = Math.floor(cv.width * scale);
        oc.height = Math.floor(cv.height * scale);
        gifOffscreenRef.current = oc;
      }
      const oc = gifOffscreenRef.current;
      const octx = oc.getContext("2d", { willReadFrequently: true });
      octx.drawImage(cv, 0, 0, oc.width, oc.height);
      const id = octx.getImageData(0, 0, oc.width, oc.height);
      const buf = frameBufferRef.current;
      buf.push({ data: new Uint8Array(id.data.buffer), ts: Date.now() });
      if (buf.length > 60) buf.shift(); // keep ~10s at 6fps
    }

    // ── Score attack: countdown + forced end when time expires ──
    if (gs.scoreAttackMode && !gs.scoreAttackDone) {
      gs.scoreAttackTimeLeft = Math.max(0, (gs.scoreAttackTimeLeft || 0) - 1);
      if (gs.scoreAttackTimeLeft <= 0) {
        gs.scoreAttackDone = true;
        gs.deadMansHand = false;
        extraLivesRef.current = 0; setExtraLives(0);
        handlePlayerDeath(gs, { cause: "score_attack_timeout", allowRecovery: false });
        return;
      }
    }

    // ── Weapon synergy check (every 30 frames) ──
    // ── Ghost race: record player position every 6 frames (~10 samples/sec) ──
    if (frameCountRef.current % 6 === 1 && p) {
      recordGhostSample(ghostRecordRef.current, { x: p.x, y: p.y, f: frameCountRef.current });
    }

    if (frameCountRef.current % 30 === 0) {
      const upgrades = gs.weaponUpgrades || [];
      const active = WEAPON_SYNERGIES.filter(s =>
        upgrades[s.weapons[0]] > 0 && upgrades[s.weapons[1]] > 0
      );
      gs.activeSynergies = active;
      gs.synergyDamageMult = active.reduce((acc, s) => acc * (s.damageMult || 1), 1);
      gs.synergyFireRateMult = active.reduce((acc, s) => acc * (s.fireRateMult || 1), 1);
      gs.synergyExtraBounces = active.reduce((acc, s) => acc + (s.extraBounces || 0), 0);
      gs.synergyExtraPellets = active.reduce((acc, s) => acc + (s.extraPellets || 0), 0);
      const _dangerLevel = Math.min(1, (gs.enemies?.length || 0) / 25);
      const _hp = gs.player?.health || 0;
      const _maxHp = gs.player?.maxHealth || 100;
      const _isCriticalHealth = _hp > 0 && _hp < _maxHp * 0.15 && !gs.bossWave;
      if (_isCriticalHealth && !criticalHealthVisualRef.current) {
        criticalHealthVisualRef.current = true;
        gs.criticalHealthVisualActive = true;
        soundLastStand();
        addText(gs, GW() / 2, GH() / 2 - 80, "ON THE BRINK!!", "#FF2222", true);
        heartbeatCounterRef.current = 30;
      } else if (!_isCriticalHealth && criticalHealthVisualRef.current) {
        criticalHealthVisualRef.current = false;
        gs.criticalHealthVisualActive = false;
      }
      setDangerIntensity(_isCriticalHealth ? 1.0 : _dangerLevel);
      // Synergy charge: ready when active synergies exist AND both weapons above 50% ammo
      if (synergyChargeCooldownRef.current > 0) synergyChargeCooldownRef.current -= 30; // decrement by 30 (once per 30-frame block)
      if (synergyChargeCooldownRef.current < 0) synergyChargeCooldownRef.current = 0;
      const _chargeReady = active.length > 0 && synergyChargeCooldownRef.current === 0 && (() => {
        const s = active[0];
        if (!s) return false;
        const a = s.weapons[0], b = s.weapons[1];
        return (gs.weaponAmmos?.[a] || 0) > (WEAPONS[a]?.maxAmmo || 30) * 0.5 &&
               (gs.weaponAmmos?.[b] || 0) > (WEAPONS[b]?.maxAmmo || 30) * 0.5;
      })();
      gs.synergyChargeReady = _chargeReady;
      setSynergyChargeReady(_chargeReady);

      // ── Boss Finale: sound when boss HP crosses 10% ──
      if (gs.bossWave && !bossFinalePlayedRef.current) {
        const _bossEn = gs.enemies?.find(e => e.isBossEnemy);
        if (_bossEn && _bossEn.health < _bossEn.maxHealth * 0.10) {
          bossFinalePlayedRef.current = true;
          soundBossFinale();
        }
      }
    }

    // ── Per-frame heartbeat while in last stand ──
    if (gs.criticalHealthVisualActive && (gs.player?.health || 0) > 0) {
      heartbeatCounterRef.current--;
      if (heartbeatCounterRef.current <= 0) {
        soundHeartbeatPulse();
        heartbeatCounterRef.current = 55;
      }
    }

    // ── Wave / boss wave logic ──
    const diffS = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    if (!gs.bossWave) {
      gs.spawnTimer += gs.scoreAttackMode ? 1.5 : (gs.algorithmSurge ? 2.5 : 1);
      const directorState = gs.waveDirector
        ? getWaveDirectorState(gs.waveDirector, gs.enemiesThisWave, gs.maxEnemiesThisWave, gs.enemies.length)
        : null;
      const telemetrySnapshot = directorState
        ? buildWaveTelemetrySnapshot(gs.waveDirector, directorState, gs.currentWave)
        : null;
      if (directorState && directorState.stageIndex !== gs.waveDirectorStage) {
        gs.waveDirectorStage = directorState.stageIndex;
        if (directorState.telegraph) {
          addText(gs, W / 2, H / 2 - 92, directorState.telegraph, "#FFD700", true);
          setLiveAnnounce(`${gs.waveDirector.label}. ${directorState.telegraph.replace(/[^\w\s]/g, " ").trim()}`);
        }
        track("wave_director_stage", {
          ...gameCtx({
            difficulty: difficultyRef.current,
            mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current),
            wave: gs.currentWave,
            score: gs.score,
          }),
          ...telemetrySnapshot,
        });
      }
      if (telemetrySnapshot?.pressureBand) {
        // Every sample may raise the observed peak even when the band is stable;
        // recordPressureSnapshot itself deduplicates transition entries.
        recordPressureSnapshot(gs.pressureArc, telemetrySnapshot);
      }
      if (telemetrySnapshot?.pressureBand && telemetrySnapshot.pressureBand !== gs.waveTelemetryBand) {
        gs.waveTelemetryBand = telemetrySnapshot.pressureBand;
        track("wave_pressure_band", {
          ...gameCtx({
            difficulty: difficultyRef.current,
            mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current),
            wave: gs.currentWave,
            score: gs.score,
          }),
          ...telemetrySnapshot,
        });
      }
      const _arcMult = gs._runAct === 'THE LEGEND' ? 0.88 : gs._runAct === 'THE OPENER' ? 1.12 : 1;
      const baseSpawnRate = Math.max(6, Math.floor((100 - gs.currentWave * 7) * diffS.spawnMult / (gs.settSpawnMult || 1) / (gs.blitzSpawnMult || 1) * _arcMult));
      const spawnRate = getWaveSpawnRate(baseSpawnRate, directorState);
      if (gs.spawnTimer >= spawnRate && gs.enemiesThisWave < gs.maxEnemiesThisWave && !gs._respiteLock) {
        gs.spawnTimer = 0; gs.enemiesThisWave++; spawnEnemy(gs);
        const ne = gs.enemies[gs.enemies.length - 1];
        const _baseFormation = getSpawnFormationPlan(gs.waveDirector, directorState, gs.enemiesThisWave - 1);
        const formation = heatBiasedFormation(heatTier(gs.heat || 0), _baseFormation, gs.enemiesThisWave - 1);
        if (formation) {
          applySpawnFormation(ne, formation, W, H);
          recordFormationExposure(gs.pressureArc, formation, { wave: gs.currentWave, stageId: directorState?.stageId });
          gs._lastFormationLabel = formation.label;
          // Formation lore toast: show once per formation type per wave
          if (!gs._formationToastedThisWave) gs._formationToastedThisWave = new Set();
          if (!gs._formationToastedThisWave.has(formation.id)) {
            gs._formationToastedThisWave.add(formation.id);
            const _lore = { FLANK: "⚠ FLANKING — enemies splitting to cut off escape", PINCER: "⚠ PINCER — encirclement inbound", SURGE: "⚠ SURGE — overwhelming assault" };
            if (_lore[formation.label]) addText(gs, W / 2, H / 2 - 60, _lore[formation.label], "#FFF8DC");
          }
        }
        const directorEliteType = getGuaranteedEliteType(gs.waveDirector, directorState, gs.enemiesThisWave - 1);
        if (directorEliteType) applyEliteType(ne, directorEliteType);
        if (gs.waveEliteOnly) applyEliteType(ne, directorEliteType || getRandomEliteType(getWaveSpawnRng(gs)));
        // Phantom elite: 12% of elite-eligible spawns at wave 25+, non-boss only
        if (ne && !ne.eliteType && !ne.isBossEnemy && gs.currentWave >= 25 && getRunRng(gs, "spawn")() < 0.12) {
          ne.eliteType = "phantom"; ne.phantomTimer = 0; ne.phantomVisible = true;
          ne.speed *= 1.1; ne.health *= 0.85; ne.maxHealth = ne.health;
        }
        // Beat-sync pulse: ring of particles when spawn lands on a downbeat
        try {
          const _bpm = getMusicBPM();
          const _framesPerBeat = Math.round(60 / _bpm * 60);
          const _beatPhase = frameCountRef.current % _framesPerBeat;
          if (ne && (_beatPhase < 4 || _beatPhase > _framesPerBeat - 4)) {
            addParticles(gs, ne.x, ne.y, ne.color || "#FF4400", 6);
          }
        } catch {}
        // Chain enrage spawn: tag enemy with flash timer so drawGame can tint + label it
        if (ne && (gs._chainEnrageLevel || 0) >= 1) {
          ne._spawnFlashTimer = 20;
          ne._spawnEnrageLevel = gs._chainEnrageLevel;
        }
      }
    }
    // Wave cleared
    if (gs.enemies.length === 0 && gs.enemiesThisWave >= gs.maxEnemiesThisWave) {
      // Respite gate: count down after high-threat wave before advancing
      if (gs._respiteLock) {
        gs._respiteTimer = (gs._respiteTimer || 1) - 1;
        if (gs._respiteTimer <= 0) gs._respiteLock = false;
        if (gs._respiteLock) return;
        gs._waveTransitDone = true; // respite over — skip re-firing effects
      }
      if (!gs._waveTransitDone) {
      // Show route select on non-boss waves (wave 2+, not special competitive modes)
      const _showRoute = !gs.bossWave && gs.currentWave >= 2
        && !gs.bossRushMode && !gs.scoreAttackMode && !gs.dailyChallengeMode
        && !gs._routeSelectDone;
      if (_showRoute) {
        gs._routeSelectDone = true; // prevent re-entry next frame
        const rOpts = getRouteOptions(gs, getRunRng(gs, "choices"));
        setRouteOptions(rOpts);
        setRoutePending(true);
        routePendingRef.current = true;
        return; // game loop will pause; resumes after player picks a route
      }
      gs._routeSelectDone = false; // reset for next wave
      gs._waveTransitDone = true; // mark effects as firing; blocks re-entry this wave
      const contractResult = resolveWaveChallengeContract(gs);
      if (contractResult) {
        if (contractResult.completed) {
          gs.coins = (gs.coins || 0) + contractResult.rewardCoins;
          setCoins(gs.coins);
          addText(gs, GW() / 2, GH() / 2 - 108, `+${contractResult.rewardCoins}💩 ${contractResult.label}`, contractResult.color, true);
          gs.objectivesCompleted = [...(gs.objectivesCompleted || []), { type: "wave_contract", label: contractResult.label }];
        } else {
          addText(gs, GW() / 2, GH() / 2 - 108, `${contractResult.label} MISSED · ${contractResult.reason}`, "#FF8866");
          gs.objectivesFailed = [...(gs.objectivesFailed || []), { type: "wave_contract", label: contractResult.label }];
        }
        setActiveWaveContract(null);
      }
      // Score snapshot for momentum sparkline
      (gs._waveScoreLog = gs._waveScoreLog || []).push(gs.score);
      // Persist per-enemy wave kill bests only for progression-eligible runs.
      try { if (!gs.practiceRun) updateEnemyCareerStatsBatch(gs._wkbt || {}); } catch {}
      gs._wkbt = {};
      // Survival bonus XP: awarded before resetting _waveDeaths
      if ((gs._waveDeaths || 0) === 0 && !gs.bossWave) {
        const bonus = getWaveSurvivalBonus(gs.currentWave, xpRef.current.level);
        addXp(bonus);
        if (gs.currentWave >= 3) addText(gs, GW() / 2, GH() / 2 - 100, `+${bonus} XP FLAWLESS WAVE!`, "#44FF88", true);
      }
      gs._runAct = getRunAct(gs.currentWave);
      gs._waveDeaths = 0;          // reset per-wave death counter for adaptive assist
      perksThisWaveRef.current = 0; // allow 1 perk screen again next wave
      setAssistAvailable(false);
      setAssistUsed(false);

      // META TREE def3: heal on wave clear
      if (gs._treeWaveHeal && p) {
        p.health = Math.min(p.maxHealth, p.health + gs._treeWaveHeal);
        setHealth(Math.floor(p.health));
      }

      // Analytics: wave clear event (every 5 waves to avoid spam)
      if (gs.currentWave % 5 === 0) {
        const _wCtx = gameCtx({ difficulty: difficultyRef.current, mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current), wave: gs.currentWave, score: gs.score });
        track("wave_reached", _wCtx);
        if (gs.currentWave === 5 || gs.currentWave === 10 || gs.currentWave === 20 || gs.currentWave === 50) {
          track("wave_milestone", { ..._wCtx, milestone: gs.currentWave });
        }
      }
      const waveClearRoast = getRoastCallout("wave_clear", roastCooldowns.current, gs.currentWave, 1);
      if (waveClearRoast) addText(gs, GW() / 2, GH() / 2 - 126, waveClearRoast, "#9BE7FF", true);

      // Wave kill feed: build top-3 type attribution card
      const _wkt = gs._waveKillsByType || {};
      const _wktEntries = Object.values(_wkt).sort((a, b) => b.count - a.count).slice(0, 3);
      if (_wktEntries.length > 0) {
        const _feedText = _wktEntries.map(e => `${e.count}× ${e.name.toUpperCase().slice(0, 10)}`).join(" · ");
        gs._waveKillFeed = { text: _feedText, wave: gs.currentWave, framesLeft: 120 };
      }
      gs._waveKillsByType = {};

      if (gs.bossWave) {
        statsRef.current.bossWavesCleared++;
        soundWaveClear();
        checkAchievements(gs);
      }
      // Clear previous wave event flags
      gs.waveEvent = null; gs.waveEventSpeedMult = 1;
      gs.waveEliteOnly = false; gs.siegeMode = false; gs.fogOfWar = false;
      gs.routeKillScoreMult = 1; // reset per-wave score bonus
      // Non-blitz routes reset the blitz streak
      const _wasBlitz = gs.routeBlitz;
      gs._wasBlitzCache = _wasBlitz; // cache for post-respite wave transition
      if (!_wasBlitz) gs.blitzCount = 0;
      gs.routeArmoryRun = false; gs.routeBlitz = false; gs.blitzSpawnMult = 1;
      // 2× Blitz in a row → Hyperspeed mode (persistent for the run)
      if ((gs.blitzCount || 0) >= 2 && !gs.hyperspeedActive) {
        gs.hyperspeedActive = true;
        addText(gsRef.current, GW() / 2, GH() / 2 - 40, "⚡⚡ HYPERSPEED UNLOCKED!", "#00E5FF", true);
        addText(gsRef.current, GW() / 2, GH() / 2, "Enemies are now faster all run", "#88CCFF");
      }
      // Post-threat-4 respite: spawn loot burst and pause before next wave
      if (!gs.bossWave && !gs.bossRushMode) {
        const _rThreat = computeWaveThreatRating({ maxEnemies: gs.maxEnemiesThisWave, eliteType: gs.waveDirector?.eliteType, event: gs.waveEvent });
        if (_rThreat >= 4) {
          gs._respiteLock = true;
          gs._respiteTimer = 120;
          const _mx = GW() / 2, _my = GH() / 2;
          const respiteRng = getRunRng(gs, "loot");
          gs.pickups.push({ x: _mx - 60 + respiteRng() * 120, y: _my - 80 + respiteRng() * 120, type: "health", life: 450 });
          gs.pickups.push({ x: _mx - 60 + respiteRng() * 120, y: _my - 80 + respiteRng() * 120, type: "health", life: 450 });
          gs.pickups.push({ x: _mx - 60 + respiteRng() * 120, y: _my - 80 + respiteRng() * 120, type: "ammo", life: 450 });
          addText(gs, _mx, _my - 60, "💨 BREATH TAKEN", "#88FFCC", true);
          return;
        }
      }
      } // end wave-clear effects (only fires once per wave via _waveTransitDone)
      gs._waveTransitDone = false;
      gs.bossWave = false;
      setBossWaveActive(false);
      setBossWaveBanner(false);
      gs.currentWave++; gs.enemiesThisWave = 0;
      setLiveAnnounce("Wave " + gs.currentWave + " started");
      // Dynamic Objective: at most one per non-boss wave, weighted by player weakness
      gs.activeObjective = null;
      gs.activeWaveContract = null;
      setActiveWaveContract(null);
      try {
        const _bossNext = gs.routeForceBoss || (gs.bossRushMode ? gs.currentWave >= 4 : gs.currentWave % 5 === 0);
        if (!_bossNext) {
          const career = loadCareerStats();
          const weakness = _identifyWeakness(career);
          const obj = pickObjective({
            wave: gs.currentWave,
            weakness,
            bossWave: false,
            world: { W: GW(), H: GH() },
            rng: getRunRng(gs, "choices"),
          });
          if (obj) {
            gs.activeObjective = obj;
            addText(gs, GW() / 2, GH() / 2 - 90, obj.label + " ACTIVE", obj.color, true);
            addText(gs, GW() / 2, GH() / 2 - 70, obj.description, "#DDDDDD");
          } else {
            const contract = pickWaveChallengeContract({
              wave: gs.currentWave,
              bossWave: false,
              rng: getRunRng(gs, "choices"),
            });
            if (contract) {
              gs.activeWaveContract = startWaveChallengeContract(contract, gs);
              setActiveWaveContract(gs.activeWaveContract);
              addText(gs, GW() / 2, GH() / 2 - 90, contract.label + " ACTIVE", contract.color, true);
              addText(gs, GW() / 2, GH() / 2 - 70, contract.description, "#DDDDDD");
            }
          }
        }
      } catch (error) {
        recordRunIntegrityFault(gs, {
          stage: "objective_director",
          error,
          wave: gs.currentWave,
        });
      }
      // Boss Rush: bosses start wave 4+ (3-wave warmup to let player gear up)
      const _bossInterval = gs.bossRushMode ? 1 : 5;
      const nextIsBoss = gs.routeForceBoss || (gs.bossRushMode
        ? gs.currentWave >= 4
        : gs.currentWave % _bossInterval === 0);
      gs.routeForceBoss = false; // consume the flag
      if (nextIsBoss) {
        gs.maxEnemiesThisWave = gs.currentWave >= 15 ? 2 : 1;
        gs.waveDirector = null;
        gs.waveDirectorStage = -1;
      } else {
        const _waveMax = gs.currentWave >= 50 ? 100 : gs.currentWave >= 40 ? 80 : 60;
        gs.maxEnemiesThisWave = Math.min(Math.floor((5 + gs.currentWave * 3) * (gs.waveEnemyMult || 1)), _waveMax);
        // Apply route modifiers to the upcoming wave
        if (gs.routeDoubleEnemies) { gs.maxEnemiesThisWave = Math.min(gs.maxEnemiesThisWave * 2, 80); gs.routeDoubleEnemies = false; }
        if (gs.routeEliteWave)    { gs.waveEliteOnly = true; gs.routeEliteWave = false; }
        if (gs._wasBlitzCache)    { gs.blitzSpawnMult = 3; }
        gs._nonBossWaveCount = (gs._nonBossWaveCount || 0) + 1;
        gs.waveDirector = createWaveDirectorPlan({
          wave: gs.currentWave,
          maxEnemies: gs.maxEnemiesThisWave,
          nonBossWaveCount: gs._nonBossWaveCount,
          scoreAttackMode: gs.scoreAttackMode,
          gauntletMode: gs.gauntletMode,
          dailyChallengeMode: gs.dailyChallengeMode,
          random: getWaveSpawnRng(gs),
        });
        gs.waveDirectorStage = -1;
        gs._formationToastedThisWave = new Set();
      }
      setWave(gs.currentWave);
      setMapTheme(gs.mapTheme ?? 0);
      if (!gs.newBestWave && gs.currentWave > (gs.careerBest?.wave || 0)) {
        gs.newBestWave = true;
        addText(gs, W / 2, H / 2 - 150, "🌊 NEW BEST WAVE!", "#00FFAA", true);
      }
      // No-hit wave tracking (reset after check)
      if (!gs.damageThisWave) statsRef.current.noHitWaves = (statsRef.current.noHitWaves || 0) + 1;
      gs.damageThisWave = 0;
      // Wave streak: consecutive clears without dying
      gs.waveStreak = (gs.waveStreak || 0) + 1;
      setWaveStreak(gs.waveStreak);
      const streakBonus = gs.waveStreak >= 3 ? (gs.waveStreak - 2) * 200 : 0;
      const waveBonus = gs.currentWave * 100 + streakBonus;
      gs.score += waveBonus; setScore(gs.score);
      setTip(TIPS[Math.floor(cosmeticRandom() * TIPS.length)]);

      if (nextIsBoss) {
        gs.bossWave = true;
        setBossWaveActive(true);
        setBossWaveBanner(true);
        soundBossWave();
        bossFinalePlayedRef.current = false;
        setMusicIntensity(true);
        gs.screenShake = 20;
        // ── Boss rotation: Karen→Splitter→Juggernaut→Summoner→Landlord, cycling ──
        const bossPlan = createBossWavePlan({
          currentWave: gs.currentWave,
          bossRushMode: gs.bossRushMode,
          developerBossSpawned: gs.developerBossSpawned,
          bossRotation: BOSS_ROTATION,
          enemyTypes: ENEMY_TYPES,
        });
        if (bossPlan.markDeveloperBossSpawned) gs.developerBossSpawned = true;
        const _bossGuidance = getBossWaveGuidance(bossPlan.primaryBoss, bossPlan.secondaryBoss);
        // Nemesis + boss kill count for cutscene card
        const _primaryType = bossPlan.primaryBoss;
        try {
          const _bossRec = getBossKillRecord(_primaryType);
          gs.nemesisBossType = isNemesis(_primaryType) ? _primaryType : (gs.nemesisBossType === _primaryType ? null : gs.nemesisBossType);
          const _killLabel = _bossRec.kills === 0 ? "FIRST ENCOUNTER" : _bossRec.kills >= 10 ? `EXECUTIONER (${_bossRec.kills}× killed)` : _bossRec.kills >= 5 ? `VETERAN (${_bossRec.kills}× killed)` : `${_bossRec.kills}× killed`;
          const _nemesisFlag = isNemesis(_primaryType);
          const _nemesisBrief = _nemesisFlag ? { weapon: getNemesisWeaponRecommendation(_primaryType), tip: _bossGuidance.verb } : null;
          // History-aware grudge quote: pick variant based on kill/death record
          // Session escalation: ≥2 deaths to this boss THIS session forces grudge/nemesis tier
          const _sessionBossDeaths = bossSessionDeathsRef.current[_primaryType] || 0;
          const _sessionEscalate = _sessionBossDeaths >= 2;
          const _grudgeVariant = _bossRec.kills === 0 && !_sessionEscalate ? 'intro'
            : _bossRec.deaths > _bossRec.kills || _sessionBossDeaths >= 3 ? 'nemesis'
            : _bossRec.deaths > 0 || _sessionEscalate ? 'grudge'
            : 'taunt';
          const _grudgePool = BOSS_GRUDGE_QUOTES[_primaryType]?.[_grudgeVariant];
          const _rawQuote = _grudgePool ? _grudgePool[Math.floor(cosmeticRandom() * _grudgePool.length)] : null;
          const _bossWave = gs.currentWave;
          const _bossWeapon = WEAPONS[currentWeaponRef.current]?.name || 'that';
          const _bossAct = _bossWave < 10 ? 'prologue' : _bossWave < 25 ? 'rising' : _bossWave < 40 ? 'climax' : 'epilogue';
          const _bossTone = getBossTone(difficultyRef.current);
          const _dynamicQuote = _rawQuote ? interpolateBossQuote(_rawQuote, { wave: _bossWave, weapon: _bossWeapon, deaths: _bossRec.deaths, streak: gs.precisionStreak || 0, act: _bossAct, sessionDeaths: _sessionBossDeaths, bossKills: _bossRec.kills, tone: _bossTone }) : null;
          if (_grudgeVariant === 'grudge' || _grudgeVariant === 'nemesis') {
            try { soundBossGrudge(_grudgeVariant === 'nemesis' ? 2 : 1); } catch {}
          }
          bossCutsceneRef.current = true;
          setBossCutscene({ ...bossPlan.previewCard, guidance: _bossGuidance, bossKillLabel: _killLabel, isNemesis: _nemesisFlag, nemesisBrief: _nemesisBrief, dynamicQuote: _dynamicQuote });
        } catch {
          bossCutsceneRef.current = true;
          setBossCutscene({ ...bossPlan.previewCard, guidance: _bossGuidance });
        }
        if (bossPlan.setLiveAnnounce) {
          setLiveAnnounce("Boss wave! " + (bossPlan.previewCard.name || "Boss") + " incoming on wave " + gs.currentWave);
        }
        track("boss_wave_preview", {
          ...gameCtx({ difficulty: difficultyRef.current, mode: resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current), wave: gs.currentWave, score: gs.score }),
          boss: _bossGuidance.headline,
          verb: _bossGuidance.verb,
        });
        setTimeout(() => { bossCutsceneRef.current = false; setBossCutscene(null); }, 3000);
        setTimeout(() => { setBossWaveBanner(false); }, 4800);
        bossPlan.announceLines.forEach((line, index) => {
          addText(gs, W / 2, H / 2 - 70 + (index * 20), line.text, line.color, line.emphasize);
        });
        bossPlan.warningLines.forEach((line, index) => {
          addText(gs, W / 2, H / 2 + 45 + (index * 20), line.text, line.color);
        });
        bossPlan.spawnBosses.forEach((bossType) => spawnBoss(gs, bossType));
        if (bossPlan.escortCount > 0) {
          for (let escortIdx = 0; escortIdx < bossPlan.escortCount; escortIdx++) spawnEnemy(gs);
          gs.maxEnemiesThisWave += bossPlan.escortCount;
          gs.enemiesThisWave += bossPlan.escortCount;
        }
        // Mark all boss enemies as "spawned" so the wave-clear condition can trigger
        gs.enemiesThisWave = gs.maxEnemiesThisWave;
        addParticles(gs, W / 2, H / 2, "#FF0000", 40);
      } else {
        setMusicIntensity(false);
        // ── Wave director event layer ──
        if (gs.waveDirector?.event) {
          gs.waveEvent = gs.waveDirector.event;
          switch (gs.waveEvent) {
            case "fast_round":
              gs.waveEventSpeedMult = 2.0;
              addText(gs, W / 2, H / 2 + 70, "⚡ FAST ROUND — Enemies 2× speed!", "#FF8800");
              break;
            case "siege":
              gs.maxEnemiesThisWave = Math.min(gs.maxEnemiesThisWave * 2, 80);
              gs.siegeMode = true;
              addText(gs, W / 2, H / 2 + 70, "🪖 SIEGE — 2× enemies, no pickups!", "#FF4444");
              break;
            case "elite_only":
              gs.waveEliteOnly = true;
              addText(gs, W / 2, H / 2 + 70, "👑 ELITE ONLY — Every enemy is elite!", "#FFD700");
              break;
            case "fog_of_war":
              gs.fogOfWar = true;
              addText(gs, W / 2, H / 2 + 70, "🌫️ FOG OF WAR — Enemies hidden until close!", "#88CCFF");
              break;
          }
        }
        // ── Cursed Run: escalating chaos events ──
        if (gs.cursedRunMode) {
          const cw = gs.currentWave;
          if (cw === 5)  { addText(gs, W / 2, H / 2 - 60, "☠ CURSED: ENEMIES ENRAGED", "#CC00FF", true); gs.mutAlwaysEnraged = true; }
          if (cw === 10) { addText(gs, W / 2, H / 2 - 60, "☠ CURSED: SCORE HIDDEN", "#CC00FF", true); gs.cursedHideScore = true; }
          if (cw === 15) { addText(gs, W / 2, H / 2 - 60, "☠ CURSED: ACID TRAILS", "#CC00FF", true); gs.cursedAcidTrails = true; }
          if (cw === 20) { addText(gs, W / 2, H / 2 - 60, "☠ CURSED: ALL EXPLOSIVE", "#CC00FF", true); gs.mutAllExplosive = true; }
          if (cw === 25) { addText(gs, W / 2, H / 2 - 60, "☠ CURSED: SPAWNS DOUBLED", "#CC00FF", true); gs.waveEnemyMult = (gs.waveEnemyMult || 1) * 2; }
        }
        addText(gs, W / 2, H / 2, "WAVE " + gs.currentWave + "!", "#FFD700", true);
        addText(gs, W / 2, H / 2 + 30, "+" + (gs.currentWave * 100) + " WAVE BONUS" + (streakBonus > 0 ? " +" + streakBonus + " STREAK" : ""), "#00FF88");
        if (gs.waveStreak >= 3) addText(gs, W / 2, H / 2 + 55, "🔥 " + gs.waveStreak + "-WAVE STREAK!", "#FF8800", true);
        soundWaveClear();

        // ── Wave incoming preview card then chain mutation/shop. Boss waves use
        // their dedicated cutscene; stacking this card can visually trap play.
        const _evtMap = { fast_round: "⚡ FAST ROUND", elite_only: "⭐ ELITE SURGE", siege: "🏰 SIEGE MODE", fog_of_war: "🌫 FOG OF WAR" };
        if (!nextIsBoss) {
          waveAnnouncePendingRef.current = true;
          const _fmtDescriptors = { FLANK: "pressure from the sides", PINCER: "split attack", SURGE: "overwhelming force" };
          setWaveAnnounce({
            waveNum: gs.currentWave,
            isBoss: false,
            eventLabel: gs.waveEvent ? (_evtMap[gs.waveEvent] || gs.waveEvent) : null,
            estimatedCount: gs.maxEnemiesThisWave,
            tempoLabel: gs.waveDirector?.label,
            threatHint: gs.waveDirector?.hint,
            telemetryBand: gs.waveTelemetryBand,
            formationHint: gs._lastFormationLabel ? `${gs._lastFormationLabel} — ${_fmtDescriptors[gs._lastFormationLabel] || ""}` : null,
            threatRating: computeWaveThreatRating({ maxEnemies: gs.maxEnemiesThisWave, eliteType: gs.waveDirector?.eliteType, event: gs.waveEvent }),
            deathCount: waveDeathCountsRef.current[gs.currentWave] || 0,
            isChokePoint: communityChokePointsRef.current.has(gs.currentWave),
          });
        }
        // After preview: offer mutation challenge (every 5th non-boss wave, not in special modes)
        const _showMutation = !nextIsBoss && !gs.gauntletMode && !gs.bossRushMode
          && !gs.scoreAttackMode && !gs.dailyChallengeMode && gs.currentWave % 5 === 0;
        const _showShop = !gs.gauntletMode && (gs.currentWave < 5 || gs.currentWave % 2 === 0);
        postMutationShopRef.current = !nextIsBoss && _showShop;
        if (!nextIsBoss) setTimeout(() => {
          waveAnnouncePendingRef.current = false;
          setWaveAnnounce(null);
          const _pool = _showMutation
            ? shuffleWithRng(WAVE_CHALLENGE_MUTATIONS, getRunRng(gs, "choices")).slice(0, 2)
            : [];
          const rewardPlan = createWaveRewardPlan({
            hasBankedPerkChoices: bankedPerkChoicesRef.current > 0,
            showMutation: _showMutation,
            showShop: _showShop,
            mutationOptions: _pool,
          });
          deferredMutationPendingRef.current = rewardPlan.deferredMutationPending;
          deferredMutationOptionsRef.current = rewardPlan.deferredMutationOptions;
          deferredShopPendingRef.current = rewardPlan.deferredShopPending;
          if (rewardPlan.action === "perk") {
            openQueuedPerkSelection();
          } else if (rewardPlan.action === "mutation") {
            setMutationOptions(rewardPlan.mutationOptions);
            setMutationPending(true);
            mutationPendingRef.current = true;
            // Shop (if applicable) triggers from applyMutation / skipMutation callbacks
          } else if (rewardPlan.action === "shop") {
            const choiceRng = getRunRng(gsRef.current, "choices");
            const opts = getShopOptions(gsRef.current, currentWeaponRef.current, choiceRng);
            setShopOptions(opts);
            setCoinShopOptions(getCoinShopOptions(gsRef.current, choiceRng));
            setShopPending(true);
            shopPendingRef.current = true;
          }
        }, 2200);
      }
    }

    // ── Bullet movement ──
    gs.bullets = stepAndCompactInPlace(gs.bullets, b => {
      // Boomerang: curve outbound, then steer back to player
      if (b.boomerang) {
        if (!b.returning) {
          const rot = 0.055; // curve angle per frame
          const nvx = b.vx * Math.cos(rot) - b.vy * Math.sin(rot);
          const nvy = b.vx * Math.sin(rot) + b.vy * Math.cos(rot);
          b.vx = nvx; b.vy = nvy;
          if (b.life <= b.outboundLife) b.returning = true;
        } else {
          const bdx = p.x - b.x, bdy = p.y - b.y, bdist = Math.hypot(bdx, bdy);
          if (bdist < 24) return false; // caught by player
          const spd = Math.hypot(b.vx, b.vy);
          b.vx = (bdx / bdist) * spd; b.vy = (bdy / bdist) * spd;
        }
      }
      b.x += b.vx; b.y += b.vy; b.life--;
      if (b.trail && frameCountRef.current % 2 === 0) addParticles(gs, b.x, b.y, b.color, 1);
      for (const ob of (gs.obstacles || [])) {
        const bounce = resolveObstacleBounce(b, ob);
        if (bounce.bounced) {
          Object.assign(b, {
            x: bounce.x, y: bounce.y, vx: bounce.vx, vy: bounce.vy,
            bouncesLeft: bounce.bouncesLeft, life: bounce.life,
          });
          addParticles(gs, b.x, b.y, "#FFFFFF", 4);
          gs.screenShake = Math.max(gs.screenShake, 1);
          break;
        }
        if (bounce.consumed) {
          addParticles(gs, b.x, b.y, b.color, 3);
          return false;
        }
        if (bounce.bounced || bounce.consumed) {
          break;
        }
      }
      return b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10;
    });

    // ── Enemy bullet movement ──
    gs.enemyBullets = stepAndCompactInPlace(gs.enemyBullets, eb => {
      const _tdm = (gs.timeDilationTimer || 0) > 0 ? 0.2 : 1;
      eb.x += eb.vx * _tdm; eb.y += eb.vy * _tdm; eb.life--;
      const hitWall = (gs.obstacles || []).some(ob => eb.x >= ob.x && eb.x <= ob.x + ob.w && eb.y >= ob.y && eb.y <= ob.y + ob.h);
      if (hitWall) return false;
      return eb.life > 0 && eb.x > -10 && eb.x < W + 10 && eb.y > -10 && eb.y < H + 10;
    });

    // ── Enemy bullet hits player ──
    if (dashRef.current.active <= 0) {
      gs.enemyBullets.forEach(eb => {
        const hit = resolveEnemyProjectilePlayerHit({
          projectile: eb,
          player: p,
          dashActive: dashRef.current.active > 0,
          glassjaw: !!gs.glassjaw,
          glassjawMult: gs.glassjawMult || 2,
          armorMult: gs._treeArmorMult || 1,
        });
        if (hit.hit) {
          eb.life = hit.projectileLife;
          applyObservedPlayerDamage(gs, { healthAfter: hit.health, frame: frameCountRef.current, kind: "projectile", sourceType: eb.sourceType, sourceName: eb.sourceName || "Enemy projectile" });
          p.invincible = hit.invincibleFrames; gs.screenShake = hit.screenShake; gs.damageFlash = hit.damageFlash;
          gs.damageThisWave = (gs.damageThisWave || 0) + 1;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y - 30, "-" + Math.floor(hit.damage), "#FF4444");
          rumbleGamepad(0.3, 0.45, 100);
          if (hit.dead) handlePlayerDeath(gs);
        }
      });
    }

    // ── Grenade logic ──
    gs.grenades = stepAndCompactInPlace(gs.grenades, g => {
      g.x += g.vx; g.y += g.vy; g.vx *= 0.96; g.vy *= 0.96; g.life--;
      if (g.life <= 0) {
        addParticles(gs, g.x, g.y, "#FF4500", 30);
        addParticles(gs, g.x, g.y, "#FFD700", 20);
        addText(gs, g.x, g.y, "BOOM!", "#FF4500", true);
        gs.screenShake = 15;
        gs.enemies.forEach(e => {
          const _gradius = 130 * (gs.settGrenadeRadMult || 1);
          const blast = resolveGrenadeEnemyDamage({
            grenade: g,
            enemy: e,
            radius: _gradius,
            damageMult: perkModsRef.current.grenadeDamageMult || 1,
          });
          if (blast.hit) {
            const result = applyEnemyDamage(e, blast.damage, { source: "grenade", weaponName: "GRENADE" });
            e.hitFlash = 10;
            gs.totalDamage += result.applied;
          }
        });
        return false;
      }
      return true;
    });
    drainEnemyDefeatsRef.current(gs);

    // ── Railgun beam: instant hitscan damage ──
    if (gs.pendingBeam) {
      const { ox, oy, cos, sin, maxT, weaponIdx: pbWpn } = gs.pendingBeam;
      gs.pendingBeam = null;
      const pbWeapon = WEAPONS[pbWpn];
      const pbDmgMult = (perkModsRef.current.damageMult || 1) * (1 + (gs.weaponUpgrades?.[pbWpn] || 0) * 0.25);
      gs.enemies.forEach(e => {
        if (e.health <= 0) return;
        const ex = e.x - ox, ey = e.y - oy;
        const proj = ex * cos + ey * sin;
        const perp = Math.abs(ex * sin - ey * cos);
        if (proj > 0 && proj < maxT && perp < e.size / 2 + 7) {
          if (e.typeIndex === 18 && e.summonerInvuln) { addParticles(gs, e.x, e.y, "#8844FF", 3); return; }
          const effectiveCrit = CRIT_CHANCE + (perkModsRef.current.critBonus || 0) + (gs.critBonus || 0);
          const isCrit = getRunRng(gs, "combat")() < effectiveCrit;
          const _pbRageMult = (gs.rageTimer || 0) > 0 ? 1.75 : 1.0;
          const _pbJugMult = (e.typeIndex === 17 && (e.jugShield || 0) > 0) ? 0.15 : 1.0;
          const dmg = pbWeapon.damage * pbDmgMult * pbComboMult * (isCrit ? CRIT_MULT + (gs.critMultBonus || 0) : 1) * (e.dmgMult || 1) * _pbRageMult * _pbJugMult;
          const railDamage = applyEnemyDamage(e, dmg, {
            source: "rail",
            weaponIdx: pbWpn,
            weaponName: pbWeapon.name,
          });
          e.hitFlash = isCrit ? 15 : 8;
          gs.totalDamage += railDamage.applied;
          if (perkModsRef.current.lifesteal) {
            const _lsMult = (perkModsRef.current.comboVampireMult && comboRef.current.count > 0) ? 2 : 1;
            p.health = Math.min(p.maxHealth, p.health + dmg * perkModsRef.current.lifesteal * _lsMult);
            setHealth(Math.floor(p.health));
          }
          if (isCrit) {
            statsRef.current.crits++;
            if (perkModsRef.current.critGrantsXp) addXp(10);
          }
          addParticles(gs, e.x, e.y, isCrit ? "#FFD700" : e.color, isCrit ? 10 : 5);
          addText(gs, e.x, e.y - e.size / 2 - 8, isCrit ? "💥 CRIT!" : HITMARKERS[Math.floor(cosmeticRandom() * HITMARKERS.length)], isCrit ? "#FFD700" : "#FFF");
        }
      });
      drainEnemyDefeatsRef.current(gs);
      gs.screenShake = Math.max(gs.screenShake, 10);
    }

    // ── Bullet-enemy collision ──
    gs.bullets.forEach(b => {
      if (b.life <= 0) return;
      gs.enemies.forEach(e => {
        if (e.health <= 0) return;
        if (bulletEnemyCollision(b, e).hit) {
          // Shield pulse blocks all damage
          if (e.shieldPulseActive) {
            addParticles(gs, b.x, b.y, "#00BFFF", 4);
            b.life = 0; return;
          }
          const { isCrit } = rollCrit({
            baseCrit: CRIT_CHANCE,
            perkCrit: perkModsRef.current.critBonus || 0,
            runCrit: gs.critBonus || 0,
            rng: getRunRng(gs, "combat"),
          });
          // Summoner invulnerability while summons alive
          if (e.typeIndex === 18 && e.summonerInvuln) { addParticles(gs, b.x, b.y, "#8844FF", 3); b.life = 0; return; }
          const { damage: dmg } = computeBulletDamage({
            bullet: b,
            enemy: e,
            player: p,
            comboCount: comboRef.current.count,
            critMult: CRIT_MULT,
            critMultBonus: gs.critMultBonus || 0,
            isCrit,
            lastResort: !!perkModsRef.current.lastResort,
            rageActive: (gs.rageTimer || 0) > 0,
          });
          // Drain juggernaut shield if active
          if (e.typeIndex === 17 && (e.jugShield || 0) > 0) {
            const rawDmg = computeJuggernautShieldDamage({ bulletDamage: b.damage, comboCount: comboRef.current.count, isCrit, critMult: CRIT_MULT });
            e.jugShield = Math.max(0, e.jugShield - rawDmg);
            if (e.jugShield <= 0) {
              e.jugShieldRegenDelay = 240;
              addText(gs, e.x, e.y - 40, "🛡 SHIELD BROKEN!", "#FF6600");
              addText(gs, W / 2, H / 3, "🦏 SHIELD SHATTERED!", "#FF6600", true);
              gs.screenShake = Math.max(gs.screenShake, 14);
              addParticles(gs, e.x, e.y, "#5599FF", 20);
            }
          }
          const projectileDamage = applyEnemyDamage(e, dmg, {
            source: "projectile",
            weaponIdx: b.wpnIdx ?? wpnIdx,
            weaponName: WEAPONS[b.wpnIdx ?? wpnIdx]?.name || "PROJECTILE",
            beatEligible: true,
          });
          e.hitFlash = isCrit ? 15 : 8;
          gs.totalDamage += projectileDamage.applied;
          // Chain Lightning: 20% chance to arc to nearest enemy for 50% damage
          if (gs.chainLightning && getRunRng(gs, "combat")() < 0.20) {
            const arcTarget = findLightningChainTarget(gs.enemies, e, { range: 200 });
            if (arcTarget) {
              const arcDmg = dmg * 0.5;
              const arcDamage = applyEnemyDamage(arcTarget, arcDmg, {
                source: "chain-lightning",
                weaponIdx: b.wpnIdx ?? wpnIdx,
                weaponName: "CHAIN LIGHTNING",
                beatEligible: true,
              });
              arcTarget.hitFlash = 8;
              gs.totalDamage += arcDamage.applied;
              gs.lightningArcs = gs.lightningArcs || [];
              gs.lightningArcs.push({ x1: e.x, y1: e.y, x2: arcTarget.x, y2: arcTarget.y, life: 8, maxLife: 8 });
            }
          }
          // Lifesteal
          if (perkModsRef.current.lifesteal) {
            const _lsMult2 = (perkModsRef.current.comboVampireMult && comboRef.current.count > 0) ? 2 : 1;
            p.health = Math.min(p.maxHealth, p.health + dmg * perkModsRef.current.lifesteal * _lsMult2);
            setHealth(Math.floor(p.health));
          }
          // Pierced lifesteal: Bloodlust + Penetrator synergy
          if (perkModsRef.current.piercedLifesteal && b.pierceLeft > 0) {
            p.health = Math.min(p.maxHealth, p.health + dmg * perkModsRef.current.piercedLifesteal);
            setHealth(Math.floor(p.health));
          }
          if (isCrit) {
            statsRef.current.crits++;
            if (perkModsRef.current.critGrantsXp) addXp(10);
          }
          const _hn = performance.now();
          if (_hn - lastHitSoundRef.current > 50) { soundHitAt(isCrit, e.x, W); lastHitSoundRef.current = _hn; rumbleGamepad(isCrit ? 0.25 : 0.05, isCrit ? 0.35 : 0.1, isCrit ? 80 : 40); }
          addParticles(gs, b.x, b.y, isCrit ? "#FFD700" : e.color, isCrit ? 10 : 5);
          gs.screenShake = Math.max(gs.screenShake, isCrit ? 6 : 2);
          addText(gs, e.x + (cosmeticRandom() - 0.5) * 20, e.y - e.size / 2 - cosmeticRandom() * 10,
            isCrit ? "💥 CRIT!" : HITMARKERS[Math.floor(cosmeticRandom() * HITMARKERS.length)],
            isCrit ? "#FFD700" : "#FFF");
          // Precision hit bonus: bullet near enemy core → 1 💩 coin + streak multiplier
          if (!e.isBossEnemy && isPrecisionHit(b, e)) {
            gs.precisionStreak = (gs.precisionStreak || 0) + 1;
            statsRef.current.bestPrecisionStreak = Math.max(statsRef.current.bestPrecisionStreak || 0, gs.precisionStreak);
            if (gs.precisionStreak > (gs._precisionPeakStreak || 0)) {
              gs._precisionPeakStreak = gs.precisionStreak;
              gs._precisionPeakFrame = frameCountRef.current;
            }
            soundPrecisionClick(gs.precisionStreak);
            if (gs.precisionStreak === 5) soundPrecisionLock();
            gs.coins = (gs.coins || 0) + 1;
            if (gs.precisionStreak === 3) {
              gs.coins += 2;
              addText(gs, e.x, e.y - e.size - 10, "🎯 PRECISION BURST! +3💩", "#FF88FF", true);
              addParticles(gs, e.x, e.y, "#FF88FF", 8);
            } else if (gs.precisionStreak > 3) {
              addText(gs, e.x, e.y - e.size - 10, `🎯 ×${gs.precisionStreak} +1💩`, "#CC88FF");
            } else {
              addText(gs, e.x, e.y - e.size - 10, "🎯 +1💩", "#FFAAFF");
            }
            // Beat-precision bonus: precision hit during beat vulnerability window → +2💩
            // Window widens with streak: base 8 frames + 1 extra per 5 streak (max +4 at streak≥20)
            try {
              const _bpBpm = getMusicBPM();
              const _bpFpb = Math.round(60 / _bpBpm * 60);
              const _bpPhase = frameCountRef.current % _bpFpb;
              const _bpStreak = gs.precisionStreak || 0;
              const _bpWindow = 8 + Math.min(4, Math.floor(_bpStreak / 5));
              if (_bpPhase < _bpWindow) {
                gs.coins = (gs.coins || 0) + 2;
                addText(gs, e.x, e.y - e.size - 22, "🎵🎯 BEAT PRECISION! +2💩", "#00FFEE");
                addParticles(gs, e.x, e.y, "#00FFEE", 5);
                try {
                  const _rmTotal = trackRhythmMasteryHit();
                  if ([100, 500, 1000, 2500, 5000].includes(_rmTotal)) {
                    addText(gs, e.x, e.y - e.size - 40, `🎵 RHYTHM MASTER ×${_rmTotal}!`, "#FFD700", true);
                  }
                } catch {}
              }
            } catch {}
            // Flow state: streak ≥10 → 1.5s bullet-time (genre-first mechanical reward)
            if (gs.precisionStreak >= 10 && !(gs._flowStateCooldown > 0)) {
              gs.timeDilationTimer = Math.max(gs.timeDilationTimer || 0, 90);
              gs._flowStateCooldown = 300;
              gs._flowStateFiredCount = (gs._flowStateFiredCount || 0) + 1;
              addText(gs, e.x, e.y - e.size - 30, "⚡ FLOW STATE", "#00FFEE", true);
              addParticles(gs, e.x, e.y, "#00FFEE", 12);
            }
          } else if (!e.isBossEnemy) {
            gs.precisionStreak = 0;
          }
          // Pierce logic
          const pierce = resolvePierce({ pierceLeft: b.pierceLeft || 0 });
          b.pierceLeft = pierce.nextPierceLeft;
          if (pierce.consumeBullet) b.life = 0;

        }
      });
    });
    drainEnemyDefeatsRef.current(gs);
    if (achCheckRef.current) { checkAchievements(gs); checkDailyMissions(gs); achCheckRef.current = false; }

    // ── Flow field rebuild (every 30 frames or on significant player movement) ──
    gs._ffTimer = (gs._ffTimer || 0) + 1;
    const _ffPx = gs._ffPx || 0, _ffPy = gs._ffPy || 0;
    if (gs._ffTimer >= 30 || Math.hypot(p.x - _ffPx, p.y - _ffPy) > 48) {
      gs._ffTimer = 0; gs._ffPx = p.x; gs._ffPy = p.y;
      gs.flowField = buildFlowField(W, H, p.x, p.y, gs.obstacles || []);
    }

    // ── Sergeant Karen aura ──
    gs._enemyFrameIndex = buildEnemyFrameIndex(gs.enemies, gs._enemyFrameIndex || createEnemyFrameIndex());
    applySergeantAura(gs.enemies, gs._enemyFrameIndex);

    // ── Enemy movement & melee ──
    gs.enemies.forEach(e => {
      // Phantom elite: toggle visibility every 90 frames
      if (e.eliteType === "phantom") {
        e.phantomTimer = (e.phantomTimer || 0) + 1;
        if (e.phantomTimer >= 90) { e.phantomTimer = 0; e.phantomVisible = !e.phantomVisible; }
      }
      e.wobble += 0.1;
      const zigzag = e.typeIndex === 10 ? Math.sin(e.wobble * 3) * 3 : 0;
      const freezeMult = (gs.freezeTimer || 0) > 0 ? 0.35 : 1;
      const timeDilMult = (gs.timeDilationTimer || 0) > 0 ? 0.18 : 1;
      const _enrageMult = gs._chainEnrageLevel === 2 ? 1.20 : gs._chainEnrageLevel === 1 ? 1.10 : 1.0;
      const buffedSpeed = e.speed * (e.buffed ? 1.35 : 1) * (gs.enemySpeedMult || 1) * freezeMult * timeDilMult * _enrageMult;
      // Flow field steering: sample flow field, fall back to direct angle if no cell data
      const ff = gs.flowField;
      let sx, sy;
      if (ff && !e.chargeActive) {
        const sampled = sampleFlowField(ff, e.x, e.y);
        if (sampled) {
          sx = sampled.sx; sy = sampled.sy;
        } else {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          sx = Math.cos(a); sy = Math.sin(a);
        }
      } else {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        sx = Math.cos(a); sy = Math.sin(a);
      }
      // Wall-avoidance steering: repulse from close walls (keeps enemies from clipping)
      if (!e.chargeActive) {
        (gs.obstacles || []).forEach(ob => {
          const nx = Math.max(ob.x, Math.min(e.x, ob.x + ob.w));
          const ny = Math.max(ob.y, Math.min(e.y, ob.y + ob.h));
          const rdx = e.x - nx, rdy = e.y - ny;
          const rdist = Math.hypot(rdx, rdy);
          const AVOID_R = e.size / 2 + 32;
          if (rdist < AVOID_R && rdist > 0) {
            const str = (AVOID_R - rdist) / AVOID_R;
            sx += (rdx / rdist) * str * 3.5;
            sy += (rdy / rdist) * str * 3.5;
          }
        });
        const slen = Math.hypot(sx, sy);
        if (slen > 0) { sx /= slen; sy /= slen; }
      }
      // Doomscroller: periodically freezes while doomscrolling (every 280 frames, stops for 70)
      if (e.typeIndex === 19 && !e.isBossEnemy) {
        e.doomscrollTimer = (e.doomscrollTimer || 0) + 1;
        e.doomscrolling = (e.doomscrollTimer % 280) < 70;
        if ((e.doomscrollTimer % 280) === 0) addParticles(gs, e.x, e.y - 20, "#7B68EE", 3);
      }
      // Skip regular movement for Juggernaut during charge/stun, or Doomscroller while frozen
      const _skipMove = (e.typeIndex === 17 && (e.jugCharging || (e.jugStunned || 0) > 0)) || (e.typeIndex === 19 && e.doomscrolling);
      if (!_skipMove) {
        e.x += sx * buffedSpeed + Math.sin(e.wobble) * 0.5 + (-sy) * zigzag;
        e.y += sy * buffedSpeed + Math.cos(e.wobble) * 0.5 + sx * zigzag;
        // Cursed Run: acid trail particles
        if (gs.cursedAcidTrails && !e.isBossEnemy && cosmeticRandom() < 0.15) {
          if ((gs.particles?.length || 0) < MAX_PARTICLES) {
            gs.particles.push({ x: e.x, y: e.y, vx: (cosmeticRandom() - 0.5) * 0.5, vy: (cosmeticRandom() - 0.5) * 0.5, life: 50, color: "#44FF44", size: 3 });
          }
        }
      }
      if (e.hitFlash > 0) e.hitFlash--;
      if ((e._spawnFlashTimer || 0) > 0) e._spawnFlashTimer--;
      if ((e._tauntCooldown || 0) > 0) e._tauntCooldown--;
      // Combat taunt: alive enemy quips at player (0.4%/frame, per-enemy 180f + global 60f cooldown)
      if (!e.isBossEnemy && !(gs._globalTauntCooldown > 0) && !(e._tauntCooldown > 0) && cosmeticRandom() < 0.004) {
        const _taunts = ENEMY_TYPES[e.typeIndex]?.combatTaunts;
        if (_taunts) {
          addText(gs, e.x, e.y - e.size - 10, _taunts[Math.floor(cosmeticRandom() * _taunts.length)], e.color);
          e._tauntCooldown = 180;
          gs._globalTauntCooldown = 60;
        }
      }
      if (e.ranged) {
        e.shootTimer++;
        const _enrageFireThresh = gs._chainEnrageLevel === 2 ? e.projRate * 0.80 : gs._chainEnrageLevel === 1 ? e.projRate * 0.85 : e.projRate;
        if (e.shootTimer >= _enrageFireThresh) {
          e.shootTimer = 0;
          const pa = Math.atan2(p.y - e.y, p.x - e.x);
          // Mega Karen phase 2: 5-bullet spread
          const bCount = getBossRangedBurstCount(e);
          for (let bi = 0; bi < bCount; bi++) {
            const angle = pa + (bi - Math.floor(bCount / 2)) * 0.28;
            gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * e.projSpeed, vy: Math.sin(angle) * e.projSpeed, life: 90, size: 4, color: e.color, damage: 6 + e.typeIndex * 2, sourceType: e.typeIndex, sourceName: ENEMY_TYPES[e.typeIndex]?.name || e.name });
          }
        }
      }
      // ── Boss special mechanics ──────────────────────────────────────────────
      if (e.isBossEnemy) {
        if (e.typeIndex === 4) { // Mega Karen: charge attack
          const phaseTwo = e.health < e.maxHealth * 0.5;
          e.chargeTimer++;
          if (!e.chargeActive && e.chargeTimer >= (phaseTwo ? 150 : 280)) {
            e.chargeTimer = 0; e.chargeActive = true; e.chargeDuration = 20;
            const ca = Math.atan2(p.y - e.y, p.x - e.x);
            e.chargeDx = Math.cos(ca); e.chargeDy = Math.sin(ca);
            addText(gs, e.x, e.y - 65, phaseTwo ? "⚡ ULTRA RAGE!!" : "I WANT YOUR MANAGER!", "#FF1493", true);
            gs.screenShake = 10; addParticles(gs, e.x, e.y, "#FF1493", 15);
          }
          if (e.chargeActive) {
            e.x += e.chargeDx * 11; e.y += e.chargeDy * 11;
            if (--e.chargeDuration <= 0) e.chargeActive = false;
          }
        }
        if (e.typeIndex === 9) { // Landlord: summon tenants
          e.summonTimer++;
          const summonCD    = e.hasMinionSurge ? 240 : 360;
          const summonCount = e.hasMinionSurge ? 4 : (gs.currentWave >= 12 ? 2 : 1);
          if (e.summonTimer >= summonCD) {
            e.summonTimer = 0;
            for (let _si = 0; _si < summonCount; _si++) spawnEnemy(gs);
            const summonMsg = e.hasMinionSurge ? "RENT STRIKE! ALL TENANTS, ATTACK!" : "PAY RENT OR VACATE!";
            addText(gs, e.x, e.y - 65, summonMsg, "#8B6914", true);
            gs.screenShake = 6; addParticles(gs, e.x, e.y, "#8B6914", 12);
          }
          if (e.hasRentNuke) {
            e.rentNukeTimer++;
            if (e.rentNukeTimer >= 600) { // every 10 seconds
              e.rentNukeTimer = 0;
              addText(gs, e.x, e.y - 80, "💸 RENT IS DUE!!", "#FFD700", true);
              addParticles(gs, e.x, e.y, "#FFD700", 20);
              gs.screenShake = 15;
              const rentDist = Math.hypot(p.x - e.x, p.y - e.y);
              if (rentDist < 220 && p.invincible <= 0) {
                applyObservedPlayerDamage(gs, { damage: 25 * (gs._treeArmorMult || 1), frame: frameCountRef.current, kind: "boss", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Landlord"} rent nuke` }); p.invincible = 30; gs.damageFlash = 12;
                gs.damageThisWave = (gs.damageThisWave || 0) + 1;
                setHealth(Math.max(0, p.health));
                addText(gs, p.x, p.y - 30, "-25 RENT DUE!", "#FFD700");
                rumbleGamepad(0.4, 0.6, 150);
                if (p.health <= 0) handlePlayerDeath(gs);
              }
            }
          }
        }
        // ── Shared ability stagger: prevents multiple abilities firing simultaneously ──
        if ((e.sharedAbilityCooldown || 0) > 0) e.sharedAbilityCooldown--;
        const _abilityReady = (e.sharedAbilityCooldown || 0) <= 0;
        // At high waves (40+) scale ability timers up so they're less frequent
        const _waveScale = gs.currentWave >= 40 ? 1.4 : gs.currentWave >= 30 ? 1.2 : 1.0;
        // ── Shared boss abilities (scale per wave) ──────────────────────────
        if (e.hasShieldPulse) {
          if (!e.shieldPulseActive) {
            e.shieldPulseCooldown--;
            if (e.shieldPulseCooldown <= 0) {
              e.shieldPulseActive = true;
              e.shieldPulseTimer  = 180; // active 3 seconds
              e.shieldPulseCooldown = 480; // recharge 8 seconds
              addText(gs, e.x, e.y - 80, "🛡 SHIELD PULSE!", "#00BFFF", true);
              addParticles(gs, e.x, e.y, "#00BFFF", 12);
              gs.screenShake = 5;
            }
          } else {
            if (--e.shieldPulseTimer <= 0) e.shieldPulseActive = false;
          }
        }
        if (e.hasEnrage && !e.enrageTriggered && e.health < e.maxHealth * 0.33) {
          e.enrageTriggered = true;
          e.speed    *= 1.8;
          e.projRate  = Math.max(30, Math.floor(e.projRate * 0.5));
          addText(gs, e.x, e.y - 80, "⚡ ENRAGED!!", "#FF0000", true);
          addParticles(gs, e.x, e.y, "#FF4400", 25);
          gs.screenShake = 12;
        }
        if (e.hasTeleport) {
          e.teleportTimer++;
          if (_abilityReady && e.teleportTimer >= Math.floor(480 * _waveScale)) {
            e.teleportTimer = 0;
            e.sharedAbilityCooldown = 90;
            const teleportRng = getRunRng(gs, "hazards");
            const tAngle = teleportRng() * Math.PI * 2;
            const tDist  = 110 + teleportRng() * 70;
            e.x = Math.max(e.size, Math.min(W - e.size, p.x + Math.cos(tAngle) * tDist));
            e.y = Math.max(e.size, Math.min(H - e.size, p.y + Math.sin(tAngle) * tDist));
            addText(gs, e.x, e.y - 65, "🌀 BLINKED!", "#FF1493", true);
            addParticles(gs, e.x, e.y, "#FF1493", 15);
            gs.screenShake = 8;
          }
        }
        // ── Bullet Ring (wave 10+): fires 8 bullets in 360° pattern ──────────
        if (e.hasBulletRing) {
          e.bulletRingTimer++;
          const _brCap = Math.floor(360 * _waveScale);
          // Warning flash: 1 second (60 frames) before the ring fires
          // Adaptive widen if player has been dying to this enemy type recently
          const _brWarn = Math.floor(60 * (gs._telegraphMult?.[e.type] || 1));
          e.bulletRingWarning = _abilityReady && e.bulletRingTimer >= _brCap - _brWarn && e.bulletRingTimer < _brCap;
          if (_abilityReady && e.bulletRingTimer >= _brCap) {
            e.bulletRingTimer = 0;
            e.bulletRingWarning = false;
            e.sharedAbilityCooldown = 120;
            const _brCount = gs.currentWave >= 40 ? 12 : 8;
            for (let _ri = 0; _ri < _brCount; _ri++) {
              const ba = (_ri / _brCount) * Math.PI * 2;
              gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 4.5, vy: Math.sin(ba) * 4.5, life: 120, size: 5, color: "#FF6600", damage: 12, sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Boss"} bullet ring` });
            }
            addText(gs, e.x, e.y - 80, "🔥 BULLET RING!", "#FF6600", true);
            addParticles(gs, e.x, e.y, "#FF6600", 14);
            gs.screenShake = 6;
          }
        }
        // ── Ground Slam (wave 15+): expanding shockwave ring ─────────────────
        if (e.hasGroundSlam) {
          if (!e.groundSlamActive) {
            e.groundSlamTimer++;
            const _gsCap = Math.floor(420 * _waveScale);
            // Warning flash: 1.5 seconds (90 frames) before the slam triggers
            const _gsWarn = Math.floor(90 * (gs._telegraphMult?.[e.type] || 1));
            e.groundSlamWarning = _abilityReady && e.groundSlamTimer >= _gsCap - _gsWarn && e.groundSlamTimer < _gsCap;
            if (_abilityReady && e.groundSlamTimer >= _gsCap) {
              e.groundSlamTimer = 0; e.groundSlamWarning = false; e.groundSlamActive = true; e.groundSlamRadius = 0;
              e.sharedAbilityCooldown = 120;
              addText(gs, e.x, e.y - 80, "💥 GROUND SLAM!", "#FF4400", true);
              addParticles(gs, e.x, e.y, "#FF4400", 20);
              gs.screenShake = 14;
            }
          } else {
            e.groundSlamRadius += 6;
            const slamDist = Math.hypot(p.x - e.x, p.y - e.y);
            if (e.groundSlamRadius > 40 && slamDist > e.groundSlamRadius - 28 && slamDist < e.groundSlamRadius + 18 && p.invincible <= 0) {
              const _slamBase = (gs.currentWave >= 40 ? 25 : 18) * (gs._treeArmorMult || 1);
              const _slamDmg = gs.glassjaw ? Math.round(_slamBase * (gs.glassjawMult || 2)) : _slamBase;
              applyObservedPlayerDamage(gs, { damage: _slamDmg, frame: frameCountRef.current, kind: "boss", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Boss"} ground slam` }); p.invincible = 25; gs.damageFlash = 10;
              gs.damageThisWave = (gs.damageThisWave || 0) + 1;
              setHealth(Math.max(0, p.health));
              addText(gs, p.x, p.y - 30, "-" + _slamDmg + " SLAM!", "#FF4400");
              rumbleGamepad(0.4, 0.65, 150);
              if (p.health <= 0) handlePlayerDeath(gs);
            }
            if (e.groundSlamRadius >= 230) e.groundSlamActive = false;
          }
        }
      }
      // ── Procedural boss abilities (bonus abilities assigned on spawn) ──────
      if (e.isBossEnemy) {
        // Shield regen: restore HP while not recently hit (reset timer on any hit)
        if (e.hasShieldRegen && e.maxHealth !== undefined) {
          if (e.hitFlash > 0) { e.shieldRegenTimer = 0; }
          else { e.shieldRegenTimer = (e.shieldRegenTimer || 0) + 1; }
          if (e.shieldRegenTimer > 120) {
            e.health = Math.min(e.maxHealth, (e.health || 0) + (e.shieldRegenRate || 0.5));
          }
        }
        // Speed surge: brief double-speed burst
        if (e.hasSpeedSurge) {
          e.speedSurgeTimer = (e.speedSurgeTimer || 0) + 1;
          if (e.speedSurgeTimer >= e.speedSurgeCooldown) {
            e.speedSurgeTimer = 0;
            e.speedSurgeActive = true;
            setTimeout(() => { if (e) e.speedSurgeActive = false; }, 2000);
            addText(gs, e.x, e.y - 50, "⚡ SPEED SURGE!", "#FF8800");
          }
        }
        if (e.speedSurgeActive) { e.speed = (e._baseSpeed || e.speed) * 2; }
        else if (e._baseSpeed) { e.speed = e._baseSpeed; }
        else { e._baseSpeed = e.speed; }
        // Bullet spray: ring of 8 bullets
        if (e.hasBulletSpray) {
          e.bulletSprayTimer = (e.bulletSprayTimer || 0) + 1;
          if (e.bulletSprayTimer >= e.bulletSprayCooldown) {
            e.bulletSprayTimer = 0;
            for (let _ang = 0; _ang < Math.PI * 2; _ang += Math.PI / 4) {
              gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(_ang) * (gs.mutEnemyProjSpeed || 1) * 4, vy: Math.sin(_ang) * (gs.mutEnemyProjSpeed || 1) * 4, damage: 8, life: 60, size: 5, color: "#FF4400", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Enemy"} bullet spray` });
            }
          }
        }
        // Enrage threshold: permanent enrage below 40% HP
        if (e.hasEnrageThreshold && !e.enrageThresholdFired && e.health < e.maxHealth * 0.4) {
          e.enrageThresholdFired = true;
          e.enraged = true;
          e.speed *= 1.4;
          addText(gs, e.x, e.y - 60, "🔥 ENRAGED!", "#FF0000", true);
          gs.screenShake = 10;
        }
        // Ground mines: drop proximity mines below 60% HP
        if (e.hasGroundMines && e.health < e.maxHealth * 0.6) {
          e.mineDropTimer = (e.mineDropTimer || 0) + 1;
          if (e.mineDropTimer >= e.mineDropCooldown) {
            e.mineDropTimer = 0;
            const mineRng = getRunRng(gs, "hazards");
            gs.pickups.push({ x: e.x + (mineRng() - 0.5) * 100, y: e.y + (mineRng() - 0.5) * 100, type: "mine", life: 600 });
          }
        }
        // Magnet pull: deflect nearby player bullets
        if (e.hasMagnetPull && e.magnetRadius) {
          gs.bullets.forEach(b => {
            const _md = Math.hypot(b.x - e.x, b.y - e.y);
            if (_md < e.magnetRadius) {
              const _ma = Math.atan2(b.y - e.y, b.x - e.x);
              b.vx += Math.cos(_ma + Math.PI / 2) * 0.8;
              b.vy += Math.sin(_ma + Math.PI / 2) * 0.8;
            }
          });
        }
      }
      // ── Juggernaut (17): shield regen + charge ──
      if (e.typeIndex === 17 && e.isBossEnemy) {
        // Shield regen
        if ((e.jugShield || 0) < e.jugShieldMax) {
          if ((e.jugShieldRegenDelay || 0) > 0) { e.jugShieldRegenDelay--; }
          else { e.jugShield = Math.min(e.jugShieldMax, (e.jugShield || 0) + e.jugShieldMax * 0.003); }
        }
        // Charge logic
        if (e.jugStunned > 0) { e.jugStunned--; }
        else if (e.jugCharging) {
          // Move in charge direction at high speed
          e.x += e.jugChargeDx * 9; e.y += e.jugChargeDy * 9;
          e.jugChargeFrames--;
          // Check wall hit
          const hitWall = (gs.obstacles || []).some(ob => e.x > ob.x && e.x < ob.x + ob.w && e.y > ob.y && e.y < ob.y + ob.h);
          if (hitWall || e.jugChargeFrames <= 0) {
            e.jugCharging = false; e.jugStunned = 60; e.jugChargeCooldown = 300;
            if (hitWall) { gs.screenShake = 12; addText(gs, e.x, e.y - 50, "💥 WALL HIT!", "#FF8800"); addParticles(gs, e.x, e.y, "#CC4400", 15); }
          }
          // Hit player while charging
          if (Math.hypot(p.x - e.x, p.y - e.y) < e.size / 2 + 18 && p.invincible <= 0) {
            let cdmg = 30; if (gs.glassjaw) cdmg *= (gs.glassjawMult || 2); cdmg *= (gs._treeArmorMult || 1);
            applyObservedPlayerDamage(gs, { damage: cdmg, frame: frameCountRef.current, kind: "contact", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Juggernaut"} charge` }); p.invincible = 35; gs.damageFlash = 12; gs.damageThisWave = (gs.damageThisWave || 0) + 1;
            setHealth(Math.max(0, p.health)); addText(gs, p.x, p.y - 30, "-" + Math.floor(cdmg) + " CHARGE!", "#FF4400");
            rumbleGamepad(0.5, 0.8, 200);
            if (p.health <= 0) handlePlayerDeath(gs);
          }
        } else {
          // Charge windup
          if ((e.jugChargeCooldown || 0) > 0) { e.jugChargeCooldown--; }
          else {
            e.jugChargeWindup = (e.jugChargeWindup || 0) + 1;
            if (e.jugChargeWindup === 1) addText(gs, e.x, e.y - 60, "⚠ CHARGING...", "#FF6600");
            if (e.jugChargeWindup >= 90) {
              e.jugChargeWindup = 0; e.jugCharging = true; e.jugChargeFrames = 55;
              const _ca = Math.atan2(p.y - e.y, p.x - e.x);
              e.jugChargeDx = Math.cos(_ca); e.jugChargeDy = Math.sin(_ca);
              addText(gs, e.x, e.y - 60, "🦏 CHARGE!", "#FF4400", true);
              addParticles(gs, e.x, e.y, "#CC4400", 20);
            }
          }
        }
      }
      // ── Summoner (18): summon elites + invulnerability ──
      if (e.typeIndex === 18 && e.isBossEnemy) {
        // Count alive summons
        const _aliveCount = countSummonsFor(gs._enemyFrameIndex, e.summonerId);
        e.summonerCount = _aliveCount;
        e.summonerInvuln = _aliveCount > 0;
        if (_aliveCount === 0 && (e.summonerVulnTimer || 0) > 0) e.summonerVulnTimer--;
        if (_aliveCount === 0 && (e.summonerVulnTimer || 0) <= 0) {
          // Portal VFX during first-summon windup (every 25 frames while timer counts down)
          if (e.summonerFirstSummon && (e.summonerTimer || 0) > 0) {
            if (frameCountRef.current % 25 === 0) {
              addParticles(gs, e.x, e.y, "#CC88FF", 6);
              const _pa = cosmeticRandom() * Math.PI * 2, _pr = 60 + cosmeticRandom() * 40;
              addParticles(gs, e.x + Math.cos(_pa) * _pr, e.y + Math.sin(_pa) * _pr, "#8844FF", 4);
            }
          }
          // Summon timer
          e.summonerTimer = (e.summonerTimer || 0) - 1;
          if (e.summonerTimer <= 0 && _aliveCount < e.summonerMaxCount) {
            e.summonerTimer = 280;
            e.summonerFirstSummon = false;
            const _sCount = Math.min(3, e.summonerMaxCount - _aliveCount);
            const summonRng = getRunRng(gs, "hazards");
            for (let _si = 0; _si < _sCount; _si++) {
              const _sa = summonRng() * Math.PI * 2, _sd = 80 + summonRng() * 60;
              spawnEnemy(gs);
              const _ne = gs.enemies[gs.enemies.length - 1];
              _ne.x = e.x + Math.cos(_sa) * _sd; _ne.y = e.y + Math.sin(_sa) * _sd;
              _ne.summonedBy = e.summonerId;
              _ne.eliteType = ["armored","fast","explosive"][Math.floor(summonRng()*3)];
              if (_ne.eliteType === "fast") { _ne.speed *= 2; _ne.size *= 0.75; }
              else if (_ne.eliteType === "armored") { _ne.dmgMult = 0.45; _ne.health *= 1.5; _ne.maxHealth = _ne.health; }
            }
            addText(gs, e.x, e.y - 70, "🌀 SUMMONING!", "#8844FF", true);
            addParticles(gs, e.x, e.y, "#8844FF", 25);
            e.summonerVulnTimer = 360; // re-enters invuln after summons die
          }
        }
      }
      // ── The Algorithm (20): viral surge + 3-shot spread ──
      if (e.typeIndex === 20 && e.isBossEnemy) {
        e.viralSurgeTimer = (e.viralSurgeTimer || 0) - 1;
        if (e.viralSurgeActive > 0) {
          e.viralSurgeActive--;
          gs.algorithmSurge = e.viralSurgeActive > 0;
          if (e.viralSurgeActive === 0) {
            gs.algorithmSurge = false;
            addText(gs, e.x, e.y - 70, "📊 SURGE ENDED", "#1DA1F2");
          }
        } else if (e.viralSurgeTimer <= 0) {
          e.viralSurgeTimer = 480;
          e.viralSurgeActive = 180; // 3 seconds of viral surge
          gs.algorithmSurge = true;
          gs.screenShake = 10;
          addText(gs, e.x, e.y - 80, "📊 GOING VIRAL!", "#1DA1F2", true);
          addParticles(gs, e.x, e.y, "#1DA1F2", 25);
        }
        // 3-shot spread every projRate instead of 1 shot
        if (e.ranged && e.shootTimer >= e.projRate) {
          e.shootTimer = 0;
          const _pa = Math.atan2(p.y - e.y, p.x - e.x);
          for (let _bi = -1; _bi <= 1; _bi++) {
            const _ang = _pa + _bi * 0.32;
            gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(_ang) * e.projSpeed, vy: Math.sin(_ang) * e.projSpeed, life: 100, size: 5, color: "#1DA1F2", damage: 8, sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Enemy"} spread` });
          }
        }
      }
      // ── The Developer (21): debug mode, hotfix, merge conflict ──
      if (e.typeIndex === 21 && e.isBossEnemy) {
        // Debug Mode: temporarily removes a random obstacle
        if (e.hasDebugMode) {
          e.debugModeTimer = (e.debugModeTimer || 0) + 1;
          if (e.debugModeTimer >= e.debugModeCooldown && gs.obstacles && gs.obstacles.length > 0) {
            e.debugModeTimer = 0;
            const _ob = gs.obstacles[Math.floor(getRunRng(gs, "hazards")() * gs.obstacles.length)];
            if (_ob && (_ob._devSaved === undefined)) {
              const _savedW = _ob.w; const _savedH = _ob.h;
              _ob._devSaved = true;
              addText(gs, e.x, e.y - 60, "🐛 DEBUGGING ARENA...", "#00FF88");
              _ob.w = 0; _ob.h = 0;
              setTimeout(() => { if (_ob) { _ob.w = _savedW; _ob.h = _savedH; _ob._devSaved = undefined; } }, 4000);
            }
          }
        }
        // Hotfix: one-time self-heal to 75% when below 50% HP
        if (e.hasHotfix && !e.hotfixUsed && e.health < e.maxHealth * 0.5) {
          e.hotfixUsed = true;
          e.health = e.maxHealth * 0.75;
          addText(gs, e.x, e.y - 70, "🩹 HOTFIX DEPLOYED!", "#00FF88", true);
          addParticles(gs, e.x, e.y, "#00FF88", 20);
        }
        // Merge Conflict: fires 6 bullets in 3 directions simultaneously
        if (e.hasMergeConflict) {
          e.mergeConflictTimer = (e.mergeConflictTimer || 0) + 1;
          if (e.mergeConflictTimer >= e.mergeConflictCooldown) {
            e.mergeConflictTimer = 0;
            addText(gs, e.x, e.y - 55, "⚠️ MERGE CONFLICT!", "#FF8800");
            for (let _set = 0; _set < 3; _set++) {
              const _baseAng = (_set / 3) * Math.PI * 2;
              for (let _spread = -1; _spread <= 1; _spread++) {
                const _ang = _baseAng + _spread * 0.3;
                gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(_ang) * 5, vy: Math.sin(_ang) * 5, damage: 12, life: 80, size: 5, color: "#FF8800", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Boss"} merge conflict` });
              }
            }
          }
        }
      }
      // ── Universal boss phase 2 at 50% HP ─────────────────────────────────
      triggerBossPhaseTwoTransition({ enemy: e, gs, addText, addParticles, soundWaveClear });
      // ── Kamikaze (ti=12) ──
      if (e.typeIndex === 12 && dashRef.current.active <= 0) {
        const kd = Math.hypot(p.x - e.x, p.y - e.y);
        if (kd < e.size / 2 + 38) {
          addParticles(gs, e.x, e.y, "#FF4400", 25); addParticles(gs, e.x, e.y, "#FFD700", 10);
          addText(gs, e.x, e.y, "💥 BOOM!", "#FF4400", true); gs.screenShake = 12;
          gs.dyingEnemies = gs.dyingEnemies || [];
          if (gs.dyingEnemies.length < MAX_DYING_ANIM)
            gs.dyingEnemies.push({ x: e.x, y: e.y, emoji: e.emoji, color: e.color, size: e.size, life: 22, maxLife: 22 });
          if (p.invincible <= 0) {
            applyObservedPlayerDamage(gs, { damage: (gs.glassjaw ? Math.round(35 * (gs.glassjawMult || 2)) : 35) * (gs._treeArmorMult || 1), frame: frameCountRef.current, kind: "contact", sourceType: e.typeIndex, sourceName: ENEMY_TYPES[e.typeIndex]?.name || "Kamikaze" }); p.invincible = 40; gs.damageFlash = 12;
            gs.damageThisWave = (gs.damageThisWave || 0) + 1;
            setHealth(Math.max(0, p.health));
            addText(gs, p.x, p.y - 30, "-35 HP", "#FF0000");
            rumbleGamepad(0.5, 0.7, 200);
            if (p.health <= 0) handlePlayerDeath(gs);
          }
          retireEnemyWithoutDefeat(e, "kamikaze-self-destruct");
        }
      }
      // ── Enemy-wall collision (push-out, same logic as player) ──
      (gs.obstacles || []).forEach(ob => {
        const ecx = Math.max(ob.x, Math.min(e.x, ob.x + ob.w));
        const ecy = Math.max(ob.y, Math.min(e.y, ob.y + ob.h));
        const ed = Math.hypot(e.x - ecx, e.y - ecy);
        const er = e.size / 2 + 2;
        if (ed < er) {
          // When ed===0 the enemy is dead-center in a wall; use a random ejection angle to avoid oscillation
          const ea = ed > 0 ? Math.atan2(e.y - ecy, e.x - ecx) : getRunRng(gs, "hazards")() * Math.PI * 2;
          e.x = ecx + Math.cos(ea) * (er + 1);
          e.y = ecy + Math.sin(ea) * (er + 1);
          e.x = Math.max(e.size / 2, Math.min(W - e.size / 2, e.x));
          e.y = Math.max(e.size / 2, Math.min(H - e.size / 2, e.y));
        }
      });
      if (dashRef.current.active <= 0) {
        const d2 = Math.hypot(p.x - e.x, p.y - e.y);
        if (d2 < e.size / 2 + 15 && p.invincible <= 0) {
          let dmg = 10 + e.typeIndex * 5;
          if (gs.glassjaw) dmg *= (gs.glassjawMult || 2);
          dmg *= (gs._treeArmorMult || 1);
          applyObservedPlayerDamage(gs, { damage: dmg, frame: frameCountRef.current, kind: e.isBossEnemy ? "boss" : "contact", sourceType: e.typeIndex, sourceName: ENEMY_TYPES[e.typeIndex]?.name || e.name || "Enemy contact" }); p.invincible = 30; gs.screenShake = 8; gs.damageFlash = 10;
          gs.damageThisWave = (gs.damageThisWave || 0) + 1;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y - 30, "-" + Math.floor(dmg) + " HP", "#FF0000");
          rumbleGamepad(0.35, 0.5, 120);
          if (p.health <= 0) handlePlayerDeath(gs);
        }
      }
    });

    // ── Hazard tile effects ──────────────────────────────────────────────────
    gs._rubbleSlowed = false;
    for (const hz of (gs.hazards || [])) {
      hz.pulseTimer = ((hz.pulseTimer || 0) + 1) % 120;
      const _hDist = Math.hypot(p.x - hz.x, p.y - hz.y);
      if (_hDist < hz.radius) {
        if (hz.type === "acid") {
          // Acid pool: 0.5 damage per frame (~30/sec)
          const _acidDmg = 0.5 * (gs._treeArmorMult || 1) * (gs.glassjaw ? (gs.glassjawMult || 2) : 1);
          applyObservedPlayerDamage(gs, { damage: _acidDmg, frame: frameCountRef.current, kind: "hazard", sourceName: "Acid pool" });
          if (frameCountRef.current % 30 === 0) {
            addText(gs, p.x, p.y - 30, `-${Math.round(_acidDmg * 30)} ACID`, "#44FF44");
          }
          setHealth(Math.floor(p.health));
          if (p.health <= 0) handlePlayerDeath(gs);
        } else if (hz.type === "electro") {
          // Electro grid: zap for 15 damage every 90 frames
          if (hz.pulseTimer === 0) {
            const _elDmg = 15 * (gs.glassjaw ? (gs.glassjawMult || 2) : 1);
            applyObservedPlayerDamage(gs, { damage: _elDmg, frame: frameCountRef.current, kind: "hazard", sourceName: "Electro grid" });
            setHealth(Math.floor(p.health));
            addText(gs, p.x, p.y - 30, `ZAP! -${Math.round(_elDmg)}`, "#FFFF00", true);
            gs.screenShake = Math.max(gs.screenShake, 4);
            if (p.health <= 0) handlePlayerDeath(gs);
          }
        } else if (hz.type === "rubble") {
          // Rubble pile: slow player movement by 40%
          gs._rubbleSlowed = true;
        }
      }
    }

    // ── Pickup collection ──
    const pickupRange = perkModsRef.current.pickupRange || 30;
    gs.pickups = stepAndCompactInPlace(gs.pickups, pk => {
      pk.life--;
      const d2 = Math.hypot(p.x - pk.x, p.y - pk.y);
      // ── Proximity mine: explode when player gets within 40px ──
      if (pk.type === "mine") {
        if (d2 < 40 && p.invincible <= 0) {
          const _mineDmg = 25 * (gsRef.current?.glassjawMult || 1);
          applyObservedPlayerDamage(gs, { damage: _mineDmg, frame: frameCountRef.current, kind: "mine", sourceName: "Proximity mine" }); setHealth(Math.floor(p.health));
          p.invincible = 30; gs.damageFlash = 12;
          gs.damageThisWave = (gs.damageThisWave || 0) + 1;
          addText(gs, pk.x, pk.y - 20, "💥 MINE! -" + Math.round(_mineDmg), "#FF4400", true);
          addParticles(gs, pk.x, pk.y, "#FF4400", 16);
          gs.screenShake = 12;
          rumbleGamepad(0.5, 0.7, 200);
          if (p.health <= 0) handlePlayerDeath(gs);
          return false;
        }
        return pk.life > 0;
      }
      if (d2 < pickupRange) {
        soundPickupAt(pk.type, pk.x, W);
        if (pk.type === "health") {
          const maxHP = p.maxHealth || 100; p.health = Math.min(maxHP, p.health + 30);
          setHealth(p.health); addText(gs, pk.x, pk.y, "+30 HP", "#00FF00");
        } else if (pk.type === "ammo") {
          const upgLevel = gs.weaponUpgrades?.[wpnIdx] || 0;
          const maxAmmo = Math.floor(WEAPONS[wpnIdx].maxAmmo * (1 + upgLevel * 0.25) * (perkModsRef.current.ammoMult || 1));
          // Scavenger: restore 30% more ammo (partial restore for all weapons)
          const ammoRestoreMult = perkModsRef.current.ammoRestoreMult || 1;
          if (ammoRestoreMult > 1) {
            // Scavenger mode: restore 30% of max ammo across ALL weapons
            WEAPONS.forEach((w, wi) => {
              const wUpg = gs.weaponUpgrades?.[wi] || 0;
              const wMax = Math.floor(w.maxAmmo * (1 + wUpg * 0.25) * (perkModsRef.current.ammoMult || 1));
              gs.weaponAmmos[wi] = Math.min(wMax, (gs.weaponAmmos[wi] || 0) + Math.floor(wMax * 0.30 * ammoRestoreMult));
            });
          }
          if (ammoRestoreMult <= 1) gs.weaponAmmos[wpnIdx] = maxAmmo; // normal: full refill current weapon
          gs.ammoCount = gs.weaponAmmos[wpnIdx]; setAmmo(gs.ammoCount);
          addText(gs, pk.x, pk.y, ammoRestoreMult > 1 ? "MAX AMMO + RESUPPLY!" : "MAX AMMO", "#00BFFF");
        } else if (pk.type === "speed") {
          p.speed = Math.min(8, p.speed + 0.5); addText(gs, pk.x, pk.y, "SPEED!", "#FFFF00");
          setTimeout(() => { if (gsRef.current) gsRef.current.player.speed = Math.max(4, gsRef.current.player.speed - 0.5); }, 5000);
        } else if (pk.type === "nuke") {
          statsRef.current.nukes++;
          addText(gs, W / 2, H / 2, "TACTICAL NUKE!", "#FF0000", true);
          gs.enemies.forEach((en, _ni) => {
            retireEnemyWithoutDefeat(en, "tactical-nuke");
            gs.score += en.points;
            if (_ni < 12) addParticles(gs, en.x, en.y, en.color, 8);
          });
          gs.enemies = []; gs.screenShake = 20; setScore(gs.score); checkAchievements(gs);
        } else if (pk.type === "guardian_angel") {
          extraLivesRef.current = 1; setExtraLives(1); statsRef.current.guardianAngels++;
          addText(gs, pk.x, pk.y - 20, "GUARDIAN ANGEL!", "#FFD700", true);
          addText(gs, pk.x, pk.y + 10, "+1 EXTRA LIFE", "#FFFFFF");
          addParticles(gs, pk.x, pk.y, "#FFD700", 25);
          addParticles(gs, pk.x, pk.y, "#FFFFFF", 15);
          gs.screenShake = 8; checkAchievements(gs);
        } else if (pk.type === "upgrade") {
          const idx = currentWeaponRef.current;
          const curLevel = gs.weaponUpgrades[idx] || 0;
          statsRef.current.weaponUpgradesCollected++;
          if (curLevel < 3) {
            gs.weaponUpgrades[idx] = curLevel + 1;
            const newLevel = gs.weaponUpgrades[idx];
            if (newLevel > statsRef.current.maxWeaponLevel) statsRef.current.maxWeaponLevel = newLevel;
            const stars = "⭐".repeat(newLevel);
            addText(gs, pk.x, pk.y - 30, "🔧 " + WEAPONS[idx].name + " " + stars, "#AA44FF", true);
            addParticles(gs, pk.x, pk.y, "#AA44FF", 20);
            setWeaponUpgrades([...gs.weaponUpgrades]);
          } else {
            gs.score += 2000; setScore(gs.score);
            addText(gs, pk.x, pk.y - 30, "MAX LEVEL! +2000", "#AA44FF", true);
          }
          checkAchievements(gs);
        } else if (pk.type === "rage") {
          gs.rageTimer = 300; // 5s at 60fps
          addText(gs, pk.x, pk.y - 20, "🔥 RAGE! +75% DMG 5s", "#FF4400", true);
          addParticles(gs, pk.x, pk.y, "#FF4400", 20);
          addParticles(gs, pk.x, pk.y, "#FF8800", 12);
          gs.screenShake = Math.max(gs.screenShake, 6);
        } else if (pk.type === "magnet") {
          // Pull all pickups to player instantly
          addText(gs, pk.x, pk.y - 20, "🧲 MAGNET!", "#FF88FF", true);
          addParticles(gs, pk.x, pk.y, "#FF88FF", 18);
          gs.pickups.forEach(other => { if (other !== pk) { other.x = p.x; other.y = p.y; } });
        } else if (pk.type === "freeze") {
          gs.freezeTimer = 180; // 3s
          addText(gs, pk.x, pk.y - 20, "❄️ FREEZE! 3s", "#88CCFF", true);
          addParticles(gs, pk.x, pk.y, "#88CCFF", 18);
          addParticles(gs, pk.x, pk.y, "#FFFFFF", 10);
          gs.screenShake = Math.max(gs.screenShake, 5);
        } else if (pk.type === "time_dilation") {
          gs.timeDilationTimer = 360; // 6s at 60fps
          addText(gs, pk.x, pk.y - 20, "⏳ BULLET TIME! 6s", "#CC88FF", true);
          addParticles(gs, pk.x, pk.y, "#AA66FF", 24);
          addParticles(gs, pk.x, pk.y, "#FFFFFF", 12);
          gs.screenShake = Math.max(gs.screenShake, 6);
        }
        addXp(50);
        return false;
      }
      return pk.life > 0;
    });

    // ── Particles / floats ──
    stepTransientEffectsInPlace(gs);


    if (gs.screenShake > 0) gs.screenShake *= 0.85;
    if (gs.muzzleFlash > 0) gs.muzzleFlash--;
    if (gs.damageFlash > 0) gs.damageFlash--;
    if (gs.killFlash > 0) gs.killFlash--;
    if ((gs.bossKillFlash || 0) > 0) gs.bossKillFlash--;
    if (gs._mutationAcceptFlash?.framesLeft > 0) gs._mutationAcceptFlash.framesLeft--;
    if (gs._waveKillFeed?.framesLeft > 0) gs._waveKillFeed.framesLeft--;
    if ((gs.adrenalineRushTimer || 0) > 0) gs.adrenalineRushTimer--;
    if ((gs.rageTimer || 0) > 0) gs.rageTimer--;
    if ((gs.freezeTimer || 0) > 0) gs.freezeTimer--;
    if ((gs.timeDilationTimer || 0) > 0) gs.timeDilationTimer--;
    if ((gs._flowStateCooldown || 0) > 0) gs._flowStateCooldown--;
    if ((gs._globalTauntCooldown || 0) > 0) gs._globalTauntCooldown--;
    if ((gs._comboCardTimer || 0) > 0) gs._comboCardTimer--;
    // Near-death event tracking for run narrative arc (below 20% max HP)
    const _ndMax = gs.player.maxHealth || 100;
    if (gs.player.health > 0 && gs.player.health < _ndMax * 0.20) {
      if (!gs._nearDeathActive) {
        gs._nearDeathActive = true;
        (gs._nearDeathEvents = gs._nearDeathEvents || []).push({ wave: gs.currentWave, hpLeft: Math.round(gs.player.health) });
      }
    } else { gs._nearDeathActive = false; }
    if (gs.coinMultTimer > 0) { gs.coinMultTimer--; if (gs.coinMultTimer === 0) { gs.coinMultActive = false; } }
    if (gs.coinStreakTimer > 0) { gs.coinStreakTimer--; if (gs.coinStreakTimer === 0) { gs.coinStreakKills = 0; } }


    gs._deathSoundsThisFrame = 0; // reset death-sound throttle each frame
    frameCountRef.current++;

    // ────────────────── RENDER ──────────────────────────────────────────────
    drawGame(ctx, canvas, W, H, gs, { dashRef, mouseRef, joystickRef, shootStickRef, startTimeRef, frameCountRef, isMobile, tip, wpnIdx });

  }, [shoot, spawnEnemy, spawnBoss, doReload, isMobile, checkAchievements, checkDailyMissions, tip, handlePlayerDeath, addXp, openQueuedPerkSelection, sampleCommandTrace, inputDebugEnabled, dashReady, grenadeReady]);

  // ── Start / stop animation ─────────────────────────────────────────────────
  useGameLoop(gameLoop, screen === "game", frameRef, {
    monitorRef: frameMonitorRef,
    shouldMeasure: () => Boolean(
      gsRef.current?.player
      && !pausedRef.current
      && !perkPendingRef.current
      && !shopPendingRef.current
      && !routePendingRef.current
      && !bossCutsceneRef.current
      && !waveAnnouncePendingRef.current
      && !mutationPendingRef.current
    ),
    onError: (error) => {
      console.error("[GAME LOOP] Frame fault closed the run instead of freezing the canvas:", error);
      handlePlayerDeath(gsRef.current, { cause: "runtime_fault", allowRecovery: false });
    },
  });

  // Browser lifecycle transitions must become explicit, input-safe pause receipts.
  useEffect(() => {
    if (screen !== "game") return undefined;
    const pauseForLifecycle = (reason) => {
      const transition = transitionPause(true, reason);
      if (!transition?.releaseInputs) releaseAllInputs(reason);
    };
    const handleVisibility = () => {
      if (document.hidden) pauseForLifecycle("visibility");
    };
    const handleBlur = () => pauseForLifecycle("blur");
    const handlePageHide = () => pauseForLifecycle("pagehide");
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", handlePageHide);
      releaseAllInputs("lifecycle-listener-cleanup");
    };
  }, [releaseAllInputs, screen, transitionPause]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        if (e.key === "Escape" && screen === "game") { transitionPause(!pausedRef.current, "keyboard"); e.preventDefault(); }
        return;
      }
      if (e.key === "Escape" && screen === "game") { transitionPause(!pausedRef.current, "keyboard"); e.preventDefault(); return; }
      if (pausedRef.current || perkPendingRef.current) return;
      inputDeviceRef.current = "keyboard";
      markInputActivity("keyboard");
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "r") doReload(currentWeaponRef.current);
      if (e.key === "q" || e.key === "g") throwGrenade();
      if (e.key === " " || e.key === "Shift") doDash();
      if (e.key === "e") fireSynergyCharge();
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= WEAPONS.length) switchWeapon(num - 1);
      if (e.key === "0" && WEAPONS.length >= 10) switchWeapon(9);
      if (e.key === "-" && WEAPONS.length >= 11) switchWeapon(10);
      if (e.key === "=" && WEAPONS.length >= 12) switchWeapon(11);
      if (["w","a","s","d","r","q","g","e","1","2","3","4","5","6","7","8","9","0","-","="," "].includes(e.key.toLowerCase()) || e.key === "Shift") e.preventDefault();
    };
    const ku = (e) => {
      markInputActivity("keyboard");
      keysRef.current[e.key.toLowerCase()] = false;
    };
    const updateMouseAim = (e) => {
      inputDeviceRef.current = "mouse";
      markInputActivity("mouse");
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.moved = true;
    };
    const mm = updateMouseAim;
    const md = (e) => {
      updateMouseAim(e);
      if (e.button === 0 && !pausedRef.current && !perkPendingRef.current) mouseRef.current.down = true;
    };
    const mu = (e) => {
      markInputActivity("mouse");
      if (e.button === 0) mouseRef.current.down = false;
    };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    window.addEventListener("mousemove", mm); window.addEventListener("mousedown", md); window.addEventListener("mouseup", mu);
    return () => {
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      window.removeEventListener("mousemove", mm); window.removeEventListener("mousedown", md); window.removeEventListener("mouseup", mu);
      releaseAllInputs("keyboard-listener-cleanup", ["keyboard", "mouse"]);
    };
  }, [doReload, throwGrenade, doDash, switchWeapon, fireSynergyCharge, markInputActivity, releaseAllInputs, screen, transitionPause]);

  // ── Touch controls ────────────────────────────────────────────────────────
  useEffect(() => {
    // Always reset sticks on screen change so stale active state never carries over
    releaseAllInputs("touch-screen-change", ["touch"]);
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ts = (e) => {
      if (pausedRef.current || perkPendingRef.current) return;
      e.preventDefault();
      inputDeviceRef.current = "mobile";
      markInputActivity("touch");
      const rect = canvas.getBoundingClientRect(), midX = rect.left + rect.width / 2;
      for (const t of e.changedTouches) {
        if (t.clientX < midX && !joystickRef.current.active) joystickRef.current = { active: true, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0, id: t.identifier };
        else if (t.clientX >= midX && !shootStickRef.current.active) shootStickRef.current = { active: true, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0, id: t.identifier, shooting: false };
      }
    };
    const tm = (e) => {
      if (pausedRef.current || perkPendingRef.current) return;
      e.preventDefault();
      markInputActivity("touch");
      for (const t of e.changedTouches) {
        if (t.identifier === joystickRef.current.id) { joystickRef.current.dx = t.clientX - joystickRef.current.startX; joystickRef.current.dy = t.clientY - joystickRef.current.startY; }
        if (t.identifier === shootStickRef.current.id) { shootStickRef.current.dx = t.clientX - shootStickRef.current.startX; shootStickRef.current.dy = t.clientY - shootStickRef.current.startY; }
      }
    };
    const te = (e) => {
      markInputActivity("touch");
      for (const t of e.changedTouches) {
        if (t.identifier === joystickRef.current.id) joystickRef.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null };
        if (t.identifier === shootStickRef.current.id) shootStickRef.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null, shooting: false };
      }
    };
    canvas.addEventListener("touchstart", ts, { passive: false });
    canvas.addEventListener("touchmove", tm, { passive: false });
    canvas.addEventListener("touchend", te); canvas.addEventListener("touchcancel", te);
    return () => {
      canvas.removeEventListener("touchstart", ts); canvas.removeEventListener("touchmove", tm);
      canvas.removeEventListener("touchend", te); canvas.removeEventListener("touchcancel", te);
      releaseAllInputs("touch-listener-cleanup", ["touch"]);
    };
  }, [markInputActivity, releaseAllInputs, screen]);

  // ── Gamepad polling ───────────────────────────────────────────────────────
  useEffect(() => {
    let lastPrevWeapon = false, lastNextWeapon = false, lastStart = false;
    let lastDash = false, lastGrenade = false, lastReload = false;
    let lastGpConnected = false;

    const poll = () => {
      const gp = getPrimaryGamepad();
      const connected = !!gp;
      if (connected !== lastGpConnected) {
        lastGpConnected = connected;
        setGamepadConnected(connected);
        if (!connected) {
          controllerTypeRef.current = "controller";
          gamepadMetaRef.current = { connected: false, index: null, id: "", type: "controller" };
          setControllerType("controller");
        }
      }
      if (!gp) {
        if (gamepadMoveRef.current.active || gamepadShootRef.current || gamepadAngleRef.current != null) {
          releaseAllInputs("gamepad-missing", ["gamepad"]);
        }
        return;
      }

      // Detect controller type
      const cType = detectControllerType(gp);
      rememberControllerProfile(gp);
      if (cType !== controllerTypeRef.current) { controllerTypeRef.current = cType; setControllerType(cType); }
      gamepadMetaRef.current = {
        connected: true,
        index: gp.index ?? null,
        id: gp.id || "",
        type: cType,
      };
      inputDeviceRef.current = cType;

      if (pausedRef.current || perkPendingRef.current || shopPendingRef.current || routePendingRef.current || bossCutsceneRef.current) {
        // While paused still handle Start button to unpause
        const start = gp.buttons[9]?.pressed;
        if (start && !lastStart) transitionPause(!pausedRef.current, "controller");
        lastStart = !!start;
        // Clear controller movement so player doesn't keep moving when unpaused.
        // Keyboard state is owned by keyboard events and must not be overwritten here.
        releaseAllInputs("gamepad-paused", ["gamepad"]);
        return;
      }

      const deadZone = settingsRef.current.controllerDeadZone ?? 0.2;
      const controls = readGamepadControls(gp, deadZone);
      if (controls.left.active || controls.right.active || controls.shoot || controls.dash
        || controls.grenade || controls.reload || controls.previousWeapon || controls.nextWeapon || controls.pause) {
        markInputActivity("gamepad");
      }

      // Left stick → movement. Keep this isolated from keyboard state so an
      // idle/paired controller cannot erase WASD input every poll.
      gamepadMoveRef.current = controls.left.active
        ? { x: controls.left.x, y: controls.left.y, active: true }
        : { x: 0, y: 0, active: false };

      // Right stick → aim ONLY (no shooting from stick)
      if (controls.right.active) {
        gamepadAngleRef.current = Math.atan2(controls.right.y, controls.right.x);
      } else {
        gamepadAngleRef.current = null;
      }

      // RT (button 7) → shoot (analog-aware)
      gamepadShootRef.current = controls.shoot;

      // A/Cross → dash (edge-triggered)
      if (controls.dash && !lastDash) doDash();
      lastDash = !!controls.dash;

      // B/Circle → grenade (edge-triggered)
      if (controls.grenade && !lastGrenade) throwGrenade();
      lastGrenade = !!controls.grenade;

      // Button 2 (X/Square / ☐) → reload (edge-triggered)
      if (controls.reload && !lastReload) doReload(currentWeaponRef.current);
      lastReload = !!controls.reload;

      // LT (button 6) → ADS / zoom (analog-aware)
      const ltValue = gp.buttons[6]?.value ?? (gp.buttons[6]?.pressed ? 1 : 0);
      if (gsRef.current) gsRef.current.adsZoom = ltValue > 0.3;

      if (controls.previousWeapon && !lastPrevWeapon) switchWeapon(((currentWeaponRef.current - 1) + WEAPONS.length) % WEAPONS.length);
      if (controls.nextWeapon && !lastNextWeapon) switchWeapon((currentWeaponRef.current + 1) % WEAPONS.length);
      lastPrevWeapon = !!controls.previousWeapon;
      lastNextWeapon = !!controls.nextWeapon;

      // Button 9 (Start/Options) → toggle pause (edge-triggered)
      const start = controls.pause;
      if (start && !lastStart) transitionPause(!pausedRef.current, "controller");
      lastStart = !!start;
    };

    const handleGamepadDisconnected = () => releaseAllInputs("gamepad-disconnected", ["gamepad"]);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    gamepadPollRef.current = setInterval(poll, 16);
    return () => {
      clearInterval(gamepadPollRef.current);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      releaseAllInputs("gamepad-listener-cleanup", ["gamepad"]);
    };
  }, [doDash, doReload, markInputActivity, releaseAllInputs, throwGrenade, switchWeapon, transitionPause]);

  // ── Respawn (from death screen) ───────────────────────────────────────────
  const _respawn = useCallback(() => {
    releaseAllInputs("respawn");
    const gs = gsRef.current, W = GW(), H = GH();
    if (gs) {
      gs.player.health = 100; gs.player.x = W / 2; gs.player.y = H / 2; gs.player.invincible = 60;
      const upgLevel = gs.weaponUpgrades?.[currentWeaponRef.current] || 0;
      gs.ammoCount = Math.floor(WEAPONS[currentWeaponRef.current].maxAmmo * (1 + upgLevel * 0.25));
      gs.enemies = []; gs.bullets = []; gs.grenades = []; gs.enemyBullets = []; gs.enemiesThisWave = 0;
      setHealth(100); setAmmo(gs.ammoCount);
      setIsReloading(false); isReloadingRef.current = false;
    }
    startTimeRef.current = Date.now(); setTimeSurvived(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { if (!pausedRef.current && !perkPendingRef.current && !shopPendingRef.current && !routePendingRef.current && !bossCutsceneRef.current && !waveAnnouncePendingRef.current && !mutationPendingRef.current) setTimeSurvived(t => t + 1); }, 1000);
    setScreen("game");
  }, [releaseAllInputs]);

  const selectPrimaryWeapon = useCallback((idx) => {
    const next = Math.max(0, Math.min(WEAPONS.length - 1, Math.floor(Number(idx) || 0)));
    currentWeaponRef.current = next;
    setCurrentWeapon(next);
    writePreference("cod-primary-weapon", String(next));
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  const base = { width: "100%", height: "100dvh", margin: 0, overflow: "hidden", background: "#0a0a0a", fontFamily: "'Courier New', monospace", display: "flex", flexDirection: "column", position: "relative", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" };

  if (screen === "username") {
    return (
      <DisplayNameScreen
        initialName={username}
        onSave={(name) => {
          lockCallsign(name);
          setUsername(name);
          claimCallsign(name);
          identify(name, {
            accountLevel: getAccountLevel(loadCareerStats().totalKills || 0),
            prestige: loadMetaProgress()?.prestige || 0,
          });
          setScreen("menu");
        }}
        onCancel={() => {
          setUsername(getLockedCallsign() || "Guest");
          setScreen("menu");
        }}
      />
    );
  }

  if (screen === "menu") {
    if (draftPending) {
      return <AsyncPanelBoundary><DraftScreen options={draftOptions} onSelect={applyDraftPerk} /></AsyncPanelBoundary>;
    }
    const homeVersion = resolveHomeVersion(window.location.search);
    const Home = homeVersion === "v1" ? MenuScreen : homeVersion === "v3" ? HomeV3 : HomeV2;
    return (
      <AsyncPanelBoundary>
        <Home
          username={username} difficulty={difficulty} setDifficulty={setDifficulty}
          isMobile={isMobile} leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={loadMoreLeaderboard}
          onStart={startGame} onRefreshLeaderboard={refreshLeaderboard}
          onChangeUsername={() => { setUsername(getLockedCallsign() || ""); setScreen("username"); }}
          starterLoadout={starterLoadout} setStarterLoadout={setStarterLoadout}
          gameSettings={gameSettings}
          onSaveSettings={s => { setGameSettings(s); settingsRef.current = s; }}
          onSetVisualPack={visualPack => {
            const next = { ...settingsRef.current, visualPack: normalizeVisualPack(visualPack) };
            settingsRef.current = next;
            setGameSettings(next);
            saveSettings(next);
          }}
          gamepadConnected={gamepadConnected} controllerType={controllerType}
          scoreAttackMode={scoreAttackMode}
          onSetScoreAttackMode={v => { setScoreAttackMode(v); scoreAttackRef.current = v; if (v) { setDailyChallengeMode(false); dailyChallengeRef.current = false; setCursedRunMode(false); cursedRunRef.current = false; setBossRushMode(false); bossRushRef.current = false; } }}
          dailyChallengeMode={dailyChallengeMode}
          onSetDailyChallengeMode={v => { setDailyChallengeMode(v); dailyChallengeRef.current = v; if (v) { setScoreAttackMode(false); scoreAttackRef.current = false; setCursedRunMode(false); cursedRunRef.current = false; setBossRushMode(false); bossRushRef.current = false; } }}
          cursedRunMode={cursedRunMode}
          onSetCursedRunMode={v => { setCursedRunMode(v); cursedRunRef.current = v; if (v) { setScoreAttackMode(false); scoreAttackRef.current = false; setDailyChallengeMode(false); dailyChallengeRef.current = false; setBossRushMode(false); bossRushRef.current = false; } }}
          bossRushMode={bossRushMode}
          onSetBossRushMode={v => { setBossRushMode(v); bossRushRef.current = v; if (v) { setScoreAttackMode(false); scoreAttackRef.current = false; setDailyChallengeMode(false); dailyChallengeRef.current = false; setCursedRunMode(false); cursedRunRef.current = false; } }}
          speedrunMode={speedrunMode}
          onSetSpeedrunMode={v => { setSpeedrunMode(v); speedrunRef.current = v; if (v) { setGauntletMode(false); gauntletRef.current = false; setScoreAttackMode(false); scoreAttackRef.current = false; setDailyChallengeMode(false); dailyChallengeRef.current = false; setCursedRunMode(false); cursedRunRef.current = false; setBossRushMode(false); bossRushRef.current = false; } }}
          gauntletMode={gauntletMode}
          onSetGauntletMode={v => { setGauntletMode(v); gauntletRef.current = v; if (v) { setSpeedrunMode(false); speedrunRef.current = false; setScoreAttackMode(false); scoreAttackRef.current = false; setDailyChallengeMode(false); dailyChallengeRef.current = false; setCursedRunMode(false); cursedRunRef.current = false; setBossRushMode(false); bossRushRef.current = false; } }}
          assistAvailable={assistAvailable}
          onApplyAssist={() => { if (!assistUsed) { setAssistUsed(true); setAssistAvailable(false); const gs = gsRef.current; if (gs && gs.player) { gs.player.health = Math.min(gs.player.maxHealth, gs.player.health + 50); setHealth(gs.player.health); } } }}
          onInstallApp={pwaPromptReady ? promptInstallApp : null}
          pwaInstallPromptReady={pwaPromptReady}
          primaryWeaponIndex={currentWeapon}
          onSelectPrimaryWeapon={selectPrimaryWeapon}
          onReplayTraining={() => {
            const resetEvidence = normalizeTutorialEvidence();
            tutorialEvidenceRef.current = resetEvidence;
            setTutorialEvidence(resetEvidence);
            // Training is an immediate play action; bypass the pre-run draft once.
            draftShownRef.current = true;
            startGame(undefined, { training: true });
          }}
        />
      </AsyncPanelBoundary>
    );
  }

  if (screen === "death") {
    const deathScreenProps = buildDeathScreenProps({
      score,
      kills,
      deaths,
      wave,
      level,
      bestStreak,
      timeSurvived,
      totalDamage,
      stats: statsRef.current,
      deathMessage,
      difficulty,
      runSeed,
      runModifier,
      runModifiers: RUN_MODIFIERS,
      achievementsUnlocked,
      activePerks,
      missionsSummary,
      leaderboard,
      lbLoading,
      lbHasMore,
      onLoadMore: loadMoreLeaderboard,
      username,
      DIFFICULTIES,
      onStartGame: startGame,
      onMenu: () => { stopMusic(); stopAmbient(); stopDangerDrone(); setDangerIntensity(0); setScreen("menu"); },
      onRefreshLeaderboard: refreshLeaderboard,
      onSubmitScore: submitScore,
      highlightGifUrl,
      gifEncoding,
      fmtTime,
      gamepadConnected,
      controllerType,
      weaponKills: weaponKillsSnapshot,
      starterLoadout,
      traceEvidence: deathTraceEvidenceRef.current,
      performanceReceipt: frameMonitorRef.current?.snapshot?.() || null,
      gs: gsRef.current,
      bossKillCount: statsRef.current.bossKills || 0,
      weaponMilestones: weaponMilestonesRef.current,
      cosmeticUnlocks,
      objectivesSummary,
      scoreAttackMode,
      dailyChallengeMode,
      bossRushMode,
      cursedRunMode,
      speedrunMode,
      gauntletMode,
      challengeVsScore,
      challengeVsName,
      onInstallApp: pwaPromptReady ? promptInstallApp : null,
      experimentMatched: experimentMatchedRef.current,
      peakMoment: peakMomentRef.current,
      communityChokeWaves: communityChokePointsRef.current,
    });
    return (
      <AsyncPanelBoundary>
        <DeathScreen {...deathScreenProps} />
      </AsyncPanelBoundary>
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────────────
  const xpNeeded = getLevelXpNeeded(level);
  const nextPerkLevel = getNextPerkLevel(level);
  return (
    <div ref={containerRef} style={base}>
      {/* Accessibility: skip-to-game link for keyboard users */}
      <a href="#game-canvas" className="skip-link">Skip to game</a>
      {/* Accessibility: aria-live region announces wave/boss events to screen readers */}
      <div aria-live="polite" aria-atomic="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>{liveAnnounce}</div>
      <canvas
        id="game-canvas"
        ref={canvasRef}
        style={{ width: "100%", height: isMobile ? "calc(100% - 64px)" : "100%", display: "block", cursor: isMobile ? "default" : (gameSettings.crosshair !== "cross" ? "none" : "crosshair"),
          filter: colorblindMode ? "saturate(0.65) contrast(1.35) brightness(1.08) hue-rotate(-15deg)" : "none" }}
      />

      {/* Pause menu */}
      {paused && (
        <AsyncPanelBoundary><PauseMenu
          wave={wave} timeSurvived={timeSurvived} score={score} isMobile={isMobile}
          achievementsUnlocked={achievementsUnlocked} fmtTime={fmtTime}
          musicMuted={musicMuted} onToggleMute={toggleMusicMuted}
          musicVibe={musicVibe} onSetMusicVibe={(v) => { setMusicVibe(v); setMusicVibeState(v); writePreference("cod-music-vibe", v); }}
          colorblindMode={colorblindMode} onToggleColorblind={toggleColorblind}
          gameSettings={gameSettings} onSaveSettings={s => { setGameSettings(s); settingsRef.current = s; }}
          pauseReason={pauseReason}
          onResume={() => transitionPause(false, "resume")}
          onLeave={() => {
            const mode = resolveMode(scoreAttackRef.current, dailyChallengeRef.current, cursedRunRef.current, bossRushRef.current, speedrunRef.current, gauntletRef.current);
            const abandonPayload = { wave, score, mode, difficulty: difficultyRef.current, timeSurvived: Math.floor((Date.now() - startTimeRef.current) / 1000) };
            track("mode_abandon", abandonPayload);
            saveStudioGameEvent(buildStudioGameEvent("mode_abandon", { surface: "pause_menu", ...abandonPayload }));
            stopMusic(); stopAmbient(); stopDangerDrone(); setDangerIntensity(0); transitionPause(false, "leave"); setScreen("menu");
          }}
          gamepadConnected={gamepadConnected} controllerType={controllerType}
          leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore}
          onLoadMore={loadMoreLeaderboard} onRefreshLeaderboard={refreshLeaderboard}
          username={username}
          gsSnapshot={gsRef.current}
          activePerks={activePerks}
          perkMods={perkModsRef.current}
          activeSynergiesData={gsRef.current?.activeSynergies || []}
        /></AsyncPanelBoundary>
      )}

      {/* Wave route select */}
      {routePending && (
        <AsyncPanelBoundary>
          <RouteSelectModal options={routeOptions} wave={wave} onSelect={applyRoute} buildArchetype={dominantArchetype} gs={gsRef.current} />
        </AsyncPanelBoundary>
      )}

      {/* Wave mutation challenge */}
      {mutationPending && mutationOptions.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "rgba(15,5,30,0.98)", border: "1px solid rgba(180,0,255,0.35)", borderRadius: 14, padding: "28px 24px", maxWidth: 460, width: "100%", color: "#FFF", boxShadow: "0 0 40px rgba(150,0,255,0.2)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#CC44FF", letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 6 }}>── CHALLENGE ──</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#CC44FF", fontFamily: "'Courier New',monospace", letterSpacing: 2 }}>🧬 MUTATION PACT</div>
              <div style={{ fontSize: 12, color: "#AAA", marginTop: 6, lineHeight: 1.5 }}>Accept an enemy buff this wave. The harder the deal, the bigger the reward.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {mutationOptions.map((mut) => (
                <button key={mut.id} onClick={() => applyMutation(mut)} style={{
                  background: "rgba(180,0,255,0.1)", border: "1px solid rgba(180,0,255,0.4)", borderRadius: 10,
                  padding: "14px 18px", color: "#FFF", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  transition: "background 0.15s", fontFamily: "inherit",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 26 }}>{mut.emoji}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#CC44FF", letterSpacing: 1 }}>{mut.name}</div>
                      <div style={{ fontSize: 12, color: "#CCC", marginTop: 2 }}>{mut.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#FFD700" }}>+{mut.reward}</div>
                    <div style={{ fontSize: 10, color: "#AA8800" }}>💩 COINS</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={skipMutation} style={{
              width: "100%", padding: "10px 0", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#888",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              ✗ SKIP — No thanks
            </button>
          </div>
        </div>
      )}

      {/* Wave clear shop */}
      {shopPending && (
        <AsyncPanelBoundary>
          <WaveShopModal options={shopOptions} wave={wave} onSelect={applyShopOption} boughtHistory={shopHistory} currentWeapon={currentWeapon} coins={coins} coinShopOptions={coinShopOptions} onCoinBuy={applyCoinShopItem} buildArchetype={dominantArchetype} gs={gsRef.current} />
        </AsyncPanelBoundary>
      )}

      {/* Perk selection modal */}
      {perkPending && (
        <AsyncPanelBoundary>
          <PerkModal options={perkOptions} level={level} onSelect={applyPerk} buildArchetype={dominantArchetype} unlockedArchetypes={unlockedArchetypes} />
        </AsyncPanelBoundary>
      )}

      {/* Achievements panel (in-game) */}
      {showAchievements && (
        <AsyncPanelBoundary>
          <AchievementsPanel achievementsUnlocked={achievementsUnlocked} onClose={() => setShowAchievements(false)} />
        </AsyncPanelBoundary>
      )}

      {/* Achievement popup */}
      {achievementPopup && !paused && (
        <div style={{ position: "absolute", top: 70, right: 16, background: "rgba(0,0,0,0.9)", border: "1px solid #FFD700", borderRadius: 10, padding: "10px 16px", color: "#FFD700", fontSize: 12, fontWeight: 700, zIndex: 60, textAlign: "right", pointerEvents: "none", boxShadow: "0 0 20px rgba(255,215,0,0.3)", maxWidth: 200 }}>
          <div style={{ fontSize: 10, color: "#AAA", letterSpacing: 1, marginBottom: 2 }}>ACHIEVEMENT UNLOCKED</div>
          <div style={{ fontSize: 20 }}>{achievementPopup.emoji}</div>
          <div style={{ fontSize: 13 }}>{achievementPopup.name}</div>
          <div style={{ fontSize: 10, color: "#CCC", fontWeight: 400, marginTop: 2 }}>{achievementPopup.desc}</div>
        </div>
      )}

      {/* Meta upgrades toast */}
      {metaToast && !paused && !perkPending && (
        <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", background: "rgba(255,107,53,0.88)", border: "1px solid rgba(255,107,53,0.95)", borderRadius: 10, padding: "7px 16px", color: "#FFF", fontSize: 12, fontWeight: 700, zIndex: 50, textAlign: "center", pointerEvents: "none", maxWidth: 340, animation: "slideDown 0.3s ease-out", boxShadow: "0 0 15px rgba(255,107,53,0.4)" }}>
          <div style={{ fontSize: 10, color: "#FFD700", marginBottom: 2, letterSpacing: 1 }}>META UPGRADES ACTIVE</div>
          {metaToast}
        </div>
      )}

      {/* Mission complete toast */}
      {missionToast && (
        <div style={{
          position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,200,100,0.92)", color: "#000", fontFamily: "'Courier New',monospace",
          fontWeight: 900, fontSize: 13, padding: "8px 18px", borderRadius: 8,
          letterSpacing: 1, zIndex: 300, boxShadow: "0 4px 16px rgba(0,200,100,0.4)",
          animation: "slideDown 0.3s ease-out",
          pointerEvents: "none",
        }}>
          🎯 MISSION COMPLETE — {missionToast}
        </div>
      )}

      {/* Wave incoming preview card */}
      {waveAnnounce && !paused && (() => {
        const wa = waveAnnounce;
        const isBoss = wa.isBoss;
        const accentColor = isBoss ? "#FF4400" : "#FFD700";
        return (
          <div style={{
            position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
            pointerEvents: "none", textAlign: "center", animation: "bossIn 0.35s ease-out forwards",
            background: "rgba(0,0,0,0.7)", border: `1px solid ${accentColor}44`,
            borderRadius: 14, padding: "18px 32px", minWidth: 220,
            backdropFilter: "blur(4px)", boxShadow: `0 0 24px ${accentColor}22`,
          }}>
            <div style={{ fontSize: 9, color: "#777", letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>
              ── INCOMING ──
            </div>
            <div style={{ fontSize: "clamp(20px,5vw,34px)", fontWeight: 900, color: accentColor,
              textShadow: `0 0 18px ${accentColor}88`, letterSpacing: 3, fontFamily: "'Courier New',monospace" }}>
              {isBoss ? "⚠️ BOSS WAVE" : `WAVE ${wa.waveNum}`}
            </div>
            {wa.eventLabel && (
              <div style={{ fontSize: 13, color: "#FF8844", fontFamily: "'Courier New',monospace", marginTop: 6, fontWeight: 700 }}>
                {wa.eventLabel}
              </div>
            )}
            {wa.tempoLabel && (
              <div style={{ fontSize: 12, color: "#8bd3ff", fontFamily: "'Courier New',monospace", marginTop: 6, fontWeight: 700 }}>
                {wa.tempoLabel}
              </div>
            )}
            {wa.threatHint && (
              <div style={{ fontSize: 11, color: "#c6c6c6", maxWidth: 320, margin: "8px auto 0", lineHeight: 1.45 }}>
                {wa.threatHint}
              </div>
            )}
            {wa.formationHint && (
              <div style={{ fontSize: 10, color: "#9de8b4", fontStyle: "italic", fontFamily: "'Courier New',monospace", marginTop: 5, letterSpacing: 1 }}>
                {wa.formationHint}
              </div>
            )}
            {wa.telemetryBand && (
              <div style={{ fontSize: 10, color: wa.telemetryBand === "overrun" ? "#FF8A8A" : wa.telemetryBand === "light" ? "#88FFCC" : "#B5D4FF", marginTop: 7, letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>
                {wa.telemetryBand === "overrun" ? "PRESSURE: OVER BUDGET" : wa.telemetryBand === "light" ? "PRESSURE: LIGHT WINDOW" : "PRESSURE: STABLE"}
              </div>
            )}
            <div style={{ fontSize: 10, color: "#888", marginTop: 8, display: "flex", justifyContent: "center", gap: 16 }}>
              <span>{isBoss ? "⚠️ Boss" : `👾 ~${wa.estimatedCount} enemies`}</span>
              {!isBoss && wa.waveNum % 5 === 0 && <span style={{ color: "#CC44FF" }}>🧬 Mutation offer</span>}
            </div>
            {!isBoss && wa.threatRating && (
              <div style={{ fontSize: 11, marginTop: 7, letterSpacing: 2, fontFamily: "'Courier New',monospace",
                color: wa.threatRating >= 4 ? "#FF5533" : wa.threatRating >= 3 ? "#FFD700" : "#88FF99" }}>
                {"💀".repeat(wa.threatRating)}{" "}THREAT {wa.threatRating}/5
              </div>
            )}
            {!isBoss && wa.deathCount > 0 && (
              <div style={{ fontSize: 10, color: "#FF7777", marginTop: 6, letterSpacing: 1, fontFamily: "'Courier New',monospace", opacity: 0.8 }}>
                💀 {wa.deathCount} player{wa.deathCount !== 1 ? "s" : ""} died here
              </div>
            )}
            {!isBoss && wa.isChokePoint && (
              <div style={{ fontSize: 10, color: "#FF3300", marginTop: 4, letterSpacing: 1, fontFamily: "'Courier New',monospace", fontWeight: "bold", background: "rgba(255,51,0,0.13)", padding: "2px 6px", borderRadius: 3, display: "inline-block" }}>
                ⚠ COMMUNITY CHOKE POINT
              </div>
            )}
          </div>
        );
      })()}

      {/* Berserker kill counter (wave 40+) */}
      {wave >= 40 && berserkersKilled > 0 && screen === "game" && !paused && (
        <div style={{ position: "absolute", top: 30, right: 16, background: "rgba(255,0,200,0.15)", border: "1px solid rgba(255,0,200,0.5)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#FF00CC", fontWeight: 700, pointerEvents: "none", zIndex: 30 }}>
          💀 BERSERKERS: {berserkersKilled}
        </div>
      )}

      {/* Boss pre-wave cutscene card */}
      {bossCutscene && !paused && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 180, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)",
          animation: "bossIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards",
          pointerEvents: "none",
        }}>
          {/* Scanline overlay */}
          <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.18) 3px,rgba(0,0,0,0.18) 4px)", pointerEvents:"none" }} />
          <div style={{ position:"relative", textAlign:"center", padding:"0 24px", maxWidth:520, width:"100%" }}>
            {/* Incoming label */}
            <div style={{ fontSize:10, letterSpacing:6, color:"#FF4400", fontFamily:"'Courier New',monospace", marginBottom:16, fontWeight:700 }}>
              ── INCOMING THREAT ──
            </div>
            {/* Boss emoji */}
            <div style={{ fontSize:"clamp(64px,14vw,96px)", lineHeight:1, marginBottom:12, filter:"drop-shadow(0 0 24px " + bossCutscene.color + "88)" }}>
              {bossCutscene.emoji}
            </div>
            {/* Boss name */}
            <div style={{ fontSize:"clamp(26px,7vw,44px)", fontWeight:900, color:bossCutscene.color, textShadow:"0 0 30px " + bossCutscene.color + "99", letterSpacing:3, fontFamily:"'Courier New',monospace", marginBottom:4 }}>
              {bossCutscene.name}
            </div>
            {/* Subtitle */}
            <div style={{ fontSize:"clamp(11px,2.5vw,14px)", color:"#999", letterSpacing:3, fontFamily:"'Courier New',monospace", marginBottom:bossCutscene.bossKillLabel ? 8 : 20, fontWeight:700 }}>
              {bossCutscene.title}
            </div>
            {/* Kill count + nemesis badge */}
            {bossCutscene.bossKillLabel && (
              <div style={{ fontSize:10, color: bossCutscene.isNemesis ? "#FF4400" : "#888", letterSpacing:2, fontFamily:"'Courier New',monospace", marginBottom: bossCutscene.nemesisBrief ? 10 : 20, fontWeight: bossCutscene.isNemesis ? 900 : 400 }}>
                {bossCutscene.isNemesis ? "🎯 NEMESIS — " : ""}{bossCutscene.bossKillLabel}
              </div>
            )}
            {/* Nemesis dossier: weapon recommendation + evasion tip */}
            {bossCutscene.nemesisBrief && (
              <div style={{ maxWidth:380, margin:"0 auto 18px", padding:"8px 14px", borderRadius:8, border:"1px solid #FF440066", background:"rgba(255,68,0,0.10)", textAlign:"left" }}>
                <div style={{ fontSize:9, color:"#FF6644", letterSpacing:3, fontFamily:"'Courier New',monospace", fontWeight:900, marginBottom:5 }}>── NEMESIS DOSSIER ──</div>
                <div style={{ fontSize:11, color:"#FFD7B8", lineHeight:1.5 }}>
                  <span style={{ color:"#FF8866", fontWeight:700 }}>COUNTER: </span>{bossCutscene.nemesisBrief.weapon}
                </div>
                <div style={{ fontSize:10, color:"#CC9988", marginTop:4, lineHeight:1.4 }}>{bossCutscene.nemesisBrief.tip}</div>
              </div>
            )}
            {/* Divider */}
            <div style={{ width:"60%", height:1, background:`linear-gradient(90deg,transparent,${bossCutscene.color}66,transparent)`, margin:"0 auto 16px" }} />
            {/* Quote — dynamic (history-aware) falls back to static */}
            <div style={{ fontSize:"clamp(12px,2.8vw,15px)", color:"#CCC", fontStyle:"italic", lineHeight:1.6, marginBottom:20, maxWidth:380, margin:"0 auto 20px" }}>
              "{bossCutscene.dynamicQuote || bossCutscene.quote}"
            </div>
            {bossCutscene.guidance && (
              <div style={{ maxWidth: 420, margin: "0 auto 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#FFD7B8", lineHeight: 1.55 }}>
                  {bossCutscene.guidance.verb}
                </div>
                <div style={{ fontSize: 10, color: "#999", letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>
                  {bossCutscene.guidance.pressure}
                </div>
              </div>
            )}
            {/* Dual boss tag */}
            {bossCutscene.dual && (
              <div style={{ fontSize:11, color:"#FF8844", fontFamily:"'Courier New',monospace", letterSpacing:2, marginBottom:16 }}>
                + {bossCutscene.dual.emoji} {bossCutscene.dual.name} INCOMING
              </div>
            )}
            {/* Wave badge */}
            <div style={{ display:"inline-block", background:"rgba(255,68,0,0.15)", border:"1px solid #FF440044", borderRadius:6, padding:"4px 14px", fontSize:11, color:"#FF6622", fontFamily:"'Courier New',monospace", letterSpacing:2 }}>
              WAVE {bossCutscene.wave}
            </div>
          </div>
        </div>
      )}

      {/* Boss wave banner — shown during the fight (after cutscene) */}
      {bossWaveActive && bossWaveBanner && !bossCutscene && !paused && !perkPending && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", textAlign: "center", animation: "bossIn 0.5s ease-out forwards" }}>
          <div style={{ fontSize: "clamp(28px,6vw,48px)", fontWeight: 900, color: "#FF0000", textShadow: "0 0 20px #FF0000,0 0 40px #FF000088", letterSpacing: 4, fontFamily: "'Courier New',monospace" }}>
            ⚠ BOSS WAVE ⚠
          </div>
        </div>
      )}

      {/* Gamepad connected indicator */}
      {gamepadConnected && (
        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 12, color: "#00FF88", background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "2px 6px", pointerEvents: "none", zIndex: 50, letterSpacing: 1 }}>
          🎮
        </div>
      )}
      {inputDebugEnabled && (
        <InputDebugOverlay data={inputDebug} />
      )}

      {/* Tutorial overlay — first-run hints */}
      {!paused && !perkPending && !shopPending && !routePending && (
        <AsyncPanelBoundary>
          <TutorialOverlay isMobile={isMobile} controllerConnected={gamepadConnected} controllerType={controllerType} evidence={tutorialEvidence} />
        </AsyncPanelBoundary>
      )}

      {/* HUD overlay */}
      <HUD
        wave={wave} timeSurvived={timeSurvived} score={score} kills={kills} deaths={deaths}
        health={health} ammo={ammo} isReloading={isReloading} currentWeapon={currentWeapon}
        combo={combo} comboTimer={comboTimer} killstreak={killstreak}
        level={level} xp={xp} xpNeeded={xpNeeded} killFeed={killFeed} username={username}
        bankedPerkChoices={bankedPerkChoices} nextPerkLevel={nextPerkLevel}
        grenadeReady={grenadeReady} dashReady={dashReady} extraLives={extraLives}
        guardianAngelFlash={guardianAngelFlash} difficulty={difficulty} isMobile={isMobile}
        weaponUpgrades={weaponUpgrades} activePerks={activePerks}
        buildArchetype={dominantArchetype}
        unlockedArchetypes={unlockedArchetypes}
        weaponAmmos={gsRef.current?.weaponAmmos || []}
        weaponMods={gsRef.current?.weaponMods || {}}
        weaponEvolutions={weaponEvolutionsRef.current}
        runModifier={RUN_MODIFIERS.find(m => m.id === runModifier) || null}
        onSwitchWeapon={switchWeapon} onReload={() => doReload(currentWeaponRef.current)}
        onDash={doDash} onGrenade={throwGrenade} onPause={() => transitionPause(true, "hud")}
        fmtTime={fmtTime}
        overclockedActive={activePerks.some(p => p.id === "overclocked")}
        overclockedShots={overclockedShots}
        waveStreak={waveStreak}
        activeWaveContract={activeWaveContract}
        mapTheme={mapTheme}
        vsScore={challengeVsScore} vsName={challengeVsName}
        synergyChargeReady={synergyChargeReady}
        onSynergyCharge={fireSynergyCharge}
        cursedHideScore={gsRef.current?.cursedHideScore || false}
        speedrunMode={speedrunMode}
        startTime={startTimeRef.current}
        missions={screen === "game" ? (() => {
          const gs = gsRef.current;
          if (!gs || !dailyMissionsRef.current?.length) return [];
          const s = {
            kills: gs.kills || 0, wave: gs.currentWave || 1,
            maxCombo: comboRef.current?.max || 0,
            totalDamage: gs.totalDamage || 0,
            dashes: statsRef.current?.dashes || 0,
            timeSurvived: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0,
            crits: statsRef.current?.crits || 0,
            grenadeKills: statsRef.current?.grenadeKills || 0,
            bossKills: statsRef.current?.bossKills || 0,
            bestStreak: statsRef.current?.bestStreak || 0,
            score: gs.score || 0,
            level: xpRef.current?.level || 1,
            saScore: gs.scoreAttackMode ? (gs.score || 0) : 0,
            saKills: gs.scoreAttackMode ? (gs.kills || 0) : 0,
            saWave: gs.scoreAttackMode ? (gs.currentWave || 1) : 0,
          };
          return dailyMissionsRef.current.map(m => ({ ...m, _progress: s[m.track] || 0 }));
        })() : []}
        missionDoneSet={missionDoneRef.current}
        hud={hudFlagsMemo}
        heat={gsRef.current?.heat || 0}
        topGhosts={gsRef.current?.topGhosts || []}
        weeklyRival={gsRef.current?.weeklyRival || null}
        experimentMatched={experimentMatchedRef.current}
        careerBestWave={gsRef.current?.careerBest?.wave || 0}
        practiceDrill={gsRef.current?.practiceDrill || null}
        runDrill={gsRef.current?.activeRunDrill || null}
        runIntegrity={getRunIntegrityReceipt(gsRef.current)}
        practiceMastery={gsRef.current?.practiceMastery || null}
      />

      {/* Mobile action bar */}
      {isMobile && <MobileWeaponDock currentWeapon={currentWeapon} weaponUpgrades={weaponUpgrades} weaponAmmos={gsRef.current?.weaponAmmos || []} ammo={ammo} weaponMods={gsRef.current?.weaponMods || {}} grenadeReady={grenadeReady} dashReady={dashReady} isReloading={isReloading} onSwitchWeapon={switchWeapon} onReload={() => doReload(currentWeaponRef.current)} onDash={doDash} onGrenade={throwGrenade} />}
      {!isMobile && <DesktopWeaponDock currentWeapon={currentWeapon} weaponUpgrades={weaponUpgrades} weaponAmmos={gsRef.current?.weaponAmmos || []} ammo={ammo} weaponMods={gsRef.current?.weaponMods || {}} grenadeReady={grenadeReady} dashReady={dashReady} isReloading={isReloading} showAmmoBars onSwitchWeapon={switchWeapon} onReload={() => doReload(currentWeaponRef.current)} onDash={doDash} onGrenade={throwGrenade} />}

      <style>{`
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:.3 } }
        @keyframes ammoPulseYellow { 0%,100% { opacity:1 } 50% { opacity:.55 } }
        @keyframes ammoPulseRed { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        @keyframes bossIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.5) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
        * { box-sizing:border-box; margin:0 }
        body { margin:0; overflow:hidden }
        input::placeholder { color:#999 }
        :focus-visible { outline: 3px solid #FFD700 !important; outline-offset: 3px !important; border-radius: 4px; }
        button:focus-visible { box-shadow: 0 0 0 3px rgba(255,215,0,0.5) !important; }
        .skip-link { position:absolute; top:-9999px; left:0; z-index:9999; padding:8px 16px; background:#FFD700; color:#000; font-weight:900; text-decoration:none; border-radius:0 0 6px 0; font-family:'Courier New',monospace; }
        .skip-link:focus { top:0; }
      `}</style>
    </div>
  );
}
