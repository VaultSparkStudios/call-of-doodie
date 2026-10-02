import { escapeHtml as e } from "./public-route-registry.mjs";
import { BOSS_GAUNTLET_BOSS_COUNT, BOSS_RUSH_WARMUP_WAVES, THRONE_COUNT, spell } from "../../src/config/modeFacts.js";

const RUN_SHAPES = Object.freeze({
  standard: "Open-ended wave survival",
  score_attack: "Five-minute score sprint",
  daily_challenge: "One shared daily seed",
  cursed: "Open-ended hard-modifier run",
  boss_rush: `${spell(BOSS_RUSH_WARMUP_WAVES)} warmup waves, then bosses each wave`,
  speedrun: "Open-ended survival against your stopwatch",
  gauntlet: "Weekly fixed opening kit",
  zombies: "Open-ended horde survival",
  boss_gauntlet: `${spell(BOSS_GAUNTLET_BOSS_COUNT)} ordered boss fights; clear all to win`,
  sewer_extraction: "Collect crates, then extract to bank loot",
  bot_royale: "Shrinking flood; last one standing wins",
  hold_the_throne: `Capture ${spell(THRONE_COUNT)} thrones to win`,
});

const SCENES = Object.freeze({
  "blacksite-flush": { mark: "01 / BUNKER", motif: "▥", art: "cod-karen-nemesis-v2.png", alt: "Regional Manager Karen holding a complaint clipboard", signal: "The complaint bunker is open. The records are not." },
  "porcelain-siege": { mark: "02 / DISTRICT", motif: "▤", art: "cod-porcelain-throne.png", alt: "The porcelain district's contested throne", signal: "The district is under notice. Take back the pressure." },
  "final-notice": { mark: "03 / HEARING", motif: "◈", art: "cod-doodie-operative-v3.png", alt: "A Doodie operative ready to return the final notice", signal: "Every appeal ends at the Board." },
});

function modeCard(mode) {
  const score = mode.scoring === "local-only" ? "Local results only" : "Eligible for the public board when a valid run is submitted";
  const squad = mode.id === "hold_the_throne" ? "Solo player + computer squad"
    : mode.id === "bot_royale" ? "Solo player vs computer bots"
      : "Solo player vs computer threats";
  return `<article class="discovery-card" id="mode-${e(mode.id)}" data-mode-id="${e(mode.id)}">
    <div class="discovery-card__top"><span>${e(mode.kind === "ruleset" ? "RULESET" : "GAME MODE")}</span><span>${mode.seededReplayCode ? "REPLAY CODE" : "NO REPLAY CODE"}</span></div>
    <h3>${e(mode.label)}</h3><p class="discovery-card__objective">${e(mode.objective)}</p>
    <dl><div><dt>Run shape</dt><dd>${e(RUN_SHAPES[mode.id])}</dd></div><div><dt>Squad</dt><dd>${e(squad)}</dd></div><div><dt>Result</dt><dd>${e(score)}</dd></div></dl>
    <a href="../?mode=${encodeURIComponent(mode.id)}#deploy" aria-label="Select ${e(mode.label)} for your next run">Select ${e(mode.label)} <span aria-hidden="true">→</span></a>
  </article>`;
}

export function renderModeDiscovery(gameplay) {
  const games = gameplay.modes.filter((mode) => mode.kind === "mode");
  const rulesets = gameplay.modes.filter((mode) => mode.kind === "ruleset");
  return `<div class="play-discovery">
    <section class="discovery-lead card"><p class="eyebrow">Choose by outcome</p><h2>What kind of run do you want?</h2><p>A game mode changes the objective. A ruleset reshapes the original survival loop. Every match here is played solo; bots and squadmates are computer controlled, not other people in a live lobby.</p><a href="../operations/">Browse the authored Operations →</a></section>
    <section aria-labelledby="mode-games"><div class="discovery-section-head"><span>01 / GAME MODES</span><h2 id="mode-games">Change the objective</h2><p>${games.length} playable modes. Some end in a win; Classic and Zombies ask how long you can survive.</p></div><div class="discovery-grid">${games.map(modeCard).join("")}</div></section>
    <section aria-labelledby="mode-rulesets"><div class="discovery-section-head"><span>02 / RULESETS</span><h2 id="mode-rulesets">Change the pressure</h2><p>${rulesets.length} survival variants, from a timed score sprint to boss-after-boss combat.</p></div><div class="discovery-grid">${rulesets.map(modeCard).join("")}</div></section>
    <aside class="field-guide__outro"><strong>Local does not mean lesser.</strong><p>Every mode can be played in your browser. Public board eligibility depends on a valid submission. A replay code records supported setup and advisory evidence; it is not a full physics replay. Newer objective modes are currently local-only and have no replay code.</p><a href="../board/">Read the board rules →</a></aside>
  </div>`;
}

function operationDossier(operation, index) {
  const scene = SCENES[operation.id];
  if (!scene || operation.routeIntel.length !== 2) throw new Error(`Missing authored dossier: ${operation.id}`);
  return `<article class="operation-dossier" id="${e(operation.id)}" data-operation-id="${e(operation.id)}">
    <div class="operation-scene operation-scene--${e(operation.id)}"><span>${e(scene.mark)}</span><b aria-hidden="true">${e(scene.motif)}</b><img src="../visual-assets/${e(scene.art)}" alt="${e(scene.alt)}" width="512" height="512" loading="lazy" decoding="async"><p>${e(scene.signal)}</p></div>
    <div class="operation-dossier__body"><div class="discovery-card__top"><span>OP ${String(index + 1).padStart(2, "0")}</span><span>${operation.encounterVerbs.length} ENCOUNTERS · ${operation.durationMinutes.join("–")} MIN</span></div>
      <h2>${e(operation.title)}</h2><p class="operation-brief">${e(operation.brief)}</p><p><strong>Final antagonist:</strong> ${e(operation.antagonist)}</p>
      <ol class="encounter-strip" aria-label="Encounter sequence">${operation.encounterTitles.map((title, order) => `<li><span>${String(order + 1).padStart(2, "0")}</span>${e(title)}</li>`).join("")}</ol>
      <h3>Choose your route</h3><div class="operation-routes">${operation.routeIntel.map((route) => `<section><h4>${e(route.routeLabel)}</h4><p>${e(route.immediate.accessibleSummary)}</p>${route.nextOperationEcho ? `<p class="operation-echo"><strong>Later echo:</strong> ${e(route.nextOperationEcho.description)} Eligible after completion.</p>` : ""}<a href="../?operation=${encodeURIComponent(operation.id)}&amp;route=${encodeURIComponent(route.routeId)}#deploy" aria-label="Select ${e(operation.title)} via ${e(route.routeLabel)}">Select this route →</a></section>`).join("")}</div>
    </div>
  </article>`;
}

export function renderOperationDiscovery(gameplay) {
  return `<div class="play-discovery operation-discovery"><section class="discovery-lead card"><p class="eyebrow">Campaign continuity</p><h2>Every route is a bargain.</h2><p>One path eases reinforcement pressure. The other earns a score premium. Two completed routes can create a specific echo in the next authored Operation. Select a route here, review it in the play console, then start when ready.</p><a href="../modes/">Compare the arcade modes →</a></section>${gameplay.operations.map(operationDossier).join("")}</div>`;
}
