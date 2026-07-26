import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public");
const pages = [
  {
    slug: "about", eyebrow: "About the game", title: "A roguelite shooter with a very serious plumbing problem.",
    description: "Learn what Call of Doodie is, who makes it, and what makes each run different.",
    lede: "Call of Doodie is a free, comedy-first browser arena shooter about movement, improvised builds, escalating waves, and defeating the internet’s worst archetypes.",
    sections: [
      ["The premise", "Start a run in seconds. Move, aim, dash, throw grenades, collect experience, and turn a scrappy loadout into a ridiculous build before the arena overwhelms you."],
      ["Designed for repeat runs", "Shared daily seeds, Gauntlet challenges, boss encounters, permanent unlocks, and replay receipts create reasons to return without selling power."],
      ["Made by VaultSpark Studios", "Call of Doodie is created and published by VaultSpark Studios LLC. It is original proprietary work and is not affiliated with Activision Publishing, Inc. or the Call of Duty® franchise."],
    ],
  },
  {
    slug: "play", eyebrow: "Play in your browser", title: "No install. No account wall. Start the run.",
    description: "Play Call of Doodie free in a modern desktop or mobile browser.",
    lede: "The game runs at the site root and now opens directly on the main menu. A display name is optional and only matters for shared challenges and leaderboard identity.",
    cta: ["Start Call of Doodie", "../"],
    sections: [
      ["Desktop", "Use a keyboard and mouse or a supported gamepad. A current version of Chrome, Edge, Firefox, or Safari is recommended."],
      ["Mobile", "Use the left side of the arena to move and the right side to aim. Large bottom controls handle weapon switching, reload, dash, and grenade actions."],
      ["Progress storage", "Progress is stored in this browser. Clearing site data, switching browsers, or changing devices can remove local progress unless a feature explicitly says otherwise."],
    ],
  },
  {
    slug: "how-to-play", eyebrow: "Player guide", title: "Move first. Build smart. Keep the arena readable.",
    description: "A concise guide to movement, combat, upgrades, bosses, and controls in Call of Doodie.",
    lede: "Survival is more about positioning than standing still and firing. The compact in-game training guide advances only when it observes each action.",
    sections: [
      ["1. Keep moving", "Circle threats, preserve escape lanes, and dash through danger when the arena closes in. Dash grants a brief window of invulnerability."],
      ["2. Aim into groups", "Weapons reward different ranges and crowd shapes. Switch when your current weapon no longer fits the pressure in front of you."],
      ["3. Build a run", "Collect experience, choose upgrades, and combine effects that support one plan. Focused synergies usually outperform a pile of unrelated bonuses."],
      ["4. Read the warnings", "Ranged aim lines, shield arcs, boss rings, hazard colors, and shape markers communicate danger without relying on color alone."],
    ],
  },
  {
    slug: "enemies", eyebrow: "Enemy codex", title: "Twenty-two problems. Every one has a silhouette.",
    description: "Meet every enemy and boss in the Call of Doodie roster.",
    lede: "The roster is grouped into core threats, specialists, and bosses. Each character now has distinct production art backed by a procedural fallback.",
    art: true,
    sections: [
      ["Core threats", "Mall Cop · Karen · Florida Man · Homeowners Association President · IT Guy · Gym Bro · Influencer · Conspiracy Bro"],
      ["Specialists", "Landlord · Crypto Bro · Shield Guy · YOLO Bomber · Sergeant Karen · Life Coach · Tech Chief Executive · Splitter"],
      ["Bosses", "Mega Karen · Juggernaut · Summoner · Doomscroller · The Algorithm · The Developer"],
    ],
  },
  {
    slug: "arsenal", eyebrow: "Weapons and builds", title: "Choose a tool. Then make it unreasonable.",
    description: "Explore weapons, upgrades, and buildcraft in Call of Doodie.",
    lede: "Every run starts readable and grows expressive. Weapons establish the rhythm; perks and permanent upgrades shape how far that rhythm can go.",
    sections: [
      ["Weapon roles", "Fast close-range tools clear pressure, precision weapons reward spacing, and explosive options trade speed for area control. The mobile weapon rail exposes the full cycle without tiny targets."],
      ["Run upgrades", "Level-up choices stack for the current run. Look for combinations that reinforce damage, survivability, mobility, critical hits, status effects, or cooldown loops."],
      ["Permanent upgrades", "Account progression unlocks weapons and persistent improvements over time. Competitive modes disclose relevant rules so comparisons remain understandable."],
    ],
  },
  {
    slug: "modes", eyebrow: "Ways to play", title: "One arena. Several reasons to come back.",
    description: "Compare Standard, Daily, Gauntlet, Training, Boss Rush, and other Call of Doodie modes.",
    lede: "The main menu keeps the common choice simple while still exposing specialized modes for practice, competition, and high-pressure runs.",
    sections: [
      ["Standard", "The default survival run. Choose a difficulty, build freely, and push for a new personal best."],
      ["Daily", "A shared daily seed gives players a common setup for fairer score comparison."],
      ["Gauntlet", "A focused challenge format built around shared conditions and a compact competitive loop."],
      ["Training and Boss Rush", "Training provides a low-friction practice space. Boss Rush accelerates the game toward signature encounters."],
    ],
  },
  {
    slug: "leaderboard", eyebrow: "Scores and trust", title: "A score means more when its rules are visible.",
    description: "Understand Call of Doodie leaderboards, shared seeds, replay receipts, and run integrity.",
    lede: "Public score comparison is optional. You can play as Guest; a display name is only requested when identity adds value.",
    sections: [
      ["Shared conditions", "Daily and Gauntlet modes use shared seeds so players can compare results under common starting conditions."],
      ["Run receipts", "Replay proof is advisory deterministic evidence, not a promise of full physics resimulation. Integrity indicators explain when a run is local-only or has unusual conditions."],
      ["Respectful identity", "Use a display name that is safe to publish. Do not include an email address, phone number, real-world address, or other private information."],
    ],
  },
  {
    slug: "accessibility", eyebrow: "Accessibility", title: "Readable pressure, flexible input, fewer surprises.",
    description: "Accessibility and input options available in Call of Doodie.",
    lede: "The game aims to communicate threats through shape, motion, text, and contrast—not color alone—and supports keyboard, pointer, touch, and compatible gamepad input.",
    sections: [
      ["Visual readability", "Enemy silhouettes, warning rings, aim telegraphs, health states, and elite markers provide redundant signals. Dark and light themes are available on public pages."],
      ["Motion and effects", "Reduced-motion preferences are respected by the website. Game settings provide control over visual and audio presentation where supported."],
      ["Touch and focus", "Primary mobile actions use at least 48-pixel targets. Website controls expose visible keyboard focus, semantic headings, and readable contrast."],
      ["Feedback welcome", "Accessibility is ongoing work. Send a specific barrier, device, browser, and desired outcome through the support page."],
    ],
  },
  {
    slug: "support", eyebrow: "Player support", title: "Get unstuck without sharing private information.",
    description: "Troubleshooting and support for Call of Doodie.",
    lede: "Most issues are local to the browser, input device, or stored site data. Try the focused steps below before resetting anything.",
    sections: [
      ["Game will not start", "Refresh once, confirm JavaScript is enabled, close unusually heavy tabs, and try a current browser. Do not clear site data unless you accept losing browser-local progress."],
      ["Controls feel wrong", "Disconnect duplicate gamepads, reload after reconnecting a controller, and check the in-game settings panel. On touch devices, keep both thumbs inside the arena zones."],
      ["Report a bug", "Include browser, device, mode, wave, expected result, and actual result. Never send passwords, keys, payment details, or private account information."],
    ],
    cta: ["Contact support", "../contact/"],
  },
  {
    slug: "press-kit", eyebrow: "Press kit", title: "Facts, art, and language for covering the game.",
    description: "Official Call of Doodie press facts, visual assets, and attribution guidance.",
    lede: "Call of Doodie is a free comedy-first browser roguelite shooter created by VaultSpark Studios LLC.",
    sections: [
      ["One-line description", "A fast browser arena shooter where improvised weapons, absurd enemies, and escalating buildcraft turn every short run into a story."],
      ["Key features", "Instant browser play · desktop, touch, and gamepad input · 22-character enemy roster · shared daily seeds · boss encounters · permanent progression · advisory replay receipts"],
      ["Rights and attribution", "All original code, content, characters, assets, and designs are proprietary and all rights are reserved by VaultSpark Studios LLC. Review the Rights & IP page before reuse."],
    ],
    cta: ["Request press materials", "../contact/"],
  },
  {
    slug: "status", eyebrow: "Service status", title: "Public availability and known limitations.",
    description: "Current public service posture for Call of Doodie.",
    lede: "The browser game and public documentation are the primary surfaces. This page states product behavior without promising uninterrupted availability.",
    sections: [
      ["Browser game", "Available as a public web experience. Local play may continue when optional online score services are unavailable."],
      ["Leaderboards", "Online comparison depends on the score service. A run may be labeled local-only when eligibility or connectivity cannot be verified."],
      ["Known limitation", "Progress is primarily browser-local. Cross-device synchronization is not currently promised."],
    ],
  },
  {
    slug: "changelog", eyebrow: "Changelog", title: "What changed—and why it feels better.",
    description: "Recent player-facing Call of Doodie changes.",
    lede: "This log highlights meaningful player-facing releases rather than every internal code change.",
    sections: [
      ["July 25, 2026 · Play-first interface", "Removed the mandatory first-visit display-name gate, rebuilt the main menu around Start Run, simplified language, added a mobile navigation dock, and preserved optional profile identity."],
      ["July 25, 2026 · Combat clarity", "Introduced a compact mobile heads-up display, larger action targets, contextual action-observed training, and distinct production art for all 22 enemies and bosses."],
      ["July 25, 2026 · Expanded website", "Added the player guide, enemy codex, arsenal, modes, accessibility, support, press, status, changelog, and missing public standard files."],
    ],
  },
];

const nav = `
  <a href="../">Play</a>
  <a href="../how-to-play/">How to Play</a>
  <a href="../enemies/">Enemies</a>
  <a href="../about/">About</a>
  <a href="../contact/">Contact</a>
  <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme">Theme</button>`;

function card([title, body]) {
  return `<section class="card"><h2>${title}</h2><p>${body}</p></section>`;
}

for (const page of pages) {
  const dir = path.join(root, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  const art = page.art ? `
    <figure class="roster-art card">
      <img src="../visual-assets/enemy-atlas-core.png" alt="Core enemy roster: Mall Cop, Karen, Florida Man, HOA President, IT Guy, Gym Bro, Influencer, and Conspiracy Bro">
      <img src="../visual-assets/enemy-atlas-specialists.png" alt="Specialist enemy roster: Landlord, Crypto Bro, Shield Guy, YOLO Bomber, Sergeant Karen, Life Coach, Tech CEO, and Splitter">
      <img src="../visual-assets/enemy-atlas-bosses.png" alt="Boss roster: Mega Karen, Juggernaut, Summoner, Doomscroller, The Algorithm, and The Developer">
      <figcaption>Production character art shown at high resolution; in-game silhouettes are optimized for combat scale.</figcaption>
    </figure>` : "";
  const cta = page.cta ? `<a class="primary-cta" href="${page.cta[1]}">${page.cta[0]} <span aria-hidden="true">→</span></a>` : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <meta name="description" content="${page.description}">
  <link rel="canonical" href="https://callofdoodie.wtf/${page.slug}/">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../legal.css">
  <script src="../theme.js" defer></script>
  <title>${page.title} | Call of Doodie</title>
</head>
<body>
  <div class="shell">
    <header class="site-header"><a class="brand" href="../">CALL OF <span>DOODIE</span></a><nav aria-label="Primary navigation">${nav}</nav></header>
    <main>
      <p class="eyebrow">${page.eyebrow}</p>
      <h1>${page.title}</h1>
      <p class="lede">${page.lede}</p>
      ${cta}${art}
      <div class="card-grid">${page.sections.map(card).join("")}</div>
      <aside class="next-links card" aria-label="Explore more"><strong>Keep exploring</strong><a href="../modes/">Modes</a><a href="../arsenal/">Arsenal</a><a href="../accessibility/">Accessibility</a><a href="../support/">Support</a></aside>
    </main>
    <footer><div class="footer-links"><a href="../">Play</a><a href="../about/">About</a><a href="../privacy/">Privacy</a><a href="../terms/">Terms</a><a href="../contact/">Contact</a><a href="../ip/">Rights &amp; IP</a><a href="../status/">Status</a><a href="../changelog/">Changelog</a></div><div>© 2026 <a href="https://vaultsparkstudios.com/">VaultSpark Studios LLC</a>. All rights reserved.</div></footer>
  </div>
</body>
</html>`;
  fs.writeFileSync(path.join(dir, "index.html"), html + "\n");
}
console.log(`Generated ${pages.length} public companion pages.`);
