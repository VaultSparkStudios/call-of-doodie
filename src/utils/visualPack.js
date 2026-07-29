export const VISUAL_PACKS = Object.freeze({
  MODERN: "modern",
  RETRO: "retro",
});

export const VISUAL_PACK_OPTIONS = Object.freeze([
  { id: VISUAL_PACKS.MODERN, label: "Modern", shortLabel: "Modern Atlas", description: "Current illustrated character atlas." },
  { id: VISUAL_PACKS.RETRO, label: "Retro", shortLabel: "Retro Original", description: "The original circle-and-emoji character art." },
]);

export function normalizeVisualPack(value) {
  return value === VISUAL_PACKS.RETRO ? VISUAL_PACKS.RETRO : VISUAL_PACKS.MODERN;
}

export function buildRetroCharacterManifest(enemyTypes = []) {
  return {
    schemaVersion: "retro-character-pack-v1",
    source: "first-playable-visual-language",
    player: { id: "player", renderer: "retro-player-circle" },
    enemies: enemyTypes.map((enemy, typeIndex) => ({
      id: `enemy-${typeIndex}`,
      typeIndex,
      name: enemy?.name || `Enemy ${typeIndex}`,
      emoji: enemy?.emoji || "?",
      renderer: "retro-enemy-circle-emoji",
    })),
    syntheticCharacters: [
      { id: "splitter-shard", inheritsTypeIndex: 16, renderer: "retro-enemy-circle-emoji" },
    ],
  };
}

export function drawRetroEnemyCharacter(ctx, enemy) {
  const radius = enemy.size / 2;
  ctx.fillStyle = enemy.hitFlash > 0 ? "#FFF" : enemy.color;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 2; ctx.stroke();
  if (enemy.ranged) {
    ctx.strokeStyle = `rgba(255,100,100,${0.3 + Math.sin(Date.now() / 300) * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, radius + 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.font = `${enemy.size * 0.55}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(enemy.emoji || "?", 0, -2);
}

export function drawRetroPlayerCharacter(ctx, { angle = 0, weapon, muzzleFlash = 0 } = {}) {
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = "#666"; ctx.fillRect(10, -3, 20, 6);
  ctx.fillStyle = weapon?.color || "#FFD700"; ctx.fillRect(25, -4, 8, 8);
  if (muzzleFlash > 0) {
    ctx.fillStyle = `rgba(255,255,100,${muzzleFlash / 4})`;
    ctx.beginPath(); ctx.arc(35, 0, 10 + muzzleFlash * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#44AA44"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#2D7D2D"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#336633"; ctx.beginPath(); ctx.arc(0, 0, 12, -Math.PI * 0.8, Math.PI * 0.8); ctx.fill();
  ctx.restore();
}
