// Generates a shareable run DNA card image using OffscreenCanvas.
// Receives: { weaponKills, weaponColors, weaponEmojis, wave, score, kills, runArc, buildGrade, replayProofTier }
// Posts back: { blob } — PNG blob of the card

self.onmessage = function(e) {
  const { weaponKills = [], weaponColors = [], weaponEmojis = [], wave = 0, score = 0, kills = 0, runArc = '', buildGrade = 'F', replayProofTier = null } = e.data || {};

  const W = 480, H = 160;
  let canvas;
  try {
    canvas = new OffscreenCanvas(W, H);
  } catch {
    self.postMessage({ error: 'OffscreenCanvas unavailable' });
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) { self.postMessage({ error: 'no context' }); return; }

  // Background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = '#FFD70044';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // Header
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('CALL OF DOODIE — RUN DNA', 12, 22);

  // Run arc label
  if (runArc) {
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(runArc, W - 12, 22);
  }

  // DNA bar
  const total = weaponKills.reduce((s, k) => s + (k || 0), 0);
  const barX = 12, barY = 32, barW = W - 24, barH = 16;
  if (total > 0) {
    let curX = barX;
    for (let i = 0; i < weaponKills.length; i++) {
      const k = weaponKills[i] || 0;
      if (!k) continue;
      const segW = (k / total) * barW;
      ctx.fillStyle = weaponColors[i] || '#888';
      ctx.fillRect(curX, barY, segW, barH);
      curX += segW;
    }
  } else {
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
  }

  // DNA legend: top 4 weapons
  const used = weaponKills
    .map((k, i) => ({ k: k || 0, i }))
    .filter(w => w.k > 0)
    .sort((a, b) => b.k - a.k)
    .slice(0, 4);
  ctx.textAlign = 'left';
  used.forEach(({ k, i }, idx) => {
    const lx = 12 + idx * 110;
    ctx.fillStyle = weaponColors[i] || '#888';
    ctx.fillRect(lx, 56, 8, 8);
    ctx.fillStyle = '#AAA';
    ctx.font = '9px monospace';
    ctx.fillText(`${weaponEmojis[i] || ''} ${total > 0 ? Math.round((k / total) * 100) : 0}%`, lx + 12, 64);
  });

  // Stats row
  const stats = [
    ['WAVE', 'W' + wave],
    ['KILLS', String(kills)],
    ['SCORE', score.toLocaleString()],
    ['GRADE', buildGrade || '?'],
  ];
  if (replayProofTier) stats.push(['PROOF', replayProofTier]);

  stats.forEach(([label, val], i) => {
    const sx = 12 + i * 94;
    ctx.fillStyle = '#555';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, sx, 90);
    ctx.fillStyle = '#EEE';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(val, sx, 106);
  });

  // Footer
  ctx.fillStyle = '#444';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('callofdoodie.wtf', W / 2, H - 10);

  canvas.convertToBlob({ type: 'image/png' }).then(blob => {
    self.postMessage({ blob });
  }).catch(err => {
    self.postMessage({ error: String(err) });
  });
};
