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

export function buildGhostDeathReadout(ghostData, enemies = []) {
  if (!Array.isArray(ghostData) || ghostData.length < 4) return null;
  const finalPoint = ghostData[ghostData.length - 1] || {};
  const finalType = finalPoint.killedByType;
  const enemy = finalType == null ? null : enemies[Number(finalType)] || null;
  const window = ghostData.slice(-Math.min(90, ghostData.length));
  let distance = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < window.length; i++) {
    const x = Number(window[i]?.x) || 0;
    const y = Number(window[i]?.y) || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (i > 0) {
      const px = Number(window[i - 1]?.x) || 0;
      const py = Number(window[i - 1]?.y) || 0;
      distance += Math.hypot(x - px, y - py);
    }
  }
  const spread = Math.hypot(maxX - minX, maxY - minY);
  const killer = enemy?.name || "Unknown threat";
  if (distance < 24 || spread < 18) {
    return {
      mood: "pinned",
      headline: `Pinned by ${killer}`,
      detail: "Final path barely moved. Dash earlier or cut across open space before the threat closes.",
    };
  }
  if (distance > 220 && spread > 120) {
    return {
      mood: "sprinting",
      headline: `Outrun by ${killer}`,
      detail: "Final path covered a lot of ground. Your route had speed, but not enough angle change to shake the chase.",
    };
  }
  if (spread < 70) {
    return {
      mood: "trapped",
      headline: `Boxed in by ${killer}`,
      detail: "Final movement looped inside a tight pocket. Break the circle before elites or ranged shots seal it.",
    };
  }
  return {
    mood: "drifting",
    headline: `Caught by ${killer}`,
    detail: "Final route drifted across pressure instead of cutting through it. Commit to one escape lane sooner.",
  };
}
