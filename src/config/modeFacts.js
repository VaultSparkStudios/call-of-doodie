// modeFacts.js — the numbers that appear in BOTH game code and player-facing
// copy (S175).
//
// Why this file exists: S165 raised BOT ROYALE from twelve bots to sixteen by
// editing `BOT_COUNT` in `src/modes/botRoyale.js`. The runtime changed; the
// copy did not. Four live player-facing surfaces went on claiming twelve —
// the mode catalog blurb and description (in-game mode picker and /modes/),
// `src/content/fieldManual.js` (/field-manual/ and the in-app quick
// reference), and the generated `public/gameplay-contract.json`. The S167
// TASK_BOARD line "public roadmap/changelog now describe the sixteen-bot
// scrolling royale" was true of the changelog and false of everything else,
// so the repo published two different bot counts at once for ten sessions.
//
// `modeCatalog.js` calls itself the single source of truth for mode identity,
// but it only ever owned *identity* — labels, colors, ids. The numbers inside
// its prose had no authority behind them at all. This module is that
// authority, and the rule is the one that already governs `silScore` and
// `silAvg3` in `write-project-status.mjs`: a value that is a function of
// something else is derived, never hand-entered.
//
// Constraint: this module is imported by `modeCatalog.js`, which `App.jsx`
// reads at zero cost (S163 bundle diet). It must therefore stay
// dependency-free — no imports, no runtime, plain frozen numbers. The heavy
// mode runtime imports *down* into it, never the reverse.

/** BOT ROYALE — bots spawned at drop. Authority for `botRoyale.js` BOT_COUNT. */
export const BOT_ROYALE_BOT_COUNT = 16;

/** BOSS GAUNTLET — bosses to clear for the win. Authority for BOSS_COUNT. */
export const BOSS_GAUNTLET_BOSS_COUNT = 6;

/** BOSS GAUNTLET — par time in seconds (the debrief compares against it). */
export const BOSS_GAUNTLET_PAR_SECONDS = 6 * 60;

/** HOLD THE THRONE — thrones in the layout. Pinned to `throneLayout()` length. */
export const THRONE_COUNT = 3;

/** HOLD THE THRONE — seconds of uncontested hold to capture one throne. */
export const THRONE_CAPTURE_SECONDS = 30;

/** SEWER EXTRACTION — alarm level that opens the evac toilet. */
export const EXTRACTION_ALARM_EVAC = 60;

/** SEWER EXTRACTION — alarm level that locks the exit into a last stand. */
export const EXTRACTION_ALARM_LOCK = 100;

/** Standard survival — waves between bosses. Authority for modeRules' standard
 *  `boss.interval`, and for the "Boss every N waves" line in QUICK_RULES. */
export const STANDARD_BOSS_WAVE_INTERVAL = 5;

// Prose in this game spells small numbers as words ("sixteen bots", "six
// bosses"). Copy composed from a fact therefore needs the word, not the
// numeral, or the derivation would silently change the voice of the writing
// to satisfy the machine. Only the values actually used in copy are listed;
// an unmapped number throws rather than degrading to a numeral, so a future
// balance change that outgrows this table fails loudly at import time instead
// of quietly rewriting player-facing prose.
const NUMBER_WORDS = Object.freeze({
  3: "three",
  5: "five",
  6: "six",
  12: "twelve",
  16: "sixteen",
  30: "thirty",
  60: "sixty",
  100: "one hundred",
});

/** Spell a mode fact for prose. Throws on an unmapped value — never guesses. */
export function spell(value) {
  const word = NUMBER_WORDS[value];
  if (!word) {
    throw new Error(
      `modeFacts.spell(${value}): no spelled form. Add it to NUMBER_WORDS — ` +
      `player-facing copy must not silently fall back to a numeral.`,
    );
  }
  return word;
}

/**
 * Every fact that is quoted in player-facing copy, with the module that owns
 * its runtime behavior. `scripts/check-public-claims.mjs` walks this table so
 * a new fact is covered by the copy gate the moment it is added here, and
 * `modeFacts.test.js` asserts each one against the real mode runtime.
 */
export const PLAYER_FACING_MODE_FACTS = Object.freeze([
  { key: "BOT_ROYALE_BOT_COUNT", value: BOT_ROYALE_BOT_COUNT, owner: "src/modes/botRoyale.js", noun: "bots" },
  { key: "BOSS_GAUNTLET_BOSS_COUNT", value: BOSS_GAUNTLET_BOSS_COUNT, owner: "src/modes/bossGauntlet.js", noun: "bosses" },
  { key: "THRONE_COUNT", value: THRONE_COUNT, owner: "src/systems/zones.js", noun: "thrones" },
  { key: "THRONE_CAPTURE_SECONDS", value: THRONE_CAPTURE_SECONDS, owner: "src/modes/holdTheThrone.js", noun: "seconds" },
  { key: "EXTRACTION_ALARM_LOCK", value: EXTRACTION_ALARM_LOCK, owner: "src/modes/sewerExtraction.js", noun: "alarm" },
  { key: "STANDARD_BOSS_WAVE_INTERVAL", value: STANDARD_BOSS_WAVE_INTERVAL, owner: "src/systems/modeRules.js", noun: "waves" },
]);
