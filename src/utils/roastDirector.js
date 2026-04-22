/**
 * roastDirector.js — Rule-based comedic announcer for in-run events.
 *
 * Returns a short callout string for a given run event. Rate-limited per
 * category so the same type of roast can't fire more than once per configured
 * cooldown (in waves). Stateless: the caller owns the cooldown state object.
 *
 * Events: kill_streak, wave_clear, near_death, boss_kill, first_blood,
 *         reload_under_pressure, low_ammo, coin_milestone, perk_chosen,
 *         death
 */

const POOLS = {
  kill_streak: [
    "OKAY, they noticed you.",
    "Sending them to respawn jail.",
    "Your mom would be proud. Maybe.",
    "This is your time. Don't waste it.",
    "The streak is real. The humble is not.",
    "Bodies = XP. Keep the math going.",
    "You're cooking. Try not to burn it.",
    "The enemies filed a group complaint.",
  ],

  wave_clear: [
    "Wave survived. Somehow.",
    "Another wave bites the dust.",
    "Clean. Relatively speaking.",
    "The horde has temporarily given up.",
    "Cleared. Your coach is still unimpressed.",
    "That'll do. Don't get cocky.",
    "Next wave is already warming up.",
    "Take a breath. You've earned 2 seconds.",
  ],

  near_death: [
    "Close. Real close. TOO close.",
    "Your HP has filed a restraining order.",
    "Okay that was free. It won't be next time.",
    "Living on fumes and audacity.",
    "The Grim Reaper checked his watch.",
    "Lucky. Embarrassingly lucky.",
    "You do NOT have 9 lives. Just a heads up.",
    "HP: critical. Ego: somehow intact.",
  ],

  boss_kill: [
    "BIG ONE DOWN. Take that.",
    "Boss slain. Flex responsibly.",
    "That's what happens. That's what happens.",
    "The Doodie Patrol is on a roll.",
    "Boss deleted. Moving on.",
    "They were huge and you were right.",
    "That boss had a family. You don't care.",
    "Add it to the resume.",
  ],

  first_blood: [
    "First kill. The record starts now.",
    "And so it begins.",
    "First blood. Now don't stop.",
    "Kill one, tell no one.",
    "The enemy respawn screen flickers.",
  ],

  reload_under_pressure: [
    "Reload NOW. NOW.",
    "Bold strategy, empty mag.",
    "Reloading while they watch. Brave.",
    "Hope they wait for you. They won't.",
    "Magazine out. Sweating begins.",
  ],

  low_ammo: [
    "Conserve. Every shot counts.",
    "You're not rich enough to miss.",
    "Ammo is friendship. Spend it wisely.",
    "Pick your shots. Or don't. Your funeral.",
    "Low ammo energy is a real vibe.",
  ],

  coin_milestone: [
    "Pockets heavy. Power incoming.",
    "💩 coins earned. The economy is you.",
    "Bank run. Spend them.",
    "Doodie Coins secured. Keep stacking.",
    "Flush with cash. Get it?",
  ],

  perk_chosen: [
    "Build identity locked in. No going back.",
    "Perk selected. Commit to the bit.",
    "Your build is a choice. Own it.",
    "New perk hits different. Prove it.",
    "The synergies are yours to discover.",
  ],

  death: [
    "GG. Touch grass. Come back.",
    "And that's the run. Respectfully.",
    "Next time. There's always a next time.",
    "You were doing so well. Until you weren't.",
    "The floor had your number.",
    "Eliminated. But make it fashion.",
    "L. But a learned L.",
    "Your ghost will haunt this seed.",
  ],
};

/**
 * Returns a callout string for the given event, or null if rate-limited.
 *
 * @param {string}  event         - One of the event keys in POOLS
 * @param {object}  cooldowns     - Mutable caller-owned cooldown state { [event]: lastWave }
 * @param {number}  currentWave   - Current wave number (used for rate limiting)
 * @param {number}  [cooldownWaves=2] - Minimum waves between same-category callouts
 * @returns {string|null}
 */
export function getRoastCallout(event, cooldowns, currentWave, cooldownWaves = 2) {
  const pool = POOLS[event];
  if (!pool) return null;

  const lastFired = cooldowns[event] ?? -Infinity;
  if (currentWave - lastFired < cooldownWaves) return null;

  cooldowns[event] = currentWave;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Returns all available event keys.
 */
export function getRoastEventKeys() {
  return Object.keys(POOLS);
}

/**
 * Returns the pool size for a given event (useful for tests).
 */
export function getRoastPoolSize(event) {
  return POOLS[event]?.length ?? 0;
}
