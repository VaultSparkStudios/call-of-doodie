import { cosmeticRandom } from "./runRng.js";

export const MAX_PARTICLES = 150;
export const MAX_FLOAT_TEXTS = 30;

function unitRandom(rng) {
  const value = Number(rng());
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

// Particle kinds (S155): "glow" (default shrinking circle), "spark" (line
// segment along velocity), "smoke" (growing, fading, drifts up), "debris"
// (rotating chip with gravity), "casing" (small ejected rect with gravity).
// Physics per kind lives in transientLifecycle.js; rendering in drawGame.js.
export function addParticles(gs, x, y, color, count = 8, rng = cosmeticRandom, kind = "glow") {
  if (!Array.isArray(gs?.particles)) return 0;
  const space = MAX_PARTICLES - gs.particles.length;
  if (space <= 0) return 0;
  const scaledCount = Math.max(1, Math.floor(Number(count || 0) * (Number(gs.settParticlesMult) || 1)));
  const amount = Math.min(scaledCount, space);
  for (let index = 0; index < amount; index++) {
    const angle = unitRandom(rng) * Math.PI * 2;
    const speed = kind === "smoke" ? 0.3 + unitRandom(rng) * 1.2 : 1 + unitRandom(rng) * 4;
    const particle = {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + unitRandom(rng) * 20,
      maxLife: 50,
      color,
      size: 2 + unitRandom(rng) * 4,
      kind,
    };
    if (kind === "smoke") {
      particle.vy -= 0.4 + unitRandom(rng) * 0.5; // drifts upward
      particle.life = 40 + unitRandom(rng) * 25;
      particle.maxLife = 65;
    } else if (kind === "debris" || kind === "casing") {
      particle.rot = unitRandom(rng) * Math.PI * 2;
      particle.rotVel = (unitRandom(rng) - 0.5) * 0.5;
      particle.gravity = 0.18;
      particle.vy -= 1.5 + unitRandom(rng) * 1.5; // pop upward, then fall
      if (kind === "casing") {
        particle.size = 1.5 + unitRandom(rng) * 1.2;
        particle.life = 22 + unitRandom(rng) * 10;
        particle.maxLife = 32;
      }
    }
    gs.particles.push(particle);
  }
  return amount;
}

export function addText(gs, x, y, text, color = "#FFF", big = false) {
  if (!Array.isArray(gs?.floatingTexts)) return false;
  if (gs.floatingTexts.length >= MAX_FLOAT_TEXTS) {
    if (!big) return false;
    gs.floatingTexts.splice(0, 3);
  }
  const isQuote = big === "quote";
  gs.floatingTexts.push({
    x, y, text, color,
    life: isQuote ? 110 : big ? 90 : 60,
    vy: isQuote ? -0.65 : big ? -1 : -2,
    big: big === true,
    quote: isQuote,
  });
  return true;
}
