import { WAVE_ROUTES } from "../constants.js";

export function getRouteOptions(gs, rng = Math.random) {
  const nextWave = (gs.currentWave || 1) + 1;
  const nextIsAlreadyBoss = nextWave % 5 === 0;

  const pool = WAVE_ROUTES.filter((route) => {
    if (route.id === "standard") return false;
    if (route.id === "boss_fork" && nextIsAlreadyBoss) return false;
    return true;
  });

  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return [WAVE_ROUTES[0], ...shuffled.slice(0, 2)];
}
