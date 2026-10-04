import { DIFFICULTIES } from "../constants.js";
// Sewer creatures own their bodies and combat vocabulary, independent of classic AI.
export const ZOMBIE_ROSTER = Object.freeze([
  { id: "shambler", name: "Union of the Unflushed", color: "#9fcb8f", health: 1.2, speed: 0.82, damage: 12, size: 36, tell: "BACK TO WORK", cycle: 240, windup: 48, active: 20 },
  { id: "crawler", name: "Drain Dentist", color: "#c6aeed", health: 0.8, speed: 1.08, damage: 10, size: 30, tell: "OPEN WIDE", cycle: 190, windup: 48, active: 24 },
  { id: "sprinter", name: "Panic Plunger", color: "#b6ed59", health: 0.9, speed: 0.9, damage: 16, size: 34, tell: "TOILET EMERGENCY", cycle: 240, windup: 60, active: 30 },
  { id: "bloater", name: "Septic Burp Department", color: "#dfae60", health: 1.8, speed: 0.58, damage: 18, size: 48, tell: "EXCUSE ME", cycle: 300, windup: 72, active: 1 },
  { id: "screecher", name: "The Last Paper Roll", color: "#ee95b5", health: 1.05, speed: 0.76, damage: 13, size: 40, tell: "ONE SQUARE LEFT", cycle: 330, windup: 72, active: 1 },
]);
export function getZombieOutbreakPlan(wave = 1) {
  const w = Math.max(1, Math.floor(Number(wave) || 1));
  const tier = Math.min(5, 1 + Math.floor((w - 1) / 3));
  const surge = w > 1 && w % 3 === 0;
  return { wave: w, tier, surge, label: surge ? "BACKFLOW HORDE" : `SEWER DEPTH ${tier}`, enemyCountMult: surge ? 1.5 : 1.1 + tier * 0.07, spawnRateMult: surge ? 0.7 : 0.95, healthMult: 1 + tier * 0.05, speedMult: 1 + tier * 0.015 };
}
export function getZombieWaveEnemyCount(baseCount, wave = 1) {
  return Math.min(64, Math.max(1, Math.ceil((Number(baseCount) || 1) * getZombieOutbreakPlan(wave).enemyCountMult)));
}
export function getZombieRosterAvailability({ wave = 1, completedPumps = 0, pacing = "time" } = {}) {
  const depthAvailable = wave < 2 ? 2 : wave < 4 ? 4 : 5;
  return pacing === "pumps" ? Math.max(depthAvailable, completedPumps >= 2 ? 5 : completedPumps >= 1 ? 4 : 2) : depthAvailable;
}
export function mutateEnemyForZombieMode(enemy, { wave = 1, ordinal = 0, difficulty = "normal", completedPumps = 0, pacing = "time", entrance = null } = {}) {
  if (!enemy || enemy.isZombie) return enemy;
  const plan = getZombieOutbreakPlan(wave);
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const available = getZombieRosterAvailability({ wave, completedPumps, pacing });
  const introduction = pacing === "pumps" ? ZOMBIE_ROSTER.slice(0, available).find(spec => spec.id === entrance) : null;
  const spec = introduction || ZOMBIE_ROSTER[Math.abs(Math.floor(Number(ordinal) || 0) * 7 + plan.wave * 3) % available];
  enemy.zombieEntrance = Boolean(introduction);
  const boss = enemy.isBossEnemy === true;
  enemy.originalName = enemy.name;
  Object.assign(enemy, { isZombie: true, zombieVariant: spec.id, name: boss ? `The Clogfather · ${spec.name}` : spec.name, emoji: "🧟", color: spec.color, typeIndex: ZOMBIE_ROSTER.indexOf(spec), ranged: false, eliteType: null, splitOnDeath: false, dmgMult: 1, size: spec.size * (boss ? 1.6 : 1), speed: spec.speed * plan.speedMult * (boss ? 0.85 : 1), contactDamage: spec.damage, zombieClock: Math.abs(ordinal * 37) % 90, zombieState: "stalk", zombieTell: spec.tell });
  enemy.deathQuotes = ["The plumbing union will hear about this.", "I was two flushes from retirement.", "Please recycle my remaining dignity."];
  enemy.shieldPulseActive = false;
  enemy.summonerInvuln = false;
  enemy.jugShield = 0;
  enemy.speed *= diff.speedMult;
  enemy.health = (42 + plan.wave * 6) * spec.health * (boss ? 5 : 1) * diff.healthMult;
  enemy.maxHealth = enemy.health;
  enemy.points = Math.round((enemy.points || 50) * (boss ? 1.5 : 1.1));
  return enemy;
}
export function describeZombieOutbreak(wave = 1) {
  return `${getZombieOutbreakPlan(wave).label}: kill for sludge, power the three pumps, then escape through the hatch.`;
}
// Caller owns contact damage and death receipts. All clocks advance only in simulation.
export function stepZombieEnemy(e, { gs, target, world, speedMult = 1 } = {}) {
  const spec = ZOMBIE_ROSTER.find(z => z.id === e.zombieVariant) || ZOMBIE_ROSTER[0];
  e.zombieClock = (e.zombieClock || 0) + 1;
  const tick = e.zombieClock % spec.cycle;
  const windupStart = spec.cycle - spec.windup - spec.active;
  const activeStart = spec.cycle - spec.active;
  e.zombieState = tick >= activeStart ? "attack" : tick >= windupStart ? "windup" : "stalk";
  e.zombieTellProgress = e.zombieState === "windup" ? (tick - windupStart) / spec.windup : 0;
  const angle = Math.atan2(target.y - e.y, target.x - e.x);
  if (tick === windupStart) { e.zombieAim = angle; e.zombieAimX = target.x; e.zombieAimY = target.y; }
  const aim = Number.isFinite(e.zombieAim) ? e.zombieAim : angle;
  let speed = e.speed * speedMult;
  if (e.zombieState === "windup") speed *= 0.1;
  if (e.zombieState === "attack") speed *= spec.id === "sprinter" ? 5 : spec.id === "crawler" ? 2.6 : 1.7;
  if (spec.id === "bloater" || spec.id === "screecher") {
    if (e.zombieState === "attack") speed = 0;
    if (tick === activeStart) {
      const count = spec.id === "bloater" ? 3 : 8;
      for (let i = 0; i < count; i++) {
        const a = spec.id === "bloater" ? aim + (i - 1) * 0.24 : i * Math.PI * 2 / count;
        (gs.enemyBullets ||= []).push({ x: e.x, y: e.y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, life: 90, size: spec.id === "bloater" ? 8 : 5, color: spec.color, damage: spec.damage, sourceType: e.typeIndex, sourceName: `${e.name} ${spec.id === "bloater" ? "burp" : "paper scream"}`, sourceId: e.id ?? null });
      }
    }
  }
  const moveAngle = e.zombieState === "attack" ? aim : angle;
  e.x += Math.cos(moveAngle) * speed; e.y += Math.sin(moveAngle) * speed;
  const half = e.size / 2;
  for (const ob of gs.obstacles || []) {
    const nx = Math.max(ob.x, Math.min(e.x, ob.x + ob.w)), ny = Math.max(ob.y, Math.min(e.y, ob.y + ob.h));
    const dx = e.x - nx, dy = e.y - ny, d = Math.hypot(dx, dy);
    if (d < half + 2) {
      const a = d > 0 ? Math.atan2(dy, dx) : moveAngle + Math.PI;
      e.x = nx + Math.cos(a) * (half + 3); e.y = ny + Math.sin(a) * (half + 3);
      if (e.zombieState === "attack") e.zombieClock = 0;
    }
  }
  e.x = Math.max(half, Math.min(world.W - half, e.x)); e.y = Math.max(half, Math.min(world.H - half, e.y));
  e.hitFlash = Math.max(0, (e.hitFlash || 0) - 1); e.wobble = (e.wobble || 0) + 0.1;
}

