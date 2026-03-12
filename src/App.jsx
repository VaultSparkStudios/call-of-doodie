import { useState, useEffect, useRef, useCallback } from "react";
import {
  WEAPONS, ENEMY_TYPES, KILLSTREAKS, HITMARKERS, DEATH_MESSAGES, RANK_NAMES, TIPS,
  ACHIEVEMENTS, DIFFICULTIES, KILL_MILESTONES, META_UPGRADES, STARTER_LOADOUTS,
  GRENADE_COOLDOWN, DASH_COOLDOWN, DASH_SPEED, DASH_DURATION,
  CRIT_CHANCE, CRIT_MULT, COMBO_TIMER_BASE,
} from "./constants.js";
import { loadLeaderboard, saveToLeaderboard, updateCareerStats, loadCareerStats, getDailyMissions, loadMissionProgress, saveMissionProgress, loadMetaProgress } from "./storage.js";
import {
  soundShoot, soundHit, soundDeath, soundLevelUp, soundPickup,
  soundGrenade, soundBossWave, soundAchievement, soundReload,
  soundDash, soundBossKill, soundWaveClear, soundPerkSelect,
} from "./sounds.js";
import UsernameScreen from "./components/UsernameScreen.jsx";
import MenuScreen from "./components/MenuScreen.jsx";
import DeathScreen from "./components/DeathScreen.jsx";
import PauseMenu from "./components/PauseMenu.jsx";
import HUD from "./components/HUD.jsx";
import AchievementsPanel from "./components/AchievementsPanel.jsx";
import PerkModal, { getRandomPerks } from "./components/PerkModal.jsx";

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
  const statsRef         = useRef({ bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0, guardianAngels: 0, perksSelected: 0, weaponUpgradesCollected: 0, maxWeaponLevel: 0, bossWavesCleared: 0 });
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

  // ── State ─────────────────────────────────────────────────────────────────
  const [screen, setScreen]           = useState("username");
  const [username, setUsername]       = useState("");
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
  const [metaToast, setMetaToast]         = useState(null);

  // ── Sync refs to state ────────────────────────────────────────────────────
  useEffect(() => { currentWeaponRef.current = currentWeapon; }, [currentWeapon]);
  useEffect(() => { isReloadingRef.current = isReloading; }, [isReloading]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { extraLivesRef.current = extraLives; }, [extraLives]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900 || "ontouchstart" in window);
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

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const refreshLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const board = await loadLeaderboard();
    setLeaderboard(board); setLbLoading(false);
  }, []);

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
  const initGame = useCallback(() => {
    const w = sizeRef.current.w, h = sizeRef.current.h;
    const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    const seed = Math.floor(Math.random() * 999999);
    const career = loadCareerStats();
    gsRef.current = {
      player: { x: w / 2, y: h / 2, angle: 0, health: diff.playerHP, maxHealth: diff.playerHP, speed: 4, invincible: 0 },
      enemies: [], bullets: [], particles: [], pickups: [], grenades: [], enemyBullets: [],
      dyingEnemies: [], obstacles: [], terrain: [], floorZones: [], props: [], mapTheme: 0,
      spawnTimer: 0, enemiesThisWave: 0, maxEnemiesThisWave: 5,
      currentWave: 1, score: 0, kills: 0, killstreakCount: 0,
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
    xpRef.current = { xp: 0, level: 1 };
    grenadeRef.current = { ready: true, lastUse: 0 };
    dashRef.current = { ready: true, lastUse: 0, active: 0, dx: 0, dy: 0 };
    statsRef.current = { bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0, guardianAngels: 0, perksSelected: 0, weaponUpgradesCollected: 0, maxWeaponLevel: 0, bossWavesCleared: 0 };
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
    // Generate seeded random obstacles + terrain (reproducible per run seed)
    let _ws = seed;
    const _sr = () => { _ws = Math.abs((Math.imul(_ws, 1664525) + 1013904223) | 0); return (_ws >>> 0) / 0xFFFFFFFF; };
    const SPAWN_SAFE = 115;
    const wallCount = 4 + Math.floor(_sr() * 3); // 4–6 walls
    const walls = [];
    // Divide arena into 3×2 grid; shuffle zones so walls are spread across the full map
    const COLS = 3, ROWS = 2;
    const gwZ = w * 0.84 / COLS, ghZ = h * 0.84 / ROWS;
    const zOrder = [0, 1, 2, 3, 4, 5];
    for (let _i = 5; _i > 0; _i--) {
      const _j = Math.floor(_sr() * (_i + 1));
      const _t = zOrder[_i]; zOrder[_i] = zOrder[_j]; zOrder[_j] = _t;
    }
    let _hWalls = 0, _vWalls = 0;
    for (let _wi = 0; _wi < wallCount; _wi++) {
      const zi = zOrder[_wi];
      const col = zi % COLS, row = Math.floor(zi / COLS);
      const zx0 = w * 0.08 + col * gwZ;
      const zy0 = h * 0.08 + row * ghZ;
      let wx, wy, ww, wh, _att = 0;
      do {
        const isH = _hWalls <= _vWalls ? (_sr() < 0.65) : (_sr() < 0.35);
        ww = isH ? Math.floor(70 + _sr() * 80) : Math.floor(14 + _sr() * 10);
        wh = isH ? Math.floor(14 + _sr() * 10) : Math.floor(70 + _sr() * 80);
        wx = zx0 + _sr() * Math.max(1, gwZ - ww);
        wy = zy0 + _sr() * Math.max(1, ghZ - wh);
        wx = Math.max(w * 0.04, Math.min(w * 0.96 - ww, wx));
        wy = Math.max(h * 0.06, Math.min(h * 0.94 - wh, wy));
        const tooClose = Math.hypot(wx + ww / 2 - w / 2, wy + wh / 2 - h / 2) < SPAWN_SAFE;
        if (!tooClose) { if (isH) _hWalls++; else _vWalls++; break; }
      } while (++_att < 20);
      walls.push({ x: wx, y: wy, w: ww, h: wh });
    }
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
    const mapTheme = Math.floor(_sr() * 4); // 0=office 1=bunker 2=factory 3=ruins
    gsRef.current.mapTheme = mapTheme;
    const THEME_PROPS = [
      ["🪑","💻","☕","🌿","📋","📁","🗑️","🖥️"], // office
      ["📦","🪖","🔦","⛽","🪝","🗝️","🧱","🪜"], // bunker
      ["⚙️","🔧","🔩","⛽","📦","🪛","🏭","🔌"], // factory
      ["🪨","💀","🏚️","🪵","⚰️","🕸️","🌑","🦴"], // ruins
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
    for (let _pi = 0; _pi < 8 + Math.floor(_sr() * 5); _pi++) {
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

  // ── Boss spawning ─────────────────────────────────────────────────────────
  const spawnBoss = useCallback((gs, typeIndex) => {
    const W = GW(), H = GH();
    const type = ENEMY_TYPES[typeIndex];
    const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    const pm = gs.prestigeMult || 1;
    const wv = gs.currentWave;
    const bossHealth = type.health * (1 + wv * 0.12) * diff.healthMult * pm * 2.5;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = W / 2; y = -50; }
    else if (side === 1) { x = W + 50; y = H / 2; }
    else if (side === 2) { x = W / 2; y = H + 50; }
    else { x = -50; y = H / 2; }
    gs.enemies.push({
      x, y, health: bossHealth, maxHealth: bossHealth,
      speed: type.speed * (1 + wv * 0.05) * diff.speedMult * pm * 0.8,
      size: type.size * 1.5, color: type.color,
      name: "☠ " + type.name, points: type.points * 3,
      deathQuotes: type.deathQuotes, emoji: type.emoji,
      typeIndex, wobble: 0, hitFlash: 0,
      ranged: type.ranged || false,
      projSpeed: (type.projSpeed || 0) * 1.3,
      projRate: type.projRate ? Math.floor(type.projRate * 0.65) : 999,
      shootTimer: 0, isBossEnemy: true,
      // Boss-specific mechanic fields
      chargeTimer: 0, chargeActive: false, chargeDx: 0, chargeDy: 0, chargeDuration: 0,
      summonTimer: 0,
      // Wave-scaling boss abilities (unlocked based on wave number)
      hasShieldPulse: typeIndex === 4 && gs.currentWave >= 20,
      shieldPulseActive: false, shieldPulseCooldown: 300, shieldPulseTimer: 0,
      hasEnrage: gs.currentWave >= 30,
      enrageTriggered: false,
      hasTeleport: typeIndex === 4 && gs.currentWave >= 35,
      teleportTimer: 0,
      hasMinionSurge: typeIndex === 9 && gs.currentWave >= 25,
      hasRentNuke: typeIndex === 9 && gs.currentWave >= 40,
      rentNukeTimer: 0,
    });
  }, []);

  // ── Enemy spawning ────────────────────────────────────────────────────────
  const spawnEnemy = useCallback((gs) => {
    const w = GW(), h = GH(), wv = gs.currentWave;
    let ti = 0;
    const r = Math.random();
    if      (wv >= 15 && r < 0.05) ti = 13;     // Sergeant Karen
    else if (wv >= 13 && r < 0.10) ti = 12;     // YOLO Bomber
    else if (wv >= 10 && r < 0.15) ti = 11;     // Shield Guy
    else if (wv >= 12 && r < 0.21) ti = 9;      // Landlord
    else if (wv >= 10 && r < 0.27) ti = 4;      // Mega Karen
    else if (wv >= 9  && r < 0.33) ti = 10;     // Crypto Bro
    else if (wv >= 8  && r < 0.38) ti = 3;      // HOA President
    else if (wv >= 7  && r < 0.43) ti = 8;      // Conspiracy Bro
    else if (wv >= 6  && r < 0.49) ti = 7;      // Influencer
    else if (wv >= 5  && r < 0.55) ti = 6;      // Gym Bro
    else if (wv >= 4  && r < 0.61) ti = 2;      // Florida Man
    else if (wv >= 3  && r < 0.67) ti = 5;      // IT Guy
    else if (wv >= 2  && r < 0.74) ti = 1;      // Karen
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * w; y = -30; }
    else if (side === 1) { x = w + 30; y = Math.random() * h; }
    else if (side === 2) { x = Math.random() * w; y = h + 30; }
    else { x = -30; y = Math.random() * h; }
    const type = ENEMY_TYPES[ti];
    const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    const pm = gs.prestigeMult || 1;
    const eHealth = type.health * (1 + wv * 0.12) * diff.healthMult * pm;
    gs.enemies.push({
      x, y, health: eHealth, maxHealth: eHealth,
      speed: type.speed * (1 + wv * 0.05) * diff.speedMult * pm,
      size: type.size, color: type.color, name: type.name, points: type.points,
      deathQuotes: type.deathQuotes, emoji: type.emoji, typeIndex: ti,
      wobble: Math.random() * Math.PI * 2, hitFlash: 0,
      ranged: type.ranged || false, projSpeed: type.projSpeed || 0, projRate: type.projRate || 999,
      shootTimer: Math.floor(Math.random() * 60), isBossEnemy: false,
    });
  }, []);

  // ── Pickup spawning helper ────────────────────────────────────────────────
  const spawnPickup = (gs, ex, ey, isBoss) => {
    const types    = ["health", "ammo", "speed", "nuke", "upgrade"];
    const weights  = isBoss ? [0.25, 0.15, 0.10, 0.10, 0.40] : [0.48, 0.10, 0.22, 0.05, 0.15];
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
    }, WEAPONS[wpnIdx].reloadTime);
  }, []);

  // ── Shoot ─────────────────────────────────────────────────────────────────
  const shoot = useCallback((gs, weaponIdx, angle) => {
    if (pausedRef.current || perkPendingRef.current) return;
    const weapon = WEAPONS[weaponIdx];
    const now = Date.now();
    const upgLevel = gs.weaponUpgrades?.[weaponIdx] || 0;
    const fireRateMult = 1 - upgLevel * 0.10;
    if (now - lastShotRef.current < weapon.fireRate * fireRateMult || gs.ammoCount <= 0 || isReloadingRef.current) return;
    lastShotRef.current = now; gs.ammoCount--; gs.weaponAmmos[weaponIdx] = gs.ammoCount; setAmmo(gs.ammoCount);
    soundShoot(weaponIdx);
    const p = gs.player;
    const spread = (Math.random() - 0.5) * weapon.spread;
    const a = angle + spread;
    const damageMult = (perkModsRef.current.damageMult || 1) * (1 + upgLevel * 0.25);
    const pierce = perkModsRef.current.pierce || 0;
    gs.bullets.push({
      x: p.x + Math.cos(angle) * 25, y: p.y + Math.sin(angle) * 25,
      vx: Math.cos(a) * (weapon.bulletSpeed || 12), vy: Math.sin(a) * (weapon.bulletSpeed || 12),
      damage: weapon.damage * damageMult, color: weapon.color,
      life: weapon.bulletLife || 60,
      size: weapon.bulletSize || (weaponIdx === 1 ? 8 : weaponIdx === 2 ? 2 : 4),
      trail: weapon.bulletTrail || weaponIdx === 1, pierceLeft: pierce,
      bouncesLeft: weaponIdx === 1 ? 0 : 10, // RPG doesn't bounce; all others ricochet until bullet life expires
    });
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
    soundDeath();
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
    setScreen("death"); gs.killstreakCount = 0; setKillstreak(0);
    return true;
  }, []);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    initGame();
    setScreen("game"); setScore(0); setKills(0); setDeaths(0); setWave(1);
    setCurrentWeapon(0); setAmmo(WEAPONS[0].ammo); setHealth(diff.playerHP);
    setKillstreak(0); setIsReloading(false); setCombo(0); setComboTimer(0);
    setXp(0); setLevel(1); setKillFeed([]); setGrenadeReady(true); setDashReady(true);
    setBestStreak(0); setTotalDamage(0);
    setAchievementsUnlocked([]); setAchievementPopup(null); setTimeSurvived(0);
    setPaused(false); setExtraLives(0); extraLivesRef.current = 0;
    setGuardianAngelFlash(false); setWeaponUpgrades(WEAPONS.map(() => 0));
    starterLoadoutRef.current = starterLoadout;
    setActivePerks([]); setPerkPending(false); setPerkOptions([]); setBossWaveActive(false);
    currentWeaponRef.current = 0; isReloadingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { if (!pausedRef.current && !perkPendingRef.current) setTimeSurvived(t => t + 1); }, 1000);
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
    const entry = {
      name: username, score, kills, wave, lastWords,
      rank, bestStreak, totalDamage, level,
      time: fmtTime(timeSurvived), achievements: achievementsUnlocked.length, difficulty,
      starterLoadout,
    };
    const board = await saveToLeaderboard(entry);
    setLeaderboard(board);
  }, [username, score, kills, wave, bestStreak, totalDamage, level, timeSurvived, achievementsUnlocked, difficulty, starterLoadout]);

  // ── GAME LOOP ─────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) ctxRef.current = canvas.getContext("2d");
    const ctx = ctxRef.current;
    const W = GW(), H = GH(), p = gs.player, wpnIdx = currentWeaponRef.current;

    if (pausedRef.current || perkPendingRef.current) {
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
    if (dashRef.current.active <= 0) { p.x += dx * p.speed; p.y += dy * p.speed; }
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
    const mouse = mouseRef.current;
    if (!js.active && !ss.active && (mouse.down || mouse.moved)) {
      const rect = canvas.getBoundingClientRect();
      p.angle = Math.atan2((mouse.y - rect.top) * (H / rect.height) - p.y, (mouse.x - rect.left) * (W / rect.width) - p.x);
    }
    if (autoAimRef.current && js.active && !ss.active && gs.enemies.length > 0) {
      let nearest = null, nd = Infinity;
      gs.enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; nearest = e; } });
      if (nearest) p.angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
    }
    const shouldShoot = mouse.down || ss.shooting || (autoAimRef.current && js.active && !ss.active && gs.enemies.length > 0);
    if (shouldShoot && !isReloadingRef.current && gs.ammoCount > 0) shoot(gs, wpnIdx, p.angle);
    if (p.invincible > 0) p.invincible--;

    // ── Combo decay ──
    if (comboRef.current.timer > 0) {
      comboRef.current.timer--;
      if (comboRef.current.timer <= 0) { comboRef.current.count = 0; setCombo(0); setComboTimer(0); }
      else if (frameCountRef.current % 6 === 0) setComboTimer(comboRef.current.timer);
    }

    // ── Wave / boss wave logic ──
    const diffS = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    if (!gs.bossWave) {
      gs.spawnTimer++;
      const spawnRate = Math.max(18, Math.floor((100 - gs.currentWave * 7) * diffS.spawnMult));
      if (gs.spawnTimer >= spawnRate && gs.enemiesThisWave < gs.maxEnemiesThisWave) {
        gs.spawnTimer = 0; gs.enemiesThisWave++; spawnEnemy(gs);
      }
    }
    // Wave cleared
    if (gs.enemies.length === 0 && gs.enemiesThisWave >= gs.maxEnemiesThisWave) {
      if (gs.bossWave) {
        statsRef.current.bossWavesCleared++;
        soundWaveClear();
        checkAchievements(gs);
      }
      gs.bossWave = false;
      setBossWaveActive(false);
      gs.currentWave++; gs.enemiesThisWave = 0;
      const nextIsBoss = gs.currentWave % 5 === 0;
      if (nextIsBoss) {
        gs.maxEnemiesThisWave = gs.currentWave >= 15 ? 2 : 1;
      } else {
        gs.maxEnemiesThisWave = Math.min(5 + gs.currentWave * 3, 40);
      }
      setWave(gs.currentWave);
      if (!gs.newBestWave && gs.currentWave > (gs.careerBest?.wave || 0)) {
        gs.newBestWave = true;
        addText(gs, W / 2, H / 2 - 150, "🌊 NEW BEST WAVE!", "#00FFAA", true);
      }
      const waveBonus = gs.currentWave * 100;
      gs.score += waveBonus; setScore(gs.score);
      setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);

      if (nextIsBoss) {
        gs.bossWave = true;
        setBossWaveActive(true);
        soundBossWave();
        gs.screenShake = 20;
        addText(gs, W / 2, H / 2 - 30, "⚠ BOSS WAVE ⚠", "#FF0000", true);
        addText(gs, W / 2, H / 2 + 10, "WAVE " + gs.currentWave, "#FFD700", true);
        // Escalating ability warnings
        const _wv = gs.currentWave;
        if (_wv >= 40)      addText(gs, W / 2, H / 2 + 45, "💸 RENT NUKE · 🌀 TELEPORT · 🛡 SHIELD · ⚡ ENRAGE", "#FF6600");
        else if (_wv >= 35) addText(gs, W / 2, H / 2 + 45, "🌀 TELEPORT · 🛡 SHIELD PULSE · ⚡ ENRAGE", "#FF6600");
        else if (_wv >= 30) addText(gs, W / 2, H / 2 + 45, "⚡ ENRAGE at 33% HP · 🛡 SHIELD PULSE", "#FF6600");
        else if (_wv >= 25) addText(gs, W / 2, H / 2 + 45, "👥 MINION SURGE · 🛡 SHIELD PULSE", "#FF6600");
        else if (_wv >= 20) addText(gs, W / 2, H / 2 + 45, "🛡 NEW ABILITY: SHIELD PULSE!", "#FF6600");
        // Spawn boss(es) — Mega Karen up to wave 9, Landlord 10-14, both 15+
        if (gs.currentWave >= 15) { spawnBoss(gs, 4); spawnBoss(gs, 9); }
        else if (gs.currentWave >= 10) { spawnBoss(gs, 9); }
        else { spawnBoss(gs, 4); }
        // Mark all boss enemies as "spawned" so the wave-clear condition can trigger
        gs.enemiesThisWave = gs.maxEnemiesThisWave;
        addParticles(gs, W / 2, H / 2, "#FF0000", 40);
      } else {
        addText(gs, W / 2, H / 2, "WAVE " + gs.currentWave + "!", "#FFD700", true);
        addText(gs, W / 2, H / 2 + 30, "+" + waveBonus + " WAVE BONUS", "#00FF88");
        soundWaveClear();
      }
    }

    // ── Bullet movement ──
    gs.bullets = gs.bullets.filter(b => {
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
          const dmg = eb.damage || 8;
          p.health -= dmg; p.invincible = 20; gs.screenShake = 5; gs.damageFlash = 8;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y - 30, "-" + Math.floor(dmg), "#FF4444");
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
          if (d < 130) {
            const dmg = 70 * (1 - d / 130) * (perkModsRef.current.grenadeDamageMult || 1);
            e.health -= dmg; e.hitFlash = 10; gs.totalDamage += dmg;
            e.lastDmgSource = "grenade";
          }
        });
        return false;
      }
      return true;
    });

    // ── Bullet-enemy collision ──
    gs.bullets.forEach(b => {
      if (b.life <= 0) return;
      gs.enemies.forEach(e => {
        if (e.health <= -999) return;
        const d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < e.size / 2 + b.size) {
          // Shield pulse blocks all damage
          if (e.shieldPulseActive) {
            addParticles(gs, b.x, b.y, "#00BFFF", 4);
            b.life = 0; return;
          }
          const comboMult = 1 + comboRef.current.count * 0.1;
          const effectiveCrit = CRIT_CHANCE + (perkModsRef.current.critBonus || 0);
          const isCrit = Math.random() < effectiveCrit;
          const lastResortMult = (perkModsRef.current.lastResort && p.health < p.maxHealth * 0.25) ? 3.0 : 1.0;
          // Shield Guy (ti=11): 20% damage from front, 160% from behind
          const moveAngle = Math.atan2(p.y - e.y, p.x - e.x);
          const bulletAngle = Math.atan2(b.vy, b.vx);
          const angleDiff = Math.abs(Math.atan2(Math.sin(bulletAngle - moveAngle), Math.cos(bulletAngle - moveAngle)));
          const shieldMult = (e.typeIndex === 11) ? (angleDiff < Math.PI / 2 ? 0.20 : 1.60) : 1.0;
          const dmg = b.damage * comboMult * (isCrit ? CRIT_MULT : 1) * lastResortMult * shieldMult;
          e.health -= dmg; e.hitFlash = isCrit ? 15 : 8; gs.totalDamage += dmg;
          // Lifesteal
          if (perkModsRef.current.lifesteal) {
            p.health = Math.min(p.maxHealth, p.health + dmg * perkModsRef.current.lifesteal);
            setHealth(Math.floor(p.health));
          }
          if (isCrit) statsRef.current.crits++;
          const _hn = performance.now();
          if (_hn - lastHitSoundRef.current > 50) { soundHit(isCrit); lastHitSoundRef.current = _hn; }
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
            const pts = Math.floor(e.points * comboMult);
            gs.score += pts; gs.kills++; gs.killstreakCount++;
            if (gs.killstreakCount > statsRef.current.bestStreak) statsRef.current.bestStreak = gs.killstreakCount;
            if (e.typeIndex === 4 || e.typeIndex === 9) statsRef.current.bossKills++;
            if (e.typeIndex === 9) statsRef.current.landlordKills++;
            if (e.typeIndex === 10) statsRef.current.cryptoKills++;
            if (e.isBossEnemy) soundBossKill();
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
            gs.dyingEnemies = gs.dyingEnemies || [];
            if (gs.dyingEnemies.length < MAX_DYING_ANIM)
              gs.dyingEnemies.push({ x: e.x, y: e.y, emoji: e.emoji, color: e.color, size: e.size, life: 22, maxLife: 22 });
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
            // Pickup drops
            const isBossEnemy = e.isBossEnemy;
            if (isBossEnemy && extraLivesRef.current === 0 && Math.random() < 0.18) {
              gs.pickups.push({ x: e.x, y: e.y, type: "guardian_angel", life: 600 });
            } else if (isBossEnemy || Math.random() < 0.25) {
              spawnPickup(gs, e.x, e.y, isBossEnemy);
            }
            e.health = -999;
          }
        }
      });
    });
    gs.enemies = gs.enemies.filter(e => e.health > -999);
    if (achCheckRef.current) { checkAchievements(gs); checkDailyMissions(gs); achCheckRef.current = false; }

    // ── Sergeant Karen aura ──
    const sergeantPositions = gs.enemies.filter(e => e.typeIndex === 13).map(e => ({ x: e.x, y: e.y }));
    gs.enemies.forEach(e => { e.buffed = sergeantPositions.length > 0 && sergeantPositions.some(s => Math.hypot(e.x - s.x, e.y - s.y) < 150) && e.typeIndex !== 13; });

    // ── Enemy movement & melee ──
    gs.enemies.forEach(e => {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      e.wobble += 0.1;
      const zigzag = e.typeIndex === 10 ? Math.sin(e.wobble * 3) * 3 : 0;
      const buffedSpeed = e.speed * (e.buffed ? 1.35 : 1);
      // Wall-avoidance steering: repulse away from nearby walls, blend with toward-player
      let sx = Math.cos(a), sy = Math.sin(a);
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
      e.x += sx * buffedSpeed + Math.sin(e.wobble) * 0.5 + (-sy) * zigzag;
      e.y += sy * buffedSpeed + Math.cos(e.wobble) * 0.5 + sx * zigzag;
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
                setHealth(Math.max(0, p.health));
                addText(gs, p.x, p.y - 30, "-25 RENT DUE!", "#FFD700");
                if (p.health <= 0) handlePlayerDeath(gs);
              }
            }
          }
        }
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
          if (e.teleportTimer >= 480) { // every 8 seconds
            e.teleportTimer = 0;
            const tAngle = Math.random() * Math.PI * 2;
            const tDist  = 110 + Math.random() * 70;
            e.x = Math.max(e.size, Math.min(W - e.size, p.x + Math.cos(tAngle) * tDist));
            e.y = Math.max(e.size, Math.min(H - e.size, p.y + Math.sin(tAngle) * tDist));
            addText(gs, e.x, e.y - 65, "🌀 BLINKED!", "#FF1493", true);
            addParticles(gs, e.x, e.y, "#FF1493", 15);
            gs.screenShake = 8;
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
            p.health -= 35; p.invincible = 40; gs.damageFlash = 12;
            setHealth(Math.max(0, p.health));
            addText(gs, p.x, p.y - 30, "-35 HP", "#FF0000");
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
          const ea = ed > 0 ? Math.atan2(e.y - ecy, e.x - ecx) : 0;
          e.x = ecx + Math.cos(ea) * (er + 1);
          e.y = ecy + Math.sin(ea) * (er + 1);
          e.x = Math.max(e.size / 2, Math.min(W - e.size / 2, e.x));
          e.y = Math.max(e.size / 2, Math.min(H - e.size / 2, e.y));
        }
      });
      if (dashRef.current.active <= 0) {
        const d2 = Math.hypot(p.x - e.x, p.y - e.y);
        if (d2 < e.size / 2 + 15 && p.invincible <= 0) {
          const dmg = 10 + e.typeIndex * 5;
          p.health -= dmg; p.invincible = 30; gs.screenShake = 8; gs.damageFlash = 10;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y - 30, "-" + dmg + " HP", "#FF0000");
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
          gs.ammoCount = maxAmmo; gs.weaponAmmos[wpnIdx] = maxAmmo; setAmmo(gs.ammoCount);
          addText(gs, pk.x, pk.y, "MAX AMMO", "#00BFFF");
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
    frameCountRef.current++;

    // ────────────────── RENDER ────────────────────────────────────────────
    ctx.save();
    if (gs.screenShake > 0.5) ctx.translate((Math.random() - 0.5) * gs.screenShake * 2, (Math.random() - 0.5) * gs.screenShake * 2);

    // Background
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
    bgGrad.addColorStop(0, gs.bossWave ? "#1a0000" : "#1e1e3a");
    bgGrad.addColorStop(1, gs.bossWave ? "#0e0000" : "#0e0e1a");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

    // ── Floor zone panels (room sections with tile grid, themed per run) ──
    const FZ_FILL = ["rgba(62,55,92,", "rgba(35,62,35,", "rgba(60,54,36,", "rgba(72,46,22,"];
    const FZ_TILE = ["rgba(88,76,125,", "rgba(50,85,50,", "rgba(82,74,48,", "rgba(98,62,28,"];
    const fzFill = gs.bossWave ? "rgba(82,22,22," : FZ_FILL[gs.mapTheme || 0];
    const fzTile = gs.bossWave ? "rgba(112,30,30," : FZ_TILE[gs.mapTheme || 0];
    (gs.floorZones || []).forEach(fz => {
      ctx.save(); ctx.translate(fz.x, fz.y); ctx.rotate(fz.rot);
      const ba = fz.alpha * 2.8 * (gs.bossWave ? 0.75 : 1);
      // Panel fill
      ctx.globalAlpha = ba;
      ctx.fillStyle = fzFill + "1)";
      ctx.beginPath(); ctx.roundRect(-fz.rx, -fz.ry, fz.rx * 2, fz.ry * 2, 5); ctx.fill();
      // Internal tile grid
      ctx.globalAlpha = ba * 0.5;
      ctx.strokeStyle = fzTile + "1)"; ctx.lineWidth = 0.7;
      const TS = 26;
      for (let tx = -fz.rx + TS; tx < fz.rx; tx += TS) { ctx.beginPath(); ctx.moveTo(tx, -fz.ry); ctx.lineTo(tx, fz.ry); ctx.stroke(); }
      for (let ty = -fz.ry + TS; ty < fz.ry; ty += TS) { ctx.beginPath(); ctx.moveTo(-fz.rx, ty); ctx.lineTo(fz.rx, ty); ctx.stroke(); }
      // Panel border
      ctx.globalAlpha = ba * 0.65; ctx.strokeStyle = fzTile + "1)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-fz.rx, -fz.ry, fz.rx * 2, fz.ry * 2, 5); ctx.stroke();
      ctx.globalAlpha = 1; ctx.restore();
    });

    // ── Terrain decorations (floor level, below grid) ──
    (gs.terrain || []).forEach(t => {
      ctx.save();
      ctx.translate(t.x, t.y);
      if (t.type === 0) { // stain / puddle
        ctx.globalAlpha = 0.09;
        ctx.fillStyle = gs.bossWave ? "#3a0808" : "#1c1c3c";
        ctx.beginPath(); ctx.ellipse(0, 0, t.size, t.size * 0.55, t.rot, 0, Math.PI * 2); ctx.fill();
      } else if (t.type === 1) { // floor cracks
        ctx.strokeStyle = gs.bossWave ? "rgba(90,20,20,0.30)" : "rgba(70,70,115,0.28)";
        ctx.lineWidth = 1;
        [[t.rot, t.size * 0.9], [t.rot + 2.1, t.size * 0.6], [t.rot + 3.9, t.size * 0.45]].forEach(([a, l]) => {
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5);
          ctx.lineTo(Math.cos(a + 0.55) * l * 0.3, Math.sin(a + 0.55) * l * 0.3); ctx.stroke();
        });
      } else if (t.type === 2) { // rubble / debris dots
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = gs.bossWave ? "#4a2020" : "#2a2a4e";
        for (let di = 0; di < 5; di++) {
          const da = t.rot + di * 1.26, dr = t.size * (0.28 + Math.abs(Math.sin(di * 2.3)) * 0.25);
          const ds = 1.5 + Math.abs(Math.sin(di + t.rot)) * 3;
          ctx.beginPath(); ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, ds, 0, Math.PI * 2); ctx.fill();
        }
      } else { // worn tile / scuff mark
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = gs.bossWave ? "#2a0a0a" : "#20203e";
        ctx.save(); ctx.rotate(t.rot);
        ctx.fillRect(-t.size * 0.5, -t.size * 0.3, t.size, t.size * 0.6);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    // ── Props (themed decorative emoji — no collision) ──
    (gs.props || []).forEach(pr => {
      ctx.save(); ctx.translate(pr.x, pr.y);
      ctx.globalAlpha = gs.bossWave ? 0.18 : 0.32;
      ctx.font = `${Math.floor(14 * (pr.scale || 1))}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pr.emoji, 0, 0);
      ctx.globalAlpha = 1; ctx.restore();
    });

    ctx.strokeStyle = gs.bossWave ? "rgba(180,50,50,0.08)" : "rgba(100,100,180,0.06)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // Arena border
    const bPulse = 0.25 + Math.sin(Date.now() / 900) * 0.12;
    ctx.strokeStyle = gs.bossWave ? `rgba(255,60,60,${bPulse})` : `rgba(80,80,220,${bPulse})`;
    ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, H - 8); ctx.lineWidth = 1;
    const cSz = 18; ctx.strokeStyle = gs.bossWave ? "#FF5555" : "#8888FF";
    [[4,4,1,1],[W-4,4,-1,1],[4,H-4,1,-1],[W-4,H-4,-1,-1]].forEach(([cx,cy,sx,sy]) => {
      ctx.beginPath(); ctx.moveTo(cx + sx*cSz, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy*cSz); ctx.stroke();
    });

    // Trail
    gs.trail.forEach(t => {
      ctx.globalAlpha = t.life / 15 * 0.2;
      ctx.fillStyle = dashRef.current.active > 0 ? "#00FFFF" : "#44AA44";
      ctx.beginPath(); ctx.arc(t.x, t.y, 10, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Pickups
    gs.pickups.forEach(pk => {
      const bob = Math.sin(Date.now() / 200 + pk.x) * 3;
      const ps = 1 + Math.sin(Date.now() / 300) * 0.15;
      ctx.save(); ctx.translate(pk.x, pk.y + bob); ctx.scale(ps, ps);
      const em = pk.type === "health" ? "💊" : pk.type === "ammo" ? "📦" : pk.type === "speed" ? "⚡" : pk.type === "guardian_angel" ? "😇" : pk.type === "upgrade" ? "🔧" : "☢️";
      ctx.font = pk.type === "guardian_angel" ? "28px serif" : pk.type === "upgrade" ? "24px serif" : "22px serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(em, 0, 0);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = pk.type === "upgrade" ? "#AA44FF" : pk.type === "health" ? "#0F0" : pk.type === "ammo" ? "#0BF" : pk.type === "speed" ? "#FF0" : pk.type === "guardian_angel" ? "#FFD700" : "#F00";
      if (pk.type === "guardian_angel" || pk.type === "upgrade") ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 200) * 0.1;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    });

    // Grenades
    gs.grenades.forEach(g => {
      ctx.save(); ctx.translate(g.x, g.y);
      ctx.font = (g.size * 2) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💣", 0, 0); ctx.restore();
    });

    // Enemy bullets
    gs.enemyBullets.forEach(eb => {
      ctx.save(); ctx.translate(eb.x, eb.y);
      ctx.fillStyle = eb.color || "#F44"; ctx.shadowColor = eb.color || "#F44"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(0, 0, eb.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    // Obstacles — themed, floor shadow + 3D top-left highlight + internal stripes
    const WALL_T = [
      ["rgba(50,50,90,0.95)", "rgba(105,105,190,0.75)", "#6060CC", [88,88,155]],   // office
      ["rgba(30,56,30,0.95)", "rgba(65,125,65,0.75)",   "#42AA42", [52,102,52]],   // bunker
      ["rgba(56,50,34,0.95)", "rgba(125,110,68,0.75)",  "#A89540", [102,88,52]],   // factory
      ["rgba(66,44,22,0.95)", "rgba(140,100,55,0.75)",  "#B88440", [115,78,40]],   // ruins
    ];
    const wt = gs.bossWave
      ? ["rgba(76,20,20,0.95)", "rgba(165,45,45,0.75)", "#CC3030", [135,32,32]]
      : WALL_T[gs.mapTheme || 0];
    (gs.obstacles || []).forEach(ob => {
      // Cast shadow
      ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(ob.x + 5, ob.y + 5, ob.w, ob.h);
      // Main fill
      ctx.fillStyle = wt[0]; ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      // Internal stripe detail
      const [sr, sg, sb] = wt[3];
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.22)`; ctx.lineWidth = 1;
      const isH = ob.w > ob.h;
      const step = isH ? Math.max(6, Math.floor(ob.h / 3)) : Math.max(6, Math.floor(ob.w / 3));
      if (isH) { for (let sy = ob.y + step; sy < ob.y + ob.h - 1; sy += step) { ctx.beginPath(); ctx.moveTo(ob.x + 2, sy); ctx.lineTo(ob.x + ob.w - 2, sy); ctx.stroke(); } }
      else      { for (let sx = ob.x + step; sx < ob.x + ob.w - 1; sx += step) { ctx.beginPath(); ctx.moveTo(sx, ob.y + 2); ctx.lineTo(sx, ob.y + ob.h - 2); ctx.stroke(); } }
      // Top-left 3D highlight edge
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = `rgba(${Math.min(255,sr+50)},${Math.min(255,sg+50)},${Math.min(255,sb+50)},0.85)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ob.x, ob.y + ob.h); ctx.lineTo(ob.x, ob.y); ctx.lineTo(ob.x + ob.w, ob.y); ctx.stroke();
      ctx.globalAlpha = 1;
      // Glow outline
      ctx.strokeStyle = wt[1]; ctx.lineWidth = 2; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      ctx.shadowColor = wt[2]; ctx.shadowBlur = 8; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h); ctx.shadowBlur = 0;
    });

    // Enemies
    gs.enemies.forEach(e => {
      ctx.save(); ctx.translate(e.x, e.y);
      const r = e.size / 2;
      const faceA = Math.atan2(p.y - e.y, p.x - e.x);
      const dn = Date.now();

      // Drop shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(0, r + 3, r * 0.7, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();

      // Boss: under-body glow pool
      if (e.isBossEnemy) {
        const rgb = e.enrageTriggered ? "255,80,0" : "220,0,0";
        ctx.globalAlpha = 0.18 + Math.sin(dn / 200) * 0.06;
        ctx.fillStyle = `rgba(${rgb},1)`;
        ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Body base
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      // Hit-flash white overlay
      if (e.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.9, e.hitFlash / 12);
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Inner depth ring (darker ring for body volume)
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = r * 0.28;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      // Top-left highlight
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.28, r * 0.38, 0, Math.PI * 2); ctx.fill();
      // Outer border
      ctx.strokeStyle = e.hitFlash > 0 ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

      // Type-specific visual details
      if (e.hitFlash <= 6) {
        switch (e.typeIndex) {
          case 0: { // Mall Cop — gold star badge on chest
            const bs = Math.max(5, r * 0.3);
            ctx.fillStyle = "#FFD700"; ctx.globalAlpha = 0.9; ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
              const a2 = ((i * 4 + 2) * Math.PI / 5) - Math.PI / 2;
              i === 0 ? ctx.moveTo(Math.cos(a1) * bs, r * 0.18 + Math.sin(a1) * bs)
                      : ctx.lineTo(Math.cos(a1) * bs, r * 0.18 + Math.sin(a1) * bs);
              ctx.lineTo(Math.cos(a2) * bs * 0.42, r * 0.18 + Math.sin(a2) * bs * 0.42);
            }
            ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; break;
          }
          case 1: { // Karen — spiky blonde hair
            ctx.strokeStyle = "#FFD700"; ctx.lineCap = "round";
            ctx.lineWidth = Math.max(2, r * 0.15);
            for (let i = 0; i < 6; i++) {
              const ha = -Math.PI + (i / 5) * Math.PI;
              ctx.beginPath();
              ctx.moveTo(Math.cos(ha) * (r - 2), Math.sin(ha) * (r - 2));
              ctx.lineTo(Math.cos(ha) * (r + 9 + (i % 2) * 5), Math.sin(ha) * (r + 9 + (i % 2) * 5));
              ctx.stroke();
            }
            ctx.lineCap = "butt"; break;
          }
          case 2: { // Florida Man — croc scale dots
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            [[-0.38, 0], [0, -0.38], [0.38, 0], [0, 0.38], [0, 0]].forEach(([dx, dy]) => {
              ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.13, 0, Math.PI * 2); ctx.fill();
            }); break;
          }
          case 3: { // HOA President — clipboard
            ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
            ctx.fillRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.62); ctx.strokeRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.62);
            ctx.fillStyle = "rgba(40,40,40,0.55)";
            [-0.18, 0.03, 0.24].forEach(dy => ctx.fillRect(-r * 0.28, dy * r, r * 0.56, r * 0.11)); break;
          }
          case 5: { // IT Guy — thick glasses
            ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.fillStyle = "rgba(160,230,255,0.28)";
            [-1, 1].forEach(s => {
              ctx.beginPath(); ctx.arc(s * r * 0.34, -r * 0.12, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            });
            ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.12); ctx.lineTo(r * 0.1, -r * 0.12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-r * 0.58, -r * 0.12); ctx.lineTo(-r * 0.76, -r * 0.22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r * 0.58, -r * 0.12); ctx.lineTo(r * 0.76, -r * 0.22); ctx.stroke(); break;
          }
          case 6: { // Gym Bro — bulging arms either side
            ctx.fillStyle = e.color; ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5;
            [-1, 1].forEach(s => {
              ctx.beginPath(); ctx.ellipse(s * r * 0.92, r * 0.06, r * 0.32, r * 0.44, s * 0.22, 0, Math.PI * 2);
              ctx.fill(); ctx.stroke();
            }); break;
          }
          case 7: { // Influencer — animated ring-light halo
            ctx.strokeStyle = `rgba(255,220,50,${0.5 + Math.sin(dn / 180) * 0.3})`; ctx.lineWidth = 3.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(0, 0, r + 13, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); break;
          }
          case 8: { // Conspiracy Bro — tinfoil hat
            ctx.fillStyle = "rgba(210,210,220,0.88)"; ctx.strokeStyle = "rgba(160,160,170,0.6)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -r - 15); ctx.lineTo(-r * 0.62, -r + 1); ctx.lineTo(r * 0.62, -r + 1);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
            [[-.28, -r - 7, -.18, -r + 1], [.12, -r - 9, .2, -r + 1]].forEach(([x1, y1, x2, y2]) => {
              ctx.beginPath(); ctx.moveTo(x1 * r, y1); ctx.lineTo(x2 * r, y2); ctx.stroke();
            }); break;
          }
          case 9: { // Landlord — gold $ on chest
            ctx.font = `bold ${Math.floor(r * 0.54)}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = "#FFD700"; ctx.globalAlpha = 0.82;
            ctx.fillText("$", r * 0.08, r * 0.2); ctx.globalAlpha = 1; break;
          }
          case 10: { // Crypto Bro — zigzag chart line
            ctx.strokeStyle = "#00FFD0"; ctx.lineWidth = 2; ctx.globalAlpha = 0.78; ctx.lineCap = "round";
            ctx.beginPath();
            [[-r*.44,-r*.08],[-r*.22,r*.22],[0,-r*.24],[r*.22,r*.08],[r*.44,-r*.28]].forEach(([x, y], i) =>
              i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = "butt"; break;
          }
          case 12: { // YOLO Bomber — hazard stripes clipped to circle
            ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
            ctx.globalAlpha = 0.38;
            for (let i = -5; i <= 5; i++) {
              ctx.fillStyle = i % 2 === 0 ? "#FFD700" : "#CC1100";
              ctx.fillRect(-r + (i + 5) * (r * 0.22), -r, r * 0.22, r * 2);
            }
            ctx.globalAlpha = 1; ctx.restore(); break;
          }
          case 13: { // Sergeant Karen — rank chevrons
            ctx.strokeStyle = "rgba(255,255,255,0.78)"; ctx.lineWidth = 2; ctx.lineCap = "round";
            [r * 0.36, r * 0.1].forEach(cy => {
              ctx.beginPath(); ctx.moveTo(-r * 0.32, cy); ctx.lineTo(0, cy - r * 0.23); ctx.lineTo(r * 0.32, cy); ctx.stroke();
            }); ctx.lineCap = "butt"; break;
          }
          default: break;
        }
      }

      // Eyes facing player (skip during hit flash)
      if (e.hitFlash <= 4) {
        ctx.save(); ctx.rotate(faceA);
        const er = Math.max(1.8, r * 0.18);
        [-1, 1].forEach(side => {
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.beginPath(); ctx.ellipse(r * 0.42, side * r * 0.3, er * 1.4, er, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = e.isBossEnemy ? "#FF0000" : "#111";
          ctx.beginPath(); ctx.arc(r * 0.5, side * r * 0.3, er * 0.72, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.65)";
          ctx.beginPath(); ctx.arc(r * 0.44, side * r * 0.3 - er * 0.3, er * 0.32, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      }

      // Boss glow ring
      if (e.isBossEnemy) {
        const rgb = e.enrageTriggered ? "255,80,0" : "255,0,0";
        ctx.strokeStyle = `rgba(${rgb},${0.55 + Math.sin(dn / 200) * 0.25})`;
        ctx.lineWidth = e.enrageTriggered ? 4.5 : 3;
        ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.stroke();
      }
      // Shield pulse visual
      if (e.shieldPulseActive) {
        const sA = 0.55 + Math.sin(dn / 80) * 0.3;
        ctx.strokeStyle = `rgba(0,191,255,${sA})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.2; ctx.fillStyle = "#00BFFF";
        ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Enrage aura
      if (e.enrageTriggered) {
        const eA = 0.32 + Math.sin(dn / 70) * 0.18;
        ctx.strokeStyle = `rgba(255,100,0,${eA})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, Math.PI * 2); ctx.stroke();
      }
      // Sergeant aura
      if (e.typeIndex === 13) {
        ctx.strokeStyle = "rgba(255,136,0," + (0.3 + Math.sin(dn / 250) * 0.18) + ")";
        ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Shield Guy arc
      if (e.typeIndex === 11) {
        const sa = Math.atan2(p.y - e.y, p.x - e.x);
        ctx.strokeStyle = "rgba(120,170,255,0.8)"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, r + 9, sa - 0.9, sa + 0.9); ctx.stroke();
        ctx.lineWidth = 1;
      }
      // Ranged ring
      if (e.ranged && !e.isBossEnemy) {
        ctx.strokeStyle = "rgba(255,100,100," + (0.28 + Math.sin(dn / 300) * 0.15) + ")";
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();
      }

      // Emoji
      ctx.font = Math.floor(r * 0.72) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = e.hitFlash > 6 ? 0.15 : 0.88;
      ctx.fillText(e.emoji, 0, 1);
      ctx.globalAlpha = 1;

      // HP bar
      if (e.health < e.maxHealth) {
        const bw = e.size + 4;
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-bw / 2, -r - 14, bw, 6);
        ctx.fillStyle = e.health > e.maxHealth * 0.5 ? "#00EE44" : e.health > e.maxHealth * 0.25 ? "#FFAA00" : "#FF2222";
        ctx.fillRect(-bw / 2, -r - 14, bw * Math.max(0, e.health / e.maxHealth), 6);
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(-bw / 2, -r - 14, bw, 6);
      }
      // Name label
      ctx.fillStyle = e.isBossEnemy ? "#FF5555" : "rgba(255,255,255,0.85)";
      ctx.font = "bold " + (e.isBossEnemy ? 11 : 9) + "px monospace"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 2.5;
      ctx.strokeText(e.name, 0, r + 14); ctx.fillText(e.name, 0, r + 14);
      ctx.restore();
    });

    // Player bullets
    gs.bullets.forEach(b => {
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, b.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    // Particles
    gs.particles.forEach(pt => {
      ctx.globalAlpha = pt.life / pt.maxLife; ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Dying enemy animations
    (gs.dyingEnemies || []).forEach(de => {
      const t = de.life / de.maxLife; // 1→0
      ctx.save(); ctx.translate(de.x, de.y - (1 - t) * 25);
      ctx.globalAlpha = t; ctx.scale(1 + (1 - t) * 0.6, 1 + (1 - t) * 0.6);
      ctx.font = (de.size * 0.55) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(de.emoji, 0, 0); ctx.restore();
    });
    ctx.globalAlpha = 1;

    // Player — layered soldier: shadow → legs → [rotate] → gun → vest → helmet
    ctx.save(); ctx.translate(p.x, p.y);
    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(2, 14, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Invincible blink / dash glow
    const _blink = p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0;
    if (_blink) ctx.globalAlpha = 0.35;
    if (dashRef.current.active > 0) { ctx.globalAlpha = _blink ? 0.35 : 0.68; ctx.shadowColor = "#00FFFF"; ctx.shadowBlur = 22; }
    // Legs (unrotated — bob south)
    const _lb = Math.sin(frameCountRef.current * 0.28) * 3.5;
    ctx.fillStyle = "#284A28";
    ctx.beginPath(); ctx.ellipse(-5 + _lb * 0.5, 11, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4 - _lb * 0.5, 11, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    // === Rotate to aim angle ===
    ctx.rotate(p.angle);
    const curWpn = WEAPONS[wpnIdx];
    // Gun grip + barrel
    ctx.fillStyle = "#444"; ctx.fillRect(8, -3, 6, 6);         // grip
    ctx.fillStyle = "#505050"; ctx.fillRect(13, -2.5, 16, 5);  // barrel body
    ctx.fillStyle = "#3A3A3A"; ctx.fillRect(24, -3.5, 6, 7);   // suppressor base
    ctx.fillStyle = curWpn.color; ctx.fillRect(28, -2.5, 6, 5); // muzzle color
    // Tactical vest body
    ctx.fillStyle = "#3A6A3A";
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#244E24"; ctx.lineWidth = 2; ctx.stroke();
    // Vest strap lines
    ctx.strokeStyle = "rgba(18,45,18,0.7)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(3, 8); ctx.stroke();
    // Small pouch on vest
    ctx.fillStyle = "rgba(28,55,28,0.8)";
    ctx.fillRect(-8, -4, 5, 5);
    ctx.strokeStyle = "rgba(18,45,18,0.5)"; ctx.lineWidth = 0.8; ctx.strokeRect(-8, -4, 5, 5);
    // Chest highlight
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath(); ctx.ellipse(-1, -3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Helmet
    ctx.fillStyle = "#2A5A2A";
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#183C18"; ctx.lineWidth = 1.5; ctx.stroke();
    // Helmet brim detail
    ctx.strokeStyle = "rgba(45,90,45,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    // Visor slit (green HUD glow)
    ctx.fillStyle = "rgba(70,240,110,0.55)";
    ctx.beginPath(); ctx.ellipse(6, 0, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,80,0.4)"; ctx.lineWidth = 1; ctx.stroke();
    // Helmet highlight
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath(); ctx.arc(-3, -4, 4, 0, Math.PI * 2); ctx.fill();
    // Reset alpha before muzzle flash (so flash is always bright)
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (gs.muzzleFlash > 0) {
      ctx.shadowColor = "#FFD740"; ctx.shadowBlur = gs.muzzleFlash * 5;
      ctx.fillStyle = `rgba(255,220,60,${gs.muzzleFlash / 4})`;
      ctx.beginPath(); ctx.arc(35, 0, 5 + gs.muzzleFlash * 2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Floating texts
    gs.floatingTexts.forEach(ft => {
      const maxLife = ft.big ? 90 : ft.quote ? 110 : 60;
      ctx.globalAlpha = Math.min(1, ft.life / maxLife);
      ctx.fillStyle = ft.color; ctx.textAlign = "center";
      if (ft.quote) {
        ctx.font = "bold italic 16px monospace";
        ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4;
      } else if (ft.big) {
        ctx.font = "bold 22px monospace";
        ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
      } else {
        ctx.font = "bold 13px monospace";
        ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
      }
      ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;

    // Mini-radar
    const rs = 45, rx = W - rs - 8, ry = isMobile ? 52 : 48;
    ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = gs.bossWave ? "#F00" : "#0F0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#0F0"; ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
    gs.enemies.forEach(e => {
      const edx = (e.x - p.x) / (W * 0.6) * rs, edy = (e.y - p.y) / (H * 0.6) * rs;
      if (Math.hypot(edx, edy) < rs - 2) {
        ctx.fillStyle = e.isBossEnemy ? "#FF00FF" : e.typeIndex >= 4 ? "#F00" : e.ranged ? "#F80" : "#FF0";
        ctx.beginPath(); ctx.arc(rx + edx, ry + edy, e.isBossEnemy ? 4 : 2, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // Damage / kill flash
    if (gs.damageFlash > 0) { ctx.fillStyle = "rgba(255,0,0," + (gs.damageFlash * 0.03) + ")"; ctx.fillRect(0, 0, W, H); }
    if (gs.killFlash > 0) { ctx.fillStyle = "rgba(255,215,0," + (gs.killFlash * 0.015) + ")"; ctx.fillRect(0, 0, W, H); }
    // Boss wave red pulse
    if (gs.bossWave) {
      ctx.fillStyle = "rgba(255,0,0," + (0.03 + Math.sin(Date.now() / 300) * 0.02) + ")";
      ctx.fillRect(0, 0, W, H);
    }

    // Touch joysticks
    const drawStick = (ref, baseColor) => {
      if (!ref.current.active) return;
      const j = ref.current, rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const cx = (j.startX - rect.left) * sx, cy = (j.startY - rect.top) * sy;
      ctx.globalAlpha = 0.15; ctx.fillStyle = baseColor;
      ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45;
      const clampD = Math.min(Math.hypot(j.dx, j.dy), 50);
      const ang = Math.atan2(j.dy, j.dx);
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * clampD * sx, cy + Math.sin(ang) * clampD * sy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    drawStick(joystickRef, "#FFF"); drawStick(shootStickRef, "#F66");

    // Tips (early waves)
    if (gs.currentWave <= 3) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#FFF"; ctx.font = "11px monospace"; ctx.textAlign = "center";
      ctx.fillText(tip, W / 2, H - 10); ctx.globalAlpha = 1;
    }

    ctx.restore();
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
      if (e.key === "q" || e.key === "g" || e.key === "5") throwGrenade();
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
    return <UsernameScreen username={username} setUsername={setUsername} onContinue={() => { if (username.trim().length >= 2) setScreen("menu"); }} />;
  }

  if (screen === "menu") {
    return (
      <MenuScreen
        username={username} difficulty={difficulty} setDifficulty={setDifficulty}
        isMobile={isMobile} leaderboard={leaderboard} lbLoading={lbLoading}
        onStart={startGame} onRefreshLeaderboard={refreshLeaderboard}
        onChangeUsername={() => setScreen("username")}
        starterLoadout={starterLoadout} setStarterLoadout={setStarterLoadout}
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
        achievementsUnlocked={achievementsUnlocked}
        leaderboard={leaderboard} lbLoading={lbLoading} username={username}
        DIFFICULTIES={DIFFICULTIES}
        onStartGame={startGame} onMenu={() => setScreen("menu")}
        onRefreshLeaderboard={refreshLeaderboard} onSubmitScore={submitScore}
        fmtTime={fmtTime}
      />
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────────────
  const xpNeeded = level * 500;
  return (
    <div ref={containerRef} style={base}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: isMobile ? "calc(100% - 56px)" : "100%", display: "block", cursor: isMobile ? "default" : "crosshair" }}
      />

      {/* Pause menu */}
      {paused && (
        <PauseMenu
          wave={wave} timeSurvived={timeSurvived} score={score} isMobile={isMobile}
          achievementsUnlocked={achievementsUnlocked} fmtTime={fmtTime}
          onResume={() => setPaused(false)}
          onLeave={() => { setPaused(false); setScreen("menu"); }}
        />
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

      {/* HUD overlay */}
      <HUD
        wave={wave} timeSurvived={timeSurvived} score={score} kills={kills} deaths={deaths}
        health={health} ammo={ammo} isReloading={isReloading} currentWeapon={currentWeapon}
        combo={combo} comboTimer={comboTimer} killstreak={killstreak}
        level={level} xp={xp} xpNeeded={xpNeeded} killFeed={killFeed} username={username}
        grenadeReady={grenadeReady} dashReady={dashReady} extraLives={extraLives}
        guardianAngelFlash={guardianAngelFlash} difficulty={difficulty} isMobile={isMobile}
        weaponUpgrades={weaponUpgrades} activePerks={activePerks}
        onSwitchWeapon={switchWeapon} onReload={() => doReload(currentWeaponRef.current)}
        onDash={doDash} onGrenade={throwGrenade} onPause={() => setPaused(true)}
        fmtTime={fmtTime}
      />

      {/* Mobile action bar */}
      {isMobile && (
        <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", background: "rgba(10,10,10,0.95)", borderTop: "1px solid rgba(255,255,255,0.12)", flexShrink: 0, gap: 2 }}>
          <div style={{ display: "flex", gap: 2, flex: 1 }}>
            {WEAPONS.map((w, i) => (
              <button key={i}
                onTouchStart={(e) => { e.preventDefault(); switchWeapon(i); }}
                onClick={() => switchWeapon(i)}
                style={{
                  flex: 1, height: 44, borderRadius: 8, position: "relative",
                  background: i === currentWeapon ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: i === currentWeapon ? "2px solid " + w.color : "1px solid rgba(255,255,255,0.12)",
                  color: i === currentWeapon ? w.color : "#BBB",
                  fontSize: "clamp(14px,4vw,18px)", fontFamily: "'Courier New',monospace",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                {w.emoji}
                <span style={{ position: "absolute", top: 1, right: 3, fontSize: 8, color: "#999", fontWeight: 900 }}>{i + 1}</span>
                {weaponUpgrades[i] > 0 && <span style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", fontSize: 7, color: "#AA44FF", lineHeight: 1 }}>{"⭐".repeat(weaponUpgrades[i])}</span>}
              </button>
            ))}
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
