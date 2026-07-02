// ── REMATCH drill helpers (S112) ─────────────────────────────────────────────
// Pure logic for the death-wave rematch: restart at the wave that killed you,
// on the same seed, as a leaderboard-excluded practice run. Boss waves route
// through the previous wave so the game loop's native boss setup (cutscene,
// plan, banner) still runs.

// Death wave → wave the drill starts on. Returns null when a rematch adds
// nothing (death on wave 1 is just a normal restart).
export function resolveRematchStartWave(deathWave) {
  const wave = Math.floor(Number(deathWave));
  if (!isFinite(wave) || wave <= 1) return null;
  // Boss waves (every 5th) need the wave-advance path to set up the boss;
  // start one wave earlier as a warm-up that flows into the boss naturally.
  if (wave % 5 === 0) return wave - 1;
  return wave;
}

// Mirrors the in-loop wave sizing formula so a drill wave is the same size
// the player actually faced (App.jsx wave-advance block).
export function getMaxEnemiesForWave(wave, waveEnemyMult = 1) {
  const wv = Math.max(1, Math.floor(Number(wave) || 1));
  const waveMax = wv >= 50 ? 100 : wv >= 40 ? 80 : 60;
  return Math.min(Math.floor((5 + wv * 3) * (waveEnemyMult || 1)), waveMax);
}

// Non-boss waves completed before reaching `wave` (bosses land every 5th);
// keeps the wave-director theme rotation roughly in phase for a mid-run start.
export function estimateNonBossWaveCount(wave) {
  const wv = Math.max(1, Math.floor(Number(wave) || 1));
  return Math.max(1, wv - Math.floor(wv / 5));
}

// Survivability kit so a fresh loadout isn't hopeless against wave-scaled
// enemies. Coins route power through the game's own wave-shop economy instead
// of hand-picking upgrades for the player.
export function buildRematchKit(startWave) {
  const wave = Math.floor(Number(startWave));
  if (!isFinite(wave) || wave <= 1) return null;
  return {
    startWave: wave,
    maxHealthBonus: Math.min(100, (wave - 1) * 5),
    coins: Math.min(400, wave * 15),
  };
}
