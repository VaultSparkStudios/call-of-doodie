# Session Log

Chronological record of all AI-assisted sessions.

---

## 2026-03-18 — Session 12 (Claude Sonnet 4.6)

**Focus:** Seed info in Rules modal, custom-settings ⚙️ leaderboard badge

**Completed:**

*Features:*
- Rules modal seed entries: 🌱 Seeds (explains seed range 0–999998, map control, custom seed input) and 🔄 Replay (explains replay button on death screen)
- Custom settings badge: `submitScore` computes `customSettings` boolean by comparing 7 gameplay-affecting settings fields vs `SETTINGS_DEFAULTS`; stored in leaderboard entry; `saveToLeaderboard` strips field from Supabase INSERT (no column yet), preserves in localStorage row; LeaderboardPanel shows ⚙️ badge on entries where `e.customSettings` is truthy

**Key commit:** `a031204`

**Files changed:**
- `src/components/MenuScreen.jsx` — 2 new Rules modal entries (Seeds + Replay)
- `src/App.jsx` — SETTINGS_DEFAULTS import; customSettings computed in submitScore
- `src/storage.js` — strip customSettings from Supabase INSERT; preserve in localStorage row
- `src/components/LeaderboardPanel.jsx` — ⚙️ badge for custom-settings entries
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `handoffs/LATEST_HANDOFF.md` — updated

---

## 2026-03-18 — Session 11 (Claude Sonnet 4.6)

**Focus:** Leaderboard pagination, gameHelpers.js extraction, new daily missions, 2 new map themes

**Completed:**

*Features:*
- Leaderboard pagination: `loadLeaderboard(offset, limit=50)` with Supabase `.range()`; "LOAD MORE ↓" button in LeaderboardPanel; `lbHasMore` state + `loadMoreLeaderboard` callback in App.jsx; props threaded through MenuScreen/DeathScreen
- gameHelpers.js: `spawnEnemy(gs, W, H, difficultyId)` + `spawnBoss(gs, W, H, difficultyId, typeIndex)` extracted as pure module-level functions; App.jsx useCallbacks are thin wrappers (~100 lines removed)
- 2 new daily missions: `no_hit_wave` (clear N waves without taking damage; `gs.damageThisWave` tracks hits per wave) and `single_weapon` (get N kills with one weapon; bullets carry `wpnIdx`, `statsRef.weaponKills[]` per weapon)
- 2 new map themes: space (6 — deep purple, cosmic props 🚀🛸🌌, sine hum + blips ambient) and arctic (7 — cold blue, icy props ❄🐧🦭, wind + ice creak ambient); theme count 6→8 across all theme arrays

**Key commit:** `57667af`

**Files changed:**
- `src/gameHelpers.js` — new file, spawnEnemy + spawnBoss
- `src/App.jsx` — gameHelpers import + thin wrapper useCallbacks; lbHasMore/loadMoreLeaderboard; damageThisWave tracking; weaponKills tracking; makeBullet wpnIdx; noHitWaves tracking at wave clear; checkDailyMissions new fields; THEME_PROPS extended; theme count 8
- `src/storage.js` — loadLeaderboard pagination (offset/limit/.range()); no_hit_wave + single_weapon mission types + params
- `src/drawGame.js` — all theme color arrays extended for themes 6+7
- `src/sounds.js` — _AMBIENT_TICK extended; cases 6+7 in _playAmbientTick
- `src/components/LeaderboardPanel.jsx` — lbHasMore/onLoadMore props; Load More button; subtitle shows count
- `src/components/MenuScreen.jsx` — pass-through lbHasMore/onLoadMore props
- `src/components/DeathScreen.jsx` — pass-through lbHasMore/onLoadMore props

---

## 2026-03-18 — Session 10 (Claude Sonnet 4.6)

**Focus:** Gamepad haptics and ambient room tone audio

**Completed:**

*Features:*
- Gamepad vibration/rumble via Vibration Actuator API (Chrome 68+): `rumbleGamepad(weak, strong, ms)` module-level helper; 8 distinct rumble events — enemy hit (40ms), crit hit (80ms), player bullet damage (100ms), enemy contact (120ms), rent nuke/ground slam (150ms), kamikaze explosion (200ms), boss kill (500ms), player death (600ms)
- Ambient room tone: `startAmbient(themeIndex)` / `stopAmbient()` in sounds.js; 6 procedural themes (office HVAC, bunker drone, factory machinery, ruins wind+drip, desert wind+shimmer, forest crickets); runs as independent timer loop alongside background music at low volume (0.004–0.018 vol range)

**Key commit:** `53ac0c5`

**Files changed:**
- `src/App.jsx` — `rumbleGamepad` helper + 8 rumble call sites; `startAmbient`/`stopAmbient` imports + call sites alongside `startMusic`/`stopMusic`
- `src/sounds.js` — `startAmbient`, `stopAmbient`, `_tickAmbient`, `_playAmbientTick`, 6 ambient theme functions, `_AMBIENT_TICK` intervals array
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md` — updated

---

## 2026-03-18 — Session 9 (Claude Sonnet 4.6)

**Focus:** Perk synergies, boss scaling, new weapon sounds, daily mission types, heat gauge, wave streak bonus

**Completed:**

*Features:*
- Perk synergies: Storm Vampire (chain_lightning+vampire → lifesteal+chain together), Pyro Grenadier (grenadier+pyromaniac → grenade damage ×1.5), Dead Eye (eagle_eye+penetrator → +15% crit+pierce)
- Boss scaling at wave 30+/40+: `gs.sharedAbilityCooldown = 120` after any ability fires; bullet ring + ground slam timers scale ×1.2 (wave 30+) or ×1.4 (wave 40+)
- Weapon sounds: Boomerang WHOOSH (sawtooth sweep 600→180Hz + noise), Railgun CRACK (noise burst + 3200→700Hz sawtooth)
- 4 new daily mission types: perk_collector (pick N perks), nuke_user (use N nukes), high_roller (score N pts), arms_race (collect N weapon upgrades)
- Overclocked heat gauge: HUD bar 0–20 shot heat, color ramp yellow→orange→red, shown only when overclocked perk active
- Wave streak bonus: consecutive wave clears without dying tracked in `gs.waveStreak`; ≥3 shows "🔥 STREAK ×N" badge in HUD + score bonus 200×(streak-2) per wave clear

**Key commits:** `5372ab8`, `1f4d40f`

**Files changed:**
- `src/App.jsx` — perk synergy detection in applyPerk, boss ability timer scaling, checkDailyMissions tracking for 4 new types, waveStreak increment/reset/bonus
- `src/sounds.js` — case 8 (boomerang) and case 9 (railgun) in soundShoot()
- `src/components/HUD.jsx` — heat gauge bar, wave streak badge
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md` — updated

---

## 2026-03-18 — Session 8 (Claude Sonnet 4.6)

**Focus:** Full feature + test cycle — elite enemies, gamepad, perks, wave shop, boss telegraphing, render refactor, PWA, two-pass code review with bug fixes

**Completed:**

*Features:*
- Elite enemy variants (wave 10+): armored (dmgMult 0.45, +50% HP), fast (2× speed, 0.75× size), explosive (chain AOE 85px/35dmg on death) — distinct colored rings in render
- Gamepad/controller support: left stick=move, right stick=aim+fire, A=dash, B=grenade, LB/RB=weapon cycle, Start=pause. 🎮 HUD indicator. Edge-triggered buttons. Cleanup on unmount.
- 8 new perks: tungsten_rounds, scavenger, overclocked (all fully implemented); glass_jaw, paranoia (cursed, fully implemented); adrenaline_rush, chain_lightning, dead_mans_hand (stubs — in perk pool, effects pending)
- Wave shop: every wave 1–4, then every 2nd wave from wave 5+ (boss waves unchanged)
- Boss ability telegraphing: 60-frame orange pulsing ring before bullet ring, 90-frame red warning circle before ground slam
- drawGame.js extracted (~620 lines) — render decoupled from game loop; App.jsx ~1150 lines now
- PWA: manifest.json + sw.js + SVG icon + SW registration in index.html
- Settings panel desc subtitles on every setting
- soundUIOpen/soundUIClose added to sounds.js
- Seed replay button on death screen (🔄 REPLAY #seed)
- 5 distinct music vibes (Chill/Action/Intense/Retro/Spooky) with separate BPM and beat functions
- Custom seed input on menu screen; mobile pause button (⏸)
- "Rage Quit" button in PauseMenu; grenade hotkey Q/G only (removed 5 conflict)
- NEW_FEATURES changelog updated with 7 new entries

*Bug fixes (found via two-pass automated code review):*
- bossKillFlash-- moved from drawGame.js to App.jsx (was causing double-decrement risk)
- PWA manifest data URI icon → file-based SVG (browsers reject data URIs in manifests)
- soundUIClose dead import removed from PauseMenu
- Scavenger perk: current weapon ammo overwrite fixed (partial restore now preserved)
- Glass Jaw: kamikaze and ground slam damage now correctly doubled
- Gamepad: setGamepadConnected throttled to only fire on connection state change

**Key commits:** `d5ff539`, `8498828`, `bbc59cc`, `ea4f054`

**Files changed:**
- `src/App.jsx` — gamepad refs+polling, elite variants, glassjaw/overclocked/scavenger effects, boss telegraphing timers, wave shop condition, bug fixes throughout
- `src/drawGame.js` — new file (~620 lines), extracted render + elite rings + boss warning visuals
- `src/sounds.js` — soundUIOpen, soundUIClose, 5 music vibe functions (MUSIC_VIBES, getMusicVibe, setMusicVibe)
- `src/settings.js` — new file, SETTINGS_DEFAULTS, loadSettings/saveSettings, loadPresets/savePresets
- `src/constants.js` — 8 new perks, 2 new cursed perks, 7 new NEW_FEATURES entries
- `src/components/SettingsPanel.jsx` — new file, full settings panel with tabs/sliders/presets/desc
- `src/components/DeathScreen.jsx` — seed replay button, GIF highlight props
- `src/components/HUD.jsx` — mobile pause button, 🎮 gamepad indicator
- `src/components/PauseMenu.jsx` — settings button, music vibes, rage quit, soundUIOpen, Q/G grenade
- `src/components/MenuScreen.jsx` — settings button, custom seed input
- `src/components/LeaderboardPanel.jsx` — difficulty filter tabs (had already existed)
- `public/manifest.json` — new file
- `public/sw.js` — new file
- `public/icon.svg` — new file
- `index.html` — manifest link, SW registration

---

## 2026-03-12 — Session 6 (Claude Sonnet 4.6)

**Focus:** Performance fixes, boss scaling, Supabase integration, wall randomization, bullet ricochet, enemy-wall collision, leaderboard upgrades

**Completed:**
- Deep-game lag fixes: particle cap (200), floatingText cap (30), dyingEnemy cap (20), wave enemy cap (40), throttled trail particles, limited nuke burst
- Boss ability ramp: Shield Pulse (wave 20+), Minion Surge (wave 25+), Enrage (wave 30+), Teleport Blink (wave 35+), Rent Nuke (wave 40+)
- Supabase global leaderboard: @supabase/supabase-js installed, src/supabase.js, storage.js updated, GitHub secrets set, .env.local created, RLS table created
- Leaderboard UI: title → GLOBAL LEADERBOARD, difficulty tabs, kills column, loadout badge, last words as tooltip
- Wall randomization: seeded LCG per run, 5–7 walls, safe spawn zone, overlap check
- Bullet ricochet: 1 bounce for all weapons except RPG, reflect-by-face logic, white spark
- Enemy-wall collision: closest-point push-out, arena clamp, applied after all movement
- submitScore: starterLoadout added to entry + Supabase column added

**Key commits:** `a9775bf`, `c04ac8b`, `1220a5d`

**Files changed:**
- `src/App.jsx` — perf caps, boss abilities, wall gen, bullet bounce, enemy-wall collision, submitScore
- `src/storage.js` — Supabase leaderboard read/write with localStorage fallback
- `src/supabase.js` — new file, Supabase client init
- `src/components/LeaderboardPanel.jsx` — full UI rewrite with tabs, kills, loadout
- `.github/workflows/deploy.yml` — env vars injected into build step
- `package.json` / `package-lock.json` — @supabase/supabase-js added
- `.env.local` — created locally, gitignored

---

## 2026-03-12 — Session 5 (Claude Sonnet 4.6)

**Focus:** Studio compliance closeout

**Completed:**
- Committed and pushed 7 Studio System Template files created at end of session 4 but not yet in the repo: `context/PROJECT_BRIEF.md`, `context/CURRENT_STATE.md`, `context/DECISIONS.md`, `context/TASK_BOARD.md`, `handoffs/LATEST_HANDOFF.md`, `logs/SESSION_LOG.md`, `prompts/bootstrap_prompt.md`
- Ran full session closeout (write-back to all context/handoffs/logs docs)

**Key commits:** `19b9f51`, `2c31b89`

---

## 2026-03-12 — Session 4 (Claude Sonnet 4.6)

**Focus:** Feature batch — new content, game feel, progression clarity

**Completed:**
- 2 new weapons: Sniper-ator 3000, Spicy Squirt Gun
- 3 new enemies: Shield Guy (ti=11), YOLO Bomber (ti=12), Sergeant Karen (ti=13)
- 6 arena obstacles per run (player + bullet collision)
- Death animations: enemies float/fade on kill
- Arena border with pulsing glow
- 2 synergy perks: Bloodlust, Turbo Boots
- 4 starter loadouts: Standard, Glass Cannon, Iron Tank, Speed Freak
- Personal best highlights mid-run
- Meta upgrades toast at run start
- Perk countdown HUD ("Perk in 2 lvls")
- Auto-aim fixed to opt-in toggle (was always-on bug)
- Studio compliance: AGENTS.md, CODEX_HANDOFF_2026-03-12.md, context/, handoffs/, logs/, prompts/

**Key commits:** `36f4081`, `606b1f2`

---

## 2026-03-12 — Session 3 (Claude Sonnet 4.6)

**Focus:** Boss mechanics, daily missions, meta-progression, cursed perks

**Completed:**
- Mega Karen charge attack + phase 2 5-bullet spread shot
- Landlord tenant summoning every 6 seconds
- 3 LCG-seeded daily missions per day (8 mission types)
- Meta-progression: career points (1/kill), 6 permanent upgrades (cod-meta-v1)
- Cursed perks (6 options, 35% chance to appear in perk modal)
- MenuScreen: Daily Missions modal, Meta Upgrades shop, career points in Career Stats
- Auto-aim mobile toggle (🎯 button, persists in localStorage)

**Key commits:** `354ac68`, `e404954`

---

## Prior sessions (pre-log)

Sessions 1–2 established the core game: React 19 + Vite 6, canvas shooter,
4 weapons, 11 enemies, boss waves, weapon upgrades, perk system, leaderboard,
career stats, achievements, share score, mobile controls, performance fixes.
See CODEX_HANDOFF_2026-03-12.md for full feature list.
