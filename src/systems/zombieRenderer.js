// Original articulated horror-comedy silhouettes. No downloads or emoji bodies.
const TAU = Math.PI * 2;
function oval(ctx, x, y, rx, ry, color, rotation = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, TAU); ctx.fill(); ctx.stroke();
}
function limb(ctx, points, width, color) {
  ctx.strokeStyle = "#142220"; ctx.lineWidth = width + 2; ctx.beginPath(); ctx.moveTo(...points[0]); for (const p of points.slice(1)) ctx.lineTo(...p); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function strokeZombieWarning(ctx) {
  const color = ctx.strokeStyle, width = ctx.lineWidth;
  ctx.strokeStyle = "#142220"; ctx.lineWidth = width + 3; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
export function drawZombieCreature(ctx, e, { frame = 0, reducedMotion = false, dying = false } = {}) {
  const r = (e.size || 36) / 2;
  const t = reducedMotion ? 0 : (e.zombieClock || frame) * 0.09;
  const phase = e.zombieState || "stalk", warning = phase === "windup", attack = phase === "attack";
  const bob = Math.sin(t) * (attack ? 2 : 1);
  const color = e.hitFlash > 0 ? "#ffffff" : e.color || "#9fcb8f";
  const id = e.zombieVariant;
  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (!dying && warning) {
    ctx.save(); ctx.rotate(e.zombieAim || 0);
    ctx.strokeStyle = "#ffe18a"; ctx.lineWidth = 2;
    if (id === "bloater") { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(125, -40); ctx.lineTo(125, 40); ctx.closePath(); }
    else if (id === "screecher") { ctx.beginPath(); ctx.arc(0, 0, r + 60, 0, TAU); }
    else { ctx.beginPath(); ctx.moveTo(r, -7); ctx.lineTo(r + 100, -7); ctx.lineTo(r + 100, 7); ctx.lineTo(r, 7); }
    strokeZombieWarning(ctx); ctx.restore();
    ctx.strokeStyle = "#ffe18a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * (e.zombieTellProgress || 0)); strokeZombieWarning(ctx);
    ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1be";
    ctx.strokeStyle = "#101b1a"; ctx.lineWidth = 4; ctx.strokeText(e.zombieTell || "LOOK OUT", 0, -r - 17); ctx.fillText(e.zombieTell || "LOOK OUT", 0, -r - 17);
  }
  ctx.translate(0, bob);
  ctx.scale(r / 20, r / 20);
  if (dying) { ctx.rotate(Math.sin(t) * 0.45); ctx.scale(1.15, 0.7); }
  ctx.strokeStyle = "#142220"; ctx.lineWidth = 1.8;
  if (id === "crawler") {
    // Disembodied jaw on finger legs; a loose toothbrush flaps behind it.
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const swing = Math.sin(t * 1.5 + i * 1.7 + side) * 5;
      limb(ctx, [[side * (7 + i * 3), 3], [side * (17 + i * 4), -4 + swing], [side * (22 + i * 3), 12 + swing]], 3, color);
    }
    ctx.strokeStyle = "#142220"; ctx.lineWidth = 1.8;
    oval(ctx, 0, 2, 16, warning ? 10 : 7, color);
    oval(ctx, 0, 3, 12, warning || attack ? 8 : 4, "#441f37");
    ctx.fillStyle = "#eee8ce";
    for (let i = 0; i < 6; i++) ctx.fillRect(-10 + i * 4, warning ? -4 : 0, 2.5, 4);
    oval(ctx, -7, -6, 5, 6, "#e4dbc7"); oval(ctx, 7, -6, 5, 6, "#e4dbc7");
    oval(ctx, -6, -7, 2, 3, "#ff634d"); oval(ctx, 7, -7, 2, 3, "#ff634d");
    limb(ctx, [[-10, 9], [-18, 18 + Math.sin(t) * 3]], 2, "#70c9ca");
    return ctx.restore();
  }
  const big = id === "bloater";
  const roll = id === "screecher";
  // Unequal legs and offset arm lengths make silhouettes readable at game scale.
  for (const side of [-1, 1]) {
    const stride = Math.sin(t + (side === -1 ? Math.PI : 0)) * (id === "sprinter" ? 7 : 4);
    limb(ctx, [[side * 6, 9], [side * 8 + stride, 17], [side * 12 + stride, 21]], 5, "#627e65");
    const reach = warning ? 8 : Math.sin(t + side) * 4;
    limb(ctx, [[side * 10, -7], [side * (17 + reach), -3], [side * (20 + reach), warning ? -14 : 6]], 4, color);
    ctx.strokeStyle = "#d9dbc2"; ctx.lineWidth = 1.5;
    for (let f = 0; f < 3; f++) { ctx.beginPath(); ctx.moveTo(side * (20 + reach), warning ? -14 : 6); ctx.lineTo(side * (22 + reach) + f - 1, warning ? -18 - f : 10 + f); ctx.stroke(); }
  }
  ctx.strokeStyle = "#142220"; ctx.lineWidth = 1.8;
  oval(ctx, 0, 2, big ? 19 + (warning ? Math.sin(t * 3) : 0) : 12, big ? 17 : 13, color);
  // Exposed rib cage versus bulging tank belly.
  if (big) {
    oval(ctx, 1, 7, 13, 10, "#af8450"); ctx.fillStyle = "#343424"; ctx.fillRect(-2, 6, 4, 3);
    ctx.fillStyle = "#eadfaf"; ctx.fillRect(-9, -3, 18, 3);
  } else if (roll) {
    ctx.fillStyle = "#eadfcc"; ctx.fillRect(-12, -8, 24, 20); ctx.strokeRect(-12, -8, 24, 20);
    ctx.strokeStyle = "#b9b1a1"; ctx.lineWidth = 1; for (let y = -4; y < 10; y += 4) { ctx.beginPath(); ctx.moveTo(-11, y); ctx.lineTo(11, y); ctx.stroke(); }
    // The final square trails like a tragically inadequate cape.
    ctx.fillStyle = "#ece5d5"; ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(22 + Math.sin(t) * 3, 13); ctx.lineTo(25, 22); ctx.lineTo(12, 19); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = "#dce5bf"; ctx.lineWidth = 2;
    for (let y = -3; y < 8; y += 5) { ctx.beginPath(); ctx.moveTo(-7, y); ctx.lineTo(0, y + 2); ctx.lineTo(7, y); ctx.stroke(); }
  }
  ctx.strokeStyle = "#142220"; ctx.lineWidth = 1.8;
  ctx.save(); ctx.translate(id === "shambler" ? Math.sin(t * 0.6) * 3 : 0, -15); ctx.rotate(id === "shambler" ? -0.16 : warning ? -0.2 : 0.08);
  oval(ctx, 0, 0, big ? 11 : 10, 10, color);
  // Sunken asymmetric glowing eyes, crooked teeth, hinged impossible jaw.
  oval(ctx, -4, -2, 4, 4, "#24302a"); oval(ctx, 4, -3, 3, 4, "#24302a");
  oval(ctx, -4, -2, 1.8, 2, "#ff866e"); oval(ctx, 4, -3, 1.4, 2, "#ffe18a");
  oval(ctx, 0, 5, 6, warning || attack ? 6 : 2.5, "#451f32");
  ctx.fillStyle = "#f6edc8"; for (let x = -4; x < 5; x += 3) ctx.fillRect(x, 2, 2, 3);
  if (id === "sprinter") {
    // Plunger helmet, bent handle and swinging chin strap.
    ctx.fillStyle = "#bf5646"; ctx.beginPath(); ctx.ellipse(0, -9, 12, 5, 0, Math.PI, TAU); ctx.fill(); ctx.stroke();
    limb(ctx, [[0, -13], [2 + Math.sin(t) * 2, -24]], 3, "#d6a870");
  } else if (id === "shambler") {
    ctx.fillStyle = "#c9b578"; ctx.fillRect(-10, -10, 19, 5); ctx.fillRect(-5, -15, 11, 6);
    ctx.fillStyle = "#355356"; ctx.fillRect(-4, -13, 3, 3);
  }
  ctx.restore();
  ctx.restore();
  if (!dying && e.health < e.maxHealth) {
    ctx.fillStyle = "#15211d"; ctx.fillRect(-r, r + 11, r * 2, 4);
    ctx.fillStyle = "#f6d178"; ctx.fillRect(-r, r + 11, r * 2 * Math.max(0, e.health / e.maxHealth), 4);
  }
}
export function drawSewerObjectives(ctx, gs, { reducedMotion = false, frame = 0 } = {}) {
  const s = gs.sewerRun; if (!s) return;
  const W = gs.arenaW || gs._W || 1280, H = gs.arenaH || gs._H || 720;
  ctx.save();
  // Rusted conduits connect the stations; the flood gauge stays at the edges.
  // Sludge channels and grates identify the sewer without obscuring threats.
  ctx.fillStyle = "rgba(3,20,24,.5)";
  ctx.fillRect(12, H * .38, W - 24, 28);
  ctx.fillRect(12, H * .62, W - 24, 28);
  ctx.strokeStyle = "rgba(115,199,165,.2)"; ctx.lineWidth = 1;
  for (let x = 24; x < W; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, H * .38 + 4); ctx.lineTo(x + 18, H * .38 + 4); ctx.moveTo(x + 9, H * .62 + 18); ctx.lineTo(x + 27, H * .62 + 18); ctx.stroke();
  }
  for (const x of [W * .12, W * .88]) {
    ctx.fillStyle = "#0b2023"; ctx.fillRect(x - 28, H * .51 - 18, 56, 36);
    ctx.strokeStyle = "#416c65"; ctx.lineWidth = 2;
    for (let dx = -21; dx <= 21; dx += 7) { ctx.beginPath(); ctx.moveTo(x + dx, H * .51 - 15); ctx.lineTo(x + dx, H * .51 + 15); ctx.stroke(); }
  }
  ctx.strokeStyle = "rgba(99,137,117,0.22)"; ctx.lineWidth = 18;
  ctx.beginPath(); ctx.moveTo(W * 0.23, H * 0.28); ctx.lineTo(W * 0.77, H * 0.28); ctx.moveTo(W * 0.5, H * 0.14); ctx.lineTo(W * 0.5, H * 0.72); ctx.stroke();
  ctx.strokeStyle = "rgba(11,35,27,0.8)"; ctx.lineWidth = 11; ctx.stroke();
  const flood = Math.min(1, s.frames / (240 * 60));
  ctx.fillStyle = flood > 0.8 ? "rgba(223,127,75,0.35)" : "rgba(133,194,151,0.24)";
  ctx.fillRect(4, H * (1 - flood), 5, H * flood); ctx.fillRect(W - 9, H * (1 - flood), 5, H * flood);
  ctx.restore();
  const points = s.phase === "extraction" || s.phase === "escaped" ? [s.hatch] : s.pumps;
  for (const [i, point] of points.entries()) {
    const hatch = points[0] === s.hatch;
    const active = hatch || i === s.activePump;
    const color = point.complete ? "#8ed0aa" : active ? s.holdBlocked ? "#ff927c" : "#f6d178" : "#86a49c";
    ctx.save(); ctx.translate(point.x, point.y);
    ctx.strokeStyle = color; ctx.lineWidth = active ? 3 : 1.5; ctx.fillStyle = "rgba(15,35,30,0.55)";
    ctx.setLineDash(active ? [10, 5] : []); ctx.beginPath(); ctx.arc(0, 0, point.radius, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#263e37"; ctx.fillRect(-21, -21, 42, 42); ctx.strokeRect(-21, -21, 42, 42);
    if (hatch) { for (let x = -14; x <= 14; x += 7) { ctx.beginPath(); ctx.moveTo(x, -17); ctx.lineTo(x, 17); ctx.stroke(); } }
    else {
      ctx.save(); if (!reducedMotion && point.complete) ctx.rotate(frame * 0.03);
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke(); ctx.restore();
    }
    ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, point.radius + 6, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, point.charge / (hatch ? 300 : 360))); ctx.stroke();
    ctx.font = "bold 12px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#faf3d6";
    ctx.strokeStyle = "#0a1713"; ctx.lineWidth = 4;
    const label = hatch ? "ESCAPE HATCH" : point.complete ? "PUMP ONLINE" : point.label;
    ctx.strokeText(label, 0, point.radius + 25); ctx.fillText(label, 0, point.radius + 25);
    if (active && !point.complete) { ctx.font = "10px monospace"; const help = s.holdBlocked ? "CLEAR THE RING" : hatch ? "HOLD HERE · 5 SECONDS" : "HOLD HERE · 6 SLUDGE"; ctx.strokeText(help, 0, point.radius + 40); ctx.fillText(help, 0, point.radius + 40); }
    ctx.restore();
  }
}


