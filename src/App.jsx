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
      dyingEnemies: [], obstacles: [], terrain: [],
      spawnTimer: 0, enemiesThisWave: 0, maxEnemiesThisWave: 5,
      currentWave: 1, score: 0, kills: 0, killstreakCount: 0,
      floatingTexts: [], screenShake: 0, muzzleFlash: 0, ammoCount: WEAPONS[0].ammo,
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
    // Apply meta upgrades
    const meta = loadMetaProgress();
    const unlocks = new Set(meta.unlocks || []);
    if (unlocks.has("veteran"))     perkModsRef.current.xpMult = 1.20;
    if (unlocks.has("swift_boots")) perkModsRef.current.dashCDMult = 0.80;
    if (unlocks.has("deep_mag"))    perkModsRef.current.ammoMult = 1.25;
    if (unlocks.has("hardened"))    perkModsRef.current.damageMult = 1.15;
    if (unlocks.has("scavenger"))   perkModsRef.current.pickupRange = 45;
    if (unlocks.has("field_medic")) {
      gsRef.current.player.health += 25;
      gsRef.current.player.maxHealth += 25;
    }
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
    const wallCount = 4 + Math.floor(_sr() * 3); // 4–6 walls with generous spacing
    const walls = [];
    let _hWalls = 0, _vWalls = 0;
    for (let _wi = 0; _wi < wallCount; _wi++) {
      let wx, wy, ww, wh, _att = 0;
      do {
        // Balance H vs V: bias toward whichever is underrepresented
        const isH = _hWalls <= _vWalls ? (_sr() < 0.65) : (_sr() < 0.35);
        ww = isH ? Math.floor(70 + _sr() * 100) : Math.floor(14 + _sr() * 10);
        wh = isH ? Math.floor(14 + _sr() * 10) : Math.floor(70 + _sr() * 100);
        wx = w * 0.08 + _sr() * (w * 0.84 - ww);
        wy = h * 0.08 + _sr() * (h * 0.84 - wh);
        const tooClose = Math.hypot(wx + ww / 2 - w / 2, wy + wh / 2 - h / 2) < SPAWN_SAFE;
        const overlap = walls.some(prev =>
          wx < prev.x + prev.w + 50 && wx + ww > prev.x - 50 &&
          wy < prev.y + prev.h + 50 && wy + wh > prev.y - 50
        );
        if (!tooClose && !overlap) { if (isH) _hWalls++; else _vWalls++; break; }
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
    // Show meta toast if upgrades active
    const metaActive = META_UPGRADES.filter(u => (new Set(loadMetaProgress().unlocks || [])).has(u.id));
    if (metaActive.length > 0) {
      setMetaToast(metaActive.map(u => u.emoji + " " + u.name).join("  ·  "));
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
    gs.floatingTexts.push({ x, y, text, color, life: big ? 90 : 60, vy: big ? -1 : -2, big });
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
    const wv = gs.currentWave;
    const bossHealth = type.health * (1 + wv * 0.12) * diff.healthMult * 2.5;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = W / 2; y = -50; }
    else if (side === 1) { x = W + 50; y = H / 2; }
    else if (side === 2) { x = W / 2; y = H + 50; }
    else { x = -50; y = H / 2; }
    gs.enemies.push({
      x, y, health: bossHealth, maxHealth: bossHealth,
      speed: type.speed * (1 + wv * 0.05) * diff.speedMult * 0.8,
      size: type.size * 1.5, color: type.color,
      name: "☠ " + type.name, points: type.points * 3,
      deathQuote: type.deathQuote, emoji: type.emoji,
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
    const eHealth = type.health * (1 + wv * 0.12) * diff.healthMult;
    gs.enemies.push({
      x, y, health: eHealth, maxHealth: eHealth,
      speed: type.speed * (1 + wv * 0.05) * diff.speedMult,
      size: type.size, color: type.color, name: type.name, points: type.points,
      deathQuote: type.deathQuote, emoji: type.emoji, typeIndex: ti,
      wobble: Math.random() * Math.PI * 2, hitFlash: 0,
      ranged: type.ranged || false, projSpeed: type.projSpeed || 0, projRate: type.projRate || 999,
      shootTimer: Math.floor(Math.random() * 60), isBossEnemy: false,
    });
  }, []);

  // ── Pickup spawning helper ────────────────────────────────────────────────
  const spawnPickup = (gs, ex, ey, isBoss) => {
    const types    = ["health", "ammo", "speed", "nuke", "upgrade"];
    const weights  = isBoss ? [0.25, 0.20, 0.15, 0.10, 0.30] : [0.38, 0.33, 0.19, 0.05, 0.05];
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
    lastShotRef.current = now; gs.ammoCount--; setAmmo(gs.ammoCount);
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
    setCurrentWeapon(idx); currentWeaponRef.current = idx;
    if (gsRef.current) {
      const upgLevel = gsRef.current.weaponUpgrades?.[idx] || 0;
      const maxAmmo = Math.floor(WEAPONS[idx].maxAmmo * (1 + upgLevel * 0.25) * (perkModsRef.current.ammoMult || 1));
      gsRef.current.ammoCount = maxAmmo; setAmmo(maxAmmo);
    }
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
            addText(gs, e.x, e.y - 50, e.deathQuote, "#FF69B4");
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
      e.x += Math.cos(a) * buffedSpeed + Math.sin(e.wobble) * 0.5 + Math.cos(a + Math.PI / 2) * zigzag;
      e.y += Math.sin(a) * buffedSpeed + Math.cos(e.wobble) * 0.5 + Math.sin(a + Math.PI / 2) * zigzag;
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
          gs.ammoCount = maxAmmo; setAmmo(gs.ammoCount);
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

    // Obstacles
    (gs.obstacles || []).forEach(ob => {
      ctx.fillStyle = "rgba(60,60,100,0.92)"; ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.strokeStyle = "rgba(110,110,200,0.7)"; ctx.lineWidth = 2; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      ctx.shadowColor = "#6666DD"; ctx.shadowBlur = 6; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h); ctx.shadowBlur = 0;
    });

    // Enemies
    gs.enemies.forEach(e => {
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(0, e.size / 2, e.size / 2, e.size / 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.hitFlash > 0 ? "#FFF" : e.color;
      ctx.beginPath(); ctx.arc(0, 0, e.size / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 2; ctx.stroke();
      // Boss glow ring
      if (e.isBossEnemy) {
        const bossRingColor = e.enrageTriggered ? "255,80,0" : "255,0,0";
        ctx.strokeStyle = `rgba(${bossRingColor},${0.4 + Math.sin(Date.now() / 200) * 0.3})`;
        ctx.lineWidth = e.enrageTriggered ? 4 : 3;
        ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 6, 0, Math.PI * 2); ctx.stroke();
      }
      // Shield pulse visual
      if (e.shieldPulseActive) {
        const sAlpha = 0.5 + Math.sin(Date.now() / 80) * 0.3;
        ctx.strokeStyle = `rgba(0,191,255,${sAlpha})`;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 14, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#00BFFF";
        ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Enrage aura
      if (e.enrageTriggered) {
        const eAlpha = 0.3 + Math.sin(Date.now() / 70) * 0.2;
        ctx.strokeStyle = `rgba(255,100,0,${eAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 22, 0, Math.PI * 2); ctx.stroke();
      }
      // Sergeant aura
      if (e.typeIndex === 13) {
        ctx.strokeStyle = "rgba(255,136,0," + (0.3 + Math.sin(Date.now() / 250) * 0.2) + ")";
        ctx.lineWidth = 2; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Shield Guy visual
      if (e.typeIndex === 11) {
        const shieldAngle = Math.atan2(p.y - e.y, p.x - e.x);
        ctx.strokeStyle = "rgba(100,150,255,0.7)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 8, shieldAngle - 0.9, shieldAngle + 0.9); ctx.stroke();
        ctx.lineWidth = 1;
      }
      if (e.ranged && !e.isBossEnemy) {
        ctx.strokeStyle = "rgba(255,100,100," + (0.3 + Math.sin(Date.now() / 300) * 0.2) + ")";
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 4, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.font = (e.size * 0.55) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(e.emoji, 0, -2);
      if (e.health < e.maxHealth) {
        const bw = e.size;
        ctx.fillStyle = "#222"; ctx.fillRect(-bw / 2, -e.size / 2 - 12, bw, 5);
        ctx.fillStyle = e.health > e.maxHealth * 0.5 ? "#0F0" : e.health > e.maxHealth * 0.25 ? "#FA0" : "#F00";
        ctx.fillRect(-bw / 2, -e.size / 2 - 12, bw * (e.health / e.maxHealth), 5);
      }
      ctx.fillStyle = e.isBossEnemy ? "#FF4444" : "#FFF";
      ctx.font = "bold " + (e.isBossEnemy ? 10 : 9) + "px monospace"; ctx.textAlign = "center";
      ctx.fillText(e.name, 0, e.size / 2 + 13);
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

    // Player
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, 15, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(p.angle);
    if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) ctx.globalAlpha = 0.4;
    if (dashRef.current.active > 0) { ctx.globalAlpha = 0.6; ctx.shadowColor = "#0FF"; ctx.shadowBlur = 15; }
    const curWpn = WEAPONS[wpnIdx];
    ctx.fillStyle = "#666"; ctx.fillRect(10, -3, 20, 6);
    ctx.fillStyle = curWpn.color; ctx.fillRect(25, -4, 8, 8);
    if (gs.muzzleFlash > 0) {
      ctx.fillStyle = "rgba(255,255,100," + (gs.muzzleFlash / 4) + ")";
      ctx.beginPath(); ctx.arc(35, 0, 10 + gs.muzzleFlash * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#44AA44"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2D7D2D"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#336633"; ctx.beginPath(); ctx.arc(0, 0, 12, -Math.PI * 0.8, Math.PI * 0.8); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();

    // Floating texts
    gs.floatingTexts.forEach(ft => {
      ctx.globalAlpha = ft.life / (ft.big ? 90 : 60); ctx.fillStyle = ft.color;
      ctx.font = ft.big ? "bold 22px monospace" : "bold 13px monospace"; ctx.textAlign = "center";
      ctx.strokeStyle = "#000"; ctx.lineWidth = ft.big ? 4 : 3;
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
    if (gsRef.current) {
      const upgLevel = gsRef.current.weaponUpgrades?.[currentWeaponRef.current] || 0;
      const maxAmmo = Math.floor(WEAPONS[currentWeaponRef.current].maxAmmo * (1 + upgLevel * 0.25));
      gsRef.current.ammoCount = maxAmmo;
    }
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
