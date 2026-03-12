# Session Log

Chronological record of all AI-assisted sessions.

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
