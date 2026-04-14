import { WAVE_ROUTES } from "../constants.js";

export function getRouteOptions(gs) {
  const nextWave = (gs.currentWave || 1) + 1;
  const nextIsAlreadyBoss = nextWave % 5 === 0;

  const pool = WAVE_ROUTES.filter((route) => {
    if (route.id === "standard") return false;
    if (route.id === "boss_fork" && nextIsAlreadyBoss) return false;
    return true;
  });

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return [WAVE_ROUTES[0], ...shuffled.slice(0, 2)];
}
