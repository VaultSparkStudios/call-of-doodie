import { useState, useEffect, useRef, useCallback } from "react";

// ===== CONSTANTS =====
const WEAPONS = [
  { name: "Banana Blaster", emoji: "🍌", damage: 15, fireRate: 200, ammo: 30, maxAmmo: 30, reloadTime: 1500, color: "#FFE135", sound: "PEEL!", spread: 0.03, desc: "Reliable sidearm. Peel & deal." },
  { name: "Rubber Chicken RPG", emoji: "🐔", damage: 80, fireRate: 1200, ammo: 3, maxAmmo: 3, reloadTime: 3000, color: "#FF6B35", sound: "BAWK!", spread: 0, desc: "Massive damage, slow reload. BAWK!" },
  { name: "Nerf Minigun", emoji: "🔫", damage: 5, fireRate: 50, ammo: 200, maxAmmo: 200, reloadTime: 4000, color: "#FF4444", sound: "pew pew", spread: 0.12, desc: "Spray & pray. 200 foam darts of fury." },
  { name: "Plunger Launcher", emoji: "🪠", damage: 40, fireRate: 600, ammo: 8, maxAmmo: 8, reloadTime: 2000, color: "#8B4513", sound: "THWONK!", spread: 0.02, desc: "Mid-range plunger justice. THWONK!" },
];

const ENEMY_TYPES = [
  { name: "Mall Cop", health: 30, speed: 1.2, size: 40, color: "#4488CC", points: 100, deathQuote: "My segway...!", emoji: "👮", ranged: false },
  { name: "Karen", health: 50, speed: 0.8, size: 35, color: "#FF69B4", points: 200, deathQuote: "I want the manager!", emoji: "💇‍♀️", ranged: true, projSpeed: 4, projRate: 150 },
  { name: "Florida Man", health: 80, speed: 2.0, size: 45, color: "#FF8C00", points: 300, deathQuote: "Hold my beer...", emoji: "🐊", ranged: false },
  { name: "HOA President", health: 120, speed: 0.5, size: 50, color: "#800080", points: 500, deathQuote: "Your lawn: 0.5\" too tall!", emoji: "📋", ranged: true, projSpeed: 3, projRate: 200 },
  { name: "Mega Karen", health: 400, speed: 0.4, size: 70, color: "#FF1493", points: 2000, deathQuote: "FIRED FROM LIFE!", emoji: "👹", ranged: true, projSpeed: 5, projRate: 90 },
  { name: "IT Guy", health: 60, speed: 1.5, size: 38, color: "#00CED1", points: 250, deathQuote: "Have you tried rebooting?", emoji: "💻", ranged: false },
  { name: "Gym Bro", health: 100, speed: 1.8, size: 48, color: "#32CD32", points: 350, deathQuote: "But my gains...", emoji: "💪", ranged: false },
  { name: "Influencer", health: 40, speed: 2.2, size: 32, color: "#E040FB", points: 400, deathQuote: "This isn't content...", emoji: "🤳", ranged: false },
  { name: "Conspiracy Bro", health: 90, speed: 1.6, size: 42, color: "#AAFF00", points: 450, deathQuote: "The frogs... were right...", emoji: "🛸", ranged: true, projSpeed: 3.5, projRate: 180 },
  { name: "Landlord", health: 250, speed: 0.5, size: 56, color: "#8B6914", points: 900, deathQuote: "Rent was due yesterday...", emoji: "🏠", ranged: true, projSpeed: 4, projRate: 100 },
  { name: "Crypto Bro", health: 30, speed: 3.0, size: 28, color: "#00D4AA", points: 600, deathQuote: "HODL...", emoji: "📈", ranged: false },
];

const KILLSTREAKS = [
  "Uber Eats Delivery Drone", "Roomba Strike", "Tactical Crocs Airdrop",
  "AC-130 (Guy with leaf blower)", "Nuclear (Microwave fish in office)",
  "Swarm of Angry Geese", "Mom With a Chancla",
];

const HITMARKERS = ["bonk!", "oof!", "yeet!", "bruh!", "no cap!", "sheesh!", "ratio'd!", "L + bozo!", "skill issue!", "rekt!", "gg ez!", "cope!", "slay!", "W!", "cancelled!"];

const DEATH_MESSAGES = [
  "360 no-scoped by a toddler", "Killed by: Lag (sure buddy)",
  "K/D visible from space... negatively", "Even bots felt bad",
  "Your dignity will not respawn", "Controller ran away in shame",
  "Eliminated by: gravity", "Achievement: Floor Inspector",
  "Outplayed by a potato", "Skill gap = Grand Canyon",
  "Mic check: it was your fault", "Uninstall recommended",
  "The Landlord evicted your HP", "Crypto portfolio: also crashed",
  "Karen filed a complaint about your skills", "Your WiFi blamed you",
];

const RANK_NAMES = [
  "Noob Potato", "Couch Commando", "Keyboard Warrior", "Basement Lieutenant",
  "Dorito General", "Mountain Dew Marshal", "Supreme Pizza Commander",
  "Legendary Gamer (Mom's Basement)", "Prestige Toilet Master", "Immortal Tryhard",
];

const TIPS = [
  "Tip: Git gud", "Tip: Grass exists outside", "Tip: Your K/D doesn't define you... but it should",
  "Tip: The Rubber Chicken RPG solves everything", "Tip: Karens are resistant to logic",
  "Tip: Florida Man has NO fear", "Tip: Grenades fix most social situations",
  "Tip: Dashing through enemies makes you feel cool", "Pro tip: Don't die",
  "Tip: The Plunger Launcher is not a toilet tool", "Tip: Combos = more points = more bragging",
  "Tip: The HOA President files complaints while attacking", "Tip: Nuke pickups are 5% drop rate. Good luck.",
  "Tip: Auto-aim is not cheating, it's accessibility", "Tip: Your mom says dinner's ready",
  "Tip: 15% crit chance = every bullet is a gamble", "Tip: The Conspiracy Bro knows what you did",
  "Tip: Press 5 for grenade (the spicy option)", "Tip: Pause to read the Most Wanted List. Know your enemy.",
  "Tip: Landlords are tanky AND ranged. Evict them fast.", "Tip: Crypto Bros zigzag like the market. HODL your aim.",
  "Tip: Kill milestones unlock bragging rights at 25/50/100+",
];

const ACHIEVEMENTS = [
  { id: "first_blood", name: "First Blood", desc: "Get your first kill", emoji: "🩸", check: (s) => s.kills >= 1, tier: "bronze" },
  { id: "combo_5", name: "Combo Meal", desc: "Hit a 5x combo", emoji: "🍔", check: (s) => s.maxCombo >= 5, tier: "bronze" },
  { id: "combo_10", name: "McFlurry of Blows", desc: "Hit a 10x combo", emoji: "🌪️", check: (s) => s.maxCombo >= 10, tier: "silver" },
  { id: "combo_20", name: "Infinite Combo IRL", desc: "Hit a 20x combo", emoji: "⚡", check: (s) => s.maxCombo >= 20, tier: "gold" },
  { id: "wave_5", name: "Survived Retail", desc: "Reach wave 5", emoji: "🏪", check: (s) => s.wave >= 5, tier: "bronze" },
  { id: "wave_10", name: "Middle Management", desc: "Reach wave 10", emoji: "📊", check: (s) => s.wave >= 10, tier: "silver" },
  { id: "wave_15", name: "Corporate Ladder", desc: "Reach wave 15", emoji: "🏢", check: (s) => s.wave >= 15, tier: "gold" },
  { id: "wave_20", name: "CEO of Surviving", desc: "Reach wave 20", emoji: "👔", check: (s) => s.wave >= 20, tier: "legendary" },
  { id: "kills_50", name: "Certified Menace", desc: "Get 50 kills in one run", emoji: "☠️", check: (s) => s.kills >= 50, tier: "bronze" },
  { id: "kills_100", name: "One Man Army (of Idiots)", desc: "Get 100 kills in one run", emoji: "💯", check: (s) => s.kills >= 100, tier: "silver" },
  { id: "kills_200", name: "Walking War Crime", desc: "Get 200 kills in one run", emoji: "🪖", check: (s) => s.kills >= 200, tier: "gold" },
  { id: "streak_10", name: "Untouchable", desc: "10 kill streak without dying", emoji: "🔥", check: (s) => s.bestStreak >= 10, tier: "silver" },
  { id: "streak_25", name: "John Wick Energy", desc: "25 kill streak without dying", emoji: "🎯", check: (s) => s.bestStreak >= 25, tier: "gold" },
  { id: "nuke", name: "Office Microwave Incident", desc: "Pick up a tactical nuke", emoji: "☢️", check: (s) => s.nukes >= 1, tier: "silver" },
  { id: "karen_boss", name: "Manager Located", desc: "Defeat Mega Karen", emoji: "💀", check: (s) => s.bossKills >= 1, tier: "silver" },
  { id: "karen_boss_5", name: "Karen Whisperer", desc: "Defeat 5 Mega Karens", emoji: "🧘", check: (s) => s.bossKills >= 5, tier: "gold" },
  { id: "dash_20", name: "Tactical Roll", desc: "Use dash 20 times", emoji: "💨", check: (s) => s.dashes >= 20, tier: "bronze" },
  { id: "dash_100", name: "Parkour!", desc: "Use dash 100 times", emoji: "🏃", check: (s) => s.dashes >= 100, tier: "silver" },
  { id: "score_10k", name: "Sweat Lord", desc: "Score 10,000+ points", emoji: "💎", check: (s) => s.score >= 10000, tier: "silver" },
  { id: "score_50k", name: "No-Life Speedrun", desc: "Score 50,000+ points", emoji: "👑", check: (s) => s.score >= 50000, tier: "gold" },
  { id: "score_100k", name: "Legendary Degenerate", desc: "Score 100,000+ points", emoji: "🏆", check: (s) => s.score >= 100000, tier: "legendary" },
  { id: "grenades_10", name: "Spam Artist", desc: "Throw 10 grenades", emoji: "💣", check: (s) => s.grenades >= 10, tier: "bronze" },
  { id: "dmg_10k", name: "DPS Check Passed", desc: "Deal 10,000 total damage", emoji: "⚔️", check: (s) => s.totalDamage >= 10000, tier: "silver" },
  { id: "level_10", name: "Touched Grass (in-game)", desc: "Reach level 10", emoji: "🌿", check: (s) => s.level >= 10, tier: "gold" },
  { id: "crits_50", name: "RNG Blessed", desc: "Land 50 critical hits", emoji: "🎰", check: (s) => s.crits >= 50, tier: "silver" },
  { id: "landlord", name: "Eviction Notice", desc: "Defeat a Landlord", emoji: "🏠", check: (s) => s.landlordKills >= 1, tier: "silver" },
  { id: "crypto", name: "Market Correction", desc: "Defeat 10 Crypto Bros", emoji: "📉", check: (s) => s.cryptoKills >= 10, tier: "bronze" },
  { id: "survive_5m", name: "Patience of a Saint", desc: "Survive 5 minutes", emoji: "⏱️", check: (s) => s.timeSurvived >= 300, tier: "silver" },
  { id: "guardian_angel", name: "Divine Intervention", desc: "Collect a Guardian Angel power-up", emoji: "😇", check: (s) => s.guardianAngels >= 1, tier: "gold" },
  { id: "insane_wave5", name: "Certified Masochist", desc: "Reach wave 5 on INSANE difficulty", emoji: "🤡", check: (s) => s.wave >= 5 && s.difficulty === "insane", tier: "legendary" },
];

const GRENADE_COOLDOWN = 8000;
const DASH_COOLDOWN = 1500;
const DASH_SPEED = 18;
const DASH_DURATION = 8;
const CRIT_CHANCE = 0.15;
const CRIT_MULT = 2.0;

const DIFFICULTIES = {
  easy: { label: "Easy", emoji: "🟢", desc: "Chill mode. Enemies are weaker and slower.", healthMult: 0.7, speedMult: 0.8, spawnMult: 1.3, playerHP: 150, color: "#44CC44" },
  normal: { label: "Normal", emoji: "🟡", desc: "The standard Call of Doodie experience.", healthMult: 1.0, speedMult: 1.0, spawnMult: 1.0, playerHP: 100, color: "#FFD700" },
  hard: { label: "Hard", emoji: "🔴", desc: "Enemies hit harder and faster. Git gud.", healthMult: 1.4, speedMult: 1.2, spawnMult: 0.75, playerHP: 80, color: "#FF4444" },
  insane: { label: "INSANE", emoji: "💀", desc: "You WILL die. Guaranteed. No refunds.", healthMult: 1.8, speedMult: 1.4, spawnMult: 0.5, playerHP: 60, color: "#FF00FF" },
};

const KILL_MILESTONES = {
  25: "Novice Exterminator",
  50: "Certified Menace to Society",
  75: "HR Has Been Notified",
  100: "Triple Digit Demon",
  150: "Geneva Convention Violator",
  200: "Walking War Crime",
  250: "They Write Songs About You",
  300: "Literally Unstoppable",
  500: "You Need Professional Help",
};

// ===== STORAGE =====
const storageKey = "cod-lb-v5";
function hasWindowStorage() { try { return typeof window.storage !== "undefined" && window.storage && typeof window.storage.get === "function"; } catch { return false; } }
async function loadLeaderboard() {
  try {
    if (hasWindowStorage()) { const r = await window.storage.get(storageKey, true); return r ? JSON.parse(r.value) : []; }
    const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function saveToLeaderboard(entry) {
  try {
    const board = await loadLeaderboard();
    board.push({ ...entry, ts: Date.now() });
    board.sort((a, b) => b.score - a.score);
    const top = board.slice(0, 100);
    if (hasWindowStorage()) { await window.storage.set(storageKey, JSON.stringify(top), true); }
    else { localStorage.setItem(storageKey, JSON.stringify(top)); }
    return top;
  } catch { return []; }
}

// ===== CAREER STATS STORAGE =====
const careerKey = "cod-career-v1";
const upgradesKey = "cod-upgrades-v1";
const defaultCareer = { gamesPlayed: 0, totalKills: 0, totalDeaths: 0, totalScore: 0, bestScore: 0, highestWave: 0, totalTimePlayed: 0, rageQuits: 0, totalDamageDealt: 0, bossesDefeated: 0, nukesCollected: 0, guardianAngelsUsed: 0, achievementCounts: {}, prestigePoints: 0 };
async function loadCareerStats() {
  try {
    if (hasWindowStorage()) { const r = await window.storage.get(careerKey, true); return r ? { ...defaultCareer, ...JSON.parse(r.value) } : { ...defaultCareer }; }
    const raw = localStorage.getItem(careerKey); return raw ? { ...defaultCareer, ...JSON.parse(raw) } : { ...defaultCareer };
  } catch { return { ...defaultCareer }; }
}
async function saveCareerStats(stats) {
  try {
    const json = JSON.stringify(stats);
    if (hasWindowStorage()) { await window.storage.set(careerKey, json, true); }
    else { localStorage.setItem(careerKey, json); }
  } catch {}
}
const defaultUpgrades = { damage: [0,0,0,0], fireRate: [0,0,0,0], ammo: [0,0,0,0] };
async function loadUpgrades() {
  try {
    if (hasWindowStorage()) { const r = await window.storage.get(upgradesKey, true); return r ? { ...defaultUpgrades, ...JSON.parse(r.value) } : { ...defaultUpgrades }; }
    const raw = localStorage.getItem(upgradesKey); return raw ? { ...defaultUpgrades, ...JSON.parse(raw) } : { ...defaultUpgrades };
  } catch { return { ...defaultUpgrades }; }
}
async function saveUpgrades(upgrades) {
  try {
    const json = JSON.stringify(upgrades);
    if (hasWindowStorage()) { await window.storage.set(upgradesKey, json, true); }
    else { localStorage.setItem(upgradesKey, json); }
  } catch {}
}
const UPGRADE_COSTS = { damage: [500, 1500, 4000, 10000, 25000], fireRate: [800, 2000, 5000, 12000, 30000], ammo: [300, 1000, 3000, 8000, 20000] };
const UPGRADE_MAX = 5;
const UPGRADE_LABELS = { damage: { name: "Damage", emoji: "💥", desc: "+15% per level" }, fireRate: { name: "Fire Rate", emoji: "⚡", desc: "+10% per level" }, ammo: { name: "Ammo Capacity", emoji: "📦", desc: "+20% per level" } };
function getUpgradedWeapon(wpnIdx, upgrades) {
  const w = WEAPONS[wpnIdx];
  const dLvl = upgrades.damage[wpnIdx] || 0, fLvl = upgrades.fireRate[wpnIdx] || 0, aLvl = upgrades.ammo[wpnIdx] || 0;
  return { ...w, damage: Math.round(w.damage * (1 + dLvl * 0.15)), fireRate: Math.max(20, Math.round(w.fireRate * (1 - fLvl * 0.10))), ammo: Math.round(w.ammo * (1 + aLvl * 0.20)), maxAmmo: Math.round(w.maxAmmo * (1 + aLvl * 0.20)) };
}

// ===== BOSS WAVES =====
const BOSS_WAVE_TYPES = [
  { name: "Giga Karen", emoji: "👹", health: 800, speed: 0.5, size: 85, color: "#FF1493", points: 5000, deathQuote: "I'LL HAVE YOUR JOB!", ranged: true, projSpeed: 6, projRate: 50, special: "multi_shot" },
  { name: "Regional Manager", emoji: "👔", health: 1200, speed: 0.35, size: 90, color: "#8B0000", points: 8000, deathQuote: "This wasn't in my KPIs...", ranged: true, projSpeed: 5, projRate: 70, special: "summon" },
  { name: "HOA Overlord", emoji: "🏛️", health: 2000, speed: 0.3, size: 100, color: "#4B0082", points: 12000, deathQuote: "The bylaws... were wrong?!", ranged: true, projSpeed: 7, projRate: 40, special: "shield" },
  { name: "Final Form Karen", emoji: "☠️", health: 3000, speed: 0.4, size: 110, color: "#FF0000", points: 20000, deathQuote: "I AM... the manager...", ranged: true, projSpeed: 8, projRate: 30, special: "all" },
];

// ===== COMPONENT =====
export default function CallOfDoodie() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gsRef = useRef(null);
  const keysRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0, down: false, moved: false });
  const lastShotRef = useRef(0);
  const frameRef = useRef(null);
  const joystickRef = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null });
  const shootStickRef = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null, shooting: false });
  const sizeRef = useRef({ w: 800, h: 600 });

  const [screen, setScreen] = useState("username");
  const [username, setUsername] = useState("");
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [wave, setWave] = useState(1);
  const [currentWeapon, setCurrentWeapon] = useState(0);
  const [ammo, setAmmo] = useState(WEAPONS[0].ammo);
  const [health, setHealth] = useState(100);
  const [killstreak, setKillstreak] = useState(0);
  const [deathMessage, setDeathMessage] = useState("");
  const [isReloading, setIsReloading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastWords, setLastWords] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [killFeed, setKillFeed] = useState([]);
  const [grenadeReady, setGrenadeReady] = useState(true);
  const [bestStreak, setBestStreak] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbLoading, setLbLoading] = useState(false);
  const [totalDamage, setTotalDamage] = useState(0);
  const [dashReady, setDashReady] = useState(true);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState([]);
  const [achievementPopup, setAchievementPopup] = useState(null);
  const [timeSurvived, setTimeSurvived] = useState(0);
  const [tip, setTip] = useState("");
  const [paused, setPaused] = useState(false);
  const [hoveredTool, setHoveredTool] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [pauseView, setPauseView] = useState("main");
  const [extraLives, setExtraLives] = useState(0);
  const [difficulty, setDifficulty] = useState("normal");
  const [guardianAngelFlash, setGuardianAngelFlash] = useState(false);
  const [careerStats, setCareerStats] = useState({ ...defaultCareer });
  const [weaponUpgrades, setWeaponUpgrades] = useState({ ...defaultUpgrades });
  const [menuView, setMenuView] = useState("main");
  const [isBossWave, setIsBossWave] = useState(false);
  const [showArmory, setShowArmory] = useState(false);
  const [showCareer, setShowCareer] = useState(false);

  const currentWeaponRef = useRef(0);
  const isReloadingRef = useRef(false);
  const comboRef = useRef({ count: 0, timer: 0, max: 0 });
  const killFeedRef = useRef([]);
  const xpRef = useRef({ xp: 0, level: 1 });
  const grenadeRef = useRef({ ready: true, lastUse: 0 });
  const dashRef = useRef({ ready: true, lastUse: 0, active: 0, dx: 0, dy: 0 });
  const statsRef = useRef({ bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0 });
  const achievedRef = useRef(new Set());
  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const extraLivesRef = useRef(0);
  const difficultyRef = useRef("normal");
  const weaponUpgradesRef = useRef({ ...defaultUpgrades });
  const careerRef = useRef({ ...defaultCareer });
  const gameEndedRef = useRef(false);

  useEffect(() => { currentWeaponRef.current = currentWeapon; }, [currentWeapon]);
  useEffect(() => { isReloadingRef.current = isReloading; }, [isReloading]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { extraLivesRef.current = extraLives; }, [extraLives]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { weaponUpgradesRef.current = weaponUpgrades; }, [weaponUpgrades]);
  useEffect(() => { careerRef.current = careerStats; }, [careerStats]);

  useEffect(() => {
    (async () => {
      const c = await loadCareerStats(); setCareerStats(c); careerRef.current = c;
      const u = await loadUpgrades(); setWeaponUpgrades(u); weaponUpgradesRef.current = u;
    })();
  }, []);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const touch = "ontouchstart" in window;
      setIsMobile(w <= 600 || (touch && w <= 900));
      setIsTablet(w > 600 && w <= 1024);
    };
    check(); window.addEventListener("resize", check);
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

  const refreshLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const board = await loadLeaderboard();
    setLeaderboard(board); setLbLoading(false);
  }, []);

  useEffect(() => { refreshLeaderboard(); }, [refreshLeaderboard]);

  const GW = () => sizeRef.current.w;
  const GH = () => sizeRef.current.h;

  const checkAchievements = useCallback((gs) => {
    const s = { kills: gs.kills, wave: gs.currentWave, maxCombo: comboRef.current.max, bestStreak: statsRef.current.bestStreak, nukes: statsRef.current.nukes, bossKills: statsRef.current.bossKills, dashes: statsRef.current.dashes, score: gs.score, grenades: statsRef.current.grenades, totalDamage: gs.totalDamage || 0, level: xpRef.current.level, crits: statsRef.current.crits, landlordKills: statsRef.current.landlordKills, cryptoKills: statsRef.current.cryptoKills, timeSurvived: Math.floor((Date.now() - startTimeRef.current) / 1000), guardianAngels: statsRef.current.guardianAngels, difficulty: difficultyRef.current };
    ACHIEVEMENTS.forEach(a => {
      if (!achievedRef.current.has(a.id) && a.check(s)) {
        achievedRef.current.add(a.id);
        setAchievementsUnlocked(prev => [...prev, a.id]);
        setAchievementPopup(a);
        setTimeout(() => setAchievementPopup(p => p?.id === a.id ? null : p), 3000);
      }
    });
  }, []);

  const initGame = useCallback(() => {
    const w = sizeRef.current.w, h = sizeRef.current.h;
    const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    const wpn0 = getUpgradedWeapon(0, weaponUpgradesRef.current);
    gsRef.current = {
      player: { x: w / 2, y: h / 2, angle: 0, health: diff.playerHP, maxHealth: diff.playerHP, speed: 4, invincible: 0 },
      enemies: [], bullets: [], particles: [], pickups: [], grenades: [], enemyBullets: [],
      spawnTimer: 0, enemiesThisWave: 0, maxEnemiesThisWave: 5,
      currentWave: 1, score: 0, kills: 0, killstreakCount: 0,
      floatingTexts: [], screenShake: 0, muzzleFlash: 0, ammoCount: wpn0.ammo,
      damageFlash: 0, killFlash: 0, totalDamage: 0, trail: [],
      isBossWave: false, bossAlive: false,
    };
    comboRef.current = { count: 0, timer: 0, max: 0 };
    killFeedRef.current = [];
    xpRef.current = { xp: 0, level: 1 };
    grenadeRef.current = { ready: true, lastUse: 0 };
    dashRef.current = { ready: true, lastUse: 0, active: 0, dx: 0, dy: 0 };
    statsRef.current = { bestStreak: 0, totalDamage: 0, nukes: 0, bossKills: 0, dashes: 0, grenades: 0, crits: 0, landlordKills: 0, cryptoKills: 0, guardianAngels: 0 };
    achievedRef.current = new Set();
    startTimeRef.current = Date.now();
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }, []);

  const spawnEnemy = useCallback((gs) => {
    const w = GW(), h = GH(), wv = gs.currentWave;
    let ti = 0;
    const r = Math.random();
    if (wv >= 12 && r < 0.06) ti = 9;
    else if (wv >= 10 && r < 0.12) ti = 4;
    else if (wv >= 9 && r < 0.17) ti = 10;
    else if (wv >= 8 && r < 0.22) ti = 3;
    else if (wv >= 7 && r < 0.27) ti = 8;
    else if (wv >= 6 && r < 0.33) ti = 7;
    else if (wv >= 5 && r < 0.39) ti = 6;
    else if (wv >= 4 && r < 0.45) ti = 2;
    else if (wv >= 3 && r < 0.51) ti = 5;
    else if (wv >= 2 && r < 0.58) ti = 1;
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
      speed: type.speed * (1 + wv * 0.05) * diff.speedMult, size: type.size, color: type.color,
      name: type.name, points: type.points, deathQuote: type.deathQuote,
      emoji: type.emoji, typeIndex: ti, wobble: Math.random() * Math.PI * 2, hitFlash: 0,
      ranged: type.ranged || false, projSpeed: type.projSpeed || 0, projRate: type.projRate || 999,
      shootTimer: Math.floor(Math.random() * 60),
    });
  }, []);

  const addParticles = (gs, x, y, color, count = 8) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
      gs.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 30+Math.random()*20, maxLife: 50, color, size: 2+Math.random()*4 });
    }
  };
  const addText = (gs, x, y, text, color = "#FFF", big = false) => {
    gs.floatingTexts.push({ x, y, text, color, life: big ? 90 : 60, vy: big ? -1 : -2, big });
  };
  const addKillFeed = (enemyName, weaponName) => {
    const entry = { enemy: enemyName, weapon: weaponName, id: Date.now() + Math.random() };
    killFeedRef.current = [entry, ...killFeedRef.current].slice(0, 5);
    setKillFeed([...killFeedRef.current]);
  };
  const addXp = (amount) => {
    const ref = xpRef.current;
    ref.xp += amount;
    const needed = ref.level * 500;
    if (ref.xp >= needed) {
      ref.xp -= needed; ref.level++;
      setLevel(ref.level);
      if (gsRef.current) {
        addText(gsRef.current, GW()/2, GH()/2 - 60, "\u2B06 LEVEL " + ref.level + "!", "#00FF88", true);
        gsRef.current.player.speed = 4 + ref.level * 0.12;
      }
    }
    setXp(ref.xp);
  };

  const throwGrenade = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || !grenadeRef.current.ready || pausedRef.current) return;
    grenadeRef.current.ready = false; setGrenadeReady(false);
    const p = gs.player;
    gs.grenades.push({ x: p.x, y: p.y, vx: Math.cos(p.angle)*8, vy: Math.sin(p.angle)*8, life: 45, size: 8 });
    statsRef.current.grenades++;
    setTimeout(() => { grenadeRef.current.ready = true; setGrenadeReady(true); }, GRENADE_COOLDOWN);
  }, []);

  const doDash = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || !dashRef.current.ready || pausedRef.current) return;
    dashRef.current.ready = false; setDashReady(false);
    const keys = keysRef.current;
    const js = joystickRef.current;
    let ddx = 0, ddy = 0;
    if (keys["w"] || keys["arrowup"]) ddy -= 1;
    if (keys["s"] || keys["arrowdown"]) ddy += 1;
    if (keys["a"] || keys["arrowleft"]) ddx -= 1;
    if (keys["d"] || keys["arrowright"]) ddx += 1;
    if (js.active) { const dist = Math.hypot(js.dx, js.dy); if (dist > 5) { ddx += js.dx/dist; ddy += js.dy/dist; } }
    const dlen = Math.hypot(ddx, ddy);
    if (dlen > 0) { ddx /= dlen; ddy /= dlen; } else { ddx = Math.cos(gs.player.angle); ddy = Math.sin(gs.player.angle); }
    dashRef.current.active = DASH_DURATION; dashRef.current.dx = ddx; dashRef.current.dy = ddy;
    gs.player.invincible = Math.max(gs.player.invincible, DASH_DURATION + 5);
    statsRef.current.dashes++;
    addParticles(gs, gs.player.x, gs.player.y, "#00FFFF", 12);
    setTimeout(() => { dashRef.current.ready = true; setDashReady(true); }, DASH_COOLDOWN);
  }, []);

  const startGame = () => {
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    initGame();
    const wpn0 = getUpgradedWeapon(0, weaponUpgradesRef.current);
    setScreen("game"); setScore(0); setKills(0); setDeaths(0); setWave(1);
    setCurrentWeapon(0); setAmmo(wpn0.ammo); setHealth(diff.playerHP); setIsBossWave(false);
    setKillstreak(0); setIsReloading(false); setCombo(0); setComboTimer(0);
    setXp(0); setLevel(1); setKillFeed([]); setGrenadeReady(true); setDashReady(true);
    setBestStreak(0); setTotalDamage(0); setSubmitted(false); setLastWords("");
    setAchievementsUnlocked([]); setAchievementPopup(null); setTimeSurvived(0);
    setPaused(false); setHoveredTool(null); setExtraLives(0); extraLivesRef.current = 0;
    setGuardianAngelFlash(false); gameEndedRef.current = false;
    currentWeaponRef.current = 0; isReloadingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) setTimeSurvived(t => t + 1);
    }, 1000);
  };

  useEffect(() => {
    if (screen !== "game" && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [screen]);

  const doReload = useCallback((wpnIdx) => {
    if (isReloadingRef.current || pausedRef.current) return;
    setIsReloading(true); isReloadingRef.current = true;
    const uw = getUpgradedWeapon(wpnIdx, weaponUpgradesRef.current);
    setTimeout(() => {
      if (gsRef.current) { gsRef.current.ammoCount = uw.maxAmmo; setAmmo(uw.maxAmmo); }
      setIsReloading(false); isReloadingRef.current = false;
    }, uw.reloadTime);
  }, []);

  const shoot = useCallback((gs, weaponIdx, angle) => {
    if (pausedRef.current) return;
    const weapon = getUpgradedWeapon(weaponIdx, weaponUpgradesRef.current);
    const now = Date.now();
    if (now - lastShotRef.current < weapon.fireRate || gs.ammoCount <= 0 || isReloadingRef.current) return;
    lastShotRef.current = now; gs.ammoCount--; setAmmo(gs.ammoCount);
    const p = gs.player, spread = (Math.random()-0.5)*weapon.spread, a = angle+spread;
    gs.bullets.push({
      x: p.x+Math.cos(angle)*25, y: p.y+Math.sin(angle)*25,
      vx: Math.cos(a)*12, vy: Math.sin(a)*12,
      damage: weapon.damage, color: weapon.color, life: 60,
      size: weaponIdx===1?8:weaponIdx===2?2:4, trail: weaponIdx===1,
    });
    gs.muzzleFlash = 4;
    gs.screenShake = Math.max(gs.screenShake, weaponIdx===1?12:3);
    if (gs.ammoCount <= 0) doReload(weaponIdx);
  }, [doReload]);

  const updateCareerOnGameEnd = useCallback(async (gs, wasRageQuit = false) => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    const c = { ...careerRef.current };
    c.gamesPlayed++;
    c.totalKills += gs.kills;
    c.totalDeaths++;
    c.totalScore += gs.score;
    if (gs.score > c.bestScore) c.bestScore = gs.score;
    if (gs.currentWave > c.highestWave) c.highestWave = gs.currentWave;
    c.totalTimePlayed += Math.floor((Date.now() - startTimeRef.current) / 1000);
    c.totalDamageDealt += Math.floor(gs.totalDamage);
    c.bossesDefeated += statsRef.current.bossKills;
    c.nukesCollected += statsRef.current.nukes;
    c.guardianAngelsUsed += statsRef.current.guardianAngels;
    if (wasRageQuit) c.rageQuits++;
    const earnedPP = Math.floor(gs.score / 10);
    c.prestigePoints += earnedPP;
    const counts = c.achievementCounts || {};
    achievedRef.current.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    c.achievementCounts = counts;
    setCareerStats(c); careerRef.current = c;
    await saveCareerStats(c);
  }, []);

  const handlePlayerDeath = useCallback((gs) => {
    if (extraLivesRef.current > 0) {
      extraLivesRef.current--;
      setExtraLives(extraLivesRef.current);
      const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
      gs.player.health = diff.playerHP;
      gs.player.invincible = 120;
      setHealth(diff.playerHP);
      gs.enemies.forEach(e => { e.health -= 30; e.hitFlash = 10; });
      gs.enemyBullets = [];
      gs.screenShake = 20;
      addText(gs, gs.player.x, gs.player.y - 50, "GUARDIAN ANGEL!", "#FFD700", true);
      addParticles(gs, gs.player.x, gs.player.y, "#FFD700", 30);
      addParticles(gs, gs.player.x, gs.player.y, "#FFFFFF", 20);
      setGuardianAngelFlash(true);
      setTimeout(() => setGuardianAngelFlash(false), 1500);
      return false;
    }
    setDeaths(dd => dd + 1);
    setDeathMessage(DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]);
    setTotalDamage(Math.floor(gs.totalDamage)); setBestStreak(statsRef.current.bestStreak);
    setTimeSurvived(Math.floor((Date.now() - startTimeRef.current) / 1000));
    updateCareerOnGameEnd(gs, false);
    setScreen("death"); gs.killstreakCount = 0; setKillstreak(0);
    return true;
  }, [updateCareerOnGameEnd]);

  // ===== GAME LOOP =====
  const gameLoop = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = GW(), H = GH(), p = gs.player, wpnIdx = currentWeaponRef.current;

    if (pausedRef.current) { frameRef.current = requestAnimationFrame(gameLoop); return; }

    if (dashRef.current.active > 0) {
      dashRef.current.active--;
      p.x += dashRef.current.dx * DASH_SPEED;
      p.y += dashRef.current.dy * DASH_SPEED;
      gs.trail.push({ x: p.x, y: p.y, life: 15 });
    }

    let dx = 0, dy = 0;
    const keys = keysRef.current;
    if (keys["w"]||keys["arrowup"]) dy -= 1;
    if (keys["s"]||keys["arrowdown"]) dy += 1;
    if (keys["a"]||keys["arrowleft"]) dx -= 1;
    if (keys["d"]||keys["arrowright"]) dx += 1;
    const js = joystickRef.current;
    if (js.active) { const dist = Math.hypot(js.dx,js.dy); if (dist>5) { dx+=js.dx/Math.max(dist,50); dy+=js.dy/Math.max(dist,50); } }
    const len = Math.hypot(dx,dy);
    if (len > 0) { dx/=len; dy/=len; }
    if (dashRef.current.active <= 0) { p.x += dx*p.speed; p.y += dy*p.speed; }
    p.x = Math.max(20, Math.min(W-20, p.x));
    p.y = Math.max(20, Math.min(H-20, p.y));
    if (Math.abs(dx)>0.1||Math.abs(dy)>0.1) { if (Math.random()<0.3) gs.trail.push({x:p.x,y:p.y,life:10}); }
    gs.trail = gs.trail.filter(t=>{t.life--;return t.life>0;});

    const ss = shootStickRef.current;
    if (ss.active && Math.hypot(ss.dx,ss.dy) > 10) { p.angle = Math.atan2(ss.dy, ss.dx); ss.shooting = true; }
    else if (ss.active) { ss.shooting = false; }
    const mouse = mouseRef.current;
    if (!js.active && !ss.active && (mouse.down || mouse.moved)) {
      const rect = canvas.getBoundingClientRect();
      p.angle = Math.atan2((mouse.y-rect.top)*(H/rect.height)-p.y, (mouse.x-rect.left)*(W/rect.width)-p.x);
    }
    if (js.active && !ss.active && gs.enemies.length > 0) {
      let nearest = null, nd = Infinity;
      gs.enemies.forEach(e => { const d = Math.hypot(e.x-p.x,e.y-p.y); if (d<nd){nd=d;nearest=e;} });
      if (nearest) p.angle = Math.atan2(nearest.y-p.y, nearest.x-p.x);
    }
    const shouldShoot = mouse.down || ss.shooting || (js.active && !ss.active && gs.enemies.length > 0);
    if (shouldShoot && !isReloadingRef.current && gs.ammoCount > 0) shoot(gs, wpnIdx, p.angle);
    if (p.invincible > 0) p.invincible--;

    if (comboRef.current.timer > 0) {
      comboRef.current.timer--;
      if (comboRef.current.timer <= 0) { comboRef.current.count = 0; setCombo(0); }
      setComboTimer(comboRef.current.timer);
    }

    gs.spawnTimer++;
    const diffS = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
    const spawnRate = Math.max(18, Math.floor((100 - gs.currentWave * 7) * diffS.spawnMult));
    if (gs.spawnTimer >= spawnRate && gs.enemiesThisWave < gs.maxEnemiesThisWave) {
      gs.spawnTimer = 0; gs.enemiesThisWave++; spawnEnemy(gs);
    }
    if (gs.enemies.length === 0 && gs.enemiesThisWave >= gs.maxEnemiesThisWave) {
      gs.currentWave++; gs.enemiesThisWave = 0;
      gs.bossAlive = false;
      const isBoss = gs.currentWave % 5 === 0;
      gs.isBossWave = isBoss;
      setIsBossWave(isBoss);
      if (isBoss) {
        gs.maxEnemiesThisWave = 1;
        const bIdx = Math.min(Math.floor(gs.currentWave / 5) - 1, BOSS_WAVE_TYPES.length - 1);
        const boss = BOSS_WAVE_TYPES[bIdx];
        const diff = DIFFICULTIES[difficultyRef.current] || DIFFICULTIES.normal;
        const bHealth = boss.health * (1 + gs.currentWave * 0.1) * diff.healthMult;
        const side = Math.floor(Math.random() * 4);
        let bx, by;
        if (side === 0) { bx = W/2; by = -50; } else if (side === 1) { bx = W+50; by = H/2; } else if (side === 2) { bx = W/2; by = H+50; } else { bx = -50; by = H/2; }
        gs.enemies.push({
          x: bx, y: by, health: bHealth, maxHealth: bHealth,
          speed: boss.speed * diff.speedMult, size: boss.size, color: boss.color,
          name: boss.name, points: boss.points, deathQuote: boss.deathQuote,
          emoji: boss.emoji, typeIndex: 99, wobble: 0, hitFlash: 0,
          ranged: true, projSpeed: boss.projSpeed, projRate: boss.projRate,
          shootTimer: 0, isBoss: true, special: boss.special, specialTimer: 0, shieldActive: false, shieldTimer: 0, shieldCooldown: 0,
        });
        gs.enemiesThisWave = 1; gs.bossAlive = true;
        addText(gs, W/2, H/2-30, "BOSS WAVE!", "#FF0000", true);
        addText(gs, W/2, H/2, boss.emoji + " " + boss.name.toUpperCase(), boss.color, true);
        gs.screenShake = 15;
      } else {
        gs.maxEnemiesThisWave = 5 + gs.currentWave * 3;
      }
      setWave(gs.currentWave);
      addText(gs, W/2, H/2+35, "WAVE " + gs.currentWave + (isBoss?" - BOSS":""), "#FFD700", true);
      const waveBonus = isBoss ? gs.currentWave * 250 : gs.currentWave * 100;
      gs.score += waveBonus; setScore(gs.score);
      addText(gs, W/2, H/2+60, "+" + waveBonus + " WAVE BONUS", "#00FF88");
      setTip(TIPS[Math.floor(Math.random()*TIPS.length)]);
    }

    gs.bullets = gs.bullets.filter(b => {
      b.x += b.vx; b.y += b.vy; b.life--;
      if (b.trail) addParticles(gs, b.x, b.y, b.color, 1);
      return b.life>0 && b.x>-10 && b.x<W+10 && b.y>-10 && b.y<H+10;
    });

    gs.enemyBullets = gs.enemyBullets.filter(eb => {
      eb.x += eb.vx; eb.y += eb.vy; eb.life--;
      return eb.life > 0 && eb.x > -10 && eb.x < W+10 && eb.y > -10 && eb.y < H+10;
    });

    if (dashRef.current.active <= 0) {
      gs.enemyBullets.forEach(eb => {
        const d = Math.hypot(eb.x-p.x, eb.y-p.y);
        if (d < 18 && p.invincible <= 0) {
          eb.life = 0;
          const dmg = eb.damage || 8;
          p.health -= dmg; p.invincible = 20; gs.screenShake = 5; gs.damageFlash = 8;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y-30, "-" + dmg, "#FF4444");
          if (p.health <= 0) { handlePlayerDeath(gs); }
        }
      });
    }

    gs.grenades = gs.grenades.filter(g => {
      g.x += g.vx; g.y += g.vy; g.vx *= 0.96; g.vy *= 0.96; g.life--;
      if (g.life <= 0) {
        addParticles(gs, g.x, g.y, "#FF4500", 30);
        addParticles(gs, g.x, g.y, "#FFD700", 20);
        addText(gs, g.x, g.y, "BOOM!", "#FF4500", true);
        gs.screenShake = 15;
        gs.enemies.forEach(e => {
          const d = Math.hypot(e.x-g.x, e.y-g.y);
          if (d < 130) { const rawDmg = 70*(1-d/130); const gShieldMult = (e.isBoss && e.shieldActive) ? 0.25 : 1; const dmg = rawDmg * gShieldMult; e.health -= dmg; e.hitFlash = 10; gs.totalDamage += dmg; }
        });
        return false;
      }
      return true;
    });

    gs.bullets.forEach(b => {
      gs.enemies.forEach(e => {
        const d = Math.hypot(b.x-e.x, b.y-e.y);
        if (d < e.size/2 + b.size) {
          const comboMult = 1 + comboRef.current.count * 0.1;
          const isCrit = Math.random() < CRIT_CHANCE;
          const shieldMult = (e.isBoss && e.shieldActive) ? 0.25 : 1;
          const dmg = b.damage * comboMult * (isCrit ? CRIT_MULT : 1) * shieldMult;
          e.health -= dmg; e.hitFlash = isCrit ? 15 : 8; b.life = 0; gs.totalDamage += dmg;
          if (isCrit) statsRef.current.crits++;
          addParticles(gs, b.x, b.y, isCrit ? "#FFD700" : e.color, isCrit ? 10 : 5);
          gs.screenShake = Math.max(gs.screenShake, isCrit ? 6 : 2);
          const hitText = shieldMult < 1 ? "🛡 SHIELDED!" : isCrit ? "💥 CRIT!" : HITMARKERS[Math.floor(Math.random()*HITMARKERS.length)];
          const hitColor = shieldMult < 1 ? "#00BFFF" : isCrit ? "#FFD700" : "#FFF";
          addText(gs, e.x+(Math.random()-0.5)*20, e.y-e.size/2-Math.random()*10, hitText, hitColor);
          if (e.health <= 0) {
            comboRef.current.count++; comboRef.current.timer = 120;
            if (comboRef.current.count > comboRef.current.max) comboRef.current.max = comboRef.current.count;
            setCombo(comboRef.current.count);
            const pts = Math.floor(e.points * comboMult);
            gs.score += pts; gs.kills++; gs.killstreakCount++;
            if (gs.killstreakCount > statsRef.current.bestStreak) statsRef.current.bestStreak = gs.killstreakCount;
            if (e.typeIndex === 4 || e.typeIndex === 9 || e.isBoss) statsRef.current.bossKills++;
            if (e.typeIndex === 9) statsRef.current.landlordKills++;
            if (e.typeIndex === 10) statsRef.current.cryptoKills++;
            setScore(gs.score); setKills(gs.kills); setKillstreak(gs.killstreakCount);
            setBestStreak(statsRef.current.bestStreak); setTotalDamage(Math.floor(gs.totalDamage));
            addParticles(gs, e.x, e.y, e.color, 20);
            addText(gs, e.x, e.y-30, "+" + pts + (comboRef.current.count>1?" (x"+comboRef.current.count+")":""), "#FFD700");
            addText(gs, e.x, e.y-50, e.deathQuote, "#FF69B4");
            addKillFeed(e.name, WEAPONS[wpnIdx].name);
            addXp(pts); gs.killFlash = 6;
            checkAchievements(gs);
            if (KILL_MILESTONES[gs.kills]) {
              addText(gs, W/2, H/2 - 90, KILL_MILESTONES[gs.kills], "#FF44FF", true);
              addText(gs, W/2, H/2 - 65, gs.kills + " KILLS!", "#FFF", true);
              gs.screenShake = 10;
              addParticles(gs, W/2, H/2 - 80, "#FF44FF", 20);
            }
            if (gs.killstreakCount % 5 === 0 && gs.killstreakCount > 0) {
              const ki = Math.min(Math.floor(gs.killstreakCount/5)-1, KILLSTREAKS.length-1);
              addText(gs, W/2, 80, KILLSTREAKS[ki] + "!", "#FF4500", true);
              gs.enemies.forEach(en => { en.health -= 40; en.hitFlash = 15; });
              gs.screenShake = 12;
            }
            const isABoss = e.typeIndex === 4 || e.typeIndex === 9 || e.isBoss;
            if (isABoss && extraLivesRef.current === 0 && Math.random() < (e.isBoss ? 0.35 : 0.12)) {
              gs.pickups.push({x:e.x,y:e.y,type:"guardian_angel",life:600});
            } else if (Math.random() < 0.25) {
              const types = ["health","ammo","speed","nuke"];
              const weights = [0.4,0.35,0.2,0.05];
              let roll = Math.random(), cumul = 0, pType = "health";
              for (let i=0;i<types.length;i++){cumul+=weights[i];if(roll<cumul){pType=types[i];break;}}
              gs.pickups.push({x:e.x,y:e.y,type:pType,life:400});
            }
            e.health = -999;
          }
        }
      });
    });
    gs.enemies = gs.enemies.filter(e => e.health > -999);

    gs.enemies.forEach(e => {
      const a = Math.atan2(p.y-e.y, p.x-e.x);
      e.wobble += 0.1;
      const zigzag = e.typeIndex === 10 ? Math.sin(e.wobble * 3) * 3 : 0;
      e.x += Math.cos(a)*e.speed + Math.sin(e.wobble)*0.5 + Math.cos(a + Math.PI/2)*zigzag;
      e.y += Math.sin(a)*e.speed + Math.cos(e.wobble)*0.5 + Math.sin(a + Math.PI/2)*zigzag;
      if (e.hitFlash > 0) e.hitFlash--;
      if (e.ranged) {
        e.shootTimer++;
        if (e.shootTimer >= e.projRate) {
          e.shootTimer = 0;
          const pa = Math.atan2(p.y-e.y, p.x-e.x);
          if (e.isBoss && (e.special === "multi_shot" || e.special === "all")) {
            for (let si = -2; si <= 2; si++) {
              const sa = pa + si * 0.25;
              gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa)*e.projSpeed, vy: Math.sin(sa)*e.projSpeed, life: 90, size: 6, color: e.color, damage: 12 });
            }
          } else {
            gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa)*e.projSpeed, vy: Math.sin(pa)*e.projSpeed, life: 90, size: e.isBoss?6:4, color: e.color, damage: e.isBoss ? 15 : 6 + e.typeIndex * 2 });
          }
        }
        if (e.isBoss && (e.special === "summon" || e.special === "all")) {
          e.specialTimer = (e.specialTimer||0) + 1;
          if (e.specialTimer >= 300 && gs.enemies.filter(en=>!en.isBoss).length < 6) {
            e.specialTimer = 0;
            spawnEnemy(gs);
            addText(gs, e.x, e.y - e.size/2 - 20, "SUMMON!", e.color);
          }
        }
        if (e.isBoss && (e.special === "shield" || e.special === "all")) {
          if (e.shieldActive) {
            e.shieldTimer = (e.shieldTimer||0) + 1;
            if (e.shieldTimer >= 180) { e.shieldActive = false; e.shieldTimer = 0; e.shieldCooldown = 0; }
          } else {
            e.shieldCooldown = (e.shieldCooldown||0) + 1;
            if (e.shieldCooldown >= 360) { e.shieldActive = true; e.shieldTimer = 0; e.shieldCooldown = 0; addText(gs, e.x, e.y - e.size/2 - 20, "🛡 SHIELD!", "#00BFFF"); }
          }
        }
      }
      if (dashRef.current.active <= 0) {
        const d2 = Math.hypot(p.x-e.x, p.y-e.y);
        if (d2 < e.size/2+15 && p.invincible <= 0) {
          const dmg = 10 + e.typeIndex*5;
          p.health -= dmg; p.invincible = 30; gs.screenShake = 8; gs.damageFlash = 10;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y-30, "-" + dmg + " HP", "#FF0000");
          if (p.health <= 0) { handlePlayerDeath(gs); }
        }
      }
    });

    gs.pickups = gs.pickups.filter(pk => {
      pk.life--;
      const d2 = Math.hypot(p.x-pk.x, p.y-pk.y);
      if (d2 < 30) {
        if (pk.type==="health") { const maxHP = p.maxHealth || 100; p.health = Math.min(maxHP,p.health+30); setHealth(p.health); addText(gs,pk.x,pk.y,"+30 HP","#00FF00"); }
        else if (pk.type==="ammo") { const uw=getUpgradedWeapon(wpnIdx,weaponUpgradesRef.current); gs.ammoCount = uw.maxAmmo; setAmmo(gs.ammoCount); addText(gs,pk.x,pk.y,"MAX AMMO","#00BFFF"); }
        else if (pk.type==="speed") { p.speed = Math.min(8,p.speed+0.5); addText(gs,pk.x,pk.y,"SPEED!","#FFFF00"); setTimeout(()=>{if(gsRef.current)gsRef.current.player.speed=Math.max(4,gsRef.current.player.speed-0.5);},5000); }
        else if (pk.type==="nuke") { statsRef.current.nukes++; addText(gs,W/2,H/2,"TACTICAL NUKE!","#FF0000",true); gs.enemies.forEach(en=>{en.health=-999;gs.score+=en.points;addParticles(gs,en.x,en.y,en.color,10);}); gs.enemies=[]; gs.screenShake=20; setScore(gs.score); checkAchievements(gs); }
        else if (pk.type==="guardian_angel") { extraLivesRef.current = 1; setExtraLives(1); statsRef.current.guardianAngels++; addText(gs,pk.x,pk.y-20,"GUARDIAN ANGEL!","#FFD700",true); addText(gs,pk.x,pk.y+10,"+1 EXTRA LIFE","#FFFFFF"); addParticles(gs,pk.x,pk.y,"#FFD700",25); addParticles(gs,pk.x,pk.y,"#FFFFFF",15); gs.screenShake=8; checkAchievements(gs); }
        addXp(50); return false;
      }
      return pk.life > 0;
    });

    gs.particles = gs.particles.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vx*=0.95;pt.vy*=0.95;pt.life--;return pt.life>0;});
    gs.floatingTexts = gs.floatingTexts.filter(ft=>{ft.y+=ft.vy;ft.life--;return ft.life>0;});
    if (gs.screenShake>0) gs.screenShake *= 0.85;
    if (gs.muzzleFlash>0) gs.muzzleFlash--;
    if (gs.damageFlash>0) gs.damageFlash--;
    if (gs.killFlash>0) gs.killFlash--;

    // ===== RENDER =====
    ctx.save();
    if (gs.screenShake>0.5) ctx.translate((Math.random()-0.5)*gs.screenShake*2,(Math.random()-0.5)*gs.screenShake*2);
    const bgGrad = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.7);
    bgGrad.addColorStop(0,"#1e1e3a"); bgGrad.addColorStop(1,"#0e0e1a");
    ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = "rgba(100,100,180,0.06)"; ctx.lineWidth = 1;
    for (let gx=0;gx<W;gx+=50){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
    for (let gy=0;gy<H;gy+=50){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}

    gs.trail.forEach(t => {
      ctx.globalAlpha = t.life/15*0.2;
      ctx.fillStyle = dashRef.current.active>0?"#00FFFF":"#44AA44";
      ctx.beginPath(); ctx.arc(t.x,t.y,10,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    gs.pickups.forEach(pk => {
      const bob = Math.sin(Date.now()/200+pk.x)*3;
      const ps = 1+Math.sin(Date.now()/300)*0.15;
      ctx.save(); ctx.translate(pk.x,pk.y+bob); ctx.scale(ps,ps);
      const em = pk.type==="health"?"\uD83D\uDC8A":pk.type==="ammo"?"\uD83D\uDCE6":pk.type==="speed"?"\u26A1":pk.type==="guardian_angel"?"\uD83D\uDE07":"\u2622\uFE0F";
      ctx.font=pk.type==="guardian_angel"?"28px serif":"22px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(em,0,0);
      ctx.globalAlpha=0.15;
      ctx.fillStyle=pk.type==="health"?"#0F0":pk.type==="ammo"?"#0BF":pk.type==="speed"?"#FF0":pk.type==="guardian_angel"?"#FFD700":"#F00";
      if(pk.type==="guardian_angel"){ctx.globalAlpha=0.25+Math.sin(Date.now()/200)*0.1;}
      ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.restore();
    });

    gs.grenades.forEach(g => {
      ctx.save(); ctx.translate(g.x,g.y);
      ctx.font=(g.size*2)+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("\uD83D\uDCA3",0,0); ctx.restore();
    });

    gs.enemyBullets.forEach(eb => {
      ctx.save(); ctx.translate(eb.x, eb.y);
      ctx.fillStyle = eb.color||"#F44"; ctx.shadowColor = eb.color||"#F44"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(0,0,eb.size,0,Math.PI*2); ctx.fill(); ctx.restore();
    });

    gs.enemies.forEach(e => {
      ctx.save(); ctx.translate(e.x,e.y);
      ctx.fillStyle="rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(0,e.size/2,e.size/2,e.size/6,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = e.hitFlash>0?"#FFF":e.color;
      ctx.beginPath(); ctx.arc(0,0,e.size/2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=2; ctx.stroke();
      if (e.ranged) { ctx.strokeStyle = "rgba(255,100,100,"+(0.3+Math.sin(Date.now()/300)*0.2)+")"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,0,e.size/2+4,0,Math.PI*2); ctx.stroke(); }
      if (e.isBoss) {
        ctx.strokeStyle = e.color; ctx.lineWidth=2; ctx.globalAlpha=0.3+Math.sin(Date.now()/200)*0.2;
        ctx.beginPath(); ctx.arc(0,0,e.size/2+8,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,e.size/2+14,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
        if (e.shieldActive) {
          const pulse = 0.4+Math.sin(Date.now()/150)*0.3;
          ctx.strokeStyle = `rgba(0,191,255,${pulse})`; ctx.lineWidth=3;
          ctx.beginPath(); ctx.arc(0,0,e.size/2+20,0,Math.PI*2); ctx.stroke();
          ctx.fillStyle = `rgba(0,100,255,${pulse*0.15})`;
          ctx.beginPath(); ctx.arc(0,0,e.size/2+20,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.font=(e.size*0.55)+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(e.emoji,0,-2);
      if (e.health<e.maxHealth) {
        const bw=e.size;
        ctx.fillStyle="#222"; ctx.fillRect(-bw/2,-e.size/2-12,bw,5);
        ctx.fillStyle=e.health>e.maxHealth*0.5?"#0F0":e.health>e.maxHealth*0.25?"#FA0":"#F00";
        ctx.fillRect(-bw/2,-e.size/2-12,bw*(e.health/e.maxHealth),5);
      }
      ctx.fillStyle="#FFF"; ctx.font="bold 9px monospace"; ctx.textAlign="center";
      ctx.fillText(e.name,0,e.size/2+13);
      ctx.restore();
    });

    gs.bullets.forEach(b => {
      ctx.save(); ctx.translate(b.x,b.y);
      ctx.fillStyle=b.color; ctx.shadowColor=b.color; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(0,0,b.size,0,Math.PI*2); ctx.fill(); ctx.restore();
    });

    gs.particles.forEach(pt => {
      ctx.globalAlpha=pt.life/pt.maxLife; ctx.fillStyle=pt.color;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size*(pt.life/pt.maxLife),0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;

    ctx.save(); ctx.translate(p.x,p.y);
    ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0,15,18,6,0,0,Math.PI*2); ctx.fill();
    ctx.rotate(p.angle);
    if (p.invincible>0 && Math.floor(p.invincible/3)%2===0) ctx.globalAlpha=0.4;
    if (dashRef.current.active>0) { ctx.globalAlpha=0.6; ctx.shadowColor="#0FF"; ctx.shadowBlur=15; }
    const curWpn=WEAPONS[wpnIdx];
    ctx.fillStyle="#666"; ctx.fillRect(10,-3,20,6);
    ctx.fillStyle=curWpn.color; ctx.fillRect(25,-4,8,8);
    if (gs.muzzleFlash>0) {
      ctx.fillStyle="rgba(255,255,100,"+(gs.muzzleFlash/4)+")";
      ctx.beginPath(); ctx.arc(35,0,10+gs.muzzleFlash*2,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle="#44AA44"; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#2D7D2D"; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle="#336633"; ctx.beginPath(); ctx.arc(0,0,12,-Math.PI*0.8,Math.PI*0.8); ctx.fill();
    ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.restore();

    const activeBoss = gs.enemies.find(e => e.isBoss);
    if (activeBoss) {
      const bw = W * 0.5, bh = 8, bx = W/2 - bw/2, by = H - (isMobile ? 70 : 30);
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx-2, by-16, bw+4, 28);
      ctx.strokeStyle = activeBoss.color; ctx.lineWidth = 1; ctx.strokeRect(bx-2, by-16, bw+4, 28);
      ctx.fillStyle = "#FFF"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
      ctx.fillText(activeBoss.emoji + " " + activeBoss.name.toUpperCase(), W/2, by-5);
      ctx.fillStyle = "#333"; ctx.fillRect(bx, by+2, bw, bh);
      const hpPct = Math.max(0, activeBoss.health / activeBoss.maxHealth);
      ctx.fillStyle = hpPct > 0.5 ? "#FF1493" : hpPct > 0.25 ? "#FF4500" : "#FF0000";
      ctx.fillRect(bx, by+2, bw * hpPct, bh);
    }

    gs.floatingTexts.forEach(ft => {
      ctx.globalAlpha=ft.life/(ft.big?90:60); ctx.fillStyle=ft.color;
      ctx.font=ft.big?"bold 22px monospace":"bold 13px monospace"; ctx.textAlign="center";
      ctx.strokeStyle="#000"; ctx.lineWidth=ft.big?4:3;
      ctx.strokeText(ft.text,ft.x,ft.y); ctx.fillText(ft.text,ft.x,ft.y);
    });
    ctx.globalAlpha=1;

    const rs=45, rx=W-rs-8, ry=isMobile?52:48;
    ctx.globalAlpha=0.35; ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(rx,ry,rs,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#0F0"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(rx,ry,rs,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=0.7;
    ctx.fillStyle="#0F0"; ctx.beginPath(); ctx.arc(rx,ry,2,0,Math.PI*2); ctx.fill();
    gs.enemies.forEach(e => {
      const edx=(e.x-p.x)/(W*0.6)*rs, edy=(e.y-p.y)/(H*0.6)*rs;
      if (Math.hypot(edx,edy)<rs-2) {
        ctx.fillStyle=e.typeIndex>=4?"#F00":e.ranged?"#F80":"#FF0";
        ctx.beginPath(); ctx.arc(rx+edx,ry+edy,e.typeIndex>=4?3:2,0,Math.PI*2); ctx.fill();
      }
    });
    ctx.globalAlpha=1;
    if (gs.damageFlash>0) { ctx.fillStyle="rgba(255,0,0,"+(gs.damageFlash*0.03)+")"; ctx.fillRect(0,0,W,H); }
    if (gs.killFlash>0) { ctx.fillStyle="rgba(255,215,0,"+(gs.killFlash*0.015)+")"; ctx.fillRect(0,0,W,H); }

    const drawStick=(ref,baseColor)=>{
      if(!ref.current.active) return;
      const j=ref.current, rect=canvas.getBoundingClientRect();
      const sx=W/rect.width,sy=H/rect.height;
      const cx=(j.startX-rect.left)*sx,cy=(j.startY-rect.top)*sy;
      ctx.globalAlpha=0.15; ctx.fillStyle=baseColor;
      ctx.beginPath(); ctx.arc(cx,cy,60,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.45;
      const clampD=Math.min(Math.hypot(j.dx,j.dy),50);
      const ang=Math.atan2(j.dy,j.dx);
      ctx.beginPath(); ctx.arc(cx+Math.cos(ang)*clampD*sx,cy+Math.sin(ang)*clampD*sy,22,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    };
    drawStick(joystickRef,"#FFF"); drawStick(shootStickRef,"#F66");

    if (gs.currentWave <= 3) {
      ctx.globalAlpha=0.5; ctx.fillStyle="#FFF"; ctx.font="11px monospace"; ctx.textAlign="center";
      ctx.fillText(tip,W/2,H-10); ctx.globalAlpha=1;
    }

    ctx.restore();
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [shoot, spawnEnemy, doReload, isMobile, checkAchievements, tip, handlePlayerDeath]);

  useEffect(() => {
    if (screen !== "game") { if (frameRef.current) cancelAnimationFrame(frameRef.current); return; }
    const gs = gsRef.current;
    if (gs) gs.ammoCount = WEAPONS[currentWeaponRef.current].maxAmmo;
    frameRef.current = requestAnimationFrame(gameLoop);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [screen, gameLoop]);

  useEffect(() => {
    const kd = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        if (e.key === "Escape" && screen === "game") { setPaused(p => {if(!p) setPauseView("main"); return !p;}); e.preventDefault(); }
        return;
      }
      if (e.key === "Escape") {
        if (showLeaderboard) { setShowLeaderboard(false); e.preventDefault(); return; }
        if (showAchievements) { setShowAchievements(false); e.preventDefault(); return; }
        if (showArmory) { setShowArmory(false); e.preventDefault(); return; }
        if (showCareer) { setShowCareer(false); e.preventDefault(); return; }
        if (screen === "game" && pausedRef.current && pauseView !== "main") { setPauseView("main"); e.preventDefault(); return; }
        if (screen === "game") { setPaused(p => {if(!p) setPauseView("main"); return !p;}); e.preventDefault(); return; }
        if (screen === "menu" && menuView !== "main") { setMenuView("main"); e.preventDefault(); return; }
      }
      if (pausedRef.current) return;
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "r") doReload(currentWeaponRef.current);
      if (e.key === "q" || e.key === "g" || e.key === "5") throwGrenade();
      if (e.key === " " || e.key === "Shift") doDash();
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        const uw = getUpgradedWeapon(num-1, weaponUpgradesRef.current);
        setCurrentWeapon(num-1); currentWeaponRef.current = num-1;
        setAmmo(uw.maxAmmo); setIsReloading(false); isReloadingRef.current = false;
        if (gsRef.current) gsRef.current.ammoCount = uw.maxAmmo;
      }
      if (["w","a","s","d","r","q","g","1","2","3","4","5"," "].includes(e.key.toLowerCase()) || e.key === "Shift") e.preventDefault();
    };
    const ku = (e) => keysRef.current[e.key.toLowerCase()] = false;
    const mm = (e) => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; mouseRef.current.moved = true; };
    const md = (e) => { if (e.button===0 && !pausedRef.current) mouseRef.current.down = true; };
    const mu = (e) => { if (e.button===0) mouseRef.current.down = false; };
    window.addEventListener("keydown",kd); window.addEventListener("keyup",ku);
    window.addEventListener("mousemove",mm); window.addEventListener("mousedown",md); window.addEventListener("mouseup",mu);
    return () => { window.removeEventListener("keydown",kd); window.removeEventListener("keyup",ku); window.removeEventListener("mousemove",mm); window.removeEventListener("mousedown",md); window.removeEventListener("mouseup",mu); };
  }, [doReload, throwGrenade, doDash, screen, showLeaderboard, showAchievements, showArmory, showCareer, pauseView, menuView]);

  useEffect(() => {
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ts = (e) => {
      if (pausedRef.current) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect(), midX = rect.left+rect.width/2;
      for (const t of e.changedTouches) {
        if (t.clientX<midX && !joystickRef.current.active) joystickRef.current={active:true,startX:t.clientX,startY:t.clientY,dx:0,dy:0,id:t.identifier};
        else if (t.clientX>=midX && !shootStickRef.current.active) shootStickRef.current={active:true,startX:t.clientX,startY:t.clientY,dx:0,dy:0,id:t.identifier,shooting:false};
      }
    };
    const tm = (e) => {
      if (pausedRef.current) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier===joystickRef.current.id){joystickRef.current.dx=t.clientX-joystickRef.current.startX;joystickRef.current.dy=t.clientY-joystickRef.current.startY;}
        if (t.identifier===shootStickRef.current.id){shootStickRef.current.dx=t.clientX-shootStickRef.current.startX;shootStickRef.current.dy=t.clientY-shootStickRef.current.startY;}
      }
    };
    const te = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier===joystickRef.current.id) joystickRef.current={active:false,startX:0,startY:0,dx:0,dy:0,id:null};
        if (t.identifier===shootStickRef.current.id) shootStickRef.current={active:false,startX:0,startY:0,dx:0,dy:0,id:null,shooting:false};
      }
    };
    canvas.addEventListener("touchstart",ts,{passive:false});
    canvas.addEventListener("touchmove",tm,{passive:false});
    canvas.addEventListener("touchend",te); canvas.addEventListener("touchcancel",te);
    return () => { canvas.removeEventListener("touchstart",ts); canvas.removeEventListener("touchmove",tm); canvas.removeEventListener("touchend",te); canvas.removeEventListener("touchcancel",te); };
  }, [screen]);

  const switchWeapon = (idx) => {
    const uw = getUpgradedWeapon(idx, weaponUpgradesRef.current);
    setCurrentWeapon(idx); currentWeaponRef.current = idx;
    setAmmo(uw.maxAmmo); setIsReloading(false); isReloadingRef.current = false;
    if (gsRef.current) gsRef.current.ammoCount = uw.maxAmmo;
  };

  const respawn = () => {
    const gs = gsRef.current, W = GW(), H = GH();
    if (gs) {
      gs.player.health=100; gs.player.x=W/2; gs.player.y=H/2; gs.player.invincible=60;
      gs.ammoCount=WEAPONS[currentWeaponRef.current].maxAmmo;
      gs.enemies=[]; gs.bullets=[]; gs.grenades=[]; gs.enemyBullets=[]; gs.enemiesThisWave=0;
      setHealth(100); setAmmo(WEAPONS[currentWeaponRef.current].maxAmmo);
      setIsReloading(false); isReloadingRef.current=false; setSubmitted(false); setLastWords("");
    }
    startTimeRef.current = Date.now(); setTimeSurvived(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{if(!pausedRef.current) setTimeSurvived(t=>t+1);},1000);
    setScreen("game");
  };

  const fmtTime = (s) => Math.floor(s/60)+":"+String(s%60).padStart(2,"0");

  const submitScore = async () => {
    const words = lastWords.trim().split(/\s+/).filter(Boolean);
    if (words.length > 5) { setLastWords(words.slice(0,5).join(" ")); return; }
    const entry = {
      name: username, score, kills, wave, lastWords: lastWords.trim() || "...",
      rank: RANK_NAMES[Math.min(Math.floor(kills/10), RANK_NAMES.length-1)],
      bestStreak, totalDamage, level, time: fmtTime(timeSurvived),
      achievements: achievementsUnlocked.length, difficulty,
    };
    const board = await saveToLeaderboard(entry);
    setLeaderboard(board); setSubmitted(true);
  };

  const rankIndex = Math.min(Math.floor(kills/10), RANK_NAMES.length-1);
  const weapon = WEAPONS[currentWeapon];
  const xpNeeded = level * 500;

  const base = {
    width:"100%", height:"100dvh", margin:0, overflow:"hidden",
    background:"#0a0a0a", fontFamily:"'Courier New', monospace",
    display:"flex", flexDirection:"column", position:"relative",
    touchAction:"none", userSelect:"none", WebkitUserSelect:"none",
  };
  const scrollBase = {
    ...base, overflow:"hidden auto", alignItems:"center",
    color:"#fff", boxSizing:"border-box",
    touchAction:"manipulation", userSelect:"none", WebkitUserSelect:"none",
  };
  const btnP = { padding:isMobile?"12px 24px":"14px 40px", fontSize:isMobile?15:18, fontWeight:900, fontFamily:"'Courier New',monospace", background:"linear-gradient(180deg,#FF6B35,#CC4400)", color:"#FFF", border:"none", borderRadius:8, cursor:"pointer", letterSpacing:2, textTransform:"uppercase", boxShadow:"0 4px 15px rgba(255,107,53,0.3)", transition:"transform 0.1s, box-shadow 0.1s" };
  const btnS = { ...btnP, background:"rgba(255,255,255,0.06)", color:"#CCC", border:"1px solid rgba(255,255,255,0.15)", boxShadow:"none" };
  const card = { background:"rgba(255,255,255,0.04)", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", padding:isMobile?12:16 };
  const closeBtnStyle = { position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#FFF",fontSize:18,fontWeight:900,cursor:"pointer",fontFamily:"monospace",width:isMobile?44:36,height:isMobile?44:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",transition:"background 0.15s, transform 0.1s" };
  const overlayBackdrop = { position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?8:12,backdropFilter:"blur(4px)",touchAction:"manipulation" };
  const menuWidth = isMobile ? "100%" : isTablet ? 560 : 620;
  const sectionGap = isMobile ? 10 : 16;

  const Tooltip = ({ text, visible }) => {
    if (!visible) return null;
    return (
      <div style={{position:"absolute",bottom:"100%",left:"50%",transform:"translateX(-50%)",marginBottom:8,background:"rgba(0,0,0,0.92)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,padding:"6px 10px",color:"#FFF",fontSize:11,whiteSpace:"nowrap",pointerEvents:"none",zIndex:20,maxWidth:220,textAlign:"center"}}>
        {text}
        <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid rgba(0,0,0,0.92)"}} />
      </div>
    );
  };

  // ======== USERNAME ========
  if (screen === "username") {
    return (
      <div style={{...base,alignItems:"center",justifyContent:"center",color:"#fff",padding:20,boxSizing:"border-box",touchAction:"manipulation"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 50% 30%, rgba(255,107,53,0.08) 0%, transparent 60%)"}} />
        <div style={{textAlign:"center",maxWidth:420,width:"100%",position:"relative",zIndex:1}}>
          <div style={{fontSize:56,marginBottom:12,filter:"drop-shadow(0 0 20px rgba(255,215,0,0.3))"}}>🎮</div>
          <h1 style={{fontSize:"clamp(32px,8vw,56px)",fontWeight:900,margin:0,background:"linear-gradient(180deg,#FFD700,#FF6B00)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-1,filter:"drop-shadow(0 0 20px rgba(255,107,0,0.4))"}}>CALL OF DOODIE</h1>
          <div style={{fontSize:"clamp(8px,2vw,12px)",color:"#FF6B35",letterSpacing:4,marginTop:4}}>MODERN WARFARE ON MOM'S WIFI</div>
          <p style={{color:"#999",fontSize:13,margin:"20px 0 24px",letterSpacing:1}}>ENTER YOUR CALLSIGN, SOLDIER</p>
          <input type="text" value={username} maxLength={20}
            onChange={e => setUsername(e.target.value)}
            placeholder="xX_N00bSlayer_Xx"
            style={{width:"100%",padding:"14px 16px",fontSize:18,fontFamily:"'Courier New',monospace",background:"rgba(255,255,255,0.06)",border:"2px solid rgba(255,255,255,0.15)",borderRadius:8,color:"#FFD700",textAlign:"center",outline:"none",letterSpacing:1,boxSizing:"border-box",transition:"border-color 0.2s"}}
            onFocus={e=>e.target.style.borderColor="#FF6B35"}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.15)"}
            onKeyDown={e=>{if(e.key==="Enter"&&username.trim().length>=2)setScreen("menu");}}
          />
          <div style={{fontSize:11,color:"#666",margin:"8px 0 24px",letterSpacing:1}}>2-20 characters</div>
          <button onClick={()=>{if(username.trim().length>=2)setScreen("menu");}} disabled={username.trim().length<2}
            style={{...btnP,opacity:username.trim().length<2?0.4:1,width:"100%",maxWidth:260,fontSize:16,padding:"16px 40px"}}>LOCK IN</button>
        </div>
      </div>
    );
  }

  // ======== LEADERBOARD ========
  const LeaderboardPanel = ({onClose}) => (
    <div onClick={(e)=>{if(e.target===e.currentTarget)onClose();}} style={{...overlayBackdrop,background:"rgba(0,0,0,0.88)"}}>
      <div style={{...card,maxWidth:560,width:"100%",maxHeight:"88vh",overflow:"auto",position:"relative",border:"1px solid rgba(255,215,0,0.2)",padding:isMobile?"16px 10px 16px 10px":"18px 14px",color:"#fff"}}>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
        <h3 style={{color:"#FFD700",margin:"0 0 4px",fontSize:18,letterSpacing:2}}>HALL OF SHAME</h3>
        <p style={{color:"#BBB",fontSize:10,margin:"0 0 14px"}}>Top 100 - Global leaderboard</p>
        {lbLoading ? <p style={{color:"#DDD",fontSize:13}}>Loading...</p> : leaderboard.length === 0 ? (
          <p style={{color:"#CCC",fontStyle:"italic",fontSize:13}}>No entries yet. Be the first to die gloriously!</p>
        ) : (
          <div style={{fontSize:11}}>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 65px 36px 44px 1fr",gap:4,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.15)",color:"#DDD",fontWeight:700,fontSize:9,letterSpacing:1}}>
              <span>#</span><span>PLAYER</span><span style={{textAlign:"right"}}>SCORE</span><span style={{textAlign:"right"}}>W</span><span style={{textAlign:"right"}}>TIME</span><span style={{textAlign:"right",paddingRight:4}}>LAST WORDS</span>
            </div>
            {leaderboard.map((e,i) => {
              const isMe = e.name === username;
              const medal = i<3 ? ["\uD83E\uDD47","\uD83E\uDD48","\uD83E\uDD49"][i] : String(i+1);
              const rowColor = i<3 ? ["#FFD700","#E0E0E0","#CD7F32"][i] : "#EEE";
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr 65px 36px 44px 1fr",gap:4,padding:"7px 2px",borderBottom:"1px solid rgba(255,255,255,0.06)",color:rowColor,background:isMe?"rgba(255,107,53,0.12)":"transparent",borderRadius:4,alignItems:"center"}}>
                  <span style={{fontWeight:900,fontSize:i<3?14:11}}>{medal}</span>
                  <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    <span style={{fontWeight:700}}>{e.name}</span>
                    {e.level && <span style={{color:"#BBB",fontSize:9,marginLeft:4}}>Lv{e.level}</span>}
                  </div>
                  <span style={{textAlign:"right",fontWeight:900,fontVariantNumeric:"tabular-nums"}}>{e.score?.toLocaleString()}</span>
                  <span style={{textAlign:"right",color:"#CCC",fontSize:10}}>{e.wave}</span>
                  <span style={{textAlign:"right",color:"#BBB",fontSize:10,fontVariantNumeric:"tabular-nums"}}>{e.time||"--"}</span>
                  <span style={{textAlign:"right",color:"#FF69B4",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:10,paddingRight:4}}>"{e.lastWords}"</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ======== PAUSE MENU ========
  // ======== CAREER ACHIEVEMENTS PANEL ========
  const AchievementsPanel = ({onClose}) => {
    const tierColors = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", legendary: "#FF44FF" };
    const tierNames = { bronze: "BRONZE", silver: "SILVER", gold: "GOLD", legendary: "LEGENDARY" };
    const unlocked = achievementsUnlocked.length;
    const total = ACHIEVEMENTS.length;
    const pct = Math.round((unlocked / total) * 100);
    return (
      <div onClick={(e)=>{if(e.target===e.currentTarget)onClose();}} style={{...overlayBackdrop,background:"rgba(0,0,0,0.9)",zIndex:110}}>
        <div style={{...card,maxWidth:520,width:"100%",maxHeight:"88vh",overflow:"auto",position:"relative",border:"1px solid rgba(255,215,0,0.25)",padding:isMobile?"16px 10px 16px 10px":"18px 14px",color:"#fff"}}>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
          <h3 style={{color:"#FFD700",margin:"0 0 2px",fontSize:18,letterSpacing:2}}>🏅 CAREER ACHIEVEMENTS</h3>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#CCC",marginBottom:3}}>
              <span>{unlocked}/{total} UNLOCKED</span><span>{pct}%</span>
            </div>
            <div style={{height:6,background:"rgba(255,255,255,0.1)",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#FF6B35,#FFD700)",borderRadius:3,transition:"width 0.3s"}} />
            </div>
          </div>
          {["legendary","gold","silver","bronze"].map(tier => {
            const tierAchs = ACHIEVEMENTS.filter(a => a.tier === tier);
            if (tierAchs.length === 0) return null;
            return (
              <div key={tier} style={{marginBottom:12}}>
                <div style={{fontSize:10,color:tierColors[tier],fontWeight:900,letterSpacing:2,marginBottom:6,borderBottom:"1px solid "+tierColors[tier]+"44",paddingBottom:4}}>
                  {tierNames[tier]} ({tierAchs.filter(a=>achievementsUnlocked.includes(a.id)).length}/{tierAchs.length})
                </div>
                {tierAchs.map(a => {
                  const isUnlocked = achievementsUnlocked.includes(a.id);
                  return (
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",borderRadius:6,marginBottom:2,background:isUnlocked?"rgba(255,215,0,0.06)":"transparent",opacity:isUnlocked?1:0.45}}>
                      <span style={{fontSize:20,filter:isUnlocked?"none":"grayscale(1)"}}>{a.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:isUnlocked?tierColors[tier]:"#999"}}>{a.name}</div>
                        <div style={{fontSize:10,color:isUnlocked?"#CCC":"#666"}}>{a.desc}</div>
                      </div>
                      {isUnlocked && <span style={{fontSize:10,color:"#0F0",fontWeight:900}}>✓</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ======== PAUSE MENU ========
  const PauseMenu = () => {
    const pBtn = {padding:isMobile?"14px 24px":"12px 24px",fontSize:isMobile?16:15,fontWeight:900,fontFamily:"'Courier New',monospace",background:"rgba(255,255,255,0.08)",color:"#FFF",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,cursor:"pointer",width:"100%",maxWidth:300,touchAction:"manipulation",WebkitTapHighlightColor:"transparent",transition:"background 0.15s, transform 0.1s"};
    const pauseBackdrop = {position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?12:16,backdropFilter:"blur(6px)",touchAction:"manipulation"};

    if (pauseView === "rules") return (
      <div onClick={(e)=>{if(e.target===e.currentTarget)setPauseView("main");}} style={pauseBackdrop}>
        <div style={{...card,maxWidth:460,width:"100%",padding:isMobile?"20px 14px":"24px 20px",color:"#fff",border:"1px solid rgba(255,215,0,0.25)",maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
          <button onClick={()=>setPauseView("main")} style={closeBtnStyle}>✕</button>
          <h3 style={{color:"#FFD700",margin:"0 0 12px",fontSize:18}}>📜 RULES OF ENGAGEMENT</h3>
          <div style={{fontSize:isMobile?12:13,color:"#EEE",lineHeight:2}}>
            <div>🎯 <strong style={{color:"#FF6B35"}}>Objective:</strong> Survive as many waves as possible</div>
            <div>👾 <strong style={{color:"#FF6B35"}}>Enemies:</strong> Spawn in waves, each harder than the last</div>
            <div>⚡ <strong style={{color:"#FF6B35"}}>Combos:</strong> Kill quickly for score multipliers (2s window)</div>
            <div>🔥 <strong style={{color:"#FF6B35"}}>Killstreaks:</strong> Every 5 kills triggers a bonus attack</div>
            <div>💥 <strong style={{color:"#FF6B35"}}>Critical Hits:</strong> 15% chance for 2x damage (gold text)</div>
            <div>💊 <strong style={{color:"#FF6B35"}}>Pickups:</strong> Enemies drop health, ammo, speed, or nukes</div>
            <div>😇 <strong style={{color:"#FF6B35"}}>Guardian Angel:</strong> Super rare boss drop — grants 1 extra life!</div>
            <div>⚠️ <strong style={{color:"#FF6B35"}}>Ranged Foes:</strong> Glowing ring enemies shoot at you!</div>
            <div>💨 <strong style={{color:"#FF6B35"}}>Dash:</strong> Brief invincibility to dodge through danger</div>
            <div>⬆ <strong style={{color:"#FF6B35"}}>XP & Levels:</strong> Level up from kills to move faster</div>
            <div>🏆 <strong style={{color:"#FF6B35"}}>Leaderboard:</strong> Submit your score with famous last words</div>
          </div>
          <button onClick={()=>setPauseView("main")} style={{...pBtn,marginTop:16,background:"linear-gradient(180deg,#FF6B35,#CC4400)",border:"none"}}>← BACK</button>
        </div>
      </div>
    );

    if (pauseView === "controls") return (
      <div onClick={(e)=>{if(e.target===e.currentTarget)setPauseView("main");}} style={pauseBackdrop}>
        <div style={{...card,maxWidth:460,width:"100%",padding:isMobile?"20px 14px":"24px 20px",color:"#fff",border:"1px solid rgba(255,215,0,0.25)",maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
          <button onClick={()=>setPauseView("main")} style={closeBtnStyle}>✕</button>
          <h3 style={{color:"#FFD700",margin:"0 0 12px",fontSize:18}}>⌨ CONTROLS</h3>
          {isMobile ? (
            <div style={{fontSize:13,color:"#EEE",lineHeight:2.2}}>
              <div>👆 <span style={{color:"#FF6B35",fontWeight:800}}>Left thumb</span> — Move soldier</div>
              <div>👆 <span style={{color:"#FF6B35",fontWeight:800}}>Right thumb</span> — Aim & auto-fire</div>
              <div>🎯 <span style={{color:"#EEE"}}>Move only → auto-aims nearest enemy</span></div>
              <div>💨 <span style={{color:"#00E5FF",fontWeight:800}}>DASH button</span> — Invincible dodge</div>
              <div>💣 <span style={{color:"#FF4500",fontWeight:800}}>GRENADE button</span> — AOE explosion</div>
              <div>🔢 <span style={{color:"#FFD700",fontWeight:800}}>Weapon buttons</span> — Tap to swap</div>
              <div>⟳ <span style={{color:"#FFD700",fontWeight:800}}>R button</span> — Manual reload</div>
              <div>⏸ <span style={{color:"#FFD700",fontWeight:800}}>Pause button</span> — This menu</div>
            </div>
          ) : (
            <div style={{fontSize:13,color:"#EEE",lineHeight:2.2}}>
              <div>🏃 <span style={{color:"#FF6B35",fontWeight:800}}>W/A/S/D</span> — Move</div>
              <div>🖱 <span style={{color:"#FF6B35",fontWeight:800}}>Mouse</span> — Aim</div>
              <div>🔫 <span style={{color:"#FF6B35",fontWeight:800}}>Left Click</span> — Shoot</div>
              <div>🔄 <span style={{color:"#FFD700",fontWeight:800}}>R</span> — Reload</div>
              <div>🔢 <span style={{color:"#FFD700",fontWeight:800}}>1 / 2 / 3 / 4</span> — Switch weapons</div>
              <div>💣 <span style={{color:"#FF4500",fontWeight:800}}>5 / Q / G</span> — Throw grenade</div>
              <div>💨 <span style={{color:"#00E5FF",fontWeight:800}}>Space / Shift</span> — Dash</div>
              <div>⏸ <span style={{color:"#FFD700",fontWeight:800}}>Escape</span> — Pause / Resume</div>
            </div>
          )}
          <div style={{marginTop:14}}>
            <div style={{fontSize:12,color:"#FFD700",fontWeight:700,marginBottom:6}}>WEAPONS</div>
            {WEAPONS.map((w,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:12,color:"#EEE"}}>
                <span style={{fontSize:16}}>{w.emoji}</span>
                <span style={{color:w.color,fontWeight:700,minWidth:isMobile?100:140}}>[{i+1}] {w.name}</span>
                <span style={{color:"#CCC",fontSize:11}}>{w.desc}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setPauseView("main")} style={{...pBtn,marginTop:16,background:"linear-gradient(180deg,#FF6B35,#CC4400)",border:"none"}}>← BACK</button>
        </div>
      </div>
    );

    if (pauseView === "bestiary") return (
      <div onClick={(e)=>{if(e.target===e.currentTarget)setPauseView("main");}} style={pauseBackdrop}>
        <div style={{...card,maxWidth:460,width:"100%",padding:isMobile?"20px 14px":"24px 20px",color:"#fff",border:"1px solid rgba(255,215,0,0.25)",maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
          <button onClick={()=>setPauseView("main")} style={closeBtnStyle}>✕</button>
          <h3 style={{color:"#FFD700",margin:"0 0 12px",fontSize:18}}>👾 MOST WANTED LIST</h3>
          {ENEMY_TYPES.map((e,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 6px",borderRadius:6,marginBottom:4,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}}>
              <span style={{fontSize:24}}>{e.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:e.color}}>{e.name}</div>
                <div style={{fontSize:10,color:"#CCC"}}>HP: {e.health} · Speed: {e.speed} · Points: {e.points}{e.ranged ? " · RANGED ⚡" : ""}</div>
                <div style={{fontSize:10,color:"#FF69B4",fontStyle:"italic"}}>"{e.deathQuote}"</div>
              </div>
            </div>
          ))}
          <button onClick={()=>setPauseView("main")} style={{...pBtn,marginTop:16,background:"linear-gradient(180deg,#FF6B35,#CC4400)",border:"none"}}>← BACK</button>
        </div>
      </div>
    );

    // Main pause view
    return (
      <div style={{...pauseBackdrop}}>
        <div style={{textAlign:"center",maxWidth:320,width:"100%"}}>
          <div style={{fontSize:36,marginBottom:4}}>⏸</div>
          <h2 style={{color:"#FFD700",fontSize:28,margin:"0 0 4px",letterSpacing:3,fontFamily:"'Courier New',monospace"}}>PAUSED</h2>
          <p style={{color:"#CCC",fontSize:12,margin:"0 0 20px",fontFamily:"'Courier New',monospace"}}>Wave {wave} · {fmtTime(timeSurvived)} · Score: {score.toLocaleString()}</p>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <button onClick={()=>{setPauseView("main");setPaused(false);}} style={{...pBtn,background:"linear-gradient(180deg,#FF6B35,#CC4400)",border:"none",fontSize:18}}>▶ RESUME</button>
            <button onClick={()=>setPauseView("rules")} style={pBtn}>📜 RULES</button>
            <button onClick={()=>setPauseView("controls")} style={pBtn}>⌨ CONTROLS</button>
            <button onClick={()=>setPauseView("bestiary")} style={pBtn}>👾 MOST WANTED</button>
            <button onClick={()=>setShowAchievements(true)} style={pBtn}>🏅 ACHIEVEMENTS ({achievementsUnlocked.length}/{ACHIEVEMENTS.length})</button>
            <button onClick={()=>{setPaused(false);setPauseView("main"); if(gsRef.current) updateCareerOnGameEnd(gsRef.current,true); setScreen("menu");}} style={{...pBtn,color:"#F66",borderColor:"rgba(255,100,100,0.3)",marginTop:4}}>🚪 LEAVE GAME</button>
          </div>
        </div>
      </div>
    );
  };

  // ======== WEAPON ARMORY PANEL ========
  const ArmoryPanel = ({onClose}) => {
    const cs = careerStats;
    const doUpgrade = async (stat, wpnIdx) => {
      const lvl = weaponUpgrades[stat][wpnIdx] || 0;
      if (lvl >= UPGRADE_MAX) return;
      const cost = UPGRADE_COSTS[stat][lvl];
      if (cs.prestigePoints < cost) return;
      const newC = { ...cs, prestigePoints: cs.prestigePoints - cost };
      const newU = { ...weaponUpgrades, [stat]: [...weaponUpgrades[stat]] };
      newU[stat][wpnIdx] = lvl + 1;
      setCareerStats(newC); careerRef.current = newC;
      setWeaponUpgrades(newU); weaponUpgradesRef.current = newU;
      await saveCareerStats(newC); await saveUpgrades(newU);
    };
    return (
      <div onClick={(e)=>{if(e.target===e.currentTarget)onClose();}} style={{...overlayBackdrop,background:"rgba(0,0,0,0.9)",zIndex:110}}>
        <div style={{...card,maxWidth:560,width:"100%",maxHeight:"88vh",overflow:"auto",position:"relative",border:"1px solid rgba(255,107,53,0.3)",padding:isMobile?"16px 10px 16px 10px":"18px 14px",color:"#fff"}}>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
          <h3 style={{color:"#FF6B35",margin:"0 0 2px",fontSize:18,letterSpacing:2}}>WEAPON ARMORY</h3>
          <div style={{fontSize:11,color:"#FFD700",marginBottom:12}}>Prestige Points: <strong>{cs.prestigePoints?.toLocaleString()}</strong> <span style={{color:"#999",fontSize:9}}>(earn 10% of score each run)</span></div>
          {WEAPONS.map((w,wi) => {
            const uw = getUpgradedWeapon(wi, weaponUpgrades);
            return (
              <div key={wi} style={{...card,marginBottom:8,padding:"10px 12px",border:"1px solid "+w.color+"33"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:22}}>{w.emoji}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:900,color:w.color}}>{w.name}</div>
                    <div style={{fontSize:10,color:"#CCC"}}>DMG: {uw.damage} · Rate: {uw.fireRate}ms · Ammo: {uw.maxAmmo}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {Object.entries(UPGRADE_LABELS).map(([stat,info]) => {
                    const lvl = weaponUpgrades[stat][wi] || 0;
                    const maxed = lvl >= UPGRADE_MAX;
                    const cost = maxed ? 0 : UPGRADE_COSTS[stat][lvl];
                    const canAfford = cs.prestigePoints >= cost;
                    return (
                      <div key={stat} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                        <span style={{width:16,textAlign:"center"}}>{info.emoji}</span>
                        <span style={{width:80,color:"#DDD"}}>{info.name}</span>
                        <div style={{flex:1,display:"flex",gap:2}}>
                          {Array.from({length:UPGRADE_MAX}).map((_,i) => (
                            <div key={i} style={{width:16,height:8,borderRadius:2,background:i<lvl?"linear-gradient(180deg,#FF6B35,#CC4400)":"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)"}} />
                          ))}
                        </div>
                        {maxed ? <span style={{color:"#0F0",fontSize:10,fontWeight:700,width:70,textAlign:"right"}}>MAXED</span> : (
                          <button onClick={()=>doUpgrade(stat,wi)} disabled={!canAfford} style={{
                            padding:"2px 8px",fontSize:10,fontWeight:700,fontFamily:"'Courier New',monospace",borderRadius:4,cursor:canAfford?"pointer":"default",
                            background:canAfford?"linear-gradient(180deg,#FF6B35,#CC4400)":"rgba(255,255,255,0.05)",
                            color:canAfford?"#FFF":"#666",border:"none",opacity:canAfford?1:0.5,width:70,
                          }}>{cost.toLocaleString()} PP</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ======== CAREER STATS PANEL ========
  const CareerPanel = ({onClose}) => {
    const cs = careerStats;
    const tierColors = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", legendary: "#FF44FF" };
    const avgScore = cs.gamesPlayed > 0 ? Math.round(cs.totalScore / cs.gamesPlayed) : 0;
    const avgKills = cs.gamesPlayed > 0 ? Math.round(cs.totalKills / cs.gamesPlayed) : 0;
    const kd = cs.totalDeaths > 0 ? (cs.totalKills / cs.totalDeaths).toFixed(1) : "0.0";
    const rageRate = cs.gamesPlayed > 0 ? Math.round((cs.rageQuits / cs.gamesPlayed) * 100) : 0;
    return (
      <div onClick={(e)=>{if(e.target===e.currentTarget)onClose();}} style={{...overlayBackdrop,background:"rgba(0,0,0,0.9)",zIndex:110}}>
        <div style={{...card,maxWidth:540,width:"100%",maxHeight:"88vh",overflow:"auto",position:"relative",border:"1px solid rgba(255,215,0,0.25)",padding:isMobile?"16px 10px 16px 10px":"18px 14px",color:"#fff"}}>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
          <h3 style={{color:"#FFD700",margin:"0 0 12px",fontSize:18,letterSpacing:2}}>CAREER SERVICE RECORD</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
            {[
              [cs.gamesPlayed,"GAMES PLAYED","#FF6B35"],
              [cs.totalKills.toLocaleString(),"TOTAL KILLS","#0F0"],
              [cs.totalDeaths,"TOTAL DEATHS","#F44"],
              [cs.bestScore.toLocaleString(),"BEST SCORE","#FFD700"],
              [cs.highestWave,"HIGHEST WAVE","#FF4500"],
              [kd,"K/D RATIO","#00BFFF"],
              [avgScore.toLocaleString(),"AVG SCORE","#E040FB"],
              [avgKills,"AVG KILLS","#44CC44"],
              [fmtTime(cs.totalTimePlayed),"TIME PLAYED","#CCC"],
              [cs.bossesDefeated,"BOSSES SLAIN","#FF1493"],
              [cs.nukesCollected,"NUKES FOUND","#FF0000"],
              [cs.guardianAngelsUsed,"ANGELS USED","#FFD700"],
              [cs.rageQuits,"RAGE QUITS","#F66"],
              [rageRate+"%","RAGE RATE","#FF69B4"],
              [(cs.prestigePoints||0).toLocaleString(),"PRESTIGE PTS","#FF6B35"],
            ].map(([val,label,color],i) => (
              <div key={i} style={{...card,padding:"6px 4px",textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:900,color}}>{val}</div>
                <div style={{fontSize:8,color:"#CCC",letterSpacing:1}}>{label}</div>
              </div>
            ))}
          </div>
          <h4 style={{color:"#FFD700",fontSize:14,margin:"0 0 8px",letterSpacing:2}}>LIFETIME ACHIEVEMENTS</h4>
          <div style={{fontSize:10,color:"#BBB",marginBottom:8}}>Times each achievement was earned across all runs</div>
          {["legendary","gold","silver","bronze"].map(tier => {
            const tierAchs = ACHIEVEMENTS.filter(a => a.tier === tier);
            if (tierAchs.length === 0) return null;
            return (
              <div key={tier} style={{marginBottom:10}}>
                <div style={{fontSize:9,color:tierColors[tier],fontWeight:900,letterSpacing:2,marginBottom:4,borderBottom:"1px solid "+tierColors[tier]+"44",paddingBottom:3}}>{tier.toUpperCase()}</div>
                {tierAchs.map(a => {
                  const count = (cs.achievementCounts || {})[a.id] || 0;
                  return (
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 4px",fontSize:11,opacity:count>0?1:0.4}}>
                      <span style={{fontSize:16,filter:count>0?"none":"grayscale(1)"}}>{a.emoji}</span>
                      <span style={{flex:1,color:count>0?tierColors[tier]:"#777"}}>{a.name}</span>
                      <span style={{color:count>0?"#FFD700":"#555",fontWeight:900,fontSize:12}}>x{count}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ======== MENU ========
  if (screen === "menu") {
    const menuBtnStyle = {...btnS,width:"100%",padding:isMobile?"14px 14px":"10px 14px",fontSize:isMobile?14:13,textAlign:"left",display:"flex",alignItems:"center",gap:10,touchAction:"manipulation",WebkitTapHighlightColor:"transparent",minHeight:isMobile?48:40};

    const MenuRules = () => (
      <div style={{...card,maxWidth:500,width:"100%",margin:"0 auto",padding:"20px 16px",textAlign:"left"}}>
        <h3 style={{color:"#FFD700",margin:"0 0 10px",fontSize:16,textAlign:"center"}}>📜 RULES OF ENGAGEMENT</h3>
        <div style={{fontSize:12,color:"#EEE",lineHeight:2}}>
          <div>🎯 <strong style={{color:"#FF6B35"}}>Objective:</strong> Survive as many waves as possible</div>
          <div>👾 <strong style={{color:"#FF6B35"}}>Enemies:</strong> Spawn in waves, each harder than the last</div>
          <div>⚡ <strong style={{color:"#FF6B35"}}>Combos:</strong> Kill quickly for score multipliers (2s window)</div>
          <div>🔥 <strong style={{color:"#FF6B35"}}>Killstreaks:</strong> Every 5 kills triggers a bonus attack</div>
          <div>💥 <strong style={{color:"#FF6B35"}}>Critical Hits:</strong> 15% chance for 2x damage (gold text)</div>
          <div>💊 <strong style={{color:"#FF6B35"}}>Pickups:</strong> Enemies drop health, ammo, speed, or nukes</div>
          <div>😇 <strong style={{color:"#FF6B35"}}>Guardian Angel:</strong> Super rare boss drop — grants 1 extra life!</div>
          <div>👹 <strong style={{color:"#FF6B35"}}>Boss Waves:</strong> Every 5th wave features a powerful boss fight!</div>
          <div>⚠️ <strong style={{color:"#FF6B35"}}>Ranged Foes:</strong> Glowing ring enemies shoot at you!</div>
          <div>💨 <strong style={{color:"#FF6B35"}}>Dash:</strong> Brief invincibility to dodge through danger</div>
          <div>⬆ <strong style={{color:"#FF6B35"}}>XP & Levels:</strong> Level up from kills to move faster</div>
          <div>🏆 <strong style={{color:"#FF6B35"}}>Leaderboard:</strong> Submit your score with famous last words</div>
          <div>🔧 <strong style={{color:"#FF6B35"}}>Upgrades:</strong> Spend Prestige Points to upgrade weapons permanently</div>
        </div>
        <button onClick={()=>setMenuView("main")} style={{...btnP,marginTop:14,width:"100%",fontSize:14,padding:isMobile?"14px":"10px",minHeight:isMobile?48:40,touchAction:"manipulation"}}>← BACK</button>
      </div>
    );

    const MenuControls = () => (
      <div style={{...card,maxWidth:500,width:"100%",margin:"0 auto",padding:"20px 16px",textAlign:"left"}}>
        <h3 style={{color:"#FFD700",margin:"0 0 10px",fontSize:16,textAlign:"center"}}>⌨ CONTROLS</h3>
        {isMobile ? (
          <div style={{fontSize:12,color:"#EEE",lineHeight:2.2}}>
            <div>👆 <span style={{color:"#FF6B35",fontWeight:800}}>Left thumb</span> — Move soldier</div>
            <div>👆 <span style={{color:"#FF6B35",fontWeight:800}}>Right thumb</span> — Aim & auto-fire</div>
            <div>🎯 <span style={{color:"#EEE"}}>Move only → auto-aims nearest enemy</span></div>
            <div>💨 <span style={{color:"#00E5FF",fontWeight:800}}>DASH button</span> — Invincible dodge</div>
            <div>💣 <span style={{color:"#FF4500",fontWeight:800}}>GRENADE button</span> — AOE explosion</div>
            <div>🔢 <span style={{color:"#FFD700",fontWeight:800}}>Weapon buttons</span> — Tap to swap</div>
          </div>
        ) : (
          <div style={{fontSize:12,color:"#EEE",lineHeight:2.2}}>
            <div>🏃 <span style={{color:"#FF6B35",fontWeight:800}}>W/A/S/D</span> — Move</div>
            <div>🖱 <span style={{color:"#FF6B35",fontWeight:800}}>Mouse</span> — Aim</div>
            <div>🔫 <span style={{color:"#FF6B35",fontWeight:800}}>Left Click</span> — Shoot</div>
            <div>🔄 <span style={{color:"#FFD700",fontWeight:800}}>R</span> — Reload</div>
            <div>🔢 <span style={{color:"#FFD700",fontWeight:800}}>1 / 2 / 3 / 4</span> — Switch weapons</div>
            <div>💣 <span style={{color:"#FF4500",fontWeight:800}}>5 / Q / G</span> — Throw grenade</div>
            <div>💨 <span style={{color:"#00E5FF",fontWeight:800}}>Space / Shift</span> — Dash</div>
            <div>⏸ <span style={{color:"#FFD700",fontWeight:800}}>Escape</span> — Pause / Resume</div>
          </div>
        )}
        <div style={{marginTop:12}}>
          <div style={{fontSize:11,color:"#FFD700",fontWeight:700,marginBottom:4}}>WEAPONS</div>
          {WEAPONS.map((w,i) => {
            const uw = getUpgradedWeapon(i, weaponUpgrades);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",fontSize:11,color:"#EEE"}}>
                <span style={{fontSize:14}}>{w.emoji}</span>
                <span style={{color:w.color,fontWeight:700,minWidth:130}}>[{i+1}] {w.name}</span>
                <span style={{color:"#CCC",fontSize:10}}>DMG:{uw.damage} Ammo:{uw.maxAmmo}</span>
              </div>
            );
          })}
        </div>
        <button onClick={()=>setMenuView("main")} style={{...btnP,marginTop:14,width:"100%",fontSize:14,padding:isMobile?"14px":"10px",minHeight:isMobile?48:40,touchAction:"manipulation"}}>← BACK</button>
      </div>
    );

    const MenuMostWanted = () => (
      <div style={{...card,maxWidth:500,width:"100%",margin:"0 auto",padding:"20px 16px",textAlign:"left"}}>
        <h3 style={{color:"#FFD700",margin:"0 0 10px",fontSize:16,textAlign:"center"}}>👾 MOST WANTED LIST</h3>
        <div style={{fontSize:10,color:"#CCC",marginBottom:10,textAlign:"center"}}>Intel on all known hostiles. Study up, soldier.</div>
        {ENEMY_TYPES.map((e,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 6px",borderRadius:6,marginBottom:3,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{fontSize:22}}>{e.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:e.color}}>{e.name}</div>
              <div style={{fontSize:10,color:"#CCC"}}>HP: {e.health} · Speed: {e.speed} · Points: {e.points}{e.ranged ? " · RANGED" : ""}</div>
              <div style={{fontSize:9,color:"#FF69B4",fontStyle:"italic"}}>"{e.deathQuote}"</div>
            </div>
          </div>
        ))}
        <div style={{fontSize:11,color:"#FF4500",fontWeight:700,marginTop:10,marginBottom:6}}>BOSS ENCOUNTERS (Every 5 waves)</div>
        {BOSS_WAVE_TYPES.map((b,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 6px",borderRadius:6,marginBottom:3,background:"rgba(255,0,0,0.05)",border:"1px solid rgba(255,0,0,0.15)"}}>
            <span style={{fontSize:26}}>{b.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:b.color}}>{b.name} <span style={{fontSize:9,color:"#F44"}}>BOSS</span></div>
              <div style={{fontSize:10,color:"#CCC"}}>HP: {b.health} · Speed: {b.speed} · Points: {b.points}</div>
              <div style={{fontSize:9,color:"#FF69B4",fontStyle:"italic"}}>"{b.deathQuote}"</div>
            </div>
          </div>
        ))}
        <button onClick={()=>setMenuView("main")} style={{...btnP,marginTop:14,width:"100%",fontSize:14,padding:isMobile?"14px":"10px",minHeight:isMobile?48:40,touchAction:"manipulation"}}>← BACK</button>
      </div>
    );

    return (
      <div style={{...scrollBase,padding:0}}>
        {showLeaderboard && <LeaderboardPanel onClose={()=>setShowLeaderboard(false)} />}
        {showAchievements && <AchievementsPanel onClose={()=>setShowAchievements(false)} />}
        {showArmory && <ArmoryPanel onClose={()=>setShowArmory(false)} />}
        {showCareer && <CareerPanel onClose={()=>setShowCareer(false)} />}
        <div style={{position:"fixed",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,255,255,0.02) 49px,rgba(255,255,255,0.02) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(255,255,255,0.02) 49px,rgba(255,255,255,0.02) 50px)",pointerEvents:"none",zIndex:0}} />
        <div style={{position:"fixed",inset:0,backgroundImage:"radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.1) 0%, transparent 60%)",pointerEvents:"none",zIndex:0}} />
        <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:menuWidth,width:"100%",padding:isMobile?"20px 16px 32px":"32px 24px 40px"}}>
          {menuView === "rules" ? <MenuRules /> : menuView === "controls" ? <MenuControls /> : menuView === "mostwanted" ? <MenuMostWanted /> : (<>
          <div style={{fontSize:isMobile?9:10,color:"#666",letterSpacing:6,marginBottom:8}}>ACTIVISION'T PRESENTS</div>
          <h1 style={{fontSize:"clamp(30px,8vw,58px)",fontWeight:900,margin:0,background:"linear-gradient(180deg,#FFD700,#FF8C00,#FF6B00)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-2,filter:"drop-shadow(0 0 30px rgba(255,107,0,0.4))",lineHeight:1.1}}>CALL OF DOODIE</h1>
          <div style={{fontSize:"clamp(8px,2.2vw,13px)",color:"#FF6B35",marginTop:4,letterSpacing:isMobile?2:4,fontWeight:700}}>MODERN WARFARE ON MOM'S WIFI</div>
          <div style={{margin:`${sectionGap}px 0 ${sectionGap-4}px`,fontSize:12,color:"#999"}}>
            Deploying as: <span style={{fontWeight:900,color:"#FFD700"}}>{username}</span>
            <span onClick={()=>setScreen("username")} style={{color:"#666",cursor:"pointer",marginLeft:8,fontSize:10,textDecoration:"underline"}}>(change)</span>
          </div>

          <button onClick={startGame} style={{...btnP,width:"100%",maxWidth:340,fontSize:isMobile?16:20,padding:isMobile?"14px 24px":"18px 40px",marginBottom:sectionGap,background:"linear-gradient(180deg,#FF6B35,#CC4400)",boxShadow:"0 6px 25px rgba(255,107,53,0.4)",letterSpacing:4}}>
            ▶ DEPLOY
          </button>

          <div style={{...card,marginBottom:sectionGap,textAlign:"left"}}>
            <div style={{fontSize:11,color:"#888",marginBottom:8,letterSpacing:3,textAlign:"center",fontWeight:700,textTransform:"uppercase"}}>Difficulty</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {Object.entries(DIFFICULTIES).map(([key,d]) => (
                <button key={key} onClick={()=>setDifficulty(key)} style={{
                  padding:isMobile?"8px 6px":"10px 10px",borderRadius:8,cursor:"pointer",textAlign:"left",
                  fontFamily:"'Courier New',monospace",
                  background:difficulty===key?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.02)",
                  border:difficulty===key?`2px solid ${d.color}`:"1px solid rgba(255,255,255,0.06)",
                  color:"#FFF",transition:"all 0.15s",
                }}>
                  <div style={{fontSize:isMobile?12:14,fontWeight:900,color:d.color}}>{d.emoji} {d.label}</div>
                  <div style={{fontSize:isMobile?9:10,color:"#888",marginTop:2}}>{d.desc}</div>
                  {!isMobile && <div style={{fontSize:9,color:"#555",marginTop:3}}>HP: {d.playerHP} · Enemy: {d.healthMult}x · Speed: {d.speedMult}x</div>}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6,marginBottom:sectionGap}}>
            <button onClick={()=>setMenuView("rules")} style={menuBtnStyle}>📜 Rules</button>
            <button onClick={()=>setMenuView("controls")} style={menuBtnStyle}>⌨ Controls</button>
            <button onClick={()=>setMenuView("mostwanted")} style={menuBtnStyle}>👾 Most Wanted</button>
            <button onClick={()=>{refreshLeaderboard();setShowLeaderboard(true);}} style={menuBtnStyle}>🏆 Leaderboard</button>
            <button onClick={()=>setShowArmory(true)} style={menuBtnStyle}>🔧 Weapon Armory</button>
            <button onClick={()=>setShowAchievements(true)} style={menuBtnStyle}>🏅 Achievements</button>
            <button onClick={()=>setShowCareer(true)} style={{...menuBtnStyle,gridColumn:isMobile?"auto":"1/3"}}>📊 Career Stats</button>
          </div>

          {careerStats.gamesPlayed > 0 && (
            <div style={{fontSize:10,color:"#555",marginTop:4}}>
              Games: {careerStats.gamesPlayed} · Best: {careerStats.bestScore.toLocaleString()} · Wave: {careerStats.highestWave} · PP: {(careerStats.prestigePoints||0).toLocaleString()}
            </div>
          )}
          </>)}
        </div>
      </div>
    );
  }

  // ======== DEATH ========
  if (screen === "death") {
    return (
      <div style={{...scrollBase,background:"linear-gradient(135deg,#1a0000 0%,#2a0808 50%,#1a0000 100%)",padding:0}}>
        {showLeaderboard && <LeaderboardPanel onClose={()=>setShowLeaderboard(false)} />}
        <div style={{textAlign:"center",maxWidth:isMobile?400:480,width:"100%",padding:isMobile?"20px 16px 32px":"32px 24px 40px"}}>
          <div style={{fontSize:48,filter:"drop-shadow(0 0 15px rgba(255,0,0,0.4))"}}>💀</div>
          <h2 style={{fontSize:"clamp(22px,7vw,36px)",color:"#FF2222",margin:"4px 0",letterSpacing:3}}>YOU DIED</h2>
          <p style={{color:"#FF6666",fontSize:isMobile?12:14,fontStyle:"italic",margin:"4px 0 8px"}}>"{deathMessage}"</p>
          <div style={{fontSize:11,color:(DIFFICULTIES[difficulty]||DIFFICULTIES.normal).color,marginBottom:12,fontWeight:700}}>
            {(DIFFICULTIES[difficulty]||DIFFICULTIES.normal).emoji} {(DIFFICULTIES[difficulty]||DIFFICULTIES.normal).label.toUpperCase()} MODE
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:isMobile?4:6,marginBottom:12}}>
            {[
              [score.toLocaleString(),"SCORE","#FFD700"],
              [kills,"KILLS","#0F0"],
              ["W"+wave,"WAVE","#F44"],
              ["Lv "+level,"LEVEL","#00FF88"],
              [bestStreak,"BEST STREAK","#FF4500"],
              [fmtTime(timeSurvived),"SURVIVED","#00BFFF"],
              [totalDamage.toLocaleString(),"TOTAL DMG","#E040FB"],
              [statsRef.current.crits || 0,"CRITS","#FFD700"],
              [statsRef.current.grenades || 0,"GRENADES","#FF4500"],
            ].map(([val,label,color],i) => (
              <div key={i} style={{...card,padding:isMobile?"6px 2px":"8px 4px"}}>
                <div style={{fontSize:isMobile?14:17,fontWeight:900,color:color}}>{val}</div>
                <div style={{fontSize:isMobile?8:9,color:"#999",letterSpacing:1}}>{label}</div>
              </div>
            ))}
          </div>
          {achievementsUnlocked.length > 0 && (
            <div style={{marginBottom:10,fontSize:12,color:"#999"}}>
              {achievementsUnlocked.length} achievement{achievementsUnlocked.length>1?"s":""} unlocked:
              <span style={{color:"#FFD700",marginLeft:4}}>
                {achievementsUnlocked.map(id=>{const a=ACHIEVEMENTS.find(x=>x.id===id);return a?a.emoji:"";}).join(" ")}
              </span>
            </div>
          )}
          <div style={{marginBottom:10,color:"#CCC",fontSize:13}}>
            Rank: <span style={{color:"#FFD700",fontWeight:700}}>{RANK_NAMES[rankIndex]}</span>
          </div>
          {!submitted ? (
            <div style={{...card,marginBottom:12,border:"1px solid rgba(255,215,0,0.1)"}}>
              <div style={{fontSize:11,color:"#FFD700",marginBottom:8,letterSpacing:2,fontWeight:700}}>SUBMIT TO HALL OF SHAME</div>
              <input type="text" value={lastWords} maxLength={60}
                onChange={e=>{const w=e.target.value.split(/\s+/).filter(Boolean);if(w.length<=5)setLastWords(e.target.value);}}
                placeholder="Famous last words (5 words max)"
                style={{width:"100%",padding:"10px 12px",fontSize:13,fontFamily:"'Courier New',monospace",fontStyle:"italic",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#FF69B4",textAlign:"center",outline:"none",marginBottom:6,boxSizing:"border-box"}}
                onKeyDown={e=>{if(e.key==="Enter")submitScore();}}
              />
              <div style={{fontSize:10,color:"#666",marginBottom:8}}>
                {lastWords.trim().split(/\s+/).filter(Boolean).length}/5 words
              </div>
              <button onClick={submitScore} style={{...btnP,width:"100%",fontSize:14,padding:"12px"}}>SUBMIT SCORE</button>
            </div>
          ) : (
            <div style={{...card,marginBottom:12,border:"1px solid rgba(0,255,0,0.15)",background:"rgba(0,255,0,0.03)"}}>
              <div style={{color:"#0F0",fontSize:14,fontWeight:700}}>Score submitted!</div>
              <div style={{color:"#888",fontSize:11,marginTop:4}}>Your shame is now public knowledge.</div>
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={startGame} style={{...btnP,flex:1,minWidth:100,fontSize:isMobile?13:15,minHeight:isMobile?48:40,touchAction:"manipulation"}}>PLAY AGAIN</button>
            <button onClick={()=>{refreshLeaderboard();setShowLeaderboard(true);}} style={{...btnS,flex:1,minWidth:100,fontSize:isMobile?13:15,minHeight:isMobile?48:40,touchAction:"manipulation"}}>LEADERBOARD</button>
            <button onClick={()=>setScreen("menu")} style={{...btnS,flex:1,minWidth:100,fontSize:isMobile?13:15,minHeight:isMobile?48:40,touchAction:"manipulation"}}>MAIN MENU</button>
          </div>
        </div>
      </div>
    );
  }

  // ======== GAME ========
  const comboColor = combo>=10?"#FF0000":combo>=5?"#FF4500":combo>=3?"#FFD700":"#FFF";

  return (
    <div ref={containerRef} style={base}>
      <canvas ref={canvasRef} style={{width:"100%",height:isMobile?"calc(100% - 56px)":"100%",display:"block",cursor:isMobile?"default":"crosshair"}} />

      {paused && <PauseMenu />}
      {showAchievements && <AchievementsPanel onClose={()=>setShowAchievements(false)} />}

      {achievementPopup && !paused && (
        <div style={{position:"absolute",top:60,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.85)",border:"1px solid #FFD700",borderRadius:10,padding:"10px 20px",color:"#FFD700",fontSize:13,fontWeight:700,zIndex:50,textAlign:"center",pointerEvents:"none",animation:"slideDown 0.3s ease-out",boxShadow:"0 0 20px rgba(255,215,0,0.3)"}}>
          <div style={{fontSize:22}}>{achievementPopup.emoji}</div>
          <div>{achievementPopup.name}</div>
          <div style={{fontSize:10,color:"#CCC",fontWeight:400}}>{achievementPopup.desc}</div>
        </div>
      )}

      <div style={{position:"absolute",top:0,left:0,right:0,bottom:isMobile?56:0,pointerEvents:"none",color:"#fff"}}>
        <div style={{position:"absolute",top:6,left:"50%",transform:"translateX(-50%)",fontSize:11,color:"#FFF",background:"rgba(0,0,0,0.5)",padding:"3px 12px",borderRadius:10,fontWeight:700,display:"flex",gap:8,alignItems:"center"}}>
          <span>WAVE {wave}</span>
          {isBossWave ? <span style={{color:"#FF0000",fontSize:9,fontWeight:900}}>👹 BOSS</span> : (
            <span style={{color:wave>=15?"#FF0000":wave>=10?"#FF4500":wave>=5?"#FFD700":"#0F0",fontSize:9}}>
              {wave>=15?"☠️ EXTREME":wave>=10?"🔥 HARD":wave>=5?"⚠️ MEDIUM":"✅ EASY"}
            </span>
          )}
          <span style={{color:"#CCC"}}>{fmtTime(timeSurvived)}</span>
          {difficulty !== "normal" && <span style={{color:(DIFFICULTIES[difficulty]||DIFFICULTIES.normal).color,fontSize:9}}>{(DIFFICULTIES[difficulty]||DIFFICULTIES.normal).emoji}</span>}
        </div>
        <div style={{position:"absolute",top:8,right:56}}>
          <div style={{fontSize:10,color:"#CCC",textAlign:"right"}}>SCORE</div>
          <div style={{fontSize:20,fontWeight:900,color:"#FFD700",textAlign:"right"}}>{score.toLocaleString()}</div>
          <div style={{fontSize:10,color:"#DDD",textAlign:"right"}}>K:<span style={{color:"#0F0"}}>{kills}</span> D:<span style={{color:"#F44"}}>{deaths}</span></div>
        </div>
        {combo>=2 && (
          <div style={{position:"absolute",top:28,left:"50%",transform:"translateX(-50%)",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:900,color:comboColor,textShadow:"0 0 10px "+comboColor}}>x{combo} COMBO</div>
            <div style={{width:80,height:3,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"3px auto",overflow:"hidden"}}>
              <div style={{width:(comboTimer/120)*100+"%",height:"100%",background:comboColor,transition:"width 0.05s"}} />
            </div>
          </div>
        )}
        {killstreak>=3 && <div style={{position:"absolute",top:8,left:12,background:"rgba(255,69,0,0.2)",padding:"3px 10px",borderRadius:4,border:"1px solid rgba(255,69,0,0.4)",fontSize:11,color:"#FF4500",fontWeight:700}}>{killstreak} STREAK</div>}
        <div style={{position:"absolute",top:26,left:12}}>
          <div style={{fontSize:10,color:"#DDD"}}>Lv {level}</div>
          <div style={{width:60,height:3,background:"rgba(255,255,255,0.15)",borderRadius:2,overflow:"hidden"}}>
            <div style={{width:(xp/xpNeeded)*100+"%",height:"100%",background:"#00FF88",borderRadius:2}} />
          </div>
        </div>
        <div style={{position:"absolute",top:42,left:12,maxWidth:200}}>
          {killFeed.slice(0,4).map((kf,i)=>(
            <div key={kf.id} style={{fontSize:10,color:"rgba(255,255,255,"+(1-i*0.15)+")",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              <span style={{color:"#FFD700"}}>{username}</span> [{WEAPONS.find(w=>w.name===kf.weapon)?.emoji}] <span style={{color:"#FF69B4"}}>{kf.enemy}</span>
            </div>
          ))}
        </div>
        <div style={{position:"absolute",bottom:8,left:12,width:isMobile?100:180}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#DDD",marginBottom:2}}>
            <span>HP{extraLives > 0 ? " 😇" : ""}</span>
            <span>{health}/{(DIFFICULTIES[difficulty]||DIFFICULTIES.normal).playerHP}</span>
          </div>
          <div style={{background:"rgba(255,255,255,0.15)",borderRadius:3,height:6,overflow:"hidden"}}>
            <div style={{width:Math.min(100, (health/(DIFFICULTIES[difficulty]||DIFFICULTIES.normal).playerHP)*100)+"%",height:"100%",borderRadius:3,background:health>60?"#0F0":health>30?"#FA0":"#F00",transition:"width 0.2s"}} />
          </div>
          {extraLives > 0 && <div style={{fontSize:9,color:"#FFD700",marginTop:2}}>Guardian Angel Active</div>}
        </div>
        <div style={{position:"absolute",bottom:8,right:56,textAlign:"right"}}>
          <div style={{fontSize:11,color:weapon.color,marginBottom:1,fontWeight:600}}>{weapon.emoji} {weapon.name}</div>
          <div style={{fontSize:20,fontWeight:900}}>
            <span style={{color:ammo>0?"#FFF":"#F44"}}>{ammo}</span>
            <span style={{color:"#BBB",fontSize:13}}>/{weapon.maxAmmo}</span>
          </div>
          {isReloading && <div style={{fontSize:11,color:"#FFD700",animation:"blink 0.5s infinite"}}>RELOADING...</div>}
        </div>
        {health<30 && <div style={{position:"absolute",inset:0,boxShadow:"inset 0 0 "+(100-health*2)+"px rgba(255,0,0,"+(30-health)/60+")",pointerEvents:"none"}} />}
        {guardianAngelFlash && <div style={{position:"absolute",inset:0,background:"radial-gradient(circle,rgba(255,215,0,0.3) 0%,transparent 70%)",pointerEvents:"none",animation:"blink 0.5s infinite"}} />}
      </div>

      {isMobile && (
        <div style={{height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 6px",background:"rgba(10,10,10,0.95)",borderTop:"1px solid rgba(255,255,255,0.12)",flexShrink:0,gap:3}}>
          <div style={{display:"flex",gap:3}}>
            {WEAPONS.map((w,i)=>(
              <button key={i} onClick={()=>switchWeapon(i)} style={{
                width:38,height:42,borderRadius:8,position:"relative",
                background:i===currentWeapon?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.04)",
                border:i===currentWeapon?"2px solid "+w.color:"1px solid rgba(255,255,255,0.12)",
                color:i===currentWeapon?w.color:"#BBB",
                fontSize:16,fontFamily:"'Courier New',monospace",
                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
              }}>
                {w.emoji}
                <span style={{position:"absolute",top:1,right:3,fontSize:8,color:"#999",fontWeight:900}}>{i+1}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>doReload(currentWeaponRef.current)} style={{
            padding:"8px 10px",borderRadius:8,fontSize:12,fontWeight:900,fontFamily:"'Courier New',monospace",
            background:isReloading?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.08)",
            color:isReloading?"#FFD700":"#FFF",
            border:"1px solid rgba(255,255,255,0.15)",cursor:"pointer",height:42,
          }}>{isReloading?"..":"R"}</button>
          <button onClick={doDash} style={{
            width:42,height:42,borderRadius:8,
            background:dashReady?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.04)",
            border:dashReady?"1px solid rgba(0,229,255,0.4)":"1px solid rgba(255,255,255,0.08)",
            color:dashReady?"#00E5FF":"#777",
            fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontFamily:"monospace",
          }}>💨</button>
          <button onClick={throwGrenade} style={{
            width:42,height:42,borderRadius:8,position:"relative",
            background:grenadeReady?"rgba(255,69,0,0.15)":"rgba(255,255,255,0.04)",
            border:grenadeReady?"1px solid rgba(255,69,0,0.4)":"1px solid rgba(255,255,255,0.08)",
            color:grenadeReady?"#FF4500":"#777",
            fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            💣
            <span style={{position:"absolute",top:1,right:3,fontSize:8,color:"#999",fontWeight:900}}>5</span>
          </button>
          <button onClick={()=>{setPauseView("main");setPaused(true);}} style={{
            width:42,height:42,borderRadius:8,
            background:"rgba(255,255,255,0.08)",
            border:"1px solid rgba(255,255,255,0.15)",
            color:"#FFF",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:900,fontFamily:"monospace",letterSpacing:1,
          }}>II</button>
        </div>
      )}

      {!isMobile && (
        <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4,alignItems:"center",background:"rgba(0,0,0,0.4)",padding:"4px 8px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)"}}>
          {WEAPONS.map((w,i)=>(
            <div key={i} style={{position:"relative"}}
              onMouseEnter={()=>setHoveredTool("wpn-"+i)} onMouseLeave={()=>setHoveredTool(null)}>
              <div style={{
                width:38,height:38,borderRadius:6,position:"relative",
                background:i===currentWeapon?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.05)",
                border:i===currentWeapon?"2px solid "+w.color:"1px solid rgba(255,255,255,0.1)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,cursor:"pointer",
              }} onClick={()=>switchWeapon(i)}>
                {w.emoji}
                <span style={{position:"absolute",top:0,right:2,fontSize:9,color:i===currentWeapon?w.color:"#AAA",fontWeight:900,fontFamily:"monospace",lineHeight:1}}>{i+1}</span>
              </div>
              <Tooltip text={"["+String(i+1)+"] "+w.name+" — "+w.desc} visible={hoveredTool==="wpn-"+i} />
            </div>
          ))}
          <div style={{width:1,height:26,background:"rgba(255,255,255,0.15)",margin:"0 2px"}} />
          <div style={{position:"relative"}}
            onMouseEnter={()=>setHoveredTool("grenade")} onMouseLeave={()=>setHoveredTool(null)}>
            <div onClick={throwGrenade} style={{width:38,height:38,borderRadius:6,position:"relative",background:grenadeReady?"rgba(255,69,0,0.15)":"rgba(255,255,255,0.05)",border:grenadeReady?"1px solid rgba(255,69,0,0.4)":"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,cursor:"pointer"}}>
              💣
              <span style={{position:"absolute",top:0,right:2,fontSize:9,color:grenadeReady?"#FF4500":"#777",fontWeight:900,fontFamily:"monospace",lineHeight:1}}>5</span>
            </div>
            <Tooltip text={"[5/Q/G] Grenade — AOE explosion, "+GRENADE_COOLDOWN/1000+"s cooldown"} visible={hoveredTool==="grenade"} />
          </div>
          <div style={{position:"relative"}}
            onMouseEnter={()=>setHoveredTool("dash")} onMouseLeave={()=>setHoveredTool(null)}>
            <div onClick={doDash} style={{width:38,height:38,borderRadius:6,position:"relative",background:dashReady?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.05)",border:dashReady?"1px solid rgba(0,229,255,0.4)":"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer"}}>
              💨
              <span style={{position:"absolute",bottom:0,right:2,fontSize:7,color:dashReady?"#0EF":"#777",fontWeight:900,fontFamily:"monospace",lineHeight:1}}>⇧</span>
            </div>
            <Tooltip text={"[Space/Shift] Dash — Invincible dodge, "+DASH_COOLDOWN/1000+"s cooldown"} visible={hoveredTool==="dash"} />
          </div>
          <div style={{position:"relative"}}
            onMouseEnter={()=>setHoveredTool("reload")} onMouseLeave={()=>setHoveredTool(null)}>
            <div onClick={()=>doReload(currentWeaponRef.current)} style={{width:38,height:38,borderRadius:6,background:isReloading?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:isReloading?"#FFD700":"#FFF",fontWeight:900,cursor:"pointer",fontFamily:"monospace"}}>R</div>
            <Tooltip text="[R] Reload — Refill your magazine" visible={hoveredTool==="reload"} />
          </div>
        </div>
      )}

      <style>{
        "@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}" +
        "@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}" +
        "*{box-sizing:border-box;margin:0} body{margin:0;overflow:hidden} input::placeholder{color:#999}"
      }</style>
    </div>
  );
}
