// backgroundLayer.js — prerendered static arena layers (S155).
//
// The arena background (gradient, floor zones, terrain decals, props, grid,
// vignette) and the obstacle blocks are immutable for a whole run, but were
// repainted from primitives every frame. Each is now rendered once into an
// offscreen canvas and blitted with a single drawImage per frame. Layers are
// keyed on everything that can change their pixels (theme, boss palette, size,
// DPR, perf step, prop-sprite readiness) and rebuild automatically on a key
// mismatch — a rare event (run start, resize, boss transition).
//
// The underlay canvas is also the persistence surface for combat decals
// (scorch rings, splats, pocks): stamping draws straight into the cached
// canvas, so persistence costs zero per-frame work. Stamps are kept as data on
// gs so a rebuild (e.g. resize) can replay them.
//
// This module only READS the layout arrays produced by arenaEnvironment.js —
// it must never generate layout or consume the seeded RNG stream (replay
// contract).

import { getThemePropSprite } from "../utils/visualAssetLibrary.js";

const MAX_DECALS = 60;

function paintUnderlay(ctx, W, H, gs, theme, retroCharacters) {
  // Background — per-theme radial gradient
  const [bgC0, bgC1] = gs.bossWave ? ["#1a0000", "#0e0000"] : theme.bg;
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, bgC0);
  bg.addColorStop(1, bgC1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Floor zone panels
  const fzFill = gs.bossWave ? "rgba(82,22,22," : theme.fzFill;
  const fzTile = gs.bossWave ? "rgba(112,30,30," : theme.fzTile;
  (gs.floorZones || []).forEach(fz => {
    ctx.save(); ctx.translate(fz.x, fz.y); ctx.rotate(fz.rot);
    const ba = fz.alpha * 3.35 * (gs.bossWave ? 0.75 : 1);
    ctx.globalAlpha = ba;
    ctx.fillStyle = fzFill + "1)";
    ctx.beginPath(); ctx.roundRect(-fz.rx, -fz.ry, fz.rx * 2, fz.ry * 2, 5); ctx.fill();
    ctx.globalAlpha = ba * 0.5;
    ctx.strokeStyle = fzTile + "1)"; ctx.lineWidth = 0.7;
    const TS = 26;
    for (let tx = -fz.rx + TS; tx < fz.rx; tx += TS) { ctx.beginPath(); ctx.moveTo(tx, -fz.ry); ctx.lineTo(tx, fz.ry); ctx.stroke(); }
    for (let ty = -fz.ry + TS; ty < fz.ry; ty += TS) { ctx.beginPath(); ctx.moveTo(-fz.rx, ty); ctx.lineTo(fz.rx, ty); ctx.stroke(); }
    ctx.globalAlpha = ba * 0.65; ctx.strokeStyle = fzTile + "1)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-fz.rx, -fz.ry, fz.rx * 2, fz.ry * 2, 5); ctx.stroke();
    ctx.globalAlpha = 1; ctx.restore();
  });

  // Terrain decorations
  const TC = gs.bossWave ? { s: "#3a0808", c: "rgba(90,20,20,0.30)", r: "#4a2020", t: "#2a0a0a" } : theme.tc;
  (gs.terrain || []).forEach(t => {
    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.type === 0) { // stain / puddle
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = TC.s;
      ctx.beginPath(); ctx.ellipse(0, 0, t.size, t.size * 0.55, t.rot, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 1) { // floor cracks
      ctx.strokeStyle = TC.c;
      ctx.lineWidth = 1;
      [[t.rot, t.size * 0.9], [t.rot + 2.1, t.size * 0.6], [t.rot + 3.9, t.size * 0.45]].forEach(([a, l]) => {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5);
        ctx.lineTo(Math.cos(a + 0.55) * l * 0.3, Math.sin(a + 0.55) * l * 0.3); ctx.stroke();
      });
    } else if (t.type === 2) { // rubble / debris dots
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = TC.r;
      for (let di = 0; di < 5; di++) {
        const da = t.rot + di * 1.26, dr = t.size * (0.28 + Math.abs(Math.sin(di * 2.3)) * 0.25);
        const ds = 1.5 + Math.abs(Math.sin(di + t.rot)) * 3;
        ctx.beginPath(); ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, ds, 0, Math.PI * 2); ctx.fill();
      }
    } else { // worn tile / scuff mark
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = TC.t;
      ctx.save(); ctx.rotate(t.rot);
      ctx.fillRect(-t.size * 0.5, -t.size * 0.3, t.size, t.size * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  // Props (themed decorative furniture — no collision)
  (gs.props || []).forEach(pr => {
    ctx.save(); ctx.translate(pr.x, pr.y);
    ctx.globalAlpha = gs.bossWave ? 0.24 : 0.42;
    const prSprite = (!retroCharacters && pr.spriteKey) ? getThemePropSprite(pr.spriteKey) : null;
    if (prSprite) {
      const prSize = 28 * (pr.scale || 1);
      ctx.rotate(pr.rot || 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(prSprite.image, prSprite.x, prSprite.y, prSprite.width, prSprite.height, -prSize / 2, -prSize / 2, prSize, prSize);
    } else {
      ctx.font = `${Math.floor(14 * (pr.scale || 1))}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pr.emoji, 0, 0);
    }
    ctx.globalAlpha = 1; ctx.restore();
  });

  // 50px grid
  ctx.strokeStyle = gs.bossWave ? "rgba(180,50,50,0.08)" : theme.grid;
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy < H; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

  // Theme vignette (skipped on boss waves, matching the live path)
  if (!gs.bossWave) {
    const vc = theme.vignette;
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.72);
    vig.addColorStop(0, `rgba(${vc},0)`);
    vig.addColorStop(1, `rgba(${vc},0.22)`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
}

function paintObstacles(ctx, gs, theme, perfStep) {
  const wt = gs.bossWave
    ? ["rgba(76,20,20,0.95)", "rgba(165,45,45,0.75)", "#CC3030", [135, 32, 32]]
    : theme.wall;
  (gs.obstacles || []).forEach(ob => {
    // Cast shadow
    ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(ob.x + 5, ob.y + 5, ob.w, ob.h);
    // Main fill
    ctx.fillStyle = wt[0]; ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    const [sr, sg, sb] = wt[3];
    // Lit top face
    ctx.fillStyle = `rgba(${Math.min(255, sr + 46)},${Math.min(255, sg + 46)},${Math.min(255, sb + 46)},0.5)`;
    ctx.fillRect(ob.x, ob.y, ob.w, Math.min(6, ob.h * 0.18));
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(ob.x, ob.y + ob.h - Math.min(4, ob.h * 0.12), ob.w, Math.min(4, ob.h * 0.12));
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.22)`; ctx.lineWidth = 1;
    const isH = ob.w > ob.h;
    const step = isH ? Math.max(6, Math.floor(ob.h / 3)) : Math.max(6, Math.floor(ob.w / 3));
    if (isH) { for (let sy = ob.y + step; sy < ob.y + ob.h - 1; sy += step) { ctx.beginPath(); ctx.moveTo(ob.x + 2, sy); ctx.lineTo(ob.x + ob.w - 2, sy); ctx.stroke(); } }
    else      { for (let sx = ob.x + step; sx < ob.x + ob.w - 1; sx += step) { ctx.beginPath(); ctx.moveTo(sx, ob.y + 2); ctx.lineTo(sx, ob.y + ob.h - 2); ctx.stroke(); } }
    // Top-left 3D highlight edge
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = `rgba(${Math.min(255, sr + 50)},${Math.min(255, sg + 50)},${Math.min(255, sb + 50)},0.85)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ob.x, ob.y + ob.h); ctx.lineTo(ob.x, ob.y); ctx.lineTo(ob.x + ob.w, ob.y); ctx.stroke();
    ctx.globalAlpha = 1;
    // Glow outline (shadowBlur is a no-op at perf step ≥2 via the ctx override,
    // but offscreen contexts don't carry that override — honor it directly)
    ctx.strokeStyle = wt[1]; ctx.lineWidth = 2; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
    if (perfStep < 2) {
      ctx.shadowColor = wt[2]; ctx.shadowBlur = 8; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h); ctx.shadowBlur = 0;
    }
  });
}

function paintDecal(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.rot || 0);
  ctx.globalAlpha = d.alpha ?? 0.3;
  if (d.kind === "scorch") {
    const g = ctx.createRadialGradient(0, 0, d.size * 0.15, 0, 0, d.size);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.7, "rgba(20,10,5,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, d.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = (d.alpha ?? 0.3) * 0.8;
    ctx.strokeStyle = "rgba(40,25,10,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, d.size * 0.7, 0, Math.PI * 2); ctx.stroke();
  } else if (d.kind === "splat") {
    ctx.fillStyle = d.color || "rgba(90,60,30,0.6)";
    ctx.beginPath(); ctx.ellipse(0, 0, d.size, d.size * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = (d.seed || 0) + i * 1.7;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d.size * 1.1, Math.sin(a) * d.size * 0.8, d.size * (0.14 + (i % 3) * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
  } else { // pock — small impact chip
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.arc(0, 0, d.size, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.arc(-d.size * 0.25, -d.size * 0.25, d.size * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function makeLayer(W, H, dpr) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(W * dpr));
  c.height = Math.max(1, Math.round(H * dpr));
  const lctx = c.getContext("2d");
  lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas: c, ctx: lctx };
}

// Count of props whose atlas sprite has finished loading — part of the cache
// key so the underlay repaints once when the theme-prop atlas arrives.
function propSpriteReadyCount(gs, retroCharacters) {
  if (retroCharacters) return 0;
  let n = 0;
  for (const pr of gs.props || []) {
    if (pr.spriteKey && getThemePropSprite(pr.spriteKey)) n++;
  }
  return n;
}

/**
 * Returns { underlay, obstacles } canvases for the current arena, rebuilding
 * them only when the cache key changes. Call every frame; blit with drawImage.
 */
export function getArenaLayers(gs, W, H, dpr, { theme, perfStep = 0, retroCharacters = false } = {}) {
  const key = [
    theme?.name, gs.bossWave ? 1 : 0, W, H, dpr, perfStep >= 2 ? 1 : 0,
    retroCharacters ? 1 : 0,
    (gs.obstacles || []).length, (gs.props || []).length,
    propSpriteReadyCount(gs, retroCharacters),
    gs._arenaLayerEpoch || 0,
  ].join(":");
  let cache = gs._arenaLayers;
  if (!cache || cache.key !== key) {
    const underlay = makeLayer(W, H, dpr);
    const obstacles = makeLayer(W, H, dpr);
    paintUnderlay(underlay.ctx, W, H, gs, theme, retroCharacters);
    paintObstacles(obstacles.ctx, gs, theme, perfStep);
    // Replay persisted decals onto the fresh underlay
    for (const d of gs._arenaDecals || []) paintDecal(underlay.ctx, d);
    cache = { key, underlay, obstacles };
    gs._arenaLayers = cache;
  }
  return cache;
}

/**
 * Persist a combat decal: stored on gs (bounded ring) and stamped directly
 * into the cached underlay so it costs nothing per frame afterwards.
 * kinds: "scorch" (explosions), "splat" (big deaths), "pock" (impacts).
 */
export function stampArenaDecal(gs, decal) {
  if (!gs) return;
  const ring = gs._arenaDecals || (gs._arenaDecals = []);
  ring.push(decal);
  if (ring.length > MAX_DECALS) ring.shift();
  const cache = gs._arenaLayers;
  if (cache?.underlay?.ctx) paintDecal(cache.underlay.ctx, decal);
}

// Force a rebuild on the next frame (e.g. after clearing decals).
export function invalidateArenaLayers(gs) {
  if (gs) gs._arenaLayerEpoch = (gs._arenaLayerEpoch || 0) + 1;
}
