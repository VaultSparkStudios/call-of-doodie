// ===== WEAPONS =====
export const WEAPONS = [
  { name: "Banana Blaster", emoji: "🍌", damage: 15, fireRate: 200, ammo: 30, maxAmmo: 30, reloadTime: 1500, color: "#FFE135", sound: "PEEL!", spread: 0.03, desc: "Reliable sidearm. Peel & deal." },
  { name: "Rubber Chicken RPG", emoji: "🐔", damage: 80, fireRate: 1200, ammo: 3, maxAmmo: 3, reloadTime: 3000, color: "#FF6B35", sound: "BAWK!", spread: 0, desc: "Massive damage, slow reload. BAWK!" },
  { name: "Nerf Minigun", emoji: "🔫", damage: 5, fireRate: 50, ammo: 200, maxAmmo: 200, reloadTime: 4000, color: "#FF4444", sound: "pew pew", spread: 0.12, desc: "Spray & pray. 200 foam darts of fury." },
  { name: "Plunger Launcher", emoji: "🪠", damage: 40, fireRate: 600, ammo: 8, maxAmmo: 8, reloadTime: 2000, color: "#8B4513", sound: "THWONK!", spread: 0.02, desc: "Mid-range plunger justice. THWONK!" },
  { name: "Sniper-ator 3000", emoji: "🎯", damage: 120, fireRate: 1800, ammo: 5, maxAmmo: 5, reloadTime: 2500, color: "#00FFAA", sound: "CRACK!", spread: 0.005, bulletLife: 110, bulletSize: 7, bulletTrail: true, bulletSpeed: 18, desc: "One-tap precision. Enemies won't get a second chance." },
  { name: "Spicy Squirt Gun", emoji: "🌶️", damage: 4, fireRate: 28, ammo: 100, maxAmmo: 100, reloadTime: 2800, color: "#FF5500", sound: "FWOOSH!", spread: 0.22, bulletLife: 14, bulletSize: 3, bulletTrail: false, bulletSpeed: 8, desc: "Short range, ridiculous fire rate. 100 shots of burning regret." },
];

// ===== ENEMIES =====
export const ENEMY_TYPES = [
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
  { name: "Shield Guy", health: 90, speed: 1.0, size: 44, color: "#4488FF", points: 350, deathQuote: "My shield... shattered!", emoji: "🛡️", ranged: false },
  { name: "YOLO Bomber", health: 20, speed: 3.8, size: 28, color: "#FF4400", points: 500, deathQuote: "Worth every HP!", emoji: "💥", ranged: false },
  { name: "Sergeant Karen", health: 55, speed: 0.8, size: 40, color: "#FF8800", points: 450, deathQuote: "Tell my troops... git gud", emoji: "📣", ranged: false },
];

// ===== PERKS =====
export const PERKS = [
  {
    id: "hollow_points", name: "Hollow Points", desc: "+25% bullet damage", emoji: "💥", tier: "common",
    apply: (mods) => { mods.damageMult = (mods.damageMult || 1) * 1.25; },
  },
  {
    id: "eagle_eye", name: "Eagle Eye", desc: "+10% crit chance", emoji: "🎯", tier: "common",
    apply: (mods) => { mods.critBonus = (mods.critBonus || 0) + 0.10; },
  },
  {
    id: "adrenaline", name: "Adrenaline Rush", desc: "+15% move speed", emoji: "⚡", tier: "common",
    apply: (mods, gs) => { if (gs?.player) gs.player.speed *= 1.15; mods.hasAdrenaline = true; },
  },
  {
    id: "iron_gut", name: "Iron Gut", desc: "+30 max HP & current HP", emoji: "🛡️", tier: "common",
    apply: (mods, gs) => { if (gs?.player) { gs.player.maxHealth += 30; gs.player.health = Math.min(gs.player.health + 30, gs.player.maxHealth); } },
  },
  {
    id: "fast_learner", name: "Fast Learner", desc: "+30% XP gain", emoji: "📚", tier: "common",
    apply: (mods) => { mods.xpMult = (mods.xpMult || 1) * 1.30; },
  },
  {
    id: "grenadier", name: "Grenadier", desc: "−35% grenade cooldown", emoji: "💣", tier: "uncommon",
    apply: (mods) => { mods.grenadeCDMult = (mods.grenadeCDMult || 1) * 0.65; },
  },
  {
    id: "parkour_pro", name: "Parkour Pro", desc: "−40% dash cooldown", emoji: "🏃", tier: "uncommon",
    apply: (mods) => { mods.dashCDMult = (mods.dashCDMult || 1) * 0.60; },
  },
  {
    id: "vampire", name: "Vampire", desc: "Heal 8% of damage dealt", emoji: "🧛", tier: "uncommon",
    apply: (mods) => { mods.lifesteal = (mods.lifesteal || 0) + 0.08; mods.hasVampire = true; },
  },
  {
    id: "deep_pockets", name: "Deep Pockets", desc: "+50% max ammo on all weapons", emoji: "📦", tier: "uncommon",
    apply: (mods) => { mods.ammoMult = (mods.ammoMult || 1) * 1.50; },
  },
  {
    id: "combo_master", name: "Combo Master", desc: "+50% combo window time", emoji: "🌪️", tier: "uncommon",
    apply: (mods) => { mods.comboTimerMult = (mods.comboTimerMult || 1) * 1.50; },
  },
  {
    id: "magnetism", name: "Magnetism", desc: "2× pickup collection range", emoji: "🧲", tier: "rare",
    apply: (mods) => { mods.pickupRange = (mods.pickupRange || 30) * 2; },
  },
  {
    id: "penetrator", name: "Penetrator", desc: "Bullets pierce through 1 extra enemy", emoji: "🔫", tier: "rare",
    apply: (mods) => { mods.pierce = (mods.pierce || 0) + 1; },
  },
  {
    id: "bloodlust", name: "Bloodlust", emoji: "🩸", tier: "uncommon",
    desc: "+30% dmg. Synergy: +15% lifesteal if Vampire active",
    apply: (mods) => { mods.damageMult = (mods.damageMult || 1) * 1.30; if (mods.hasVampire) mods.lifesteal = (mods.lifesteal || 0) + 0.15; },
  },
  {
    id: "turbo_boots", name: "Turbo Boots", emoji: "🚀", tier: "uncommon",
    desc: "−30% dash CD. Synergy: +20% speed if Adrenaline active",
    apply: (mods, gs) => { mods.dashCDMult = (mods.dashCDMult || 1) * 0.70; if (mods.hasAdrenaline && gs?.player) gs.player.speed *= 1.20; },
  },
];

// ===== CURSED PERKS =====
export const CURSED_PERKS = [
  { id: "glass_cannon",  name: "Glass Cannon",  emoji: "💀", tier: "cursed",
    desc: "+75% damage dealt · −40% max HP",
    apply: (mods, gs) => { mods.damageMult = (mods.damageMult||1)*1.75; if(gs?.player){const m=Math.max(15,Math.floor(gs.player.maxHealth*0.6));gs.player.maxHealth=m;gs.player.health=Math.min(gs.player.health,m);} } },
  { id: "berserker",     name: "Berserker",     emoji: "😡", tier: "cursed",
    desc: "+20% lifesteal · dash cooldown ×2",
    apply: (mods) => { mods.lifesteal=(mods.lifesteal||0)+0.20; mods.dashCDMult=(mods.dashCDMult||1)*2.0; } },
  { id: "tunnel_vision", name: "Tunnel Vision", emoji: "🔍", tier: "cursed",
    desc: "+60% damage · −50% ammo capacity",
    apply: (mods) => { mods.damageMult=(mods.damageMult||1)*1.60; mods.ammoMult=(mods.ammoMult||1)*0.5; } },
  { id: "speed_demon",   name: "Speed Demon",   emoji: "👹", tier: "cursed",
    desc: "+50% move speed · −45% max HP",
    apply: (mods, gs) => { if(gs?.player){gs.player.speed*=1.5;const m=Math.max(15,Math.floor(gs.player.maxHealth*0.55));gs.player.maxHealth=m;gs.player.health=Math.min(gs.player.health,m);} } },
  { id: "pyromaniac",    name: "Pyromaniac",    emoji: "🔥", tier: "cursed",
    desc: "Grenade dmg ×2 · −25% bullet damage",
    apply: (mods) => { mods.grenadeDamageMult=(mods.grenadeDamageMult||1)*2.0; mods.damageMult=(mods.damageMult||1)*0.75; } },
  { id: "last_resort",   name: "Last Resort",   emoji: "💔", tier: "cursed",
    desc: "+200% dmg below 25% HP · start at 25% HP",
    apply: (mods, gs) => { mods.lastResort=true; if(gs?.player){gs.player.health=Math.max(1,Math.floor(gs.player.maxHealth*0.25));} } },
];

export const PERK_TIER_COLORS = { common: "#AAAAAA", uncommon: "#44BB44", rare: "#4488FF", legendary: "#FF44FF", cursed: "#FF2244" };
export const PERK_TIER_WEIGHTS = { common: 5, uncommon: 3, rare: 1, cursed: 0 };

// ===== STARTER LOADOUTS =====
export const STARTER_LOADOUTS = [
  { id: "standard",  name: "Standard Issue", emoji: "⚖️", desc: "Default soldier. Versatile and balanced.",                 color: "#AAAAAA" },
  { id: "cannon",    name: "Glass Cannon",   emoji: "💀", desc: "+50% damage · start with only 60% HP.",                   color: "#FF4444" },
  { id: "tank",      name: "Iron Tank",      emoji: "🛡️", desc: "+60 max HP · −20% move speed.",                          color: "#4488FF" },
  { id: "speedster", name: "Speed Freak",    emoji: "⚡", desc: "+35% move speed · −40% dash cooldown.",                   color: "#00FFAA" },
];

// ===== META UPGRADES =====
export const META_UPGRADES = [
  { id: "veteran",     name: "Veteran",       emoji: "🎖️", cost: 50,  desc: "Start each run with +20% XP" },
  { id: "field_medic", name: "Field Medic",   emoji: "💊",  cost: 60,  desc: "Start each run with +25 HP" },
  { id: "swift_boots", name: "Swift Boots",   emoji: "👟",  cost: 75,  desc: "Start each run with −20% dash CD" },
  { id: "deep_mag",    name: "Deep Magazine", emoji: "📦",  cost: 50,  desc: "Start each run with +25% ammo" },
  { id: "hardened",    name: "Hardened",      emoji: "🛡️", cost: 100, desc: "Start each run with +15% damage" },
  { id: "scavenger",   name: "Scavenger",     emoji: "🧲",  cost: 80,  desc: "Start each run with +50% pickup range" },
];

// ===== KILLSTREAKS =====
export const KILLSTREAKS = [
  "Uber Eats Delivery Drone", "Roomba Strike", "Tactical Crocs Airdrop",
  "AC-130 (Guy with leaf blower)", "Nuclear (Microwave fish in office)",
  "Swarm of Angry Geese", "Mom With a Chancla",
];

// ===== TEXT POOLS =====
export const HITMARKERS = ["bonk!", "oof!", "yeet!", "bruh!", "no cap!", "sheesh!", "ratio'd!", "L + bozo!", "skill issue!", "rekt!", "gg ez!", "cope!", "slay!", "W!", "cancelled!"];

export const DEATH_MESSAGES = [
  "360 no-scoped by a toddler", "Killed by: Lag (sure buddy)",
  "K/D visible from space... negatively", "Even bots felt bad",
  "Your dignity will not respawn", "Controller ran away in shame",
  "Eliminated by: gravity", "Achievement: Floor Inspector",
  "Outplayed by a potato", "Skill gap = Grand Canyon",
  "Mic check: it was your fault", "Uninstall recommended",
  "The Landlord evicted your HP", "Crypto portfolio: also crashed",
  "Karen filed a complaint about your skills", "Your WiFi blamed you",
];

export const RANK_NAMES = [
  "Noob Potato", "Couch Commando", "Keyboard Warrior", "Basement Lieutenant",
  "Dorito General", "Mountain Dew Marshal", "Supreme Pizza Commander",
  "Legendary Gamer (Mom's Basement)", "Prestige Toilet Master", "Immortal Tryhard",
];

export const TIPS = [
  "Tip: Git gud", "Tip: Grass exists outside", "Tip: Your K/D doesn't define you... but it should",
  "Tip: The Rubber Chicken RPG solves everything", "Tip: Karens are resistant to logic",
  "Tip: Florida Man has NO fear", "Tip: Grenades fix most social situations",
  "Tip: Dashing through enemies makes you feel cool", "Pro tip: Don't die",
  "Tip: The Plunger Launcher is not a toilet tool", "Tip: Combos = more points = more bragging",
  "Tip: The HOA President files complaints while attacking", "Tip: Nuke pickups are 5% drop rate. Good luck.",
  "Tip: Auto-aim is not cheating, it's accessibility", "Tip: Your mom says dinner's ready",
  "Tip: 15% crit chance = every bullet is a gamble", "Tip: The Conspiracy Bro knows what you did",
  "Tip: Press 5 for grenade (the spicy option)", "Tip: Pause to read the Bestiary. Know your enemy.",
  "Tip: Landlords are tanky AND ranged. Evict them fast.", "Tip: Crypto Bros zigzag like the market. HODL your aim.",
  "Tip: Kill milestones unlock bragging rights at 25/50/100+",
  "Tip: Level up to pick a perk. Choose wisely.", "Tip: Perks stack — grab the same one twice for double effect.",
  "Tip: Weapon upgrades drop from enemies. Keep your eyes open.",
  "Tip: Boss waves hit every 5 waves. Prepare accordingly.",
  "Tip: Vampire perk + Nerf Minigun = free healthcare.",
  "Tip: Penetrator perk makes every bullet worth more.",
  "Tip: Sniper-ator 3000 pierces the soul. One shot, one vibe.",
  "Tip: Spicy Squirt Gun works best when you're basically touching the enemy.",
  "Tip: Sergeant Karen buffs nearby enemies. Eliminate her first.",
];

// ===== ACHIEVEMENTS =====
export const ACHIEVEMENTS = [
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
  // New achievements
  { id: "first_perk", name: "Perk Up", desc: "Select your first perk", emoji: "✨", check: (s) => s.perksSelected >= 1, tier: "bronze" },
  { id: "perk_5", name: "Build Complete", desc: "Select 5 perks in one run", emoji: "🧬", check: (s) => s.perksSelected >= 5, tier: "silver" },
  { id: "perk_10", name: "Theorycrafted", desc: "Select 10 perks in one run", emoji: "🔬", check: (s) => s.perksSelected >= 10, tier: "gold" },
  { id: "first_upgrade", name: "Arms Dealer", desc: "Pick up your first weapon upgrade", emoji: "🔧", check: (s) => s.weaponUpgradesCollected >= 1, tier: "bronze" },
  { id: "max_upgrade", name: "Fully Pimped", desc: "Max out a weapon (level 3)", emoji: "⭐", check: (s) => s.maxWeaponLevel >= 3, tier: "gold" },
  { id: "boss_wave_clear", name: "Bouncer", desc: "Clear your first boss wave", emoji: "🚫", check: (s) => s.bossWavesCleared >= 1, tier: "silver" },
  { id: "boss_wave_5", name: "Boss Rush Mode", desc: "Clear 5 boss waves", emoji: "💀", check: (s) => s.bossWavesCleared >= 5, tier: "legendary" },
];

// ===== GAME CONSTANTS =====
export const GRENADE_COOLDOWN = 8000;
export const DASH_COOLDOWN = 1500;
export const DASH_SPEED = 18;
export const DASH_DURATION = 8;
export const CRIT_CHANCE = 0.15;
export const CRIT_MULT = 2.0;
export const COMBO_TIMER_BASE = 120;

export const DIFFICULTIES = {
  easy:   { label: "Easy",   emoji: "🟢", desc: "Chill mode. Enemies are weaker and slower.", healthMult: 0.7, speedMult: 0.8, spawnMult: 1.3, playerHP: 150, color: "#44CC44" },
  normal: { label: "Normal", emoji: "🟡", desc: "The standard Call of Doodie experience.",   healthMult: 1.0, speedMult: 1.0, spawnMult: 1.0, playerHP: 100, color: "#FFD700" },
  hard:   { label: "Hard",   emoji: "🔴", desc: "Enemies hit harder and faster. Git gud.",    healthMult: 1.4, speedMult: 1.2, spawnMult: 0.75, playerHP: 80, color: "#FF4444" },
  insane: { label: "INSANE", emoji: "💀", desc: "You WILL die. Guaranteed. No refunds.",      healthMult: 1.8, speedMult: 1.4, spawnMult: 0.5,  playerHP: 60, color: "#FF00FF" },
};

export const KILL_MILESTONES = {
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
