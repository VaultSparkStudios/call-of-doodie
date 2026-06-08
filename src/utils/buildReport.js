function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function letter(score) {
  if (score >= 88) return "A";
  if (score >= 72) return "B";
  return "C";
}

function labelFor({ grade, ammoScore, survivalScore, synergyScore }) {
  if (grade === "A" && synergyScore >= 75) return "BORN SOLDIER";
  if (ammoScore < 45) return "TRIGGER HAPPY";
  if (survivalScore < 45) return "GLASS CANNON";
  if (synergyScore < 35) return "LONE WOLF LOADOUT";
  return grade === "A" ? "FIELD PROMOTION" : grade === "B" ? "COMBAT READY" : "BOOT CAMP MATERIAL";
}

export function computeBuildGrade({
  activeSynergies = [],
  weaponKills = [],
  weaponAmmos = [],
  totalShots = null,
  wave = 1,
  level = 1,
  kills = 0,
} = {}) {
  const synergyCount = Array.isArray(activeSynergies) ? activeSynergies.length : num(activeSynergies);
  const synergyScore = clamp01(synergyCount / 3) * 100;

  const killTotal = Math.max(0, weaponKills.reduce((sum, k) => sum + num(k), 0) || num(kills));
  const inferredSpent = Array.isArray(weaponAmmos)
    ? weaponAmmos.reduce((sum, ammo) => sum + Math.max(0, 30 - num(ammo, 30)), 0)
    : 0;
  const shotCount = Math.max(killTotal, totalShots == null ? inferredSpent : num(totalShots));
  const ammoScore = shotCount > 0 ? clamp01(killTotal / shotCount) * 100 : killTotal > 0 ? 72 : 48;

  const expectedWave = Math.max(3, num(level, 1) * 2.2);
  const survivalScore = clamp01(num(wave, 1) / expectedWave) * 100;

  const score = Math.round((synergyScore * 0.34) + (ammoScore * 0.28) + (survivalScore * 0.38));
  const grade = letter(score);
  return {
    grade,
    label: labelFor({ grade, ammoScore, survivalScore, synergyScore }),
    score,
    breakdown: [
      { id: "synergy", label: "SYNERGY", value: Math.round(synergyScore) },
      { id: "ammo", label: "AMMO DISCIPLINE", value: Math.round(ammoScore) },
      { id: "survival", label: "SURVIVAL", value: Math.round(survivalScore) },
    ],
  };
}
