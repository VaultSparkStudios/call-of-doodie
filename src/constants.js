// ===== WEAPONS =====
export const WEAPONS = [
  { name: "Banana Blaster", emoji: "🍌", damage: 15, fireRate: 200, ammo: 30, maxAmmo: 30, reloadTime: 1500, color: "#FFE135", sound: "PEEL!", spread: 0.03, desc: "Reliable sidearm. Peel & deal." },
  { name: "Rubber Chicken RPG", emoji: "🐔", damage: 80, fireRate: 1200, ammo: 3, maxAmmo: 3, reloadTime: 3000, color: "#FF6B35", sound: "BAWK!", spread: 0, desc: "Massive damage, slow reload. BAWK!" },
  { name: "Nerf Minigun", emoji: "🔫", damage: 5, fireRate: 50, ammo: 200, maxAmmo: 200, reloadTime: 4000, color: "#FF4444", sound: "pew pew", spread: 0.12, desc: "Spray & pray. 200 foam darts of fury." },
  { name: "Plunger Launcher", emoji: "🪠", damage: 40, fireRate: 600, ammo: 8, maxAmmo: 8, reloadTime: 2000, color: "#8B4513", sound: "THWONK!", spread: 0.02, desc: "Mid-range plunger justice. THWONK!" },
  { name: "Sniper-ator 3000", emoji: "🎯", damage: 120, fireRate: 1800, ammo: 5, maxAmmo: 5, reloadTime: 2500, color: "#00FFAA", sound: "CRACK!", spread: 0.005, bulletLife: 110, bulletSize: 7, bulletTrail: true, bulletSpeed: 18, desc: "One-tap precision. Enemies won't get a second chance." },
  { name: "Spicy Squirt Gun", emoji: "🌶️", damage: 4, fireRate: 28, ammo: 100, maxAmmo: 100, reloadTime: 2800, color: "#FF5500", sound: "FWOOSH!", spread: 0.22, bulletLife: 14, bulletSize: 3, bulletTrail: false, bulletSpeed: 8, desc: "Short range, ridiculous fire rate. 100 shots of burning regret." },
  { name: "Confetti Cannon", emoji: "🎊", damage: 12, fireRate: 900, ammo: 18, maxAmmo: 18, reloadTime: 2000, color: "#FF69B4", sound: "POP!", spread: 0.55, bulletLife: 22, bulletSize: 3, bulletSpeed: 9, pellets: 6, desc: "6 confetti pellets per blast. Close range chaos." },
  { name: "Shock Zapper", emoji: "⚡", damage: 32, fireRate: 1100, ammo: 15, maxAmmo: 15, reloadTime: 2400, color: "#00E5FF", sound: "ZAP!", spread: 0.06, bulletLife: 75, bulletSize: 5, bulletSpeed: 15, burst: 3, burstDelay: 90, desc: "3-shot burst, medium range. Zap zap zap." },
  { name: "Boomerang Blaster", emoji: "🪃", damage: 28, fireRate: 1100, ammo: 5, maxAmmo: 5, reloadTime: 1800, color: "#FFA500", sound: "WHOOSH!", spread: 0, bulletLife: 100, bulletSize: 9, bulletSpeed: 6, boomerang: true, desc: "Curves out, returns to you. Pierces every enemy both ways." },
  { name: "Railgun", emoji: "🔦", damage: 160, fireRate: 2800, ammo: 4, maxAmmo: 4, reloadTime: 3500, color: "#00FFFF", sound: "ZORCH!", spread: 0, hitscan: true, desc: "Instant hitscan beam. Penetrates every enemy in a straight line." },
  { name: "Ricochet Pistol", emoji: "🎱", damage: 35, fireRate: 340, ammo: 18, maxAmmo: 18, reloadTime: 1800, color: "#7FFF00", sound: "PING!", spread: 0.04, bulletLife: 90, bulletSize: 6, bulletSpeed: 12, bouncesLeft: 10, desc: "Bounces up to 10 times per shot. Angles are your best friend." },
  { name: "Nuclear Kazoo", emoji: "🎵", damage: 22, fireRate: 260, ammo: 24, maxAmmo: 24, reloadTime: 2000, color: "#FF00FF", sound: "HONK!", spread: 0.20, bulletLife: 48, bulletSize: 5, bulletSpeed: 10, pellets: 3, desc: "3-wide shots per fire. Annoyingly effective in crowds." },
];

// ===== ENEMIES =====
// deathQuotes: array — one is picked randomly on death
export const ENEMY_TYPES = [
  { name: "Mall Cop", health: 30, speed: 1.2, size: 40, color: "#4488CC", points: 100, emoji: "👮", ranged: false,
    deathQuotes: ["My segway...!", "I was SO close to retirement!", "Sir, this is a Wendy's...", "Badge number 2... retired.", "I did NOT train for this!"] },
  { name: "Karen", health: 50, speed: 0.8, size: 35, color: "#FF69B4", points: 200, emoji: "💇‍♀️", ranged: true, projSpeed: 4, projRate: 150,
    deathQuotes: ["I want the MANAGER... of heaven!", "I'm calling corporate!", "I have a Yelp account!", "Do you know who I AM?!", "I will NOT be removing my review!"] },
  { name: "Florida Man", health: 80, speed: 2.0, size: 45, color: "#FF8C00", points: 300, emoji: "🐊", ranged: false,
    deathQuotes: ["Hold my beer...", "I've survived worse! (Technically true)", "The gator saw this coming...", "Shoulda worn the crocs.", "Florida Man dies doing what he loved."] },
  { name: "HOA President", health: 120, speed: 0.5, size: 50, color: "#800080", points: 500, emoji: "📋", ranged: true, projSpeed: 3, projRate: 200,
    deathQuotes: ["Your lawn was 0.5\" too tall!", "I'm issuing a posthumous violation!", "This wasn't in the bylaws...", "Fine: $50. Payable in the afterlife.", "The committee... will hear of this!"] },
  { name: "Mega Karen", health: 400, speed: 0.4, size: 70, color: "#FF1493", points: 2000, emoji: "👹", ranged: true, projSpeed: 5, projRate: 90,
    deathQuotes: ["FIRED FROM LIFE!", "I want to speak to Death's manager!", "One star. Would NOT recommend dying.", "I WILL haunt your Glassdoor review!", "My lawyers will hear about THIS!"] },
  { name: "IT Guy", health: 60, speed: 1.5, size: 38, color: "#00CED1", points: 250, emoji: "💻", ranged: false,
    deathQuotes: ["Have you tried rebooting?", "Error 404: Survival not found.", "This is a skill issue on your part.", "I should've used Linux...", "My death was caused by a skill issue."] },
  { name: "Gym Bro", health: 100, speed: 1.8, size: 48, color: "#32CD32", points: 350, emoji: "💪", ranged: false,
    deathQuotes: ["But my gains...", "Bro do you even lift... death?", "Rest in gains.", "I skipped leg day... and now I can't run.", "Protein shakes can't save me now!"] },
  { name: "Influencer", health: 40, speed: 2.2, size: 32, color: "#E040FB", points: 400, emoji: "🤳", ranged: false,
    deathQuotes: ["This isn't content...", "Don't forget to like & subscribe!", "Dying... but make it aesthetic!", "My death had terrible lighting.", "Unalived. Check my Patreon for more."] },
  { name: "Conspiracy Bro", health: 90, speed: 1.6, size: 42, color: "#AAFF00", points: 450, emoji: "🛸", ranged: true, projSpeed: 3.5, projRate: 180,
    deathQuotes: ["The frogs... were right...", "This was an INSIDE JOB!", "They knew I was onto them...", "Wake up sheeple... I'm dying!", "The deep state finally got me!"] },
  { name: "Landlord", health: 250, speed: 0.5, size: 56, color: "#8B6914", points: 900, emoji: "🏠", ranged: true, projSpeed: 4, projRate: 100,
    deathQuotes: ["Rent was due YESTERDAY!", "I'm raising prices from beyond the grave.", "Death? I'll pass the cost to tenants.", "No refund on the security deposit.", "I'm keeping your deposit. Always."] },
  { name: "Crypto Bro", health: 30, speed: 3.0, size: 28, color: "#00D4AA", points: 600, emoji: "📈", ranged: false,
    deathQuotes: ["HODL...", "Wen moon? Wen death apparently.", "This is fine. I'm diversified.", "Bought the dip... of my HP.", "Number go down. Way down."] },
  { name: "Shield Guy", health: 90, speed: 1.0, size: 44, color: "#4488FF", points: 350, emoji: "🛡️", ranged: false,
    deathQuotes: ["My shield... shattered!", "I was literally invincible earlier!", "You shot the UNSHIELDED side!", "I should've had a second shield!", "Skill diff. I admit it."] },
  { name: "YOLO Bomber", health: 20, speed: 3.8, size: 28, color: "#FF4400", points: 500, emoji: "💥", ranged: false,
    deathQuotes: ["YOLO! (Only once, apparently)", "10/10 would explode again.", "Worth every HP!", "Boom. No regrets.", "I lived fast and died in a fireball."] },
  { name: "Sergeant Karen", health: 55, speed: 0.8, size: 40, color: "#FF8800", points: 450, emoji: "📣", ranged: false,
    deathQuotes: ["Tell my troops... git gud", "FALL BACK— oh wait, too late.", "I demand a formal debrief!", "This. Is. NOT. Regulation!", "I want a full written report on my death!"] },
  { name: "Life Coach", health: 70, speed: 2.4, size: 34, color: "#FFCC00", points: 500, emoji: "📚", ranged: false,
    deathQuotes: ["You just killed my VIBE!", "Your potential was wasted!", "I was THIS close to unlocking your greatness!", "Wrong mindset... and also you shot me.", "The real enemy was within you all along."] },
  { name: "Tech CEO", health: 320, speed: 0.3, size: 66, color: "#00BFFF", points: 1500, emoji: "💼", ranged: true, projSpeed: 5, projRate: 80,
    deathQuotes: ["I'll pivot from this.", "My VCs will hear about this.", "Disrupting... the concept of living.", "Series D? More like series DEAD.", "I was about to IPO..."] },
  // ── Boss-rotation types (indices 16–18) ──
  { name: "Splitter", health: 450, speed: 1.0, size: 64, color: "#FF6688", points: 3000, emoji: "💔", ranged: true, projSpeed: 4.2, projRate: 110,
    deathQuotes: ["We are many...", "Division is power!", "I multiply in death!", "One becomes three!", "You can't kill us all!"] },
  { name: "Juggernaut", health: 900, speed: 0.55, size: 78, color: "#CC4400", points: 3500, emoji: "🦏", ranged: false, projSpeed: 0, projRate: 999,
    deathQuotes: ["My shield... broken!", "Unstoppable was wrong.", "Charged too hard...", "The wall didn't yield.", "Fine. You win this round."] },
  { name: "Summoner", health: 320, speed: 0.4, size: 60, color: "#8844FF", points: 4000, emoji: "🌀", ranged: true, projSpeed: 3.5, projRate: 190,
    deathQuotes: ["My minions... avenge me!", "The circle is broken!", "Without my summons...", "I was too vulnerable!", "The portal... closes..."] },
  // ── Regular enemy: index 19 ──
  { name: "Doomscroller", health: 55, speed: 1.5, size: 36, color: "#7B68EE", points: 380, emoji: "📱", ranged: false,
    deathQuotes: ["Just... one more... scroll...", "I missed the red flag. I was doomscrolling.", "At least my screen time hits zero.", "Worth it. I think.", "Finally... offline."] },
  // ── Boss-rotation type: index 20 ──
  { name: "The Algorithm", health: 700, speed: 0.5, size: 68, color: "#1DA1F2", points: 4500, emoji: "📊", ranged: true, projSpeed: 4.0, projRate: 85,
    deathQuotes: ["Error 404: Engagement not found.", "My reach... declining...", "The metrics... flatlined...", "Shadow-banned. From life.", "Content... terminated."] },
];

// ===== PERKS =====
export const PERKS = [
  {
    id: "hollow_points", name: "Hollow Points", desc: "+25% bullet damage", emoji: "💥", tier: "common",
    apply: (mods) => { mods.damageMult = (mods.damageMult || 1) * 1.25; },
  },
  {
    id: "eagle_eye", name: "Eagle Eye", desc: "+10% crit chance. Synergy: +10% crit with Penetrator", emoji: "🎯", tier: "common",
    apply: (mods) => { mods.critBonus = (mods.critBonus || 0) + 0.10; mods.hasEagleEye = true; if (mods.pierce > 0) mods.critBonus += 0.10; },
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
    id: "grenadier", name: "Grenadier", desc: "−35% grenade cooldown. Synergy: +50% grenade dmg with Pyromaniac", emoji: "💣", tier: "uncommon",
    apply: (mods) => { mods.grenadeCDMult = (mods.grenadeCDMult || 1) * 0.65; mods.hasGrenadier = true; if (mods.hasPyromaniac) mods.grenadeDamageMult = (mods.grenadeDamageMult || 1) * 1.5; },
  },
  {
    id: "parkour_pro", name: "Parkour Pro", desc: "−40% dash cooldown", emoji: "🏃", tier: "uncommon",
    apply: (mods) => { mods.dashCDMult = (mods.dashCDMult || 1) * 0.60; },
  },
  {
    id: "vampire", name: "Vampire", desc: "Heal 8% of damage dealt. Synergy: +6% more lifesteal with Chain Lightning", emoji: "🧛", tier: "uncommon",
    apply: (mods) => { mods.lifesteal = (mods.lifesteal || 0) + 0.08; mods.hasVampire = true; if (mods.hasChainLightning) mods.lifesteal += 0.06; },
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
    id: "penetrator", name: "Penetrator", desc: "Bullets pierce through 1 extra enemy. Synergy: +10% crit with Eagle Eye", emoji: "🔫", tier: "rare",
    apply: (mods) => { mods.pierce = (mods.pierce || 0) + 1; if (mods.hasEagleEye) mods.critBonus = (mods.critBonus || 0) + 0.10; },
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
  {
    id: "tungsten_rounds", name: "Tungsten Rounds", emoji: "🔩", tier: "uncommon",
    desc: "+20% bullet damage, bullets pierce 1 extra enemy",
    apply: (mods) => { mods.damageMult = (mods.damageMult || 1) * 1.20; mods.pierce = (mods.pierce || 0) + 1; },
  },
  {
    id: "adrenaline_rush", name: "Adrenaline Rush", emoji: "💉", tier: "uncommon",
    desc: "Killing an enemy while below 30% HP grants 2s of double speed",
    apply: (mods) => { mods.adrenalineRush = true; },
  },
  {
    id: "chain_lightning", name: "Chain Lightning", emoji: "⚡", tier: "rare",
    desc: "Hits have 20% chance to arc to 1 nearby enemy for 50% damage. Synergy: +6% lifesteal with Vampire",
    apply: (mods, gs) => { if (gs) gs.chainLightning = true; mods.hasChainLightning = true; if (mods.hasVampire) mods.lifesteal = (mods.lifesteal || 0) + 0.06; },
  },
  {
    id: "dead_mans_hand", name: "Dead Man's Hand", emoji: "🃏", tier: "rare",
    desc: "On death, trigger a massive explosion. Activates guardian angel if available",
    apply: (mods, gs) => { if (gs) gs.deadMansHand = true; },
  },
  {
    id: "overclocked", name: "Overclocked", emoji: "🔧", tier: "uncommon",
    desc: "+35% fire rate, -15% damage. Every 20 shots triggers a forced 1s reload",
    apply: (mods, gs) => {
      mods.damageMult = (mods.damageMult || 1) * 0.85;
      mods.fireRateMult = (mods.fireRateMult || 1) * 0.65;
      if (gs) { gs.overclockedShots = 0; gs.overclocked = true; }
    },
  },
  {
    id: "scavenger", name: "Scavenger", emoji: "🎒", tier: "common",
    desc: "Enemies drop ammo 40% more often. Ammo pickups restore 30% more ammo",
    apply: (mods) => { mods.ammoDropMult = (mods.ammoDropMult || 1) * 1.40; mods.ammoRestoreMult = (mods.ammoRestoreMult || 1) * 1.30; },
  },
  {
    id: "combo_lifesteal", name: "Combo Lifesteal", emoji: "🩸", tier: "uncommon",
    desc: "+6% lifesteal · +60% combo window",
    apply: (mods) => { mods.lifesteal = (mods.lifesteal || 0) + 0.06; mods.comboTimerMult = (mods.comboTimerMult || 1) * 1.60; },
  },
  {
    id: "overdrive", name: "Overdrive", emoji: "🚀", tier: "uncommon",
    desc: "+40% fire rate · +10% damage",
    apply: (mods) => { mods.fireRateMult = (mods.fireRateMult || 1) * 0.60; mods.damageMult = (mods.damageMult || 1) * 1.10; },
  },
  {
    id: "hoarder", name: "Hoarder", emoji: "🧺", tier: "uncommon",
    desc: "+80% pickup range · +50% ammo drops",
    apply: (mods) => { mods.pickupRange = (mods.pickupRange || 30) * 1.80; mods.ammoDropMult = (mods.ammoDropMult || 1) * 1.50; },
  },
  {
    id: "glass_mind", name: "Glass Mind", emoji: "🧠", tier: "rare",
    desc: "+80% XP gain · −25 max HP",
    apply: (mods, gs) => { mods.xpMult = (mods.xpMult || 1) * 1.80; if (gs?.player) { const m = Math.max(15, gs.player.maxHealth - 25); gs.player.maxHealth = m; gs.player.health = Math.min(gs.player.health, m); } },
  },
  {
    id: "bullet_hose", name: "Bullet Hose", emoji: "🔃", tier: "uncommon",
    desc: "+100% max ammo · +40% ammo restore",
    apply: (mods) => { mods.ammoMult = (mods.ammoMult || 1) * 2.0; mods.ammoRestoreMult = (mods.ammoRestoreMult || 1) * 1.40; },
  },
  {
    id: "crit_cascade", name: "Crit Cascade", emoji: "🌩️", tier: "rare",
    desc: "+12% crit chance. Synergy: +10% crit with Eagle Eye; +8% crit with Penetrator",
    apply: (mods) => { mods.critBonus = (mods.critBonus || 0) + 0.12; if (mods.hasEagleEye) mods.critBonus += 0.10; if (mods.pierce > 0) mods.critBonus += 0.08; },
  },
  {
    id: "grenade_chain", name: "Grenade Chain", emoji: "💥", tier: "rare",
    desc: "−50% grenade CD · +25% grenade damage. Synergy: +50% more dmg with Pyromaniac",
    apply: (mods) => { mods.grenadeCDMult = (mods.grenadeCDMult || 1) * 0.50; mods.grenadeDamageMult = (mods.grenadeDamageMult || 1) * 1.25; if (mods.hasPyromaniac) mods.grenadeDamageMult = (mods.grenadeDamageMult || 1) * 1.50; },
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
    desc: "Grenade dmg ×2 · −25% bullet damage. Synergy: +50% more grenade dmg with Grenadier",
    apply: (mods) => { mods.grenadeDamageMult=(mods.grenadeDamageMult||1)*2.0; mods.damageMult=(mods.damageMult||1)*0.75; mods.hasPyromaniac=true; if (mods.hasGrenadier) mods.grenadeDamageMult=(mods.grenadeDamageMult||1)*1.5; } },
  { id: "last_resort",   name: "Last Resort",   emoji: "💔", tier: "cursed",
    desc: "+200% dmg below 25% HP · start at 25% HP",
    apply: (mods, gs) => { mods.lastResort=true; if(gs?.player){gs.player.health=Math.max(1,Math.floor(gs.player.maxHealth*0.25));} } },
  { id: "paranoia", name: "Paranoia", emoji: "👁", tier: "cursed",
    desc: "All enemies move 25% faster, but you gain +40% XP",
    apply: (mods, gs) => { mods.xpMult = (mods.xpMult || 1) * 1.4; if (gs) gs.enemySpeedMult = (gs.enemySpeedMult || 1) * 1.25; } },
  { id: "glass_jaw", name: "Glass Jaw", emoji: "💎", tier: "cursed",
    desc: "You take double damage but deal +50% damage",
    apply: (mods, gs) => { mods.damageMult = (mods.damageMult || 1) * 1.5; if (gs) gs.glassjaw = true; } },
  { id: "glass_legs", name: "Glass Legs", emoji: "🦿", tier: "cursed",
    desc: "+80% bullet damage · dash cooldown ×3",
    apply: (mods) => { mods.damageMult = (mods.damageMult || 1) * 1.80; mods.dashCDMult = (mods.dashCDMult || 1) * 3.0; } },
  { id: "xp_curse", name: "XP Curse", emoji: "📉", tier: "cursed",
    desc: "+120% bullet damage · −70% XP gain",
    apply: (mods) => { mods.damageMult = (mods.damageMult || 1) * 2.20; mods.xpMult = (mods.xpMult || 1) * 0.30; } },
  { id: "haste_poison", name: "Haste Poison", emoji: "☠️", tier: "cursed",
    desc: "+70% fire rate · ammo capacity ×0.3",
    apply: (mods) => { mods.fireRateMult = (mods.fireRateMult || 1) * 0.30; mods.ammoMult = (mods.ammoMult || 1) * 0.30; } },
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

// ===== META UPGRADES (tiered — 3 tiers each) =====
// Storage key "cod-meta-v2" maps upgradeTiers: { groupId: tierOwned (1-3) }
export const META_UPGRADES = [
  {
    id: "veteran", name: "Veteran", emoji: "🎖️",
    tiers: [
      { cost: 200,  desc: "Start each run with +20% XP gain" },
      { cost: 700,  desc: "Start each run with +45% XP gain" },
      { cost: 2000, desc: "Start each run with +75% XP gain" },
    ],
  },
  {
    id: "field_medic", name: "Field Medic", emoji: "💊",
    tiers: [
      { cost: 250,  desc: "Start each run with +20 max HP" },
      { cost: 800,  desc: "Start each run with +50 max HP" },
      { cost: 2500, desc: "Start each run with +100 max HP" },
    ],
  },
  {
    id: "swift_boots", name: "Swift Boots", emoji: "👟",
    tiers: [
      { cost: 300,  desc: "Start with −20% dash cooldown" },
      { cost: 900,  desc: "Start with −40% dash cooldown" },
      { cost: 2800, desc: "Start with −60% dash cooldown" },
    ],
  },
  {
    id: "deep_mag", name: "Deep Magazine", emoji: "📦",
    tiers: [
      { cost: 200,  desc: "Start with +25% max ammo on all weapons" },
      { cost: 700,  desc: "Start with +60% max ammo on all weapons" },
      { cost: 2000, desc: "Start with +100% max ammo on all weapons" },
    ],
  },
  {
    id: "hardened", name: "Hardened", emoji: "🛡️",
    tiers: [
      { cost: 400,  desc: "Start each run with +15% bullet damage" },
      { cost: 1200, desc: "Start each run with +30% bullet damage" },
      { cost: 3500, desc: "Start each run with +50% bullet damage" },
    ],
  },
  {
    id: "scavenger", name: "Scavenger", emoji: "🧲",
    tiers: [
      { cost: 300,  desc: "Start with +50% pickup range" },
      { cost: 1000, desc: "Start with +125% pickup range" },
      { cost: 3000, desc: "Start with +225% pickup range" },
    ],
  },
  {
    id: "grenadier", name: "Grenadier", emoji: "💣",
    tiers: [
      { cost: 400,  desc: "Start with −25% grenade cooldown" },
      { cost: 1200, desc: "Start with −45% grenade cooldown" },
      { cost: 3500, desc: "Start with −65% grenade cooldown" },
    ],
  },
  {
    id: "crit_master", name: "Crit Master", emoji: "🎯",
    tiers: [
      { cost: 400,  desc: "Start each run with +5% crit chance" },
      { cost: 1200, desc: "Start each run with +12% crit chance" },
      { cost: 3500, desc: "Start each run with +20% crit chance" },
    ],
  },
  {
    id: "speedster", name: "Speedster", emoji: "⚡",
    tiers: [
      { cost: 500,  desc: "Start each run with +10% move speed" },
      { cost: 1500, desc: "Start each run with +22% move speed" },
      { cost: 4000, desc: "Start each run with +38% move speed" },
    ],
  },
  {
    id: "vampire_bite", name: "Vampire Bite", emoji: "🧛",
    tiers: [
      { cost: 600,  desc: "Start with 3% lifesteal on every hit" },
      { cost: 1800, desc: "Start with 6% lifesteal on every hit" },
      { cost: 5000, desc: "Start with 10% lifesteal on every hit" },
    ],
  },
];

// ===== NEW FEATURES (changelog panel + share card) =====
export const NEW_FEATURES = [
  "🦏 Juggernaut Boss — shield absorbs damage; shatters with screen shake & VFX",
  "🌀 Summoner Boss — spawns elites, invulnerable while minions live",
  "💔 Splitter Boss — shatters into 3 fast shards on death",
  "📣 Boss Announcements — name + flavor text on every boss wave start",
  "🏆 Account Level Badge — tiered leaderboard badge based on career kills",
  "🌱 Seed on Leaderboard — run seed shown under every player name",
  "⚡ Wave Events — Fast Round, Siege, Elite Only, Fog of War every 3rd wave",
  "🔥 Rage Pickup — +75% damage for 5 seconds",
  "🧲 Magnet Pickup — instantly pulls all pickups on screen",
  "❄️ Freeze Pickup — slows all enemies 35% for 3 seconds",
  "🏟️ Named Arena Layouts — Pillars, Corridors, Cross-Rooms, Bunker (seeded)",
  "🎱 Ricochet Pistol — metallic ping, bounces off walls up to 10 times",
  "🎵 Nuclear Kazoo — nasal 3-pellet shotgun blast",
  "🎮 Full Controller Support — RT shoot, R3 dash, X/□ reload, aim assist",
  "📚 Life Coach & 💼 Tech CEO — 2 new enemy types",
  "🏆 49 Achievements — wave 25, 500 kills, 3 nukes, 10 boss kills & more",
  "⚔️ Challenge Links — share a run seed + difficulty for friends to race",
  "📷 GIF Highlight Reel — auto-captures your peak killstreak moment",
  "🗺️ 8 Map Themes — Office, Bunker, Factory, Ruins, Desert, Forest, Space, Arctic",
  "🌍 Global Leaderboard — compete worldwide with seed, loadout & device badges",
  "⭐ Prestige System — reset & raise the stakes",
  "🎲 Run Modifiers — 8 game-changers like Glass Cannon, Vampire, Ricochet+",
  "📱 Install as App — PWA support, add to home screen on any device",
  "🪃 Boomerang Blaster — curves out and returns, pierces all enemies",
  "🔦 Railgun — instant hitscan beam, penetrates every enemy in its path",
];

// ===== KILLSTREAKS =====
export const KILLSTREAKS = [
  "Uber Eats Delivery Drone", "Roomba Strike", "Tactical Crocs Airdrop",
  "AC-130 (Guy with leaf blower)", "Nuclear (Microwave fish in office)",
  "Swarm of Angry Geese", "Mom With a Chancla",
];

// ===== RUN MODIFIERS =====
// One modifier is applied per run (seeded). Each modifier has a clear upside + tradeoff.
export const RUN_MODIFIERS = [
  { id: "glass_cannon",   emoji: "💥", name: "Glass Cannon",   desc: "Deal 2× damage. Start at 50% HP." },
  { id: "vampire",        emoji: "🧛", name: "Vampire Mode",   desc: "Kills heal +3 HP. No health drops." },
  { id: "speed_freak",    emoji: "⚡", name: "Speed Freak",    desc: "Move 30% faster. Enemies are 20% faster too." },
  { id: "double_trouble", emoji: "👥", name: "Double Trouble", desc: "Twice the enemies per wave. +50% score per kill." },
  { id: "lightweight",    emoji: "💨", name: "Lightweight",    desc: "Dash cooldown halved. Move 15% faster." },
  { id: "headhunter",     emoji: "🎯", name: "Headhunter",     desc: "30% crit chance (was 15%). Crits deal 3× damage." },
  { id: "ricochet_plus",  emoji: "🔄", name: "Ricochet+",      desc: "Bullets bounce 20× instead of 10." },
  { id: "blessed",        emoji: "😇", name: "Blessed",        desc: "Start at 150% max HP. Move 10% faster." },
];

// ===== TEXT POOLS =====
export const HITMARKERS = ["bonk!", "oof!", "yeet!", "bruh!", "no cap!", "sheesh!", "ratio'd!", "L + bozo!", "skill issue!", "rekt!", "gg ez!", "cope!", "slay!", "W!", "cancelled!"];

export const DEATH_MESSAGES = [
  "360 no-scoped by a toddler",
  "Killed by: Lag (sure buddy)",
  "K/D visible from space... negatively",
  "Even the bots felt bad for you",
  "Your dignity will not respawn",
  "Controller ran away in shame",
  "Eliminated by: gravity",
  "Achievement unlocked: Floor Inspector",
  "Outplayed by a sentient potato",
  "Skill gap = the Grand Canyon",
  "Mic check: it was definitely your fault",
  "Uninstall recommended. Immediately.",
  "The Landlord evicted your HP",
  "Crypto portfolio: also crashed",
  "Karen filed a formal complaint about your skills",
  "Your WiFi personally blamed you",
  "Game over. Touch grass. Come back never.",
  "Cause of death: hubris",
  "You were this close. You were not.",
  "L + ratio + you got eliminated",
  "Your kill count was a personal best... for the enemies",
  "Reported for being bad. Case closed.",
  "DNS Error: skill not found",
  "The mall cop had more HP than your self-respect",
  "Florida Man: 1. You: Respawning.",
  "Death speedrun any% complete",
  "Mom called dinner. Right on time.",
  "Even the YOLO Bomber felt sorry",
  "You were playing on what difficulty again?",
  "Resume: 0 waves. Interests: getting wrecked.",
  "Your therapist just got a new client",
  "Kicked to the curb by the HOA",
  "You ran out of HP before excuses. Impressive.",
  "Obituary: died doing absolutely nothing right",
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
  // Wave milestones
  { id: "wave_25", name: "Silver Soldier", desc: "Reach wave 25", emoji: "🥈", check: (s) => s.wave >= 25, tier: "legendary" },
  // Survival
  { id: "survive_10m", name: "Couch Commander", desc: "Survive 10 minutes", emoji: "🛋️", check: (s) => s.timeSurvived >= 600, tier: "gold" },
  // Combat
  { id: "kills_500", name: "Certified War Criminal", desc: "Get 500 kills in one run", emoji: "💀", check: (s) => s.kills >= 500, tier: "legendary" },
  { id: "nukes_3", name: "Nuclear Option", desc: "Collect 3 nukes in one run", emoji: "☢️", check: (s) => s.nukes >= 3, tier: "gold" },
  { id: "crits_100", name: "Lucky Duck", desc: "Land 100 critical hits in one run", emoji: "🍀", check: (s) => s.crits >= 100, tier: "gold" },
  { id: "grenades_50", name: "Spam Legends", desc: "Throw 50 grenades", emoji: "💣", check: (s) => s.grenades >= 50, tier: "gold" },
  // Progression
  { id: "level_15", name: "Build Enjoyer", desc: "Reach level 15 in one run", emoji: "🔬", check: (s) => s.level >= 15, tier: "legendary" },
  // Score
  { id: "score_200k", name: "Doodie Millionaire", desc: "Score 200,000+ points", emoji: "💰", check: (s) => s.score >= 200000, tier: "legendary" },
  // Dash kills
  { id: "dash_kills_10", name: "Speed Bump", desc: "Kill 10 enemies while dashing", emoji: "💨", check: (s) => s.dashKills >= 10, tier: "silver" },
  // Perfect waves
  { id: "no_hit_waves_3", name: "Ghost Protocol", desc: "Complete 3 waves without taking damage", emoji: "👻", check: (s) => s.noHitWaves >= 3, tier: "gold" },
  // Boss
  { id: "boss_kills_10", name: "Boss Collector", desc: "Defeat 10 bosses across a single run", emoji: "👑", check: (s) => s.bossKills >= 10, tier: "legendary" },
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
