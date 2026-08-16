import crypto from "node:crypto";
import { buildPublicGameplayContract } from "./public-gameplay-contract.mjs";
import { PRIMARY_PUBLIC_NAV } from "../../src/config/publicNavigation.js";
import { CHANGELOG_ENTRIES } from "../../src/config/changelog.js";
import { deriveContentVersionDate } from "./build-date.mjs";

export const PUBLIC_CANONICAL_ORIGIN = "https://callofdoodie.wtf";
// S155: derived from the newest git commit touching content-bearing sources
// (deterministic per commit) instead of a hand-frozen string that drifted.
export const PUBLIC_CONTENT_VERSION_DATE = deriveContentVersionDate();

export function formatPublicContentDate() {
  const [year, month, day] = PUBLIC_CONTENT_VERSION_DATE.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[month - 1]} ${day}, ${year}`;
}

// S155: disclaimer truth lives in publicNavigation.js (shared with SiteFooter).
export { PARODY_DISCLAIMER } from "../../src/config/publicNavigation.js";

const CORE_ATLAS_INDICES = [0, 1, 2, 3, 5, 6, 7, 8];
const SPECIALIST_ATLAS_INDICES = [9, 10, 11, 12, 13, 14, 15, 16];
const SIGNATURE_ATLAS_INDICES = [4, 17, 18, 19, 20, 21];

function titleCase(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function listNames(items) {
  return items.map((item) => item.name).join(" · ");
}

function enemiesAt(gameplay, indices) {
  return indices.map((index) => gameplay.enemies.find((enemy) => enemy.index === index)).filter(Boolean);
}

function buildEnemySections(gameplay) {
  const bossRotation = gameplay.enemies.filter((enemy) => enemy.boss);
  return [
    ["Core threat atlas", listNames(enemiesAt(gameplay, CORE_ATLAS_INDICES))],
    ["Specialist threat atlas", listNames(enemiesAt(gameplay, SPECIALIST_ATLAS_INDICES))],
    ["Signature encounter atlas", listNames(enemiesAt(gameplay, SIGNATURE_ATLAS_INDICES))],
    ["Boss rotation", listNames(bossRotation)],
  ];
}

function buildArsenalSections(gameplay) {
  const weaponLines = gameplay.weapons.map((weapon) => (
    `${weapon.emoji} ${weapon.name} (available now; arsenal milestone level ${weapon.arsenalMilestoneLevel})`
  ));
  return [
    ["Live weapon roster", weaponLines.join(" · ")],
    ["Starter loadouts", gameplay.starterLoadouts.map((loadout) => `${loadout.name}: ${loadout.description}`).join(" · ")],
    ["Permanent upgrades", gameplay.permanentUpgrades.map((upgrade) => `${upgrade.name} (${upgrade.tiers.length} tiers)`).join(" · ")],
  ];
}

function buildModeSections(gameplay) {
  return [
    ["Seeded run modes", gameplay.modes.map((mode) => mode.label).join(" · ")],
    ["Difficulty profiles", gameplay.difficulties.map((difficulty) => difficulty.label).join(" · ")],
    ["Replay-code scope", `Replay codes capture ${gameplay.challengeLinks.replayCode.captures.map(titleCase).join(", ")}. They are ${gameplay.trust.replayEvidence}, ${gameplay.trust.excludedClaim}.`],
  ];
}

const ROUTE_DEFINITIONS = [
  {
    id: "home", path: "/", label: "Home", rel: "home", priority: 1, generated: false,
  },
  {
    id: "about", path: "/about/", label: "About", rel: "about", priority: 0.6, generated: true,
    eyebrow: "About the game", title: "A roguelite shooter with a very serious plumbing problem.",
    description: "Learn what Call of Doodie is, who makes it, and what makes each run different.",
    lede: "Call of Doodie is a free, comedy-first browser arena shooter about movement, improvised builds, escalating waves, and defeating the internet’s worst archetypes.",
    sections: [
      ["The premise", "Start a run in seconds. Move, aim, dash, throw grenades, collect experience, and turn a scrappy loadout into a ridiculous build before the arena overwhelms you."],
      ["Designed for repeat runs", "Shared daily seeds, Gauntlet challenges, boss encounters, permanent unlocks, and replay receipts create reasons to return without selling power."],
      ["Made by VaultSpark Studios", "Call of Doodie is created and published by VaultSpark Studios LLC. It is original proprietary work and is not affiliated with Activision Publishing, Inc. or the Call of Duty® franchise."],
    ],
  },
  {
    id: "play", path: "/play/", label: "Play", rel: "play", priority: 0.8, generated: true,
    eyebrow: "Play in your browser", title: "No install. No account wall. Start the run.",
    description: "Play Call of Doodie free in a modern desktop or mobile browser.",
    lede: "The game opens directly on the main menu. A display name is optional and only matters for shared challenges and leaderboard identity.",
    cta: ["Start Call of Doodie", "../"],
    sections: [
      ["Desktop", "Use a keyboard and mouse or a supported gamepad. A current version of Chrome, Edge, Firefox, or Safari is recommended."],
      ["Mobile", "Use the left side of the arena to move and the right side to aim. Large bottom controls handle weapon switching, reload, dash, and grenade actions."],
      ["Progress storage", "Progress is stored in this browser. Clearing site data, switching browsers, or changing devices can remove local progress unless a feature explicitly says otherwise."],
    ],
  },
  {
    id: "how-to-play", path: "/how-to-play/", label: "How to Play", rel: "guide", priority: 0.8, generated: true,
    eyebrow: "Player guide", title: "Move first. Build smart. Keep the arena readable.",
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
    id: "enemies", path: "/enemies/", label: "Enemies", rel: "enemies", priority: 0.8, generated: true,
    eyebrow: "Enemy codex", title: "Every problem has a silhouette.",
    description: "Meet every enemy and boss in the live Call of Doodie roster.",
    lede: (gameplay) => `The live roster contains ${gameplay.enemies.length} threats. Art cohorts describe atlas delivery; the boss rotation below comes from gameplay rules.`,
    sections: buildEnemySections,
    art: true,
  },
  {
    id: "arsenal", path: "/arsenal/", label: "Arsenal", rel: "arsenal", priority: 0.6, generated: true,
    eyebrow: "Weapons and builds", title: "Choose a tool. Then make it unreasonable.",
    description: "Explore the live weapons, starter loadouts, and permanent upgrades in Call of Doodie.",
    lede: (gameplay) => `${gameplay.weapons.length} weapons establish the rhythm; run perks and ${gameplay.permanentUpgrades.length} permanent upgrade tracks shape how far that rhythm can go.`,
    sections: buildArsenalSections,
  },
  {
    id: "modes", path: "/modes/", label: "Modes", rel: "modes", priority: 0.6, generated: true,
    eyebrow: "Ways to play", title: "One arena. Several reasons to come back.",
    description: "Compare the live seeded modes and difficulty profiles in Call of Doodie.",
    lede: (gameplay) => `The gameplay contract currently publishes ${gameplay.modes.length} seeded modes and ${gameplay.difficulties.length} difficulty profiles.`,
    sections: buildModeSections,
  },
  {
    id: "leaderboard", path: "/leaderboard/", label: "Leaderboard", rel: "leaderboard", priority: 0.6, generated: true,
    eyebrow: "Scores and trust", title: "A score means more when its rules are visible.",
    description: "Understand Call of Doodie leaderboards, shared seeds, replay receipts, and run integrity.",
    lede: "Public score comparison is optional. You can play as Guest; a display name is only requested when identity adds value.",
    sections: [
      ["Shared conditions", "Daily and Gauntlet modes use shared seeds so players can compare results under common starting conditions."],
      ["Run receipts", "Replay proof is advisory deterministic evidence, not a promise of full physics resimulation. Integrity indicators explain when a run is local-only or has unusual conditions."],
      ["Respectful identity", "Use a display name that is safe to publish. Do not include an email address, phone number, real-world address, or other private information."],
    ],
  },
  {
    id: "stats", path: "/stats/", label: "Stats", rel: "stats", priority: 0.7, generated: true,
    eyebrow: "Live player analytics", title: "Community Stats",
    description: "Verified Call of Doodie player and run statistics with scope, freshness, and plain-language analysis.",
    lede: "Community Stats refresh every 15 seconds and include every recoverable server record, from legacy public scores through full-detail completed-run facts. The verified snapshot remains visible whenever the live service is temporarily unreachable.",
    sections: [
      ["How to read this page", "Every number above is a live total across verified completed runs — never a per-player claim. The small corpus means trends are directional, not statistical. Community records show the single best verified wave, score, and kill count anyone has posted."],
      ["What is excluded", "Automated health-check rows remain available to operators but are excluded from every public total. Runs never submitted before telemetry existed cannot be recovered, and unavailable legacy detail stays unknown rather than being estimated."],
      ["Live view", "This page, the Home screen, leaderboard, and post-game debrief all refresh Community Stats every 15 seconds while visible and recover immediately after reconnect, focus, or visibility changes. Sparklines chart the totals this browser has observed changing."],
    ],
    cta: ["Play with Community Stats", "../"],
  },
  {
    id: "accessibility", path: "/accessibility/", label: "Accessibility", rel: "accessibility", priority: 0.6, generated: true,
    eyebrow: "Accessibility", title: "Readable pressure, flexible input, fewer surprises.",
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
    id: "support", path: "/support/", label: "Support", rel: "support", priority: 0.6, generated: true,
    eyebrow: "Player support", title: "Get unstuck without sharing private information.",
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
    id: "press-kit", path: "/press-kit/", label: "Press Kit", rel: "press-kit", priority: 0.5, generated: true,
    eyebrow: "Press kit", title: "Facts, art, and language for covering the game.",
    description: "Official Call of Doodie press facts, visual assets, and attribution guidance.",
    lede: "Call of Doodie is a free comedy-first browser roguelite shooter created by VaultSpark Studios LLC.",
    sections: (gameplay) => [
      ["One-line description", "A fast browser arena shooter where improvised weapons, absurd enemies, and escalating buildcraft turn every short run into a story."],
      ["Live feature facts", `Instant browser play · desktop, touch, and gamepad input · ${gameplay.enemies.length}-character roster · ${gameplay.modes.length} seeded modes · permanent progression · advisory replay receipts`],
      ["Rights and attribution", "All original code, content, characters, assets, and designs are proprietary and all rights are reserved by VaultSpark Studios LLC. Review the Rights & IP page before reuse."],
    ],
    cta: ["Request press materials", "../contact/"],
  },
  {
    id: "status", path: "/status/", label: "Status", rel: "status", priority: 0.5, generated: true,
    eyebrow: "Service status", title: "Public availability and known limitations.",
    description: "Current public service posture for Call of Doodie.",
    lede: "The browser game and public documentation are the primary surfaces. This page states product behavior without promising uninterrupted availability.",
    sections: [
      ["Browser game · operational", `Public health checks passed ${formatPublicContentDate()}. Local play can continue when optional online score services are unavailable.`],
      ["Leaderboard trust · operational", "Origin controls, bounded request quotas, replay checks, and reversible anomaly quarantine are active. Eligibility can still fall back to local-only."],
      ["Known limitation", "Progress is browser-local. Porcelain Passport can export a minimal verification receipt, but cross-device career synchronization is not currently promised."],
    ],
  },
  {
    id: "changelog", path: "/changelog/", label: "Changelog", rel: "changelog", priority: 0.5, generated: true,
    eyebrow: "Changelog", title: "What changed—and why it feels better.",
    description: "Recent player-facing Call of Doodie changes.",
    lede: "This log highlights meaningful player-facing releases rather than every internal code change.",
    // Entries live in src/config/changelog.js (S155 single changelog source).
    sections: CHANGELOG_ENTRIES,
  },
  { id: "privacy", path: "/privacy/", label: "Privacy", rel: "privacy", priority: 0.6, generated: false },
  { id: "terms", path: "/terms/", label: "Terms", rel: "terms", priority: 0.6, generated: false },
  { id: "contact", path: "/contact/", label: "Contact", rel: "contact", priority: 0.6, generated: false },
  { id: "ip", path: "/ip/", label: "Rights & IP", rel: "rights", priority: 0.6, generated: false },
];

const HEADER_ROUTE_IDS = new Set(PRIMARY_PUBLIC_NAV.map((item) => item.id));

export function getPublicRouteRegistry() {
  const gameplay = buildPublicGameplayContract();
  return ROUTE_DEFINITIONS.map((route) => ({
    ...route,
    canonicalUrl: `${PUBLIC_CANONICAL_ORIGIN}${route.path}`,
    filePath: route.path === "/" ? "index.html" : `public${route.path}index.html`,
    header: HEADER_ROUTE_IDS.has(route.id),
    footer: true,
    visualAudit: true,
    lastmod: PUBLIC_CONTENT_VERSION_DATE,
    lede: typeof route.lede === "function" ? route.lede(gameplay) : route.lede,
    sections: typeof route.sections === "function" ? route.sections(gameplay) : route.sections,
  }));
}

export function getGeneratedCompanionPages() {
  return getPublicRouteRegistry().filter((route) => route.generated);
}

export function relativeHref(routePath, prefix = "../") {
  if (routePath === "/") return prefix;
  return `${prefix}${routePath.slice(1)}`;
}

export function renderHeaderNav(prefix = "../") {
  const links = getPublicRouteRegistry().filter((route) => route.header);
  return links.map((route) => `  <a href="${relativeHref(route.path, prefix)}">${escapeHtml(route.label)}</a>`).join("\n")
    + '\n  <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme">Theme</button>';
}

export function renderFooterLinks(prefix = "../") {
  return getPublicRouteRegistry()
    .filter((route) => route.footer)
    .map((route) => `<a href="${relativeHref(route.path, prefix)}">${escapeHtml(route.label)}</a>`)
    .join("");
}

export function buildFooterManifest() {
  const routes = getPublicRouteRegistry();
  const headerLinks = routes.filter((route) => route.header).map(({ path: href, label }) => ({ href, label }));
  const footerLinks = routes.filter((route) => route.footer).map(({ path: href, label }) => ({ href, label }));
  return {
    schemaVersion: "2.0",
    headerLinks,
    footerLinks,
    footerOnly: footerLinks.map(({ href }) => href).filter((href) => !headerLinks.some((item) => item.href === href)),
    legalPages: ["/privacy/", "/terms/", "/contact/", "/ip/"],
  };
}

export function buildSitemapXml() {
  const rows = getPublicRouteRegistry().map((route) => `  <url>
    <loc>${route.canonicalUrl}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
}

export function buildRouteContractProof() {
  const routes = getPublicRouteRegistry();
  const visualRoutes = getVisualAuditRoutes();
  const gameplay = buildPublicGameplayContract();
  const payload = {
    contentVersion: PUBLIC_CONTENT_VERSION_DATE,
    routes: routes.map(({ id, path, header, footer, visualAudit, generated }) => ({ id, path, header, footer, visualAudit, generated })),
    visualRoutes: visualRoutes.map(({ id, path }) => ({ id, path })),
    gameplay: {
      enemies: gameplay.enemies.length,
      weapons: gameplay.weapons.length,
      modes: gameplay.modes.length,
      difficulties: gameplay.difficulties.length,
    },
  };
  return {
    schemaVersion: "1.0",
    source: "scripts/lib/public-route-registry.mjs",
    contentVersion: PUBLIC_CONTENT_VERSION_DATE,
    fingerprint: crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    coverage: {
      routes: routes.length,
      headerRoutes: routes.filter((route) => route.header).length,
      footerRoutes: routes.filter((route) => route.footer).length,
      visualAuditRoutes: visualRoutes.length,
      generatedPages: routes.filter((route) => route.generated).length,
    },
    gameplay: payload.gameplay,
    routeIds: routes.map((route) => route.id),
    consumers: ["companion-pages", "header", "footer", "sitemap", "agents", "llms", "visual-audit"],
  };
}

export function getAgentResources() {
  const routeResources = getPublicRouteRegistry().map((route) => ({ rel: route.rel, href: route.canonicalUrl }));
  return [
    ...routeResources,
    { rel: "security", href: `${PUBLIC_CANONICAL_ORIGIN}/.well-known/security.txt` },
    { rel: "llms", href: `${PUBLIC_CANONICAL_ORIGIN}/.well-known/llms.txt` },
    { rel: "sitemap", href: `${PUBLIC_CANONICAL_ORIGIN}/sitemap.xml` },
    { rel: "gameplay-contract", href: `${PUBLIC_CANONICAL_ORIGIN}/gameplay-contract.json` },
    { rel: "route-contract", href: `${PUBLIC_CANONICAL_ORIGIN}/route-contract.json` },
    { rel: "field-manual", href: `${PUBLIC_CANONICAL_ORIGIN}/field-manual.json` },
    { rel: "game-stats", href: `${PUBLIC_CANONICAL_ORIGIN}/stats-surface.json` },
    { rel: "game-stats-live", href: `${PUBLIC_CANONICAL_ORIGIN}/api/community-stats` },
    { rel: "service-status", href: `${PUBLIC_CANONICAL_ORIGIN}/status.json` },
  ];
}

export function buildAgentsManifest() {
  const gameplay = buildPublicGameplayContract();
  return {
    schemaVersion: "1.2",
    name: "Call of Doodie",
    canonicalUrl: `${PUBLIC_CANONICAL_ORIGIN}/`,
    publisher: { name: "VaultSpark Studios LLC", url: "https://vaultsparkstudios.com/" },
    description: `A free comedy-first browser roguelite shooter with shared seeds, ${gameplay.enemies.length} distinct enemies and bosses, buildcraft, advisory run receipts, and public leaderboards.`,
    audience: ["humans", "ai-agents"],
    access: { play: "public", readDocumentation: "public", writeActions: "not-offered", authentication: "none-required-for-public-read" },
    resources: getAgentResources(),
    capabilities: [
      { id: "game.describe", mode: "read", description: "Describe the public loop, modes, roster, accessibility, and competitive-trust posture." },
      { id: "game.inspect-rules", mode: "read", description: "Inspect the versioned gameplay contract for modes, weapons, mastery, enemies, and challenge-link grammar." },
      { id: "game.inspect-live-truth", mode: "read", description: "Inspect effective-dated product claims, source links, current service posture, and known limitations." },
    ],
    trust: {
      competitiveReplayClaim: "advisory deterministic evidence; not full physics resimulation",
      replayCoverage: gameplay.trust.replayCoverage,
      freeTierCostStatus: gameplay.cost.freeTierCostStatus,
      rights: gameplay.rights,
    },
  };
}

export function buildLlmsText() {
  const gameplay = buildPublicGameplayContract();
  const resourceLines = getAgentResources().map((resource) => {
    const route = getPublicRouteRegistry().find((entry) => entry.rel === resource.rel);
    const label = route?.label || titleCase(resource.rel);
    return `- ${label}: ${resource.href}`;
  }).join("\n");
  return `# Call of Doodie

> Call of Doodie is a free comedy-first browser roguelite shooter by VaultSpark Studios LLC.

Canonical URL: ${PUBLIC_CANONICAL_ORIGIN}/
Publisher: https://vaultsparkstudios.com/
Rights: ${gameplay.rights}

## What players do

Players ${gameplay.loop.map(titleCase).join(", ").toLowerCase()}. The live contract publishes ${gameplay.modes.length} seeded modes, ${gameplay.weapons.length} weapons, and ${gameplay.enemies.length} enemies. Replay proof is ${gameplay.trust.replayEvidence} and ${gameplay.trust.excludedClaim}.

## Public resources

${resourceLines}

## Agent guidance

Public pages and gameplay-contract.json may be summarized and linked. Do not imply affiliation with Activision Publishing, Inc. or the Call of Duty® franchise. Do not claim replay evidence is stronger than the advisory contract. No public write API or autonomous purchase capability is offered.
`;
}

export function getVisualAuditRoutes() {
  const publicRoutes = getPublicRouteRegistry()
    .filter((route) => route.visualAudit)
    .map((route) => ({
      id: route.id,
      path: route.path === "/" ? "/?home=v2" : route.path,
      localPath: route.path === "/" ? "/?home=v2" : `${route.path}index.html`,
      primary: route.path === "/",
    }));
  return [
    ...publicRoutes,
    { id: "login", path: "/login", localPath: "/login", primary: false },
    { id: "auth-callback", path: "/auth/callback", localPath: "/auth/callback", primary: false },
  ];
}
