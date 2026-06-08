export function buildGhostKillerMarker(ghostData, enemies = [], canvasSize = { width: 280, height: 140 }) {
  if (!Array.isArray(ghostData) || ghostData.length < 1) return null;
  const finalPoint = ghostData[ghostData.length - 1];
  const finalType = finalPoint?.killedByType;
  if (finalType == null) return null;

  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  ghostData.forEach((pt) => {
    minX = Math.min(minX, Number(pt.x) || 0);
    minY = Math.min(minY, Number(pt.y) || 0);
    maxX = Math.max(maxX, Number(pt.x) || 0);
    maxY = Math.max(maxY, Number(pt.y) || 0);
  });

  const width = canvasSize?.width || 280;
  const height = canvasSize?.height || 140;
  const rangeX = Math.max(maxX - minX, 100);
  const rangeY = Math.max(maxY - minY, 100);
  const x = ((Number(finalPoint.x) || 0) - minX) / rangeX * (width - 20) + 10;
  const y = ((Number(finalPoint.y) || 0) - minY) / rangeY * (height - 20) + 10;
  const enemy = enemies[Number(finalType)] || {};

  return {
    x: Math.max(14, Math.min(width - 14, x)),
    y: Math.max(16, Math.min(height - 16, y)),
    type: Number(finalType),
    emoji: enemy.emoji || "!",
    label: enemy.name || "Unknown killer",
    color: enemy.color || "#FF6666",
  };
}
