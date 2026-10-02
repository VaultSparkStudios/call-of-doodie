import { ENEMY_ATLAS_CONTRACT } from "../../src/utils/enemyAtlasContract.js";
import { WEAPON_ATLAS_CONTRACT } from "../../src/utils/objectAtlasContract.js";
import { FIELD_MANUAL_SECTIONS } from "../../src/content/fieldManual.js";
import { getControllerLabels } from "../../src/utils/gamepad.js";

const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const roleNames = { boss: "Boss", ranged: "Ranged", rusher: "Rusher", heavy: "Heavy", pursuer: "Pursuer" };
const specialThreats = {
  9: ["Calls in tenants", "Keep moving while you thin the extra enemies, then return fire."],
  11: ["Shielded side", "Rotate around the shield and fire at the exposed side."],
  12: ["Explosive close approach", "Dash clear before the bomber reaches contact range."],
  16: ["Splits on defeat", "Leave room for the three shards created by the final hit."],
  17: ["Charge lane and shield", "Sidestep the charge; use its recovery to deal damage."],
  18: ["Summoned escorts", "Clear the escorts to open a damage window on the boss."],
  20: ["Spreading projectile pattern", "Keep a side lane open instead of retreating in a straight line."],
};
const commonThreats = {
  boss: ["Boss arena cue", "Read the boss pattern, keep an escape lane, then commit damage."],
  ranged: ["Incoming projectile lane", "Strafe across the lane and approach from an angle."],
  rusher: ["Fast closing distance", "Create space early and save a dash for the final approach."],
  heavy: ["High-health advance", "Kite around open space instead of standing still to trade."],
  pursuer: ["Closing distance", "Keep moving and clear a route before the group surrounds you."],
};

function sprite(atlas, cell, name, eager = false) {
  const col = cell % atlas.columns;
  const row = Math.floor(cell / atlas.columns);
  return `<div class="field-sprite" role="img" aria-label="${escape(name)} illustration"><span class="field-sprite__clip"><img src="../${escape(atlas.runtimePath.replace(/^public\//, ""))}" alt="" width="${atlas.columns * 256}" height="${atlas.rows * 256}" loading="${eager ? "eager" : "lazy"}" decoding="async" style="width:${atlas.columns * 218}px;height:${atlas.rows * 218}px;left:-${col * 218}px;top:-${row * 218}px"></span></div>`;
}

function threatAtlas(index) {
  for (const atlas of Object.values(ENEMY_ATLAS_CONTRACT)) {
    const cell = atlas.typeIndices.indexOf(index);
    if (cell >= 0) return { atlas, cell };
  }
  throw new Error(`No atlas slot for enemy:${index}`);
}

function threatCard(enemy, position) {
  const { atlas, cell } = threatAtlas(enemy.index);
  const [watch, answer] = specialThreats[enemy.index] || commonThreats[enemy.role];
  return `<article class="field-card threat-card" id="enemy-${enemy.index}" data-threat-role="${escape(enemy.role)}" aria-labelledby="enemy-title-${enemy.index}">
    ${sprite(atlas, cell, enemy.name, position < 2)}
    <div class="field-card__body"><div class="field-card__meta"><span>THREAT ${String(enemy.index + 1).padStart(2, "0")}</span><span>${escape(roleNames[enemy.role])}</span></div>
    <h2 id="enemy-title-${enemy.index}">${escape(enemy.name)}</h2>
    <div class="threat-signal" data-role="${escape(enemy.role)}" aria-hidden="true"><span class="threat-signal__enemy">${escape(enemy.emoji)}</span><span class="threat-signal__lane">${enemy.ranged ? "· · · ▶" : "→ → →"}</span><span class="threat-signal__player">◆</span></div>
    <dl class="field-card__facts"><div><dt>Base health</dt><dd>${enemy.baseHealth}</dd></div><div><dt>Base speed</dt><dd>${enemy.baseSpeed}</dd></div><div><dt>Attack</dt><dd>${enemy.ranged ? "Projectile" : "Contact"}</dd></div></dl>
    <div class="field-card__read"><p><strong>Watch for</strong>${escape(watch)}</p><p><strong>Answer</strong>${escape(answer)}</p></div>
    </div></article>`;
}

const trajectoryPaths = {
  beam: '<path d="M16 36 H226"/><path d="m218 29 8 7-8 7"/>',
  return: '<path d="M16 36 Q110 -4 220 36 Q110 78 16 36"/><path d="m25 27-9 9 11 4"/>',
  ricochet: '<path d="M16 52 66 14 116 52 166 14 220 36"/><path d="m211 30 9 6-10 5"/>',
  spread: '<path d="M16 36 220 8 M16 36 H220 M16 36 220 64"/>',
  burst: '<path d="M16 36 H220" stroke-dasharray="18 13"/><circle cx="100" cy="36" r="4"/><circle cx="144" cy="36" r="4"/><circle cx="188" cy="36" r="4"/>',
  direct: '<path d="M16 36 H220"/><path d="m211 29 9 7-9 7"/>',
};

function weaponCard(weapon, position) {
  return `<article class="field-card weapon-card" id="weapon-${weapon.index}" aria-labelledby="weapon-title-${weapon.index}">
    ${sprite(WEAPON_ATLAS_CONTRACT, weapon.index, weapon.name, position < 2)}
    <div class="field-card__body"><div class="field-card__meta"><span>WEAPON ${String(weapon.index + 1).padStart(2, "0")}</span><span>${escape(weapon.rangeCue)} range cue</span></div>
    <h2 id="weapon-title-${weapon.index}">${escape(weapon.name)}</h2><p class="weapon-card__tradeoff">${escape(weapon.description)}</p>
    <div class="trajectory" role="img" aria-label="Illustrative ${escape(weapon.pattern)} shot pattern"><svg viewBox="0 0 240 72" focusable="false" aria-hidden="true">${trajectoryPaths[weapon.pattern]}</svg><span>${escape(weapon.pattern)} pattern · concept sketch</span></div>
    <dl class="field-card__facts"><div><dt>Base damage / projectile</dt><dd>${weapon.baseDamagePerProjectile}</dd></div><div><dt>Fire interval</dt><dd>${weapon.baseFireIntervalMs} ms</dd></div><div><dt>Magazine</dt><dd>${weapon.baseMagazine}</dd></div><div><dt>Shots / trigger</dt><dd>${weapon.projectilesPerTrigger}</dd></div></dl>
    </div></article>`;
}

function renderBestiary(gameplay) {
  return `<section class="field-guide" aria-label="Enemy field guide"><div class="field-guide__intro"><p class="eyebrow">Encounter intelligence · ${gameplay.enemies.length} live types</p><p>Base values are unmodified; waves and difficulty change the fight. Lane sketches show approach and projectile direction, not exact collision geometry.</p></div>
    <label class="field-filter">Show threat role <select data-threat-filter><option value="all">All ${gameplay.enemies.length} threats</option>${Object.entries(roleNames).map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select></label>
    <p class="field-filter__count" data-threat-count aria-live="polite">Showing all ${gameplay.enemies.length} threats.</p>
    <div class="field-card-grid">${gameplay.enemies.map(threatCard).join("")}</div></section>`;
}

function renderArsenal(gameplay) {
  return `<section class="field-guide" aria-label="Weapon field guide"><div class="field-guide__intro"><p class="eyebrow">Equipment intelligence · ${gameplay.weapons.length} live weapons</p><p>Compare cadence, magazine, shot shape, and tradeoffs before you deploy. All weapons are selectable now. Base values precede perks and upgrades; range labels and trajectories are playstyle sketches, not exact physics.</p></div>
    <div class="field-card-grid">${gameplay.weapons.map(weaponCard).join("")}</div>
    <div class="field-guide__outro"><strong>Build beyond the base kit</strong><p>Starter loadouts and permanent upgrades live in the in-game Build screen. Arsenal milestones mark career mastery; they do not lock these weapons.</p><a href="../#build/earned">Open Build <span aria-hidden="true">→</span></a></div></section>`;
}

function controls() {
  const pad = getControllerLabels();
  const sets = [
    ["keyboard", "Keyboard + mouse", [["Move", "W A S D"], ["Aim and shoot", "Mouse + left click"], ["Dash", "Space / Shift"], ["Grenade", "Q / G"], ["Swap", "1–9, 0, - , ="], ["Reload / pause", "R / Escape"]]],
    ["touch", "Touch", [["Move", "Left thumb stick"], ["Aim and fire", "Right thumb stick"], ["One-stick option", "Moving alone auto-aims at the nearest enemy"], ["Dash / grenade", "On-screen buttons"], ["Swap / reload", "Weapon buttons / R button"]]],
    ["controller", "Controller", [["Move / aim", `${pad.move} / ${pad.aim}`], ["Shoot", pad.shoot], ["Dash / grenade", `${pad.dash} / ${pad.grenade}`], ["Swap", `${pad.previousWeapon} / ${pad.nextWeapon}`], ["Reload / pause", `${pad.reload} / ${pad.pause}`]]],
  ];
  return `<section class="field-controls" aria-labelledby="controls-title"><div class="field-guide__intro"><p class="eyebrow">First 30 seconds</p><h2 id="controls-title">Choose the controls in your hands.</h2><p>Pick a device to see its controls. All three remain readable if scripts are unavailable.</p></div><label class="field-filter">Your input <select data-control-picker>${sets.map(([id, name]) => `<option value="${id}">${escape(name)}</option>`).join("")}</select></label><div class="control-grid">${sets.map(([id, name, rows]) => `<section class="field-card control-card" data-control-panel="${id}"><h3>${escape(name)}</h3><dl>${rows.map(([action, input]) => `<div><dt>${escape(action)}</dt><dd>${escape(input)}</dd></div>`).join("")}</dl></section>`).join("")}</div></section>`;
}

function renderManual(gameplay) {
  const steps = FIELD_MANUAL_SECTIONS.slice(0, 4);
  return `<div class="field-guide manual-guide"><section class="field-steps" aria-labelledby="quickstart-title"><div class="field-guide__intro"><p class="eyebrow">Quickstart</p><h2 id="quickstart-title">Four moves that keep a run alive.</h2></div><ol>${steps.map(([title, body], index) => `<li><span>0${index + 1}</span><div><h3>${escape(title.replace(/^\d+\.\s*/, ""))}</h3><p>${escape(body)}</p></div></li>`).join("")}</ol></section>
    ${controls()}
    <section class="field-modes" aria-labelledby="mode-rules-title"><div class="field-guide__intro"><p class="eyebrow">Choose your rules</p><h2 id="mode-rules-title">Each mode changes the plan.</h2><p>Classic keeps the wave loop open. Objective modes set a specific win condition; seeded rulesets change the comparison. Check the play console before you start.</p></div><div class="mode-rule-grid">${gameplay.modes.map((mode) => `<article class="field-card mode-rule"><span>${escape(mode.kind === "ruleset" ? "SEEDED RULESET" : "MODE")}</span><h3>${escape(mode.label)}</h3><p>${escape(mode.objective || "Survive waves, choose perks, and chase a better run.")}</p><small>${mode.seededReplayCode ? "Replay-code compatible" : "No seeded replay code"}</small></article>`).join("")}</div><a class="field-guide__link" href="../modes/">Compare every way to play <span aria-hidden="true">→</span></a></section>
    <div class="field-guide__outro"><strong>Ready to practice the fundamentals?</strong><p>The first run has in-game guidance for movement, firing, dash, and swapping. It advances only after observing the action.</p><a href="../">Start a guided run <span aria-hidden="true">→</span></a><p>After a run, you can download a redacted JSON summary for your own analysis or an AI agent. It is player-owned, local, and separate from a verified score.</p><a href="../run-analysis-schema.json">Read the run summary schema <span aria-hidden="true">→</span></a></div></div>`;
}

export function renderVisualFieldGuide(pageId, gameplay) {
  if (pageId === "bestiary") return renderBestiary(gameplay);
  if (pageId === "arsenal") return renderArsenal(gameplay);
  if (pageId === "field-manual") return renderManual(gameplay);
  return null;
}
