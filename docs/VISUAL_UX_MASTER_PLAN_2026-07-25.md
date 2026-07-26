# Call of Doodie Visual + UX Master Plan

Status: implementation source of truth
Owner: VaultSpark Studios LLC
Scope: public website, entry flow, menus, gameplay HUD, overlays, characters, environments, responsive behavior, accessibility, and visual QA

## Product outcome

The playable game must be the fastest path through the experience. A new visitor reaches a useful main menu immediately, understands the game in plain language, and can start a run without creating an identity. Comedy belongs in character, rewards, and supporting copy; navigation and controls use familiar words.

## Non-negotiable experience contracts

1. No callsign gate before the main menu or first run.
2. One dominant `START RUN` action; no more than five first-level actions above the fold.
3. Every primary control is at least 48 by 48 CSS pixels.
4. No HUD collisions at 320, 360, 390, 430, 768, 1024, 1440, or 1920 CSS-pixel widths.
5. Mobile portrait and landscape expose the same gameplay capabilities as desktop.
6. Tutorial guidance never obscures the player, aim space, or touch controls.
7. Every enemy has a distinct silhouette, prop, motion read, and threat telegraph at gameplay size.
8. Every public route shares the same brand, navigation, theme system, footer index, and legal posture.
9. Sewer Night and Porcelain Day remain fully readable in all menus, panels, empty states, errors, and legal pages.
10. The release is not visually complete until direct pixel review covers every screen state in both themes.

## Information architecture

### Main menu

- Play
  - Start Run
  - Mode
  - Difficulty
  - Training Run
- Challenges
  - Daily Challenge
  - Weekly Gauntlet
  - Boss Rush
  - Shared Seed
- Progress
  - Overview
  - Missions
  - Permanent Upgrades
  - Loadouts
  - Achievements
  - Run History
- Learn
  - How to Play
  - Controls
  - Enemies
  - Arsenal
- More
  - Leaderboard
  - Accessibility
  - Settings
  - Support

Desktop uses a play-focused primary column and a compact progression rail. Mobile uses Play, Challenges, Progress, and More as persistent bottom navigation.

### Public routes

Required now:

- `/`
- `/play`
- `/about`
- `/how-to-play`
- `/enemies`
- `/arsenal`
- `/modes`
- `/leaderboard`
- `/accessibility`
- `/support`
- `/privacy`
- `/terms`
- `/ip`
- `/contact`

Required standard files:

- `/sitemap.xml`
- `/robots.txt`
- `/agents.json`
- `/.well-known/llms.txt`
- `/.well-known/security.txt`
- `/favicon.ico`

Add at SPARKED:

- `/status`
- `/changelog`

## Entry and identity

- Initialize directly on the menu.
- New local players appear as `Guest`.
- Existing stored callsigns remain unchanged.
- The profile chip reads `Guest` until a display name is chosen.
- Display-name entry is requested only for public leaderboard submission, challenge sharing, supporter identity, or an explicit profile action.
- Changing or clearing a display name never blocks local play.
- Name validation remains 2–20 characters and receives a clear explanation where it is actually required.

Success signals:

- Fresh-visit-to-run conversion
- Median time to first run
- Guest run completion
- Display-name creation at public-action intent
- Entry abandonment

## Copy system

Primary labels:

- `START RUN`
- `Standard Run`
- `Normal Difficulty`
- `New Player Guide`
- `Test Controls`
- `Getting Started`
- `Profile & Progress`
- `Save & Device`
- `Upgrade Points`
- `Permanent Upgrades`
- `Enemies`
- `How to Play`
- `Early Boss Abilities`
- `Training Run`

Rule: one joke per surface is enough. Mechanical labels must remain literal.

## Gameplay HUD contracts

Desktop:

- Top left: health, level, current objective.
- Top center: wave and boss state.
- Top right: score and run timer.
- Bottom center: current weapon, ammo, ability cooldowns.
- Optional rivalry and trust details live in a collapsible run-intel rail.

Mobile:

- Top row: health, wave, score.
- Secondary status becomes a single expandable chip.
- Bottom safe-area bar owns weapon and abilities.
- Touch movement and aiming zones remain unobstructed.
- Tutorial prompts attach to the relevant control and collapse after the observed action.

## Character production matrix

Each character needs: silhouette, palette, prop, locomotion, attack anticipation, hit state, defeat state, portrait, 64px gameplay read, and colorblind-independent marker.

Batch A — core roster:

- Mall Cop
- Karen
- Florida Man
- HOA President
- IT Guy
- Gym Bro
- Influencer
- Conspiracy Bro

Batch B — specialists:

- Landlord
- Crypto Bro
- Shield Guy
- YOLO Bomber
- Sergeant Karen
- Life Coach
- Tech CEO
- Doomscroller

Batch C — bosses:

- Mega Karen
- Splitter
- Juggernaut
- Summoner
- The Algorithm
- The Developer

Boss acceptance:

- Recognizable from silhouette alone.
- Unique phase-change animation.
- Unique danger-zone language.
- Portrait appears in introduction, Enemies page, and post-run cause of death.

## Environment system

Every arena theme receives a constrained art kit:

- floor material
- wall material
- edge trim
- three prop families
- one animated ambient element
- one high-threat contrast color
- one low-contrast decorative layer

Environment detail must never compete with bullets, pickups, telegraphs, or enemies.

## Responsive state matrix

Viewports:

- 320x568
- 360x800
- 390x844
- 430x932
- 844x390
- 768x1024
- 1024x768
- 1440x900
- 1920x1080

States:

- first visit
- main menu
- mode selector
- every secondary panel
- settings and accessibility
- training
- standard combat
- boss combat
- pause
- perk choice
- shop
- route choice
- death/debrief
- leaderboard
- error and empty states
- every public route

## Delivery waves

1. Entry and main-menu simplification.
2. HUD, tutorial, and mobile gameplay layout.
3. Secondary panel consolidation.
4. Character art and threat-read integration.
5. Environment and effects pass.
6. Public route expansion and scaffold closure.
7. Full responsive, accessibility, performance, and pixel verification.

## Definition of done

- All contracts above are implemented.
- Automated route/theme/viewport checks pass.
- Interaction targets and text sizing pass the responsive audit.
- No screenshot contains overlaps, clipped controls, unreadable text, or accidental empty space.
- All 22 enemies and the player are visually reviewed in their runtime state.
- Sitemap compliance is at least 8/10 before SPARKED and 10/10 at launch.
- Keyboard, mouse, touch, and controller paths remain playable.
- Existing tests pass and new behavior has focused regression coverage.
