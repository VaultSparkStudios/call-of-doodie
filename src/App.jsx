import { useState, useEffect, useRef, useCallback } from "react";
import { drawGame } from "./drawGame.js";
import {
  WEAPONS, ENEMY_TYPES, KILLSTREAKS, HITMARKERS, DEATH_MESSAGES, RANK_NAMES, TIPS,
  ACHIEVEMENTS, DIFFICULTIES, KILL_MILESTONES, META_UPGRADES, STARTER_LOADOUTS,
  GRENADE_COOLDOWN, DASH_COOLDOWN, DASH_SPEED, DASH_DURATION,
  CRIT_CHANCE, CRIT_MULT, COMBO_TIMER_BASE, RUN_MODIFIERS,
} from "./constants.js";
import { loadLeaderboard, saveToLeaderboard, updateCareerStats, loadCareerStats, getDailyMissions, loadMissionProgress, saveMissionProgress, loadMetaProgress, getLockedCallsign, lockCallsign, clearLockedCallsign, claimCallsign, getAccountLevel } from "./storage.js";
import { spawnEnemy as _spawnEnemy, spawnBoss as _spawnBoss, BOSS_ROTATION } from "./gameHelpers.js";
import { initAnonAuth } from "./supabase.js";
import { loadSettings, SETTINGS_DEFAULTS } from "./settings.js";
import SettingsPanel from "./components/SettingsPanel.jsx";
import {
  soundShoot, soundHit, soundDeath, soundLevelUp, soundPickup, soundEnemyDeath,
  soundGrenade, soundBossWave, soundAchievement, soundReload,
  soundDash, soundBossKill, soundWaveClear, soundPerkSelect,
  soundSummonDismissed,
  soundGamepadConnect, soundGamepadDisconnect,
  startMusic, stopMusic, setMusicIntensity, getMuted, setMuted,
  setMusicVibe, MUSIC_VIBES, startAmbient, stopAmbient,
} from "./sounds.js";
import UsernameScreen from "./components/UsernameScreen.jsx";
import MenuScreen from "./components/MenuScreen.jsx";
import DeathScreen from "./components/DeathScreen.jsx";
import PauseMenu from "./components/PauseMenu.jsx";
import HUD from "./components/HUD.jsx";
import AchievementsPanel from "./components/AchievementsPanel.jsx";
import PerkModal, { getRandomPerks } from "./components/PerkModal.jsx";
import WaveShopModal from "./components/WaveShopModal.jsx";
import TutorialOverlay from "./components/TutorialOverlay.jsx";

// ── Controller helpers ────────────────────────────────────────────────────────
let _rumbleEnabled = true; // gated by settings.rumble

function detectControllerType(gp) {
  if (!gp) return "controller";
  const id = (gp.id || "").toLowerCase();
  if (id.includes("045e") || id.includes("xinput") || id.includes("xbox")) return "xbox";
  if (id.includes("054c") || id.includes("dualshock") || id.includes("dualsense") || id.includes("playstation")) return "ps";
  return "controller";
}

// Fires haptic feedback on the first connected gamepad if the Vibration Actuator
// API is available (Chrome 68+). Silently no-ops on unsupported browsers/devices.
function rumbleGamepad(weakMagnitude, strongMagnitude, durationMs) {
  if (!_rumbleEnabled) return;
  try {
    const gp = navigator.getGamepads?.()[0];
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

// ── Flow field pathfinding ────────────────────────────────────────────────────
// BFS from player position, producing direction vectors for each grid cell.
// Enemies sample their cell and move toward the player while navigating around walls.
const FF_CELL = 24; // grid cell size in px
function buildFlowField(W, H, px, py, obstacles) {
  const cols = Math.ceil(W / FF_CELL);
  const rows = Math.ceil(H / FF_CELL);
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * FF_CELL, cy = (r + 0.5) * FF_CELL;
      for (const ob of obstacles) {
        if (cx > ob.x - 10 && cx < ob.x + ob.w + 10 && cy > ob.y - 10 && cy < ob.y + ob.h + 10) {
          blocked[r * cols + c] = 1; break;
        }
      }
    }
  }
  const fdx = new Float32Array(cols * rows);
  const fdy = new Float32Array(cols * rows);
  const visited = new Uint8Array(cols * rows);
  const pc = Math.min(cols - 1, Math.max(0, Math.floor(px / FF_CELL)));
  const pr = Math.min(rows - 1, Math.max(0, Math.floor(py / FF_CELL)));
  visited[pr * cols + pc] = 1;
  const queue = [[pc, pr]]; let qi = 0;
  const DIRS = [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]];
  while (qi < queue.length) {
    const [cc, cr] = queue[qi++];
    for (const [dc, dr] of DIRS) {
      const nc = cc + dc, nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      if (visited[nr * cols + nc] || blocked[nr * cols + nc]) continue;
      visited[nr * cols + nc] = 1;
      const ddx = cc - nc, ddy = cr - nr, dl = Math.hypot(ddx, ddy);
      fdx[nr * cols + nc] = ddx / dl;
      fdy[nr * cols + nc] = ddy / dl;
      queue.push([nc, nr]);
    }
  }
  return { fdx, fdy, cols, rows };
}

// ── Wave shop options ─────────────────────────────────────────────────────────
function getShopOptions(gs, wpnIdx) {
  const p = gs.player;
  const pool = [
    { id: "health",  emoji: "💊", name: "Field Medkit",   desc: "Restore 50 HP",              available: p.health < p.maxHealth },
    { id: "ammo",    emoji: "📦", name: "Resupply Crate", desc: "Fully refill all weapons",    available: true },
    { id: "upgrade", emoji: "🔧", name: "Field Upgrade",  desc: `Upgrade ${WEAPONS[wpnIdx].emoji} (+1 ⭐)`, available: (gs.weaponUpgrades?.[wpnIdx] || 0) < 3 },
    { id: "speed",   emoji: "👟", name: "Combat Stim",    desc: "+10% move speed (permanent)", available: true },
    { id: "maxhp",   emoji: "❤️", name: "HP Canister",    desc: "+25 max HP (permanent)",      available: true },
    { id: "damage",  emoji: "🔥", name: "Damage Boost",   desc: "+15% bullet damage",          available: true },
  ].filter(o => o.available);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}

// ── Performance caps ─────────────────────────────────────────────────────────
const MAX_PARTICLES  = 200;  // hard cap on concurrent particle objects
const MAX_FLOAT_TEXTS = 30;  // hard cap on floating damage/event texts
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
  const joystickRef    = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null });
  const shootStickRef  = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null, shooting: false });
  const sizeRef        = useRef({ w: 800, h: 600 });

  const currentWeaponRef = useRef(0);
  const isReloadingRef   = useRef(false);
  const comboRef         = useRef({ count: 0, timer: 0, max: 0 });
  const killFeedRef      = useRef([]);
  const xpRef            = useRef({ xp: 0, level: 1 });
  const grenadeRef       = useRef({ ready: true, lastUse: 0 });
  const dashRef          = useRef({ ready: true, lastUse: 0, active: 0, dx: 0, dy: 0 });
  const statsRef         = useRef({ bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0, guardianAngels: 0, perksSelected: 0, weaponUpgradesCollected: 0, maxWeaponLevel: 0, bossWavesCleared: 0, dashKills: 0, grenadeKills: 0, noHitWaves: 0, weaponKills: new Array(10).fill(0) });
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
  const gamepadShootRef  = useRef(false); // gamepad RT fire signal
  const gamepadAngleRef  = useRef(null);  // gamepad right-stick aim angle (null = not active)
  const gamepadPollRef   = useRef(null);  // interval id for gamepad polling
  const controllerTypeRef = useRef("controller"); // "xbox" | "ps" | "controller"
  const inputDeviceRef   = useRef("mouse"); // "mouse" | "xbox" | "ps" | "controller" | "mobile"
  const pwaPromptRef     = useRef(null);  // deferred beforeinstallprompt event

  // ── State ─────────────────────────────────────────────────────────────────
  const [screen, setScreen]           = useState(() => getLockedCallsign() ? "menu" : "username");
  const [username, setUsername]       = useState(() => getLockedCallsign() || "");
  const [score, setScore]             = useState(0);
  const [kills, setKills]             = useState(0);
  const [deaths, setDeaths]           = useState(0);
  const [wave, setWave]               = useState(1);
  const [currentWeapon, setCurrentWeapon] = useState(0);
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
  const [showAchievements, setShowAchievements] = useState(false);
  const [extraLives, setExtraLives]   = useState(0);
  const [difficulty, setDifficulty]   = useState("normal");
  const [guardianAngelFlash, setGuardianAngelFlash] = useState(false);
  const [weaponUpgrades, setWeaponUpgrades] = useState(() => WEAPONS.map(() => 0));
  const [activePerks, setActivePerks] = useState([]);
  const [perkPending, setPerkPending] = useState(false);
  const [perkOptions, setPerkOptions] = useState([]);
  const [bossWaveActive, setBossWaveActive] = useState(false);
  const [autoAim, setAutoAim]             = useState(false);
  const [starterLoadout, setStarterLoadout] = useState("standard");
  const [runSeed, setRunSeed]             = useState(0);
  const [runModifier, setRunModifier]     = useState(null);
  const [metaToast, setMetaToast]         = useState(null);
  const [missionsSummary, setMissionsSummary] = useState([]); // captured at death
  const [shopPending, setShopPending]         = useState(false);
  const [shopOptions, setShopOptions]         = useState([]);
  const [musicMuted, setMusicMuted]           = useState(() => { const s = localStorage.getItem("cod-music-muted") === "1"; setMuted(s); return s; });
  // Sync saved vibe to sounds module on first render
  useState(() => { const v = localStorage.getItem("cod-music-vibe"); if (v) setMusicVibe(v); });
  const [colorblindMode, setColorblindMode]   = useState(() => localStorage.getItem("cod-colorblind") === "1");
  const [highlightGifUrl, setHighlightGifUrl] = useState(null);
  const [gifEncoding, setGifEncoding]         = useState(false);
  const [musicVibe, setMusicVibeState]        = useState(() => localStorage.getItem("cod-music-vibe") || "action");
  const [gameSettings, setGameSettings]       = useState(() => loadSettings());
  const [showSettings, setShowSettings]       = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [controllerType, setControllerType] = useState("controller");
  const [overclockedShots, setOverclockedShots] = useState(0);
  const [waveStreak, setWaveStreak]             = useState(0);
  const [pwaPromptReady, setPwaPromptReady]     = useState(false);
  const [mapTheme, setMapTheme]                 = useState(0);

  // ── Sync refs to state ────────────────────────────────────────────────────
  useEffect(() => { currentWeaponRef.current = currentWeapon; }, [currentWeapon]);
  useEffect(() => { isReloadingRef.current = isReloading; }, [isReloading]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { extraLivesRef.current = extraLives; }, [extraLives]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // ── Anonymous auth init ──────────────────────────────────────────────────
  useEffect(() => { initAnonAuth(); }, []);

  // ── PWA install prompt ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); pwaPromptRef.current = e; setPwaPromptReady(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── Sync rumble flag from settings ────────────────────────────────────────
  useEffect(() => { _rumbleEnabled = gameSettings.rumble !== false; }, [gameSettings.rumble]);

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
    const saved = localStorage.getItem("cod-autoaim") === "1";
    setAutoAim(saved); autoAimRef.current = saved;
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth, h = containerRef.current.clientHeight;
        sizeRef.current = { w, h };
        if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
      }
    };
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [screen]);

  const GW = () => sizeRef.current.w;
  const GH = () => sizeRef.current.h;
  const fmtTime = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  // ── Music / colorblind toggles ─────────────────────────────────────────────
  const toggleMusicMuted = useCallback(() => {
    const next = !getMuted();
    setMuted(next);
    setMusicMuted(next);
    localStorage.setItem("cod-music-muted", next ? "1" : "0");
    if (next) { stopMusic(); stopAmbient(); } else if (gsRef.current) { startMusic(gsRef.current.bossWave); startAmbient(gsRef.current.mapTheme ?? 0); }
  }, []);

  const toggleColorblind = useCallback(() => {
    setColorblindMode(prev => {
      const next = !prev;
      localStorage.setItem("cod-colorblind", next ? "1" : "0");
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

  useEffect(() => { refreshLeaderboard(); }, [refreshLeaderboard]);

  // ── Achievements ──────────────────────────────────────────────────────────
  const checkAchievements = useCallback((gs) => {
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
    };
    missions.forEach((m, idx) => {
      if (missionDoneRef.current.has(idx)) return;
      if ((s[m.track] || 0) >= m.goal) {
        missionDoneRef.current.add(idx);
        addText(gs, GW() / 2, GH() / 2 - 100, "📋 MISSION COMPLETE!", "#FFD700", true);
        addText(gs, GW() / 2, GH() / 2 - 70, m.text, "#FFF");
        soundAchievement();
      }
    });
  }, []);

  // ── Init game ─────────────────────────────────────────────────────────────
  const initGame = useCallback((forceSeed) => {
    const w = sizeRef.current.w, h = sizeRef.current.h;
    const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    const seed = (forceSeed && !isNaN(parseInt(forceSeed))) ? Math.abs(parseInt(forceSeed)) % 999999 : Math.floor(Math.random() * 999999);
    const career = loadCareerStats();
    gsRef.current = {
      player: { x: w / 2, y: h / 2, angle: 0, health: diff.playerHP, maxHealth: diff.playerHP, speed: 4, invincible: 0 },
      enemies: [], bullets: [], particles: [], pickups: [], grenades: [], enemyBullets: [],
      dyingEnemies: [], obstacles: [], terrain: [], floorZones: [], props: [], mapTheme: 0,
      spawnTimer: 0, enemiesThisWave: 0, maxEnemiesThisWave: 5,
      currentWave: 1, score: 0, kills: 0, killstreakCount: 0, damageThisWave: 0,
      floatingTexts: [], screenShake: 0, muzzleFlash: 0, ammoCount: WEAPONS[0].ammo,
      weaponAmmos: WEAPONS.map(w => w.ammo), // per-weapon ammo state
      damageFlash: 0, killFlash: 0, totalDamage: 0, trail: [],
      weaponUpgrades: WEAPONS.map(() => 0), bossWave: false,
      runSeed: seed,
      careerBest: { score: career.bestScore || 0, wave: career.bestWave || 0 },
      newBestScore: false, newBestWave: false,
    };
    setRunSeed(seed);
    comboRef.current = { count: 0, timer: 0, max: 0 };
    killFeedRef.current = [];
    frameBufferRef.current = [];
    bestMomentRef.current = { ts: 0, score: 0 };
    if (highlightUrlRef.current) { URL.revokeObjectURL(highlightUrlRef.current); highlightUrlRef.current = null; }
    setHighlightGifUrl(null);
    xpRef.current = { xp: 0, level: 1 };
    grenadeRef.current = { ready: true, lastUse: 0 };
    dashRef.current = { ready: true, lastUse: 0, active: 0, dx: 0, dy: 0 };
    statsRef.current = { bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0, guardianAngels: 0, perksSelected: 0, weaponUpgradesCollected: 0, maxWeaponLevel: 0, bossWavesCleared: 0, dashKills: 0, grenadeKills: 0, noHitWaves: 0, weaponKills: new Array(WEAPONS.length).fill(0) };
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
    gsRef.current.settAutoReload      = sett.autoReload;
    gsRef.current.settShowDPS         = sett.showDPS;
    gsRef.current.settCrosshair       = sett.crosshair;
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
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addParticles = (gs, x, y, color, count = 8) => {
    const space = MAX_PARTICLES - gs.particles.length;
    if (space <= 0) return;
    count = Math.max(1, Math.floor(count * (gs.settParticlesMult || 1)));
    const n = Math.min(count, space);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
      gs.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30 + Math.random() * 20, maxLife: 50, color, size: 2 + Math.random() * 4 });
    }
  };
  const addText = (gs, x, y, text, color = "#FFF", big = false) => {
    if (gs.floatingTexts.length >= MAX_FLOAT_TEXTS) {
      if (!big) return; // drop small texts when full
      gs.floatingTexts.splice(0, 3); // evict oldest 3 to make room for big text
    }
    const isQuote = big === "quote";
    gs.floatingTexts.push({
      x, y, text, color,
      life: isQuote ? 110 : big ? 90 : 60,
      vy: isQuote ? -0.65 : big ? -1 : -2,
      big: big === true, quote: isQuote,
    });
  };
  const addKillFeed = (enemyName, weaponName) => {
    const entry = { enemy: enemyName, weapon: weaponName, id: Date.now() + Math.random() };
    killFeedRef.current = [entry, ...killFeedRef.current].slice(0, 5);
    setKillFeed([...killFeedRef.current]);
  };
  const addXp = useCallback((amount) => {
    const ref = xpRef.current;
    const gain = Math.floor(amount * (perkModsRef.current.xpMult || 1));
    ref.xp += gain;
    const needed = ref.level * 500;
    if (ref.xp >= needed) {
      ref.xp -= needed; ref.level++;
      setLevel(ref.level);
      soundLevelUp();
      if (gsRef.current) {
        addText(gsRef.current, GW() / 2, GH() / 2 - 60, "⬆ LEVEL " + ref.level + "!", "#00FF88", true);
        gsRef.current.player.speed = 4 + ref.level * 0.12;
      }
      // Trigger perk selection every 3 level-ups
      if (ref.level % 3 === 0) {
        const opts = getRandomPerks(3);
        setPerkOptions(opts);
        setPerkPending(true);
        perkPendingRef.current = true;
      }
    }
    setXp(ref.xp);
  }, []);

  // ── Perk application ─────────────────────────────────────────────────────
  const applyPerk = useCallback((perk) => {
    perk.apply(perkModsRef.current, gsRef.current);
    // Calibrate Glass Jaw incoming-damage multiplier by difficulty (less brutal at Hard/Insane)
    if (gsRef.current?.glassjaw && !gsRef.current.glassjawMult) {
      const d = difficultyRef.current;
      gsRef.current.glassjawMult = d === "insane" ? 1.4 : d === "hard" ? 1.65 : 2.0;
    }
    // Announce perk synergies
    const pm = perkModsRef.current;
    const _synergies = [
      [pm.hasVampire && pm.hasChainLightning && !pm._synergyStormVampire, "⚡🧛 STORM VAMPIRE", "_synergyStormVampire"],
      [pm.hasGrenadier && pm.hasPyromaniac && !pm._synergyPyroGrenadier, "💣🔥 PYRO GRENADIER", "_synergyPyroGrenadier"],
      [pm.hasEagleEye && pm.pierce > 0 && !pm._synergyDeadEye, "🎯🔫 DEAD EYE", "_synergyDeadEye"],
    ];
    for (const [cond, label, flag] of _synergies) {
      if (cond) {
        pm[flag] = true;
        if (gsRef.current) addText(gsRef.current, GW() / 2, GH() / 2 - 85, "🔗 SYNERGY: " + label + "!", "#FF88FF", true);
        soundLevelUp();
        break;
      }
    }
    statsRef.current.perksSelected++;
    setActivePerks(prev => [...prev, perk]);
    setPerkPending(false);
    perkPendingRef.current = false;
    soundPerkSelect();
    if (gsRef.current) {
      addText(gsRef.current, GW() / 2, GH() / 2 - 40, perk.emoji + " " + perk.name + "!", "#00FF88", true);
    }
    checkAchievements(gsRef.current || {});
  }, [checkAchievements]);

  // ── Wave shop apply ───────────────────────────────────────────────────────
  const applyShopOption = useCallback((optionId) => {
    const gs = gsRef.current, p = gs?.player;
    if (!gs || !p) return;
    const wpnIdx = currentWeaponRef.current;
    switch (optionId) {
      case "health":
        p.health = Math.min(p.maxHealth, p.health + 50);
        setHealth(Math.floor(p.health));
        break;
      case "ammo":
        gs.weaponAmmos = WEAPONS.map((w, i) => {
          const ul = gs.weaponUpgrades?.[i] || 0;
          return Math.floor(w.maxAmmo * (1 + ul * 0.25) * (perkModsRef.current.ammoMult || 1));
        });
        gs.ammoCount = gs.weaponAmmos[wpnIdx];
        setAmmo(gs.ammoCount);
        break;
      case "upgrade":
        if ((gs.weaponUpgrades?.[wpnIdx] || 0) < 3) {
          gs.weaponUpgrades[wpnIdx]++;
          statsRef.current.weaponUpgradesCollected++;
          statsRef.current.maxWeaponLevel = Math.max(statsRef.current.maxWeaponLevel, gs.weaponUpgrades[wpnIdx]);
          setWeaponUpgrades([...gs.weaponUpgrades]);
        }
        break;
      case "speed":
        p.speed *= 1.10;
        break;
      case "maxhp":
        p.maxHealth += 25; p.health = Math.min(p.maxHealth, p.health + 25);
        setHealth(Math.floor(p.health));
        break;
      case "damage":
        perkModsRef.current.damageMult = (perkModsRef.current.damageMult || 1) * 1.15;
        break;
      default: break;
    }
    shopPendingRef.current = false;
    setShopPending(false);
  }, []);

  // ── Boss / enemy spawning (logic lives in gameHelpers.js) ────────────────
  const spawnBoss  = useCallback((gs, typeIndex) => _spawnBoss(gs, GW(), GH(), difficultyRef.current, typeIndex), []);
  const spawnEnemy = useCallback((gs)            => _spawnEnemy(gs, GW(), GH(), difficultyRef.current), []);

  // ── Pickup spawning helper ────────────────────────────────────────────────
  const spawnPickup = (gs, ex, ey, isBoss) => {
    const types    = ["health", "ammo", "speed", "nuke", "upgrade", "rage", "magnet", "freeze"];
    // Vampire mode: no health drops — replace with ammo
    // Scavenger perk boosts ammo drop weight by ammoDropMult
    const ammoBoost = perkModsRef.current.ammoDropMult || 1;
    const baseAmmoW = isBoss ? (gs.vampireMode ? 0.40 : 0.15) : (gs.vampireMode ? 0.58 : 0.10);
    const ammoW = Math.min(baseAmmoW * ammoBoost, 0.70);
    const weights  = isBoss
      ? [gs.vampireMode ? 0 : 0.20, ammoW, 0.08, 0.08, 0.35, 0.10, 0.07, 0.07]
      : [gs.vampireMode ? 0 : 0.40, ammoW, 0.18, 0.04, 0.12, 0.10, 0.08, 0.08];
    let roll = Math.random(), cumul = 0, pType = "health";
    for (let i = 0; i < types.length; i++) { cumul += weights[i]; if (roll < cumul) { pType = types[i]; break; } }
    gs.pickups.push({ x: ex, y: ey, type: pType, life: 450 });
  };

  // ── Reload ────────────────────────────────────────────────────────────────
  const doReload = useCallback((wpnIdx) => {
    if (isReloadingRef.current || pausedRef.current) return;
    setIsReloading(true); isReloadingRef.current = true;
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
  }, []);

  // ── Shoot ─────────────────────────────────────────────────────────────────
  const shoot = useCallback((gs, weaponIdx, angle) => {
    if (pausedRef.current || perkPendingRef.current) return;
    const weapon = WEAPONS[weaponIdx];
    const now = Date.now();
    const upgLevel = gs.weaponUpgrades?.[weaponIdx] || 0;
    const fireRateMult = (1 - upgLevel * 0.10) * (perkModsRef.current.fireRateMult || 1);
    if (now - lastShotRef.current < weapon.fireRate * fireRateMult || gs.ammoCount <= 0 || isReloadingRef.current) return;
    lastShotRef.current = now; gs.ammoCount--; gs.weaponAmmos[weaponIdx] = gs.ammoCount; setAmmo(gs.ammoCount);
    // Overclocked perk: track shots, force reload every 20
    if (gs.overclocked) {
      gs.overclockedShots = (gs.overclockedShots || 0) + 1;
      setOverclockedShots(gs.overclockedShots);
      if (gs.overclockedShots >= 20) {
        gs.overclockedShots = 0;
        setOverclockedShots(0);
        addText(gs, gs.player.x, gs.player.y - 40, "🔧 OVERHEATED!", "#FF8800", true);
        doReload(weaponIdx);
      }
    }
    soundShoot(weaponIdx);
    const p = gs.player;
    const spread = (Math.random() - 0.5) * weapon.spread;
    const a = angle + spread;
    const damageMult = (perkModsRef.current.damageMult || 1) * (1 + upgLevel * 0.25);
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
      bouncesLeft: noRicochet ? 0 : 10 + (gs.extraBounces || 0),
      wpnIdx: weaponIdx,
    });
    if (weapon.pellets) {
      // Shotgun — fire N pellets with independent spread
      for (let pi = 0; pi < weapon.pellets; pi++) {
        const pa = angle + (Math.random() - 0.5) * weapon.spread;
        gs.bullets.push(makeBullet(pa));
      }
    } else if (weapon.burst) {
      // Burst fire — first shot immediate, rest scheduled
      gs.bullets.push(makeBullet(a));
      for (let bi = 1; bi < weapon.burst; bi++) {
        setTimeout(() => {
          if (!gsRef.current || pausedRef.current) return;
          const ba = angle + (Math.random() - 0.5) * weapon.spread;
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
      const maxT = Math.hypot(W, H) * 1.2;
      gs.pendingBeam = { ox, oy, cos, sin, maxT, weaponIdx, color: weapon.color };
      gs.beams = gs.beams || [];
      gs.beams.push({ x1: ox, y1: oy, x2: ox + cos * maxT, y2: oy + sin * maxT, life: 14, maxLife: 14, color: weapon.color });
    } else {
      gs.bullets.push(makeBullet(a));
    }
    gs.muzzleFlash = 4;
    gs.screenShake = Math.max(gs.screenShake, weaponIdx === 1 ? 12 : weaponIdx === 4 ? 18 : 3);
    if (gs.ammoCount <= 0) doReload(weaponIdx);
  }, [doReload]);

  // ── Grenade ───────────────────────────────────────────────────────────────
  const throwGrenade = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || !grenadeRef.current.ready || pausedRef.current || perkPendingRef.current) return;
    grenadeRef.current.ready = false; setGrenadeReady(false);
    soundGrenade();
    const p = gs.player;
    gs.grenades.push({ x: p.x, y: p.y, vx: Math.cos(p.angle) * 8, vy: Math.sin(p.angle) * 8, life: 45, size: 8 });
    statsRef.current.grenades++;
    const cd = GRENADE_COOLDOWN * (perkModsRef.current.grenadeCDMult || 1);
    setTimeout(() => { grenadeRef.current.ready = true; setGrenadeReady(true); }, cd);
  }, []);

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
    const dlen = Math.hypot(ddx, ddy);
    if (dlen > 0) { ddx /= dlen; ddy /= dlen; } else { ddx = Math.cos(gs.player.angle); ddy = Math.sin(gs.player.angle); }
    dashRef.current.active = DASH_DURATION; dashRef.current.dx = ddx; dashRef.current.dy = ddy;
    gs.player.invincible = Math.max(gs.player.invincible, DASH_DURATION + 5);
    statsRef.current.dashes++;
    addParticles(gs, gs.player.x, gs.player.y, "#00FFFF", 12);
    const cd = DASH_COOLDOWN * (perkModsRef.current.dashCDMult || 1);
    setTimeout(() => { dashRef.current.ready = true; setDashReady(true); }, cd);
  }, []);

  // ── Player death ──────────────────────────────────────────────────────────
  const handlePlayerDeath = useCallback((gs) => {
    // Dead Man's Hand: massive AOE + grant a free guardian angel (once per run)
    if (gs?.deadMansHand && !gs.deadMansHandUsed) {
      gs.deadMansHandUsed = true;
      const dmhRadius = 250;
      (gs.enemies || []).forEach(e => {
        const d = Math.hypot(e.x - gs.player.x, e.y - gs.player.y);
        if (d < dmhRadius) { e.health -= Math.floor(200 * (1 - d / dmhRadius)); e.hitFlash = 15; }
      });
      addParticles(gs, gs.player.x, gs.player.y, "#FFD700", 40);
      addParticles(gs, gs.player.x, gs.player.y, "#FF4400", 25);
      addParticles(gs, gs.player.x, gs.player.y, "#FFFFFF", 15);
      addText(gs, gs.player.x, gs.player.y - 50, "💀 DEAD MAN'S HAND!", "#FFD700", true);
      gs.screenShake = 25;
      if (extraLivesRef.current === 0) { extraLivesRef.current = 1; setExtraLives(1); }
    }
    if (extraLivesRef.current > 0) {
      extraLivesRef.current--; setExtraLives(extraLivesRef.current);
      const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
      gs.player.health = diff.playerHP; gs.player.invincible = 120;
      setHealth(diff.playerHP);
      gs.enemies.forEach(e => { e.health -= 30; e.hitFlash = 10; });
      gs.enemyBullets = []; gs.screenShake = 20;
      addText(gs, gs.player.x, gs.player.y - 50, "GUARDIAN ANGEL!", "#FFD700", true);
      addParticles(gs, gs.player.x, gs.player.y, "#FFD700", 30);
      addParticles(gs, gs.player.x, gs.player.y, "#FFFFFF", 20);
      setGuardianAngelFlash(true);
      setTimeout(() => setGuardianAngelFlash(false), 1500);
      return false;
    }
    if (gs) gs.waveStreak = 0; // reset streak on death
    stopMusic(); stopAmbient();
    soundDeath();
    rumbleGamepad(0.7, 1.0, 600);
    setDeaths(dd => dd + 1);
    setDeathMessage(DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]);
    setTotalDamage(Math.floor(gs.totalDamage));
    setBestStreak(statsRef.current.bestStreak);
    setTimeSurvived(Math.floor((Date.now() - startTimeRef.current) / 1000));
    // Save career stats + mission progress
    updateCareerStats({
      kills: gs.kills, deaths: 1, score: gs.score, wave: gs.currentWave,
      streak: statsRef.current.bestStreak, damage: gs.totalDamage,
      playTime: (Date.now() - startTimeRef.current) / 1000,
      achievementIds: [...achievedRef.current],
      crits: statsRef.current.crits,
      grenades: statsRef.current.grenades,
      dashes: statsRef.current.dashes,
      level: xpRef.current.level,
      combo: comboRef.current.max,
      bossKills: statsRef.current.bossKills,
    });
    const mProgress = {};
    missionDoneRef.current.forEach(i => { mProgress[i] = true; });
    saveMissionProgress(mProgress);
    // Capture missions summary for death screen (refs become stale after screen change)
    const _missions = dailyMissionsRef.current || [];
    const _done = missionDoneRef.current || new Set();
    setMissionsSummary(_missions.map((m, i) => ({ text: m.text, icon: m.icon, completed: _done.has(i) })));
    // Encode highlight GIF from rolling frame buffer
    setGifEncoding(true);
    (async () => {
      try {
        const buf = frameBufferRef.current;
        if (buf.length >= 8) {
          const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
          const oc = gifOffscreenRef.current;
          const gw = oc?.width || 320, gh = oc?.height || 180;
          const best = bestMomentRef.current;
          const midTs = best.score > 0 ? best.ts : (buf[buf.length - 1]?.ts || 0);
          let frames = buf.filter(f => f.ts >= midTs - 2000 && f.ts <= midTs + 4000);
          if (frames.length < 8) frames = buf.slice(-60);
          frames = frames.slice(0, 60);
          if (frames.length > 0) {
            const enc = GIFEncoder();
            for (const frame of frames) {
              const rgba = new Uint8Array(frame.data);
              const palette = quantize(rgba, 256);
              const index = applyPalette(rgba, palette);
              enc.writeFrame(index, gw, gh, { palette, delay: 100 });
            }
            enc.finish();
            const blob = new Blob([enc.bytes()], { type: "image/gif" });
            if (highlightUrlRef.current) URL.revokeObjectURL(highlightUrlRef.current);
            const objUrl = URL.createObjectURL(blob);
            highlightUrlRef.current = objUrl;
            setHighlightGifUrl(objUrl);
          }
        }
      } catch (err) { console.warn("[GIF] encode failed:", err); }
      setGifEncoding(false);
    })();
    setScreen("death"); gs.killstreakCount = 0; setKillstreak(0);
    return true;
  }, []);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback((forceSeed) => {
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    stopMusic(); stopAmbient();
    settingsRef.current = loadSettings(); // refresh settings at game start
    initGame(forceSeed);
    setScreen("game"); setScore(0); setKills(0); setDeaths(0); setWave(1);
    setCurrentWeapon(0); setAmmo(WEAPONS[0].ammo); setHealth(gsRef.current.player.health);
    setKillstreak(0); setIsReloading(false); setCombo(0); setComboTimer(0);
    setXp(0); setLevel(1); setKillFeed([]); setGrenadeReady(true); setDashReady(true);
    setBestStreak(0); setTotalDamage(0);
    setAchievementsUnlocked([]); setAchievementPopup(null); setTimeSurvived(0);
    setPaused(false); setExtraLives(0); extraLivesRef.current = 0;
    setGuardianAngelFlash(false); setWeaponUpgrades(WEAPONS.map(() => 0));
    starterLoadoutRef.current = starterLoadout;
    setActivePerks([]); setPerkPending(false); setPerkOptions([]); setBossWaveActive(false);
    setShopPending(false); setShopOptions([]); shopPendingRef.current = false;
    currentWeaponRef.current = 0; isReloadingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { if (!pausedRef.current && !perkPendingRef.current && !shopPendingRef.current) setTimeSurvived(t => t + 1); }, 1000);
    setTimeout(() => {
      startMusic(false);
      startAmbient(gsRef.current?.mapTheme ?? 0);
    }, 200); // small delay to let audio context resume
  }, [difficulty, initGame, starterLoadout]);

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
    setCurrentWeapon(idx); currentWeaponRef.current = idx;
    setIsReloading(false); isReloadingRef.current = false;
  }, []);

  // ── Score submit ──────────────────────────────────────────────────────────
  const submitScore = useCallback(async ({ lastWords, rank }) => {
    const GAMEPLAY_KEYS = ["enemySpawnMult","enemyHealthMult","enemySpeedMult","playerSpeedMult","xpGainMult","pickupMagnet","grenadeRadiusMult"];
    const sett = settingsRef.current;
    const customSettings = GAMEPLAY_KEYS.some(k => sett[k] !== SETTINGS_DEFAULTS[k]);
    const entry = {
      name: username, score, kills, wave, lastWords,
      rank, bestStreak, totalDamage, level,
      time: fmtTime(timeSurvived), achievements: achievementsUnlocked.length, difficulty,
      starterLoadout, customSettings,
      inputDevice: inputDeviceRef.current,
      seed: runSeed,
      accountLevel: getAccountLevel(loadCareerStats().totalKills),
    };
    const board = await saveToLeaderboard(entry);
    setLeaderboard(board);
  }, [username, score, kills, wave, bestStreak, totalDamage, level, timeSurvived, achievementsUnlocked, difficulty, starterLoadout, runSeed]);

  // ── GAME LOOP ─────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) ctxRef.current = canvas.getContext("2d");
    const ctx = ctxRef.current;
    const W = GW(), H = GH(), p = gs.player, wpnIdx = currentWeaponRef.current;

    if (pausedRef.current || perkPendingRef.current || shopPendingRef.current) {
      frameRef.current = requestAnimationFrame(gameLoop);
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
    let dx = 0, dy = 0;
    const keys = keysRef.current;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    const js = joystickRef.current;
    if (js.active) { const dist = Math.hypot(js.dx, js.dy); if (dist > 5) { dx += js.dx / Math.max(dist, 50); dy += js.dy / Math.max(dist, 50); } }
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }
    const _rushMult = (gs.adrenalineRushTimer || 0) > 0 ? 2.0 : 1.0;
    if (dashRef.current.active <= 0) { p.x += dx * p.speed * _rushMult; p.y += dy * p.speed * _rushMult; }
    p.x = Math.max(20, Math.min(W - 20, p.x));
    p.y = Math.max(20, Math.min(H - 20, p.y));
    (gs.obstacles || []).forEach(ob => {
      const cx = Math.max(ob.x, Math.min(p.x, ob.x + ob.w));
      const cy = Math.max(ob.y, Math.min(p.y, ob.y + ob.h));
      const dist = Math.hypot(p.x - cx, p.y - cy);
      if (dist < 16) { const ang = Math.atan2(p.y - cy, p.x - cx); p.x = cx + Math.cos(ang) * 17; p.y = cy + Math.sin(ang) * 17; }
    });
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) { if (Math.random() < 0.3) gs.trail.push({ x: p.x, y: p.y, life: 10 }); }
    gs.trail = gs.trail.filter(t => { t.life--; return t.life > 0; });

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
      p.angle = Math.atan2((mouse.y - rect.top) * (H / rect.height) - p.y, (mouse.x - rect.left) * (W / rect.width) - p.x);
      inputDeviceRef.current = "mouse";
    }
    if (autoAimRef.current && js.active && !ss.active && gs.enemies.length > 0) {
      let nearest = null, nd = Infinity;
      gs.enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; nearest = e; } });
      if (nearest) p.angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
    }
    const shouldShoot = mouse.down || ss.shooting || gamepadShootRef.current || (autoAimRef.current && js.active && !ss.active && gs.enemies.length > 0);
    if (shouldShoot && !isReloadingRef.current && gs.ammoCount > 0) shoot(gs, wpnIdx, p.angle);
    if (p.invincible > 0) p.invincible--;

    // ── Combo decay ──
    if (comboRef.current.timer > 0) {
      comboRef.current.timer--;
      if (comboRef.current.timer <= 0) { comboRef.current.count = 0; setCombo(0); setComboTimer(0); }
      else if (frameCountRef.current % 6 === 0) setComboTimer(comboRef.current.timer);
    }

    // ── Frame capture for highlight GIF (~10fps) ──
    // Auto-reload when ammo empty (setting)
    if (gs.ammoCount === 0 && !isReloadingRef.current && gs.settAutoReload) doReload(currentWeaponRef.current);

    if (frameCountRef.current % 6 === 0 && canvasRef.current) {
      const cv = canvasRef.current;
      if (!gifOffscreenRef.current) {
        const scale = Math.min(1, 320 / cv.width);
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
      if (buf.length > 120) buf.shift(); // keep ~12s at 10fps
    }

    // ── Wave / boss wave logic ──
    const diffS = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    if (!gs.bossWave) {
      gs.spawnTimer++;
      const spawnRate = Math.max(18, Math.floor((100 - gs.currentWave * 7) * diffS.spawnMult / (gs.settSpawnMult || 1)));
      if (gs.spawnTimer >= spawnRate && gs.enemiesThisWave < gs.maxEnemiesThisWave) {
        gs.spawnTimer = 0; gs.enemiesThisWave++; spawnEnemy(gs);
        // Apply elite-only event override after spawn
        if (gs.waveEliteOnly) {
          const ne = gs.enemies[gs.enemies.length - 1];
          if (!ne.eliteType) {
            const et = ["armored","fast","explosive"][Math.floor(Math.random()*3)];
            ne.eliteType = et;
            if (et === "fast") { ne.speed *= 2; ne.size *= 0.75; }
            else if (et === "armored") { ne.dmgMult = 0.45; ne.health *= 1.5; ne.maxHealth = ne.health; }
          }
        }
      }
    }
    // Wave cleared
    if (gs.enemies.length === 0 && gs.enemiesThisWave >= gs.maxEnemiesThisWave) {
      if (gs.bossWave) {
        statsRef.current.bossWavesCleared++;
        soundWaveClear();
        checkAchievements(gs);
      }
      // Clear previous wave event flags
      gs.waveEvent = null; gs.waveEventSpeedMult = 1;
      gs.waveEliteOnly = false; gs.siegeMode = false; gs.fogOfWar = false;
      gs.bossWave = false;
      setBossWaveActive(false);
      gs.currentWave++; gs.enemiesThisWave = 0;
      const nextIsBoss = gs.currentWave % 5 === 0;
      if (nextIsBoss) {
        gs.maxEnemiesThisWave = gs.currentWave >= 15 ? 2 : 1;
      } else {
        gs.maxEnemiesThisWave = Math.min(Math.floor((5 + gs.currentWave * 3) * (gs.waveEnemyMult || 1)), 60);
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
      setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);

      if (nextIsBoss) {
        gs.bossWave = true;
        setBossWaveActive(true);
        soundBossWave();
        setMusicIntensity(true);
        gs.screenShake = 20;
        addText(gs, W / 2, H / 2 - 30, "⚠ BOSS WAVE ⚠", "#FF0000", true);
        addText(gs, W / 2, H / 2 + 10, "WAVE " + gs.currentWave, "#FFD700", true);
        // ── Boss rotation: Karen→Splitter→Juggernaut→Summoner→Landlord, cycling ──
        const _bSlot = (Math.floor(gs.currentWave / 5) - 1) % BOSS_ROTATION.length;
        const _bType = BOSS_ROTATION[_bSlot];
        const _bType2 = BOSS_ROTATION[(_bSlot + 1) % BOSS_ROTATION.length];
        // Boss name announcement
        const _bossNames = { 4:"👩 KAREN DEMANDS A MANAGER", 16:"💔 THE SPLITTER APPROACHES", 17:"🦏 THE JUGGERNAUT APPROACHES", 18:"🌀 THE SUMMONER RISES", 9:"🏠 THE LANDLORD RAISES RENT" };
        const _bossColors = { 4:"#FF44AA", 16:"#FF6688", 17:"#CC4400", 18:"#8844FF", 9:"#FFAA00" };
        addText(gs, W / 2, H / 2 - 70, _bossNames[_bType] || "☠ BOSS APPROACHES", _bossColors[_bType] || "#FF4400", true);
        if (gs.currentWave >= 15) {
          addText(gs, W / 2, H / 2 - 50, "+ " + (_bossNames[_bType2] || ENEMY_TYPES[_bType2].name.toUpperCase()), _bossColors[_bType2] || "#FF8844");
        }
        // Ability warnings: boss-specific first, then general escalation
        const _wv = gs.currentWave;
        const _primaryBoss = _bType;
        const _secondBoss = gs.currentWave >= 15 ? _bType2 : null;
        if (_primaryBoss === 16) {
          addText(gs, W / 2, H / 2 + 45, "💔 SPLITS INTO 3 SHARDS AT LOW HP · 🔥 BULLET RING", "#FF6688");
        } else if (_primaryBoss === 17 || _secondBoss === 17) {
          addText(gs, W / 2, H / 2 + 45, "🦏 ARMORED SHIELD ABSORBS DAMAGE · CHARGE ATTACKS!", "#CC4400");
          if (_secondBoss === 18 || _primaryBoss === 18)
            addText(gs, W / 2, H / 2 + 65, "🌀 SUMMONS ELITES · INVULNERABLE WHILE ALIVE", "#8844FF");
        } else if (_primaryBoss === 18 || _secondBoss === 18) {
          addText(gs, W / 2, H / 2 + 45, "🌀 SUMMONS ELITES · INVULNERABLE WHILE ALIVE!", "#8844FF");
        } else if (_wv >= 40) {
          addText(gs, W / 2, H / 2 + 45, "💸 RENT NUKE · 🌀 TELEPORT · 🛡 SHIELD · ⚡ ENRAGE", "#FF6600");
        } else if (_wv >= 35) {
          addText(gs, W / 2, H / 2 + 45, "🌀 TELEPORT · 🛡 SHIELD PULSE · ⚡ ENRAGE", "#FF6600");
        } else if (_wv >= 30) {
          addText(gs, W / 2, H / 2 + 45, "⚡ ENRAGE at 33% HP · 🛡 SHIELD PULSE · 💥 SLAM", "#FF6600");
        } else if (_wv >= 25) {
          addText(gs, W / 2, H / 2 + 45, "👥 MINION SURGE · 🛡 SHIELD PULSE · 💥 SLAM", "#FF6600");
        } else if (_wv >= 20) {
          addText(gs, W / 2, H / 2 + 45, "🛡 SHIELD PULSE · 💥 GROUND SLAM · 🔥 BULLET RING", "#FF6600");
        } else if (_wv >= 15) {
          addText(gs, W / 2, H / 2 + 45, "💥 GROUND SLAM · 🔥 BULLET RING UNLOCKED!", "#FF6600");
        } else if (_wv >= 10) {
          addText(gs, W / 2, H / 2 + 45, "🔥 NEW: BULLET RING!", "#FF6600");
        } else if (_wv >= 7) {
          addText(gs, W / 2, H / 2 + 45, "⚠️ BOSS + ESCORTS!", "#FF6600");
        }
        if (gs.currentWave >= 15) { spawnBoss(gs, _bType); spawnBoss(gs, _bType2); }
        else {
          spawnBoss(gs, _bType);
          if (gs.currentWave >= 7) { spawnEnemy(gs); spawnEnemy(gs); gs.maxEnemiesThisWave += 2; gs.enemiesThisWave += 2; }
        }
        // Mark all boss enemies as "spawned" so the wave-clear condition can trigger
        gs.enemiesThisWave = gs.maxEnemiesThisWave;
        addParticles(gs, W / 2, H / 2, "#FF0000", 40);
      } else {
        setMusicIntensity(false);
        // ── Wave event: every 3rd non-boss wave ──
        gs._nonBossWaveCount = (gs._nonBossWaveCount || 0) + 1;
        if (gs._nonBossWaveCount % 3 === 0 && gs.currentWave > 2) {
          const _evts = ["fast_round", "siege", "elite_only", "fog_of_war"];
          gs.waveEvent = _evts[Math.floor(Math.random() * _evts.length)];
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
        addText(gs, W / 2, H / 2, "WAVE " + gs.currentWave + "!", "#FFD700", true);
        addText(gs, W / 2, H / 2 + 30, "+" + (gs.currentWave * 100) + " WAVE BONUS" + (streakBonus > 0 ? " +" + streakBonus + " STREAK" : ""), "#00FF88");
        if (gs.waveStreak >= 3) addText(gs, W / 2, H / 2 + 55, "🔥 " + gs.waveStreak + "-WAVE STREAK!", "#FF8800", true);
        soundWaveClear();
        // Trigger wave shop — every wave for waves 1-4, every 2nd wave for wave 5+
        const showShop = gs.currentWave < 5 || gs.currentWave % 2 === 0;
        if (showShop) {
          const opts = getShopOptions(gs, currentWeaponRef.current);
          setShopOptions(opts);
          setShopPending(true);
          shopPendingRef.current = true;
        }
      }
    }

    // ── Bullet movement ──
    gs.bullets = gs.bullets.filter(b => {
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
        if (b.x >= ob.x && b.x <= ob.x + ob.w && b.y >= ob.y && b.y <= ob.y + ob.h) {
          if (b.bouncesLeft > 0) {
            const prevX = b.x - b.vx, prevY = b.y - b.vy;
            // Determine which face was hit based on pre-collision position
            if (prevX < ob.x || prevX > ob.x + ob.w) b.vx = -b.vx; else b.vy = -b.vy;
            b.bouncesLeft--;
            b.x = prevX + b.vx; b.y = prevY + b.vy; // reposition from pre-hit point with new trajectory
            b.life = Math.max(b.life, 35); // extend life so ricocheted bullets can travel full distance
            addParticles(gs, b.x, b.y, "#FFFFFF", 4);
            gs.screenShake = Math.max(gs.screenShake, 1);
          } else {
            addParticles(gs, b.x, b.y, b.color, 3); return false;
          }
          break;
        }
      }
      return b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10;
    });

    // ── Enemy bullet movement ──
    gs.enemyBullets = gs.enemyBullets.filter(eb => {
      eb.x += eb.vx; eb.y += eb.vy; eb.life--;
      const hitWall = (gs.obstacles || []).some(ob => eb.x >= ob.x && eb.x <= ob.x + ob.w && eb.y >= ob.y && eb.y <= ob.y + ob.h);
      if (hitWall) return false;
      return eb.life > 0 && eb.x > -10 && eb.x < W + 10 && eb.y > -10 && eb.y < H + 10;
    });

    // ── Enemy bullet hits player ──
    if (dashRef.current.active <= 0) {
      gs.enemyBullets.forEach(eb => {
        if (Math.hypot(eb.x - p.x, eb.y - p.y) < 18 && p.invincible <= 0) {
          eb.life = 0;
          let dmg = eb.damage || 8;
          if (gs.glassjaw) dmg *= (gs.glassjawMult || 2);
          p.health -= dmg; p.invincible = 20; gs.screenShake = 5; gs.damageFlash = 8;
          gs.damageThisWave = (gs.damageThisWave || 0) + 1;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y - 30, "-" + Math.floor(dmg), "#FF4444");
          rumbleGamepad(0.3, 0.45, 100);
          if (p.health <= 0) handlePlayerDeath(gs);
        }
      });
    }

    // ── Grenade logic ──
    gs.grenades = gs.grenades.filter(g => {
      g.x += g.vx; g.y += g.vy; g.vx *= 0.96; g.vy *= 0.96; g.life--;
      if (g.life <= 0) {
        addParticles(gs, g.x, g.y, "#FF4500", 30);
        addParticles(gs, g.x, g.y, "#FFD700", 20);
        addText(gs, g.x, g.y, "BOOM!", "#FF4500", true);
        gs.screenShake = 15;
        gs.enemies.forEach(e => {
          const d = Math.hypot(e.x - g.x, e.y - g.y);
          const _gradius = 130 * (gs.settGrenadeRadMult || 1);
          if (d < _gradius) {
            const dmg = 70 * (1 - d / _gradius) * (perkModsRef.current.grenadeDamageMult || 1);
            e.health -= dmg; e.hitFlash = 10; gs.totalDamage += dmg;
            e.lastDmgSource = "grenade";
          }
        });
        return false;
      }
      return true;
    });

    // ── Railgun beam: instant hitscan damage ──
    if (gs.pendingBeam) {
      const { ox, oy, cos, sin, maxT, weaponIdx: pbWpn } = gs.pendingBeam;
      gs.pendingBeam = null;
      const pbWeapon = WEAPONS[pbWpn];
      const pbDmgMult = (perkModsRef.current.damageMult || 1) * (1 + (gs.weaponUpgrades?.[pbWpn] || 0) * 0.25);
      const pbComboMult = 1 + comboRef.current.count * 0.1;
      gs.enemies.forEach(e => {
        if (e.health <= 0) return;
        const ex = e.x - ox, ey = e.y - oy;
        const proj = ex * cos + ey * sin;
        const perp = Math.abs(ex * sin - ey * cos);
        if (proj > 0 && proj < maxT && perp < e.size / 2 + 7) {
          if (e.typeIndex === 18 && e.summonerInvuln) { addParticles(gs, e.x, e.y, "#8844FF", 3); return; }
          const effectiveCrit = CRIT_CHANCE + (perkModsRef.current.critBonus || 0) + (gs.critBonus || 0);
          const isCrit = Math.random() < effectiveCrit;
          const _pbRageMult = (gs.rageTimer || 0) > 0 ? 1.75 : 1.0;
          const _pbJugMult = (e.typeIndex === 17 && (e.jugShield || 0) > 0) ? 0.15 : 1.0;
          const dmg = pbWeapon.damage * pbDmgMult * pbComboMult * (isCrit ? CRIT_MULT + (gs.critMultBonus || 0) : 1) * (e.dmgMult || 1) * _pbRageMult * _pbJugMult;
          e.health -= dmg; e.hitFlash = isCrit ? 15 : 8; gs.totalDamage += dmg;
          if (perkModsRef.current.lifesteal) { p.health = Math.min(p.maxHealth, p.health + dmg * perkModsRef.current.lifesteal); setHealth(Math.floor(p.health)); }
          if (isCrit) statsRef.current.crits++;
          addParticles(gs, e.x, e.y, isCrit ? "#FFD700" : e.color, isCrit ? 10 : 5);
          addText(gs, e.x, e.y - e.size / 2 - 8, isCrit ? "💥 CRIT!" : HITMARKERS[Math.floor(Math.random() * HITMARKERS.length)], isCrit ? "#FFD700" : "#FFF");
          if (e.health <= 0) {
            const comboTimerDuration = Math.floor(COMBO_TIMER_BASE * (perkModsRef.current.comboTimerMult || 1));
            comboRef.current.count++; comboRef.current.timer = comboTimerDuration;
            if (comboRef.current.count > comboRef.current.max) comboRef.current.max = comboRef.current.count;
            setCombo(comboRef.current.count);
            const pts = Math.floor(e.points * pbComboMult * (gs.killScoreMult || 1));
            gs.score += pts; gs.kills++; gs.killstreakCount++;
            if (dashRef.current.active > 0) statsRef.current.dashKills++;
            if (pbWpn != null) statsRef.current.weaponKills[pbWpn] = (statsRef.current.weaponKills[pbWpn] || 0) + 1;
            if (e.typeIndex === 4 || e.typeIndex === 9 || e.typeIndex === 16 || e.typeIndex === 17 || e.typeIndex === 18) statsRef.current.bossKills++;
            if (e.typeIndex === 9) statsRef.current.landlordKills++;
            if (e.typeIndex === 10) statsRef.current.cryptoKills++;
            if (gs.killstreakCount > statsRef.current.bestStreak) { statsRef.current.bestStreak = gs.killstreakCount; bestMomentRef.current = { ts: Date.now(), score: gs.killstreakCount * 10 }; }
            if (e.isBossEnemy) {
              soundBossKill(); rumbleGamepad(0.5, 1.0, 500);
              gs.bossKillFlash = 22; gs.screenShake = Math.max(gs.screenShake, 30);
              addParticles(gs, e.x, e.y, e.color, 50); addParticles(gs, e.x, e.y, "#FFD700", 30); addParticles(gs, e.x, e.y, "#FFFFFF", 20);
              addText(gs, W / 2, H / 3, "☠ BOSS ELIMINATED ☠", "#FF0000", true);
              if (100 > bestMomentRef.current.score) bestMomentRef.current = { ts: Date.now(), score: 100 };
            }
            setScore(gs.score); setKills(gs.kills); setKillstreak(gs.killstreakCount);
            setBestStreak(statsRef.current.bestStreak); setTotalDamage(Math.floor(gs.totalDamage));
            if (!gs.newBestScore && gs.score > (gs.careerBest?.score || 0)) {
              gs.newBestScore = true; addText(gs, W / 2, H / 2 - 120, "🏆 NEW BEST SCORE!", "#FFD700", true);
            }
            addParticles(gs, e.x, e.y, e.color, 20);
            addText(gs, e.x, e.y - 30, "+" + pts + (comboRef.current.count > 1 ? " (x" + comboRef.current.count + ")" : ""), "#FFD700");
            const _rbDq = Array.isArray(e.deathQuotes) ? e.deathQuotes[Math.floor(Math.random() * e.deathQuotes.length)] : "...";
            addText(gs, e.x, e.y - 54, `"${_rbDq}"`, "#FF88CC", "quote");
            addKillFeed(e.name, pbWeapon.name);
            if (!e.isBossEnemy) {
              if (e.summonedBy) { soundSummonDismissed(); addText(gs, e.x, e.y - 38, "✨ SUMMON DISMISSED", "#CC88FF"); }
              else if ((gs._deathSoundsThisFrame || 0) < 2) { gs._deathSoundsThisFrame = (gs._deathSoundsThisFrame || 0) + 1; soundEnemyDeath(e.typeIndex); }
            }
            if (gs.vampireMode) { p.health = Math.min(p.maxHealth, p.health + 3); setHealth(Math.floor(p.health)); }
            if (perkModsRef.current.adrenalineRush && p.health > 0 && p.health < p.maxHealth * 0.30) {
              gs.adrenalineRushTimer = 120; addText(gs, p.x, p.y - 50, "⚡ ADRENALINE!", "#FF6600", true);
            }
            gs.dyingEnemies = gs.dyingEnemies || [];
            if (gs.dyingEnemies.length < MAX_DYING_ANIM) gs.dyingEnemies.push({ x: e.x, y: e.y, emoji: e.emoji, color: e.color, size: e.size, life: 22, maxLife: 22 });
            if (e.splitOnDeath && !e.splitDone) {
              e.splitDone = true; addText(gs, e.x, e.y - 50, "💔 SPLIT!", "#FF6688", true);
              for (let _si = 0; _si < 3; _si++) {
                const _sa = (_si / 3) * Math.PI * 2 + 0.5;
                gs.enemies.push({ x: e.x + Math.cos(_sa) * 55, y: e.y + Math.sin(_sa) * 55, health: e.maxHealth * 0.35, maxHealth: e.maxHealth * 0.35, speed: e.speed * 1.4, size: e.size * 0.58, color: "#FF8899", name: "Splitter Shard", points: Math.floor(e.points * 0.25), deathQuotes: ["..."], emoji: "💔", typeIndex: 16, wobble: Math.random() * Math.PI * 2, hitFlash: 0, ranged: false, projSpeed: 0, projRate: 999, shootTimer: 60, isBossEnemy: false, splitOnDeath: false });
              }
              addParticles(gs, e.x, e.y, "#FF6688", 30);
            }
            const _rIsShd = e.typeIndex === 16 && !e.isBossEnemy;
            if (!_rIsShd) {
              if (e.isBossEnemy && extraLivesRef.current === 0 && Math.random() < 0.18) { gs.pickups.push({ x: e.x, y: e.y, type: "guardian_angel", life: 600 }); }
              else if ((e.isBossEnemy || Math.random() < 0.25) && !gs.siegeMode) { spawnPickup(gs, e.x, e.y, e.isBossEnemy); }
            }
            if (KILL_MILESTONES[gs.kills]) {
              addText(gs, W / 2, H / 2 - 90, KILL_MILESTONES[gs.kills], "#FF44FF", true);
              addText(gs, W / 2, H / 2 - 65, gs.kills + " KILLS!", "#FFF", true);
              gs.screenShake = 10;
            }
            if (gs.killstreakCount % 5 === 0 && gs.killstreakCount > 0) {
              const ki = Math.min(Math.floor(gs.killstreakCount / 5) - 1, KILLSTREAKS.length - 1);
              addText(gs, W / 2, 80, KILLSTREAKS[ki] + "!", "#FF4500", true);
              gs.enemies.forEach(en => { en.health -= 40; en.hitFlash = 15; });
              gs.screenShake = 12;
            }
            addXp(pts); gs.killFlash = 6;
            achCheckRef.current = true;
            e.health = -999;
          }
        }
      });
      gs.enemies = gs.enemies.filter(en => en.health > -999);
      gs.screenShake = Math.max(gs.screenShake, 10);
    }

    // ── Bullet-enemy collision ──
    gs.bullets.forEach(b => {
      if (b.life <= 0) return;
      gs.enemies.forEach(e => {
        if (e.health <= -999) return;
        const maxR = e.size / 2 + b.size;
        // Fast AABB reject before expensive hypot
        if (Math.abs(b.x - e.x) > maxR || Math.abs(b.y - e.y) > maxR) return;
        const d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < maxR) {
          // Shield pulse blocks all damage
          if (e.shieldPulseActive) {
            addParticles(gs, b.x, b.y, "#00BFFF", 4);
            b.life = 0; return;
          }
          const comboMult = 1 + comboRef.current.count * 0.1;
          const effectiveCrit = CRIT_CHANCE + (perkModsRef.current.critBonus || 0) + (gs.critBonus || 0);
          const isCrit = Math.random() < effectiveCrit;
          const lastResortMult = (perkModsRef.current.lastResort && p.health < p.maxHealth * 0.25) ? 3.0 : 1.0;
          // Shield Guy (ti=11): 20% damage from front, 160% from behind
          const moveAngle = Math.atan2(p.y - e.y, p.x - e.x);
          const bulletAngle = Math.atan2(b.vy, b.vx);
          const angleDiff = Math.abs(Math.atan2(Math.sin(bulletAngle - moveAngle), Math.cos(bulletAngle - moveAngle)));
          const shieldMult = (e.typeIndex === 11) ? (angleDiff < Math.PI / 2 ? 0.20 : 1.60) : 1.0;
          const rageMult = (gs.rageTimer || 0) > 0 ? 1.75 : 1.0;
          // Juggernaut shield: reduce damage while shield up
          const jugShieldMult = (e.typeIndex === 17 && (e.jugShield || 0) > 0) ? 0.15 : 1.0;
          // Summoner invulnerability while summons alive
          if (e.typeIndex === 18 && e.summonerInvuln) { addParticles(gs, b.x, b.y, "#8844FF", 3); b.life = 0; return; }
          const dmg = b.damage * comboMult * (isCrit ? CRIT_MULT + (gs.critMultBonus || 0) : 1) * lastResortMult * shieldMult * (e.dmgMult || 1) * rageMult * jugShieldMult;
          // Drain juggernaut shield if active
          if (e.typeIndex === 17 && (e.jugShield || 0) > 0) {
            const rawDmg = b.damage * comboMult * (isCrit ? CRIT_MULT : 1);
            e.jugShield = Math.max(0, e.jugShield - rawDmg);
            if (e.jugShield <= 0) {
              e.jugShieldRegenDelay = 240;
              addText(gs, e.x, e.y - 40, "🛡 SHIELD BROKEN!", "#FF6600");
              addText(gs, W / 2, H / 3, "🦏 SHIELD SHATTERED!", "#FF6600", true);
              gs.screenShake = Math.max(gs.screenShake, 14);
              addParticles(gs, e.x, e.y, "#5599FF", 20);
            }
          }
          e.health -= dmg; e.hitFlash = isCrit ? 15 : 8; gs.totalDamage += dmg;
          // Chain Lightning: 20% chance to arc to nearest enemy for 50% damage
          if (gs.chainLightning && Math.random() < 0.20) {
            const arcRange = 200;
            let arcTarget = null, arcDist = arcRange;
            gs.enemies.forEach(ne => {
              if (ne !== e && ne.health > 0) {
                const nd = Math.hypot(ne.x - e.x, ne.y - e.y);
                if (nd < arcDist) { arcDist = nd; arcTarget = ne; }
              }
            });
            if (arcTarget) {
              const arcDmg = dmg * 0.5;
              arcTarget.health -= arcDmg; arcTarget.hitFlash = 8; gs.totalDamage += arcDmg;
              gs.lightningArcs = gs.lightningArcs || [];
              gs.lightningArcs.push({ x1: e.x, y1: e.y, x2: arcTarget.x, y2: arcTarget.y, life: 8, maxLife: 8 });
            }
          }
          // Lifesteal
          if (perkModsRef.current.lifesteal) {
            p.health = Math.min(p.maxHealth, p.health + dmg * perkModsRef.current.lifesteal);
            setHealth(Math.floor(p.health));
          }
          if (isCrit) statsRef.current.crits++;
          const _hn = performance.now();
          if (_hn - lastHitSoundRef.current > 50) { soundHit(isCrit); lastHitSoundRef.current = _hn; rumbleGamepad(isCrit ? 0.25 : 0.05, isCrit ? 0.35 : 0.1, isCrit ? 80 : 40); }
          addParticles(gs, b.x, b.y, isCrit ? "#FFD700" : e.color, isCrit ? 10 : 5);
          gs.screenShake = Math.max(gs.screenShake, isCrit ? 6 : 2);
          addText(gs, e.x + (Math.random() - 0.5) * 20, e.y - e.size / 2 - Math.random() * 10,
            isCrit ? "💥 CRIT!" : HITMARKERS[Math.floor(Math.random() * HITMARKERS.length)],
            isCrit ? "#FFD700" : "#FFF");
          // Pierce logic
          if (b.pierceLeft > 0) { b.pierceLeft--; }
          else { b.life = 0; }

          if (e.health <= 0) {
            const comboTimerDuration = Math.floor(COMBO_TIMER_BASE * (perkModsRef.current.comboTimerMult || 1));
            comboRef.current.count++; comboRef.current.timer = comboTimerDuration;
            if (comboRef.current.count > comboRef.current.max) comboRef.current.max = comboRef.current.count;
            setCombo(comboRef.current.count);
            const pts = Math.floor(e.points * comboMult * (gs.killScoreMult || 1));
            gs.score += pts; gs.kills++; gs.killstreakCount++;
            if (dashRef.current.active > 0) statsRef.current.dashKills++;
            if (b.wpnIdx != null) { statsRef.current.weaponKills[b.wpnIdx] = (statsRef.current.weaponKills[b.wpnIdx] || 0) + 1; }
            if (gs.killstreakCount > statsRef.current.bestStreak) { statsRef.current.bestStreak = gs.killstreakCount; bestMomentRef.current = { ts: Date.now(), score: gs.killstreakCount * 10 }; }
            if (e.typeIndex === 4 || e.typeIndex === 9) statsRef.current.bossKills++;
            if (e.typeIndex === 9) statsRef.current.landlordKills++;
            if (e.typeIndex === 10) statsRef.current.cryptoKills++;
            if (e.isBossEnemy) {
              soundBossKill();
              rumbleGamepad(0.5, 1.0, 500);
              gs.bossKillFlash = 22; // golden flash overlay
              gs.screenShake = Math.max(gs.screenShake, 30);
              addParticles(gs, e.x, e.y, e.color, 50);
              addParticles(gs, e.x, e.y, "#FFD700", 30);
              addParticles(gs, e.x, e.y, "#FFFFFF", 20);
              addText(gs, W / 2, H / 3, "☠ BOSS ELIMINATED ☠", "#FF0000", true);
              if (100 > bestMomentRef.current.score) bestMomentRef.current = { ts: Date.now(), score: 100 };
            }
            setScore(gs.score); setKills(gs.kills); setKillstreak(gs.killstreakCount);
            setBestStreak(statsRef.current.bestStreak); setTotalDamage(Math.floor(gs.totalDamage));
            if (!gs.newBestScore && gs.score > (gs.careerBest?.score || 0)) {
              gs.newBestScore = true;
              addText(gs, W / 2, H / 2 - 120, "🏆 NEW BEST SCORE!", "#FFD700", true);
              gs.screenShake = Math.max(gs.screenShake, 8);
            }
            addParticles(gs, e.x, e.y, e.color, 20);
            addText(gs, e.x, e.y - 30, "+" + pts + (comboRef.current.count > 1 ? " (x" + comboRef.current.count + ")" : ""), "#FFD700");
            const dq = Array.isArray(e.deathQuotes) ? e.deathQuotes[Math.floor(Math.random() * e.deathQuotes.length)] : (e.deathQuote || "...");
            addText(gs, e.x, e.y - 54, `"${dq}"`, "#FF88CC", "quote");
            addKillFeed(e.name, WEAPONS[wpnIdx].name);
            if (e.lastDmgSource === "grenade") statsRef.current.grenadeKills = (statsRef.current.grenadeKills || 0) + 1;
            addXp(pts); gs.killFlash = 6;
            if (gs.vampireMode) { p.health = Math.min(p.maxHealth, p.health + 3); setHealth(Math.floor(p.health)); }
            // Adrenaline Rush: kill while <30% HP → 2s double speed
            if (perkModsRef.current.adrenalineRush && p.health > 0 && p.health < p.maxHealth * 0.30) {
              gs.adrenalineRushTimer = 120;
              addText(gs, p.x, p.y - 50, "⚡ ADRENALINE!", "#FF6600", true);
              addParticles(gs, p.x, p.y, "#FF6600", 12);
            }
            gs.dyingEnemies = gs.dyingEnemies || [];
            if (gs.dyingEnemies.length < MAX_DYING_ANIM)
              gs.dyingEnemies.push({ x: e.x, y: e.y, emoji: e.emoji, color: e.color, size: e.size, life: 22, maxLife: 22 });
            // Explosive elite: chain AOE on death
            if (e.eliteType === "explosive") {
              const expRadius = 85;
              addParticles(gs, e.x, e.y, "#FF6600", 20); addParticles(gs, e.x, e.y, "#FFAA00", 12);
              gs.screenShake = Math.max(gs.screenShake, 8);
              addText(gs, e.x, e.y - 40, "💥 CHAIN!", "#FF6600");
              gs.enemies.forEach(ne => {
                if (ne !== e && ne.health > 0) {
                  const dx = ne.x - e.x, dy = ne.y - e.y;
                  if (dx * dx + dy * dy < expRadius * expRadius) { ne.health -= 35; ne.hitFlash = 10; }
                }
              });
            }
            achCheckRef.current = true;
            if (KILL_MILESTONES[gs.kills]) {
              addText(gs, W / 2, H / 2 - 90, KILL_MILESTONES[gs.kills], "#FF44FF", true);
              addText(gs, W / 2, H / 2 - 65, gs.kills + " KILLS!", "#FFF", true);
              gs.screenShake = 10; addParticles(gs, W / 2, H / 2 - 80, "#FF44FF", 20);
            }
            if (gs.killstreakCount % 5 === 0 && gs.killstreakCount > 0) {
              const ki = Math.min(Math.floor(gs.killstreakCount / 5) - 1, KILLSTREAKS.length - 1);
              addText(gs, W / 2, 80, KILLSTREAKS[ki] + "!", "#FF4500", true);
              gs.enemies.forEach(en => { en.health -= 40; en.hitFlash = 15; });
              gs.screenShake = 12;
            }
            // Enemy death sound (non-boss only — boss kill has soundBossKill; max 2/frame to avoid audio pile-up)
            if (!e.isBossEnemy) {
              if (e.summonedBy) {
                soundSummonDismissed();
                addText(gs, e.x, e.y - 38, "✨ SUMMON DISMISSED", "#CC88FF");
              } else if ((gs._deathSoundsThisFrame || 0) < 2) {
                gs._deathSoundsThisFrame = (gs._deathSoundsThisFrame || 0) + 1;
                soundEnemyDeath(e.typeIndex);
              }
            }
            // Splitter: split into 3 mini-copies on death
            if (e.splitOnDeath && !e.splitDone) {
              e.splitDone = true;
              addText(gs, e.x, e.y - 50, "💔 SPLIT!", "#FF6688", true);
              const diff2 = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
              for (let _si = 0; _si < 3; _si++) {
                const _sa = (_si / 3) * Math.PI * 2 + 0.5;
                const _sx = e.x + Math.cos(_sa) * 55, _sy = e.y + Math.sin(_sa) * 55;
                const _sHP = e.maxHealth * 0.35;
                gs.enemies.push({
                  x: _sx, y: _sy, health: _sHP, maxHealth: _sHP,
                  speed: e.speed * 1.4 * (gs.waveEventSpeedMult || 1),
                  size: e.size * 0.58, color: "#FF8899",
                  name: "Splitter Shard", points: Math.floor(e.points * 0.25),
                  deathQuotes: ["..."], emoji: "💔", typeIndex: 16,
                  wobble: Math.random() * Math.PI * 2, hitFlash: 0,
                  ranged: false, projSpeed: 0, projRate: 999,
                  shootTimer: 60, isBossEnemy: false,
                  splitOnDeath: false,
                });
              }
              addParticles(gs, e.x, e.y, "#FF6688", 30);
            }
            // Pickup drops (skip during siege mode; Splitter shards never drop)
            const isBossEnemy = e.isBossEnemy;
            const isShard = e.typeIndex === 16 && !isBossEnemy;
            if (!isShard) {
              if (isBossEnemy && extraLivesRef.current === 0 && Math.random() < 0.18) {
                gs.pickups.push({ x: e.x, y: e.y, type: "guardian_angel", life: 600 });
              } else if ((isBossEnemy || Math.random() < 0.25) && !gs.siegeMode) {
                spawnPickup(gs, e.x, e.y, isBossEnemy);
              }
            }
            e.health = -999;
          }
        }
      });
    });
    gs.enemies = gs.enemies.filter(e => e.health > -999);
    if (achCheckRef.current) { checkAchievements(gs); checkDailyMissions(gs); achCheckRef.current = false; }

    // ── Flow field rebuild (every 30 frames or on significant player movement) ──
    gs._ffTimer = (gs._ffTimer || 0) + 1;
    const _ffPx = gs._ffPx || 0, _ffPy = gs._ffPy || 0;
    if (gs._ffTimer >= 30 || Math.hypot(p.x - _ffPx, p.y - _ffPy) > 48) {
      gs._ffTimer = 0; gs._ffPx = p.x; gs._ffPy = p.y;
      gs.flowField = buildFlowField(W, H, p.x, p.y, gs.obstacles || []);
    }

    // ── Sergeant Karen aura ──
    const sergeantPositions = gs.enemies.filter(e => e.typeIndex === 13).map(e => ({ x: e.x, y: e.y }));
    gs.enemies.forEach(e => { e.buffed = sergeantPositions.length > 0 && sergeantPositions.some(s => Math.hypot(e.x - s.x, e.y - s.y) < 150) && e.typeIndex !== 13; });

    // ── Enemy movement & melee ──
    gs.enemies.forEach(e => {
      e.wobble += 0.1;
      const zigzag = e.typeIndex === 10 ? Math.sin(e.wobble * 3) * 3 : 0;
      const freezeMult = (gs.freezeTimer || 0) > 0 ? 0.35 : 1;
      const buffedSpeed = e.speed * (e.buffed ? 1.35 : 1) * (gs.enemySpeedMult || 1) * freezeMult;
      // Flow field steering: sample flow field, fall back to direct angle if no cell data
      const ff = gs.flowField;
      let sx, sy;
      if (ff && !e.chargeActive) {
        const fc = Math.min(ff.cols - 1, Math.max(0, Math.floor(e.x / FF_CELL)));
        const fr = Math.min(ff.rows - 1, Math.max(0, Math.floor(e.y / FF_CELL)));
        const idx = fr * ff.cols + fc;
        if (ff.fdx[idx] !== 0 || ff.fdy[idx] !== 0) {
          sx = ff.fdx[idx]; sy = ff.fdy[idx];
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
      // Skip regular movement for Juggernaut during charge/stun (those are handled above)
      const _skipMove = e.typeIndex === 17 && (e.jugCharging || (e.jugStunned || 0) > 0);
      if (!_skipMove) {
        e.x += sx * buffedSpeed + Math.sin(e.wobble) * 0.5 + (-sy) * zigzag;
        e.y += sy * buffedSpeed + Math.cos(e.wobble) * 0.5 + sx * zigzag;
      }
      if (e.hitFlash > 0) e.hitFlash--;
      if (e.ranged) {
        e.shootTimer++;
        if (e.shootTimer >= e.projRate) {
          e.shootTimer = 0;
          const pa = Math.atan2(p.y - e.y, p.x - e.x);
          // Mega Karen phase 2: 5-bullet spread
          const isMKP2 = e.typeIndex === 4 && e.isBossEnemy && e.health < e.maxHealth * 0.5;
          const bCount = isMKP2 ? 5 : 1;
          for (let bi = 0; bi < bCount; bi++) {
            const angle = pa + (bi - Math.floor(bCount / 2)) * 0.28;
            gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * e.projSpeed, vy: Math.sin(angle) * e.projSpeed, life: 90, size: 4, color: e.color, damage: 6 + e.typeIndex * 2 });
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
                p.health -= 25; p.invincible = 30; gs.damageFlash = 12;
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
            const tAngle = Math.random() * Math.PI * 2;
            const tDist  = 110 + Math.random() * 70;
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
          e.bulletRingWarning = _abilityReady && e.bulletRingTimer >= _brCap - 60 && e.bulletRingTimer < _brCap;
          if (_abilityReady && e.bulletRingTimer >= _brCap) {
            e.bulletRingTimer = 0;
            e.bulletRingWarning = false;
            e.sharedAbilityCooldown = 120;
            for (let _ri = 0; _ri < 8; _ri++) {
              const ba = (_ri / 8) * Math.PI * 2;
              gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 4.5, vy: Math.sin(ba) * 4.5, life: 120, size: 5, color: "#FF6600", damage: 12 });
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
            e.groundSlamWarning = _abilityReady && e.groundSlamTimer >= _gsCap - 90 && e.groundSlamTimer < _gsCap;
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
              p.health -= gs.glassjaw ? Math.round(18 * (gs.glassjawMult || 2)) : 18; p.invincible = 25; gs.damageFlash = 10;
              gs.damageThisWave = (gs.damageThisWave || 0) + 1;
              setHealth(Math.max(0, p.health));
              addText(gs, p.x, p.y - 30, "-18 SLAM!", "#FF4400");
              rumbleGamepad(0.4, 0.65, 150);
              if (p.health <= 0) handlePlayerDeath(gs);
            }
            if (e.groundSlamRadius >= 230) e.groundSlamActive = false;
          }
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
            let cdmg = 30; if (gs.glassjaw) cdmg *= (gs.glassjawMult || 2);
            p.health -= cdmg; p.invincible = 35; gs.damageFlash = 12; gs.damageThisWave = (gs.damageThisWave || 0) + 1;
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
        const _aliveCount = gs.enemies.filter(ne => ne !== e && ne.summonedBy === e.summonerId).length;
        e.summonerCount = _aliveCount;
        e.summonerInvuln = _aliveCount > 0;
        if (_aliveCount === 0 && (e.summonerVulnTimer || 0) > 0) e.summonerVulnTimer--;
        if (_aliveCount === 0 && (e.summonerVulnTimer || 0) <= 0) {
          // Portal VFX during first-summon windup (every 25 frames while timer counts down)
          if (e.summonerFirstSummon && (e.summonerTimer || 0) > 0) {
            if (frameCountRef.current % 25 === 0) {
              addParticles(gs, e.x, e.y, "#CC88FF", 6);
              const _pa = Math.random() * Math.PI * 2, _pr = 60 + Math.random() * 40;
              addParticles(gs, e.x + Math.cos(_pa) * _pr, e.y + Math.sin(_pa) * _pr, "#8844FF", 4);
            }
          }
          // Summon timer
          e.summonerTimer = (e.summonerTimer || 0) - 1;
          if (e.summonerTimer <= 0 && _aliveCount < e.summonerMaxCount) {
            e.summonerTimer = 280;
            e.summonerFirstSummon = false;
            const _sCount = Math.min(3, e.summonerMaxCount - _aliveCount);
            for (let _si = 0; _si < _sCount; _si++) {
              const _sa = Math.random() * Math.PI * 2, _sd = 80 + Math.random() * 60;
              spawnEnemy(gs);
              const _ne = gs.enemies[gs.enemies.length - 1];
              _ne.x = e.x + Math.cos(_sa) * _sd; _ne.y = e.y + Math.sin(_sa) * _sd;
              _ne.summonedBy = e.summonerId;
              _ne.eliteType = ["armored","fast","explosive"][Math.floor(Math.random()*3)];
              if (_ne.eliteType === "fast") { _ne.speed *= 2; _ne.size *= 0.75; }
              else if (_ne.eliteType === "armored") { _ne.dmgMult = 0.45; _ne.health *= 1.5; _ne.maxHealth = _ne.health; }
            }
            addText(gs, e.x, e.y - 70, "🌀 SUMMONING!", "#8844FF", true);
            addParticles(gs, e.x, e.y, "#8844FF", 25);
            e.summonerVulnTimer = 360; // re-enters invuln after summons die
          }
        }
      }
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
            p.health -= gs.glassjaw ? Math.round(35 * (gs.glassjawMult || 2)) : 35; p.invincible = 40; gs.damageFlash = 12;
            gs.damageThisWave = (gs.damageThisWave || 0) + 1;
            setHealth(Math.max(0, p.health));
            addText(gs, p.x, p.y - 30, "-35 HP", "#FF0000");
            rumbleGamepad(0.5, 0.7, 200);
            if (p.health <= 0) handlePlayerDeath(gs);
          }
          e.health = -999;
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
          const ea = ed > 0 ? Math.atan2(e.y - ecy, e.x - ecx) : Math.random() * Math.PI * 2;
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
          p.health -= dmg; p.invincible = 30; gs.screenShake = 8; gs.damageFlash = 10;
          gs.damageThisWave = (gs.damageThisWave || 0) + 1;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y - 30, "-" + Math.floor(dmg) + " HP", "#FF0000");
          rumbleGamepad(0.35, 0.5, 120);
          if (p.health <= 0) handlePlayerDeath(gs);
        }
      }
    });

    // ── Pickup collection ──
    const pickupRange = perkModsRef.current.pickupRange || 30;
    gs.pickups = gs.pickups.filter(pk => {
      pk.life--;
      const d2 = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (d2 < pickupRange) {
        soundPickup(pk.type);
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
          gs.enemies.forEach((en, _ni) => { en.health = -999; gs.score += en.points; if (_ni < 12) addParticles(gs, en.x, en.y, en.color, 8); });
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
        }
        addXp(50);
        return false;
      }
      return pk.life > 0;
    });

    // ── Particles / floats ──
    gs.particles = gs.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.95; pt.vy *= 0.95; pt.life--; return pt.life > 0; });
    gs.floatingTexts = gs.floatingTexts.filter(ft => { ft.y += ft.vy; ft.life--; return ft.life > 0; });
    gs.dyingEnemies = (gs.dyingEnemies || []).filter(de => { de.life--; return de.life > 0; });
    if (gs.screenShake > 0) gs.screenShake *= 0.85;
    if (gs.muzzleFlash > 0) gs.muzzleFlash--;
    if (gs.damageFlash > 0) gs.damageFlash--;
    if (gs.killFlash > 0) gs.killFlash--;
    if ((gs.bossKillFlash || 0) > 0) gs.bossKillFlash--;
    if ((gs.adrenalineRushTimer || 0) > 0) gs.adrenalineRushTimer--;
    if ((gs.rageTimer || 0) > 0) gs.rageTimer--;
    if ((gs.freezeTimer || 0) > 0) gs.freezeTimer--;
    if (gs.lightningArcs) gs.lightningArcs = gs.lightningArcs.filter(a => { a.life--; return a.life > 0; });
    if (gs.beams) gs.beams = gs.beams.filter(bm => { bm.life--; return bm.life > 0; });
    gs._deathSoundsThisFrame = 0; // reset death-sound throttle each frame
    frameCountRef.current++;

    // ────────────────── RENDER ──────────────────────────────────────────────
    drawGame(ctx, canvas, W, H, gs, { dashRef, mouseRef, joystickRef, shootStickRef, startTimeRef, frameCountRef, isMobile, tip, wpnIdx });

    frameRef.current = requestAnimationFrame(gameLoop);
  }, [shoot, spawnEnemy, spawnBoss, doReload, isMobile, checkAchievements, checkDailyMissions, tip, handlePlayerDeath, addXp, spawnPickup]);

  // ── Start / stop animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") { if (frameRef.current) cancelAnimationFrame(frameRef.current); return; }
    frameRef.current = requestAnimationFrame(gameLoop);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [screen, gameLoop]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        if (e.key === "Escape" && screen === "game") { setPaused(p => !p); e.preventDefault(); }
        return;
      }
      if (e.key === "Escape" && screen === "game") { setPaused(p => !p); e.preventDefault(); return; }
      if (pausedRef.current || perkPendingRef.current) return;
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "r") doReload(currentWeaponRef.current);
      if (e.key === "q" || e.key === "g") throwGrenade();
      if (e.key === " " || e.key === "Shift") doDash();
      const num = parseInt(e.key);
      if (num >= 1 && num <= WEAPONS.length) switchWeapon(num - 1);
      if (["w","a","s","d","r","q","g","1","2","3","4","5"," "].includes(e.key.toLowerCase()) || e.key === "Shift") e.preventDefault();
    };
    const ku = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    const mm = (e) => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; mouseRef.current.moved = true; };
    const md = (e) => { if (e.button === 0 && !pausedRef.current && !perkPendingRef.current) mouseRef.current.down = true; };
    const mu = (e) => { if (e.button === 0) mouseRef.current.down = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    window.addEventListener("mousemove", mm); window.addEventListener("mousedown", md); window.addEventListener("mouseup", mu);
    return () => {
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      window.removeEventListener("mousemove", mm); window.removeEventListener("mousedown", md); window.removeEventListener("mouseup", mu);
    };
  }, [doReload, throwGrenade, doDash, switchWeapon, screen]);

  // ── Touch controls ────────────────────────────────────────────────────────
  useEffect(() => {
    // Always reset sticks on screen change so stale active state never carries over
    joystickRef.current   = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null };
    shootStickRef.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null, shooting: false };
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ts = (e) => {
      if (pausedRef.current || perkPendingRef.current) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect(), midX = rect.left + rect.width / 2;
      for (const t of e.changedTouches) {
        if (t.clientX < midX && !joystickRef.current.active) joystickRef.current = { active: true, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0, id: t.identifier };
        else if (t.clientX >= midX && !shootStickRef.current.active) shootStickRef.current = { active: true, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0, id: t.identifier, shooting: false };
      }
    };
    const tm = (e) => {
      if (pausedRef.current || perkPendingRef.current) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joystickRef.current.id) { joystickRef.current.dx = t.clientX - joystickRef.current.startX; joystickRef.current.dy = t.clientY - joystickRef.current.startY; }
        if (t.identifier === shootStickRef.current.id) { shootStickRef.current.dx = t.clientX - shootStickRef.current.startX; shootStickRef.current.dy = t.clientY - shootStickRef.current.startY; }
      }
    };
    const te = (e) => {
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
    };
  }, [screen]);

  // ── Gamepad polling ───────────────────────────────────────────────────────
  useEffect(() => {
    let lastLB = false, lastRB = false, lastStart = false;
    let lastBtnB = false, lastR3 = false, lastBtnX = false;
    let lastGpConnected = false;

    const poll = () => {
      const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      const connected = !!gp;
      if (connected !== lastGpConnected) {
        lastGpConnected = connected;
        setGamepadConnected(connected);
        if (!connected) { controllerTypeRef.current = "controller"; setControllerType("controller"); }
      }
      if (!gp) return;

      // Detect controller type
      const cType = detectControllerType(gp);
      if (cType !== controllerTypeRef.current) { controllerTypeRef.current = cType; setControllerType(cType); }
      inputDeviceRef.current = cType;

      if (pausedRef.current || perkPendingRef.current || shopPendingRef.current) {
        // While paused still handle Start button to unpause
        const start = gp.buttons[9]?.pressed;
        if (start && !lastStart) setPaused(p => !p);
        lastStart = !!start;
        // Clear movement so player doesn't keep moving when unpaused
        keysRef.current["w"] = false;
        keysRef.current["a"] = false;
        keysRef.current["s"] = false;
        keysRef.current["d"] = false;
        gamepadShootRef.current = false;
        gamepadAngleRef.current = null;
        return;
      }

      const deadZone = settingsRef.current.controllerDeadZone ?? 0.2;

      // Left stick → movement (synthesise WASD)
      const lx = gp.axes[0] ?? 0;
      const ly = gp.axes[1] ?? 0;
      keysRef.current["w"] = ly < -deadZone;
      keysRef.current["s"] = ly >  deadZone;
      keysRef.current["a"] = lx < -deadZone;
      keysRef.current["d"] = lx >  deadZone;

      // Right stick → aim ONLY (no shooting from stick)
      const rx = gp.axes[2] ?? 0;
      const ry = gp.axes[3] ?? 0;
      const rMag = Math.hypot(rx, ry);
      if (rMag > deadZone) {
        gamepadAngleRef.current = Math.atan2(ry, rx);
      } else {
        gamepadAngleRef.current = null;
      }

      // RT (button 7) → shoot (analog-aware)
      const rtValue = gp.buttons[7]?.value ?? (gp.buttons[7]?.pressed ? 1 : 0);
      gamepadShootRef.current = rtValue > 0.3;

      // R3 (button 11, right stick click) → dash (edge-triggered)
      const r3 = gp.buttons[11]?.pressed;
      if (r3 && !lastR3) doDash();
      lastR3 = !!r3;

      // Button 1 (B/Circle) → grenade (edge-triggered)
      const btnB = gp.buttons[1]?.pressed;
      if (btnB && !lastBtnB) throwGrenade();
      lastBtnB = !!btnB;

      // Button 2 (X/Square) → reload (edge-triggered)
      const btnX = gp.buttons[2]?.pressed;
      if (btnX && !lastBtnX) doReload(currentWeaponRef.current);
      lastBtnX = !!btnX;

      // Button 4 (LB/L1) → prev weapon, Button 5 (RB/R1) → next weapon (edge-triggered)
      const lb = gp.buttons[4]?.pressed;
      const rb = gp.buttons[5]?.pressed;
      if (lb && !lastLB) switchWeapon(((currentWeaponRef.current - 1) + WEAPONS.length) % WEAPONS.length);
      if (rb && !lastRB) switchWeapon((currentWeaponRef.current + 1) % WEAPONS.length);
      lastLB = !!lb; lastRB = !!rb;

      // Button 9 (Start/Options) → toggle pause (edge-triggered)
      const start = gp.buttons[9]?.pressed;
      if (start && !lastStart) setPaused(p => !p);
      lastStart = !!start;
    };

    gamepadPollRef.current = setInterval(poll, 16);
    return () => {
      clearInterval(gamepadPollRef.current);
      // Clear any synthesised key state on unmount
      keysRef.current["w"] = false;
      keysRef.current["a"] = false;
      keysRef.current["s"] = false;
      keysRef.current["d"] = false;
      gamepadShootRef.current = false;
      gamepadAngleRef.current = null;
    };
  }, [doDash, throwGrenade, switchWeapon]);

  // ── Respawn (from death screen) ───────────────────────────────────────────
  const respawn = useCallback(() => {
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
    timerRef.current = setInterval(() => { if (!pausedRef.current && !perkPendingRef.current) setTimeSurvived(t => t + 1); }, 1000);
    setScreen("game");
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  const base = { width: "100%", height: "100dvh", margin: 0, overflow: "hidden", background: "#0a0a0a", fontFamily: "'Courier New', monospace", display: "flex", flexDirection: "column", position: "relative", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" };

  if (screen === "username") {
    return <UsernameScreen username={username} setUsername={setUsername} onContinue={() => { if (username.trim().length >= 2) { const n = username.trim(); lockCallsign(n); claimCallsign(n); setScreen("menu"); } }} />;
  }

  if (screen === "menu") {
    return (
      <MenuScreen
        username={username} difficulty={difficulty} setDifficulty={setDifficulty}
        isMobile={isMobile} leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={loadMoreLeaderboard}
        onStart={startGame} onRefreshLeaderboard={refreshLeaderboard}
        onChangeUsername={() => { clearLockedCallsign(); setUsername(""); setScreen("username"); }}
        starterLoadout={starterLoadout} setStarterLoadout={setStarterLoadout}
        gameSettings={gameSettings}
        onSaveSettings={s => { setGameSettings(s); settingsRef.current = s; }}
        gamepadConnected={gamepadConnected} controllerType={controllerType}
      />
    );
  }

  if (screen === "death") {
    return (
      <DeathScreen
        score={score} kills={kills} deaths={deaths} wave={wave} level={level}
        bestStreak={bestStreak} timeSurvived={timeSurvived} totalDamage={totalDamage}
        crits={statsRef.current.crits} grenades={statsRef.current.grenades}
        deathMessage={deathMessage} difficulty={difficulty} runSeed={runSeed}
        runModifier={RUN_MODIFIERS.find(m => m.id === runModifier) || null}
        achievementsUnlocked={achievementsUnlocked}
        activePerks={activePerks} missionsSummary={missionsSummary}
        leaderboard={leaderboard} lbLoading={lbLoading} lbHasMore={lbHasMore} onLoadMore={loadMoreLeaderboard} username={username}
        DIFFICULTIES={DIFFICULTIES}
        onStartGame={startGame} onMenu={() => { stopMusic(); stopAmbient(); setScreen("menu"); }}
        onRefreshLeaderboard={refreshLeaderboard} onSubmitScore={submitScore}
        highlightGifUrl={highlightGifUrl} gifEncoding={gifEncoding}
        fmtTime={fmtTime}
        gamepadConnected={gamepadConnected} controllerType={controllerType}
        onInstallApp={pwaPromptReady ? async () => { if (!pwaPromptRef.current) return; pwaPromptRef.current.prompt(); const r = await pwaPromptRef.current.userChoice; if (r.outcome === "accepted") { pwaPromptRef.current = null; setPwaPromptReady(false); } } : null}
      />
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────────────
  const xpNeeded = level * 500;
  return (
    <div ref={containerRef} style={base}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: isMobile ? "calc(100% - 56px)" : "100%", display: "block", cursor: isMobile ? "default" : (gameSettings.crosshair !== "cross" ? "none" : "crosshair"),
          filter: colorblindMode ? "saturate(0.65) contrast(1.35) brightness(1.08) hue-rotate(-15deg)" : "none" }}
      />

      {/* Pause menu */}
      {paused && (
        <PauseMenu
          wave={wave} timeSurvived={timeSurvived} score={score} isMobile={isMobile}
          achievementsUnlocked={achievementsUnlocked} fmtTime={fmtTime}
          musicMuted={musicMuted} onToggleMute={toggleMusicMuted}
          musicVibe={musicVibe} onSetMusicVibe={(v) => { setMusicVibe(v); setMusicVibeState(v); localStorage.setItem("cod-music-vibe", v); }}
          colorblindMode={colorblindMode} onToggleColorblind={toggleColorblind}
          gameSettings={gameSettings} onSaveSettings={s => { setGameSettings(s); settingsRef.current = s; }}
          onResume={() => setPaused(false)}
          onLeave={() => { stopMusic(); stopAmbient(); setPaused(false); setScreen("menu"); }}
          gamepadConnected={gamepadConnected} controllerType={controllerType}
        />
      )}

      {/* Wave clear shop */}
      {shopPending && (
        <WaveShopModal options={shopOptions} wave={wave} onSelect={applyShopOption} />
      )}

      {/* Perk selection modal */}
      {perkPending && (
        <PerkModal options={perkOptions} level={level} onSelect={applyPerk} />
      )}

      {/* Achievements panel (in-game) */}
      {showAchievements && <AchievementsPanel achievementsUnlocked={achievementsUnlocked} onClose={() => setShowAchievements(false)} />}

      {/* Achievement popup */}
      {achievementPopup && !paused && !perkPending && (
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)", border: "1px solid #FFD700", borderRadius: 10, padding: "10px 20px", color: "#FFD700", fontSize: 13, fontWeight: 700, zIndex: 50, textAlign: "center", pointerEvents: "none", animation: "slideDown 0.3s ease-out", boxShadow: "0 0 20px rgba(255,215,0,0.3)" }}>
          <div style={{ fontSize: 22 }}>{achievementPopup.emoji}</div>
          <div>{achievementPopup.name}</div>
          <div style={{ fontSize: 10, color: "#CCC", fontWeight: 400 }}>{achievementPopup.desc}</div>
        </div>
      )}

      {/* Meta upgrades toast */}
      {metaToast && !paused && !perkPending && (
        <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", background: "rgba(255,107,53,0.88)", border: "1px solid rgba(255,107,53,0.95)", borderRadius: 10, padding: "7px 16px", color: "#FFF", fontSize: 12, fontWeight: 700, zIndex: 50, textAlign: "center", pointerEvents: "none", maxWidth: 340, animation: "slideDown 0.3s ease-out", boxShadow: "0 0 15px rgba(255,107,53,0.4)" }}>
          <div style={{ fontSize: 10, color: "#FFD700", marginBottom: 2, letterSpacing: 1 }}>META UPGRADES ACTIVE</div>
          {metaToast}
        </div>
      )}

      {/* Boss wave banner */}
      {bossWaveActive && !paused && !perkPending && (
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

      {/* Tutorial overlay — first-run hints */}
      {!paused && !perkPending && !shopPending && (
        <TutorialOverlay isMobile={isMobile} controllerConnected={gamepadConnected} wave={wave} />
      )}

      {/* HUD overlay */}
      <HUD
        wave={wave} timeSurvived={timeSurvived} score={score} kills={kills} deaths={deaths}
        health={health} ammo={ammo} isReloading={isReloading} currentWeapon={currentWeapon}
        combo={combo} comboTimer={comboTimer} killstreak={killstreak}
        level={level} xp={xp} xpNeeded={xpNeeded} killFeed={killFeed} username={username}
        grenadeReady={grenadeReady} dashReady={dashReady} extraLives={extraLives}
        guardianAngelFlash={guardianAngelFlash} difficulty={difficulty} isMobile={isMobile}
        weaponUpgrades={weaponUpgrades} activePerks={activePerks}
        runModifier={RUN_MODIFIERS.find(m => m.id === runModifier) || null}
        onSwitchWeapon={switchWeapon} onReload={() => doReload(currentWeaponRef.current)}
        onDash={doDash} onGrenade={throwGrenade} onPause={() => setPaused(true)}
        fmtTime={fmtTime}
        overclockedActive={activePerks.some(p => p.id === "overclocked")}
        overclockedShots={overclockedShots}
        waveStreak={waveStreak}
        mapTheme={mapTheme}
      />

      {/* Mobile action bar */}
      {isMobile && (
        <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", background: "rgba(10,10,10,0.95)", borderTop: "1px solid rgba(255,255,255,0.12)", flexShrink: 0, gap: 2 }}>
          {/* Weapon prev/current/next cycle — scales to any number of weapons */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
            <button
              onTouchStart={(e) => { e.preventDefault(); switchWeapon(((currentWeapon - 1) + WEAPONS.length) % WEAPONS.length); }}
              onClick={() => switchWeapon(((currentWeapon - 1) + WEAPONS.length) % WEAPONS.length)}
              style={{ width: 30, height: 44, borderRadius: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFF", fontSize: 16, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
            <div style={{ flex: 1, height: 44, borderRadius: 8, background: "rgba(255,255,255,0.12)", border: "2px solid " + WEAPONS[currentWeapon].color, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 0, position: "relative" }}>
              <span style={{ fontSize: 20 }}>{WEAPONS[currentWeapon].emoji}</span>
              <span style={{ fontSize: 10, color: WEAPONS[currentWeapon].color, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>{WEAPONS[currentWeapon].name}</span>
              {weaponUpgrades[currentWeapon] > 0 && <span style={{ position: "absolute", top: 2, right: 4, fontSize: 8, color: "#AA44FF" }}>{"⭐".repeat(weaponUpgrades[currentWeapon])}</span>}
              <span style={{ position: "absolute", bottom: 2, left: 5, fontSize: 8, color: "#aaa" }}>{currentWeapon + 1}/{WEAPONS.length}</span>
            </div>
            <button
              onTouchStart={(e) => { e.preventDefault(); switchWeapon((currentWeapon + 1) % WEAPONS.length); }}
              onClick={() => switchWeapon((currentWeapon + 1) % WEAPONS.length)}
              style={{ width: 30, height: 44, borderRadius: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFF", fontSize: 16, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
          </div>
          <button
            onTouchStart={(e) => { e.preventDefault(); doReload(currentWeaponRef.current); }}
            onClick={() => doReload(currentWeaponRef.current)}
            style={{ width: "clamp(32px,8vw,44px)", height: 44, borderRadius: 8, fontSize: 12, fontWeight: 900, fontFamily: "'Courier New',monospace", background: isReloading ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.08)", color: isReloading ? "#FFD700" : "#FFF", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 }}
          >{isReloading ? ".." : "R"}</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); doDash(); }}
            onClick={doDash}
            style={{ width: "clamp(36px,9vw,46px)", height: 44, borderRadius: 8, background: dashReady ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)", border: dashReady ? "2px solid rgba(0,229,255,0.6)" : "1px solid rgba(255,255,255,0.08)", color: dashReady ? "#00E5FF" : "#777", fontSize: "clamp(14px,4vw,18px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>💨</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); throwGrenade(); }}
            onClick={throwGrenade}
            style={{ width: "clamp(36px,9vw,46px)", height: 44, borderRadius: 8, background: grenadeReady ? "rgba(255,69,0,0.15)" : "rgba(255,255,255,0.04)", border: grenadeReady ? "2px solid rgba(255,69,0,0.6)" : "1px solid rgba(255,255,255,0.08)", color: grenadeReady ? "#FF4500" : "#777", fontSize: "clamp(14px,4vw,18px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>💣</button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              const next = !autoAimRef.current;
              autoAimRef.current = next; setAutoAim(next);
              localStorage.setItem("cod-autoaim", next ? "1" : "0");
            }}
            onClick={() => {
              const next = !autoAimRef.current;
              autoAimRef.current = next; setAutoAim(next);
              localStorage.setItem("cod-autoaim", next ? "1" : "0");
            }}
            style={{ width: "clamp(32px,8vw,42px)", height: 44, borderRadius: 8, background: autoAim ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.06)", border: autoAim ? "2px solid rgba(255,215,0,0.7)" : "1px solid rgba(255,255,255,0.15)", color: autoAim ? "#FFD700" : "#888", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🎯</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); setPaused(true); }}
            onClick={() => setPaused(true)}
            style={{ width: "clamp(32px,8vw,42px)", height: 44, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFF", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: "monospace", letterSpacing: 1, flexShrink: 0 }}>II</button>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:.3 } }
        @keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        @keyframes bossIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.5) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
        * { box-sizing:border-box; margin:0 }
        body { margin:0; overflow:hidden }
        input::placeholder { color:#999 }
      `}</style>
    </div>
  );
}
