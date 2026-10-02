// Authored, local-only tactical prototypes. These receipts describe the
// sandbox model, not a live Operation or a counterfactual replay of a run.
export const FIELD_LAB_VERSION = 'field-lab-v1';

export const PLUMBING_ROUTES = Object.freeze({
  lane: Object.freeze({ label: 'Drain the escape lane', benefit: 'The west lane stays dry and open.', cost: 'Trap power goes offline; two more enemies enter the room.', lane: 'dry', trap: 'off', boss: 'armored', pressure: 2 }),
  trap: Object.freeze({ label: 'Power the trap', benefit: 'The center trap catches the first wave.', cost: 'The west lane floods; crossing it takes longer.', lane: 'flooded', trap: 'on', boss: 'armored', pressure: 0 }),
  boss: Object.freeze({ label: 'Expose the boss', benefit: 'The boss shield opens for one volley.', cost: 'The trap shuts down and three more enemies enter the room.', lane: 'flooded', trap: 'off', boss: 'exposed', pressure: 3 }),
});

const wholeSeed = (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) >>> 0 : 0;
const hash = (value) => {
  let h = 2166136261;
  for (const char of JSON.stringify(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
};

export function createPlumbingRoom(seed = 73) {
  return { version: FIELD_LAB_VERSION, seed: wholeSeed(seed), route: 'sealed', events: [], receipt: null };
}

export function reroutePlumbing(room, route) {
  if (!room || room.version !== FIELD_LAB_VERSION || !Object.hasOwn(PLUMBING_ROUTES, route)) throw new RangeError('Unknown plumbing route');
  if (room.events.length >= 32) throw new RangeError('Room receipt limit reached');
  const event = { sequence: room.events.length + 1, from: room.route, to: route };
  const events = [...room.events, event];
  return { ...room, route, events, receipt: { version: FIELD_LAB_VERSION, seed: room.seed, eventCount: events.length, route, fingerprint: hash([room.seed, events]) } };
}

export function replayPlumbing(seed, events = []) {
  return (Array.isArray(events) ? events : []).reduce((room, event) => reroutePlumbing(room, event.to), createPlumbingRoom(seed));
}

export const COMPLAINT_TACTICS = Object.freeze({
  noise: Object.freeze({ label: 'Noise citation', tell: 'The clerk stamps a yellow warning before silencing cones appear in the center lane.', counter: 'File an appeal: move through the west lane before the cones arrive.', consequence: 'Center lane blocked for one beat.' }),
  parking: Object.freeze({ label: 'Parking complaint', tell: 'Orange tape appears before a cart blocks the west lane.', counter: 'Request a tow: use the center lane while the cart is stationary.', consequence: 'West lane blocked for one beat.' }),
});

export function createComplaintContract({ seed = 73, tactic = 'noise', counter = 'appeal' } = {}) {
  if (!Object.hasOwn(COMPLAINT_TACTICS, tactic) || !['appeal', 'tow'].includes(counter)) throw new RangeError('Unknown complaint tactic or counter');
  const correctCounter = tactic === 'noise' ? 'appeal' : 'tow';
  const events = [
    { beat: 1, cue: COMPLAINT_TACTICS[tactic].tell },
    { beat: 2, cue: COMPLAINT_TACTICS[tactic].consequence },
    { beat: 3, cue: counter === correctCounter ? 'Your chosen clause opens a safe route.' : 'Your chosen clause misses this complaint; the alternative route stays open.' },
  ];
  return { version: FIELD_LAB_VERSION, seed: wholeSeed(seed), tactic, counter, counterMatched: counter === correctCounter, competitive: false, events, fingerprint: hash([wholeSeed(seed), tactic, counter, events]) };
}

export const FATE_APPROACHES = Object.freeze({
  cover: Object.freeze({ label: 'Take cover first', changedVariable: 'First action: cover before firing.' }),
  rush: Object.freeze({ label: 'Rush the lane', changedVariable: 'First action: cross the lane before firing.' }),
});

export function fateOrder(seed = 73) { return wholeSeed(seed) % 2 ? ['cover', 'rush'] : ['rush', 'cover']; }

export function resolveFateAttempt({ seed = 73, approach, elapsedSeconds = 45 } = {}) {
  if (!Object.hasOwn(FATE_APPROACHES, approach)) throw new RangeError('Unknown practice approach');
  const normalizedSeed = wholeSeed(seed);
  const elapsed = Math.max(0, Math.min(60, Math.floor(Number(elapsedSeconds) || 0)));
  const common = normalizedSeed % 3;
  const covered = approach === 'cover';
  const observed = { damageTaken: 18 + common * 2 + (covered ? 0 : 12), targetsTagged: 3 + (covered ? 0 : 1), laneReached: covered ? 'center' : 'east' };
  return { version: FIELD_LAB_VERSION, seed: normalizedSeed, approach, changedVariable: FATE_APPROACHES[approach].changedVariable,
    elapsedSeconds: elapsed, observed, confidence: 'authored-fixture-only', uncontrolledInputs: ['timing and movement in a real run', 'enemy pathing and build choice'],
    competitive: false, fingerprint: hash([normalizedSeed, approach, elapsed, observed]) };
}

export function compareFateAttempts(first, second) {
  if (!first || !second || first.seed !== second.seed || first.approach === second.approach) throw new RangeError('Use distinct approaches with one shared seed');
  return { version: FIELD_LAB_VERSION, order: [first.approach, second.approach], sharedSeed: first.seed,
    changedVariable: 'Opening position before firing',
    observed: { damageDifference: second.observed.damageTaken - first.observed.damageTaken, targetDifference: second.observed.targetsTagged - first.observed.targetsTagged },
    confidence: 'authored-fixture-only', claim: 'These are two outcomes in a scripted practice fixture. Neither predicts or rewinds a historical run.', competitive: false };
}
