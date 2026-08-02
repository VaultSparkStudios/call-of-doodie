import { cosmeticRandom } from "./runRng.js";

export const MAX_PARTICLES = 150;
export const MAX_FLOAT_TEXTS = 30;

function unitRandom(rng) {
  const value = Number(rng());
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

export function addParticles(gs, x, y, color, count = 8, rng = cosmeticRandom) {
  if (!Array.isArray(gs?.particles)) return 0;
  const space = MAX_PARTICLES - gs.particles.length;
  if (space <= 0) return 0;
  const scaledCount = Math.max(1, Math.floor(Number(count || 0) * (Number(gs.settParticlesMult) || 1)));
  const amount = Math.min(scaledCount, space);
  for (let index = 0; index < amount; index++) {
    const angle = unitRandom(rng) * Math.PI * 2;
    const speed = 1 + unitRandom(rng) * 4;
    gs.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + unitRandom(rng) * 20,
      maxLife: 50,
      color,
      size: 2 + unitRandom(rng) * 4,
    });
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
