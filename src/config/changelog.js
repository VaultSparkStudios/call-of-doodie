// changelog.js — single source of truth for release history (S155).
//
// Two granularities live here, previously maintained in three divergent
// places (public /changelog/ hand-written in the route registry, NEW_FEATURES
// in constants.js, CodexTab news slice):
//  - CHANGELOG_ENTRIES: dated, player-facing release notes → public
//    /changelog/ page (via scripts/lib/public-route-registry.mjs)
//  - NEW_FEATURES: the flat feature list → NewFeaturesPanel, CodexTab news,
//    and the share card (constants.js re-exports it for back-compat)

export const CHANGELOG_ENTRIES = [
  ["August 16, 2026 · Operations deploy", "Added three authored 12–18 minute Operations with seven distinct encounter verbs, deterministic route and scoring receipts, interactive arena systems, mission-director guidance, an Operation-first command deck, a preference-safe chapter score, and distinct objective/reinforcement audio cues. Arcade & Rivals modes remain available. Real-time co-op remains gated and is not represented as live."],
  ["August 15, 2026 · Sound and fury", "Full audio overhaul: submix volume sliders, a sample-accurate music scheduler with bar-quantized transitions, chord progressions and section variation in every soundtrack vibe, music that ducks under big combat moments and muffles at critical health, plus new hit, dry-fire, wave, and shop sound effects. Visually: per-weapon projectiles and recoil, persistent scorch and splat decals, themed wall details, triple the sprite prop coverage, and a real walk cycle."],
  ["August 9, 2026 · Sharper, richer, more honest", "Refreshed player-facing facts across every page, expanded Community Stats presentation, and continued the in-game visual overhaul with crisper rendering and upgraded combat feedback."],
  ["August 8, 2026 · Doctrine Archive and mobile feel", "Added a permanent Doctrine Archive collection for every build doctrine ever forged, mobile haptic feedback for hits, kills, bosses, and low health, and off-screen threat-direction arrows."],
  ["August 7, 2026 · Live Community Stats and Sewer Zombies", "Launched verified live Community Stats on the Home screen, debrief, leaderboard, and a public stats page; added the seeded Sewer Zombies outbreak mode with four undead variants; introduced TOO EASY / DIALED IN / BRUTAL run feedback."],
  ["August 3, 2026 · Command center and deeper runs", "Recomposed the Home screen into Orders, Operations, Player Progress, and a live Field Manual; added Scenario Cartridges, account-free Sewer Relay links, a three-chapter Nemesis Chronicle, and opt-in local Playtest Pulse receipts."],
  ["August 3, 2026 · Trust, speed, and debrief intelligence", "Deferred the heavy arena runtime behind a lightweight command center, reduced initial JavaScript by about 73%, made debriefs lead with one evidence-backed verdict, and activated origin, quota, and reversible leaderboard trust controls."],
  ["July 25, 2026 · Play-first interface", "Removed the mandatory first-visit display-name gate, rebuilt the main menu around Start Run, simplified language, added a mobile navigation dock, and preserved optional profile identity."],
  ["July 25, 2026 · Combat clarity", "Introduced a compact responsive heads-up display, larger action targets, contextual action-observed training, and distinct production art for all 22 enemies and bosses."],
  ["July 25, 2026 · Expanded website", "Added the player guide, enemy codex, arsenal, modes, accessibility, support, press, status, changelog, and missing public standard files."],
];

export const NEW_FEATURES = [
  "🚽 Operations — three authored 7-encounter deployments with route choices, adaptive chapter score, objective cues & deterministic receipts",
  "🔊 Full Audio Overhaul — volume sliders, adaptive layered soundtrack with real progressions, music ducking & new combat sound effects",
  "🎨 Combat Feel Pass — per-weapon projectiles & recoil, persistent battle decals, themed arena details, walk cycle & light halos",
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
  "🏆 66 Achievements — wave 25, 500 kills, 3 nukes, 10 boss kills & more",
  "⚔️ Challenge Links — share a run seed + difficulty for friends to race",
  "📷 GIF Highlight Reel — auto-captures your peak killstreak moment",
  "🗺️ 8 Map Themes — Office, Bunker, Factory, Ruins, Desert, Forest, Space, Arctic",
  "🌍 Global Leaderboard — compete worldwide with seed, loadout & device badges",
  "⭐ Prestige System — reset & raise the stakes",
  "🎲 Run Modifiers — 8 game-changers like Glass Cannon, Vampire, Ricochet+",
  "📱 Install as App — PWA support, add to home screen on any device",
  "🪃 Boomerang Blaster — curves out and returns, pierces all enemies",
  "🔦 Railgun — instant hitscan beam, penetrates every enemy in its path",
  "☠ Boss Rush Mode — every wave is a boss wave, dual-bosses from wave 3",
  "☠ Cursed Run — all cursed perks, 3× score multiplier for the brave",
  "⚡ Weekly Mutations — new game-wide modifier every Monday",
  "🔗 Weapon Synergies — upgrade two matching weapons to unlock combo bonuses",
  "👻 Ghost Race — run against the shadow of your last run in real time",
  "📺 Broadcast Share Card — stream-style kill-cam thumbnail when you share your score",
  "💥 Berserker Elite — fast + armoured nightmare that spawns at wave 40+",
  "🏃 Speedrun Mode — race the clock with a live HUD timer; fastest run earns the leaderboard crown",
  "🏋️ Gauntlet Mode — weekly locked weapon + perk loadout, no shop; pure skill on a shared build",
  "🌳 META Tree — 16 permanent upgrade nodes across 4 branches; bonuses carry into every run forever",
  "🃏 Run Draft — pick one bonus perk before deploying; reshuffles every run for fresh builds",
  "🧟 Sewer Zombies — seeded outbreak mode with horde budgets, surge waves & 4 undead variants",
  "📊 Community Stats — live verified player + run totals on the menu, debrief & /stats/ page",
  "🗂️ Doctrine Archive — every build doctrine you forge is recorded forever in a collection grid",
  "📳 Mobile Haptics — tactile hit, kill, boss & low-HP feedback on touch devices",
  "🧭 Threat Arrows — off-screen enemy direction indicators keep pressure readable",
  "🕹️ Retro Visual Pack — switch back to the original first-playable look any time in Settings",
  "🎯 Field Report Feedback — rate every run TOO EASY / DIALED IN / BRUTAL and shape your next drill",
];
