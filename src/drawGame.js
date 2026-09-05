import { WEAPONS } from "./constants.js";
import { getMusicBPM } from "./audio/soundFacade.js";
import { buildWeaponAccent, drawShadedOrb, drawWeaponBarrel } from "./utils/visualPrimitives.js";
import { getRuntimeCharacterSprite, getRuntimeEnemySprite, getRuntimeZombieSprite, getWeaponSprite, getWorldObjectSprite } from "./utils/visualAssetLibrary.js";
import { motionPhaseSeed, resolveSpriteDeath, resolveSpriteMotion } from "./systems/spriteMotion.js";
import { getPlayerRenderPose } from "./utils/playerRenderPose.js";
import { drawRetroEnemyCharacter, drawRetroPlayerCharacter, VISUAL_PACKS } from "./utils/visualPack.js";
import { drawOffscreenThreatArrows, getOffscreenThreatArrows } from "./utils/offscreenIndicators.js";
import { getArenaLayers } from "./systems/backgroundLayer.js";

// Per-enemy body-shape coordinate tables (hoisted out of the draw loop —
// these were re-allocated as fresh array literals for every enemy, every
// frame; the values never change, only where they're multiplied by `r`).
const SIGN_PAIR = [-1, 1];
const CROC_SCALE_DOTS = [[-0.38, 0], [0, -0.38], [0.38, 0], [0, 0.38], [0, 0]];
const CLIPBOARD_ROW_OFFSETS = [-0.18, 0.03, 0.24];
const CRYPTO_ZIGZAG_POINTS = [[-0.44, -0.08], [-0.22, 0.22], [0, -0.24], [0.22, 0.08], [0.44, -0.28]];
const KAREN_CHEVRON_ROWS = [0.36, 0.1];

// S155 — per-weapon projectile identity (index-aligned with WEAPONS).
// shape: orb (default) | bolt (velocity-aligned capsule) | pellet (small hot
// core) | rocket (finned body + exhaust) | spark (4-point star) | note
// (kazoo eighth-note). trailMult scales the shared tracer length.
const WEAPON_PROJECTILE = [
  { shape: "orb",    trailMult: 1.0 },  // 0 Banana Blaster
  { shape: "rocket", trailMult: 2.2 },  // 1 RPG
  { shape: "pellet", trailMult: 0.7 },  // 2 Minigun
  { shape: "bolt",   trailMult: 1.0 },  // 3 Plunger
  { shape: "bolt",   trailMult: 3.0, stretch: 3.2 }, // 4 Sniper-ator
  { shape: "pellet", trailMult: 1.4 },  // 5 Squirt Gun
  { shape: "orb",    trailMult: 1.0, confetti: true }, // 6 Confetti Cannon
  { shape: "spark",  trailMult: 0.8 },  // 7 Shock Zapper
  null,                                  // 8 Boomerang (dedicated path)
  { shape: "bolt",   trailMult: 2.6, stretch: 4 }, // 9 Railgun
  { shape: "pellet", trailMult: 1.0, ring: true }, // 10 Ricochet Pistol
  { shape: "note",   trailMult: 1.2 },  // 11 Nuclear Kazoo
];

// S145 — one identity table per arena theme (was seven parallel arrays
// re-allocated inside the frame function). Order: office, bunker, factory,
// ruins, desert, forest, space, arctic — indexed by gs.mapTheme.
export const ARENA_THEMES = [
  { name: "office",  bg: ["#282849", "#10101f"], fzFill: "rgba(62,55,92,",  fzTile: "rgba(88,76,125,",  tc: { s: "#1c1c3c", c: "rgba(70,70,115,0.28)", r: "#2a2a4e", t: "#20203e" }, grid: "rgba(100,100,180,0.06)", border: "rgba(80,80,220,",  vignette: "60,60,120",  wall: ["rgba(50,50,90,0.95)", "rgba(105,105,190,0.75)", "#6060CC", [88, 88, 155]],  ambient: ["255,255,255", 0.05, 9000] },
  { name: "bunker",  bg: ["#123012", "#071207"], fzFill: "rgba(35,62,35,",  fzTile: "rgba(50,85,50,",   tc: { s: "#0c200c", c: "rgba(40,100,40,0.28)", r: "#182818", t: "#122012" }, grid: "rgba(55,120,55,0.06)",   border: "rgba(55,160,55,",  vignette: "20,55,20",   wall: ["rgba(30,56,30,0.95)", "rgba(65,125,65,0.75)", "#42AA42", [52, 102, 52]],    ambient: ["180,220,160", 0.05, 11000] },
  { name: "factory", bg: ["#33220e", "#140d05"], fzFill: "rgba(60,54,36,",  fzTile: "rgba(82,74,48,",   tc: { s: "#201408", c: "rgba(100,88,40,0.28)", r: "#281a08", t: "#1e1408" }, grid: "rgba(140,115,55,0.06)",  border: "rgba(175,145,55,", vignette: "80,55,15",   wall: ["rgba(56,50,34,0.95)", "rgba(125,110,68,0.75)", "#A89540", [102, 88, 52]],   ambient: ["255,180,80", 0.07, 6000] },
  { name: "ruins",   bg: ["#2a1b0d", "#100b05"], fzFill: "rgba(72,46,22,",  fzTile: "rgba(98,62,28,",   tc: { s: "#1a1008", c: "rgba(90,65,35,0.28)",  r: "#241808", t: "#1a1208" }, grid: "rgba(120,85,45,0.06)",   border: "rgba(155,110,55,", vignette: "55,35,10",   wall: ["rgba(66,44,22,0.95)", "rgba(140,100,55,0.75)", "#B88440", [115, 78, 40]],   ambient: ["210,180,140", 0.06, 8000] },
  { name: "desert",  bg: ["#382510", "#180f06"], fzFill: "rgba(90,68,30,",  fzTile: "rgba(125,95,42,",  tc: { s: "#201408", c: "rgba(120,92,42,0.28)", r: "#2a1a08", t: "#201408" }, grid: "rgba(160,125,55,0.06)",  border: "rgba(200,155,55,", vignette: "100,70,10",  wall: ["rgba(90,72,38,0.95)", "rgba(178,148,85,0.75)", "#C8A855", [148, 120, 65]],  ambient: ["240,200,120", 0.07, 5200] },
  { name: "forest",  bg: ["#0d2812", "#051208"], fzFill: "rgba(28,62,28,",  fzTile: "rgba(42,90,42,",   tc: { s: "#0a1c0a", c: "rgba(38,90,38,0.28)",  r: "#101e10", t: "#0a160a" }, grid: "rgba(45,120,45,0.06)",   border: "rgba(55,165,55,",  vignette: "10,50,10",   wall: ["rgba(24,54,24,0.95)", "rgba(52,115,52,0.75)", "#368A36", [44, 90, 44]],     ambient: ["190,255,190", 0.05, 10000] },
  { name: "space",   bg: ["#0e0322", "#03000b"], fzFill: "rgba(25,12,55,",  fzTile: "rgba(70,35,155,",  tc: { s: "#0e0820", c: "rgba(90,42,200,0.28)", r: "#1a1030", t: "#0c0818" }, grid: "rgba(110,55,220,0.07)",  border: "rgba(150,70,255,", vignette: "30,0,80",    wall: ["rgba(14,8,34,0.95)", "rgba(65,32,140,0.75)", "#7030C0", [52, 24, 112]],     ambient: ["220,220,255", 0.09, 14000] },
  { name: "arctic",  bg: ["#10213a", "#07101e"], fzFill: "rgba(40,60,90,",  fzTile: "rgba(65,100,148,", tc: { s: "#0c1a28", c: "rgba(60,100,155,0.28)", r: "#142230", t: "#0c1820" }, grid: "rgba(70,120,190,0.06)", border: "rgba(75,150,220,", vignette: "5,30,70",   wall: ["rgba(22,42,66,0.95)", "rgba(55,95,148,0.75)", "#4878B8", [44, 76, 118]],    ambient: ["235,245,255", 0.08, 6500] },
];

function getEnemyReadabilityStyle(enemy, timeNow) {
  if (enemy.isBossEnemy) {
    return {
      ringColor: enemy.enrageTriggered ? "#FF7A30" : "#FF4D4D",
      contrastColor: "rgba(255,255,255,0.9)",
      haloAlpha: 0.18 + Math.sin(timeNow / 150) * 0.04,
      backdropAlpha: 0.16,
      marker: "boss",
    };
  }
  if (enemy.eliteType) {
    const eliteMap = {
      armored:   { ringColor: "#FFD700", marker: "armor" },
      fast:      { ringColor: "#00E5FF", marker: "fast" },
      berserker: { ringColor: "#FF00C8", marker: "rage" },
      explosive: { ringColor: "#FF6400", marker: "blast" },
      phantom:   { ringColor: "#B450FF", marker: "stealth" },
    };
    const elite = eliteMap[enemy.eliteType] || eliteMap.explosive;
    return {
      ringColor: elite.ringColor,
      contrastColor: "rgba(255,255,255,0.82)",
      haloAlpha: 0.14 + Math.sin(timeNow / 120) * 0.05,
      backdropAlpha: 0.12,
      marker: elite.marker,
    };
  }
  if (enemy.typeIndex === 12) {
    return {
      ringColor: "#FF7A30",
      contrastColor: "rgba(255,248,220,0.85)",
      haloAlpha: 0.12,
      backdropAlpha: 0.10,
      marker: "blast",
    };
  }
  if (enemy.typeIndex === 11) {
    return {
      ringColor: "#6FB2FF",
      contrastColor: "rgba(255,255,255,0.8)",
      haloAlpha: 0.11,
      backdropAlpha: 0.09,
      marker: "shield",
    };
  }
  if (enemy.ranged) {
    return {
      ringColor: "#FF9B45",
      contrastColor: "rgba(255,245,230,0.78)",
      haloAlpha: 0.1,
      backdropAlpha: 0.08,
      marker: "ranged",
    };
  }
  return null;
}

function drawThreatBrackets(ctx, radius, color, marker) {
  const offset = radius + 8;
  const tick = Math.max(4, radius * 0.28);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-offset, -tick); ctx.lineTo(-offset, tick);
  ctx.moveTo(offset, -tick); ctx.lineTo(offset, tick);
  ctx.moveTo(-tick, -offset); ctx.lineTo(tick, -offset);
  ctx.moveTo(-tick, offset); ctx.lineTo(tick, offset);
  ctx.stroke();

  if (marker === "ranged") {
    ctx.beginPath();
    ctx.moveTo(offset + 4, 0); ctx.lineTo(offset + 10, 0);
    ctx.moveTo(-offset - 4, 0); ctx.lineTo(-offset - 10, 0);
    ctx.stroke();
  } else if (marker === "blast") {
    ctx.beginPath();
    ctx.moveTo(0, -offset - 4); ctx.lineTo(4, -offset - 10); ctx.lineTo(-4, -offset - 10); ctx.closePath();
    ctx.stroke();
  } else if (marker === "shield") {
    ctx.beginPath();
    ctx.arc(0, 0, offset + 3, -0.45, 0.45);
    ctx.stroke();
  } else if (marker === "rage") {
    ctx.beginPath();
    ctx.moveTo(-6, -offset - 2); ctx.lineTo(0, -offset - 12); ctx.lineTo(6, -offset - 2);
    ctx.stroke();
  }
}

function drawRangedAimTelegraph(ctx, enemy, player, radius, timeNow) {
  const progress = (enemy.shootTimer || 0) / Math.max(1, enemy.projRate || 1);
  if (!enemy.ranged || enemy.isBossEnemy || progress < 0.72) return;
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const distance = Math.min(190, Math.hypot(player.x - enemy.x, player.y - enemy.y) - radius);
  if (distance <= 10) return;

  ctx.save();
  ctx.rotate(angle);
  ctx.globalAlpha = 0.16 + (progress - 0.72) * 1.6 + Math.sin(timeNow / 80) * 0.04;
  ctx.strokeStyle = "#FFB36B";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(radius + 8, 0);
  ctx.lineTo(radius + 8 + distance, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#FFB36B";
  ctx.beginPath();
  ctx.moveTo(radius + 12 + distance, 0);
  ctx.lineTo(radius + 4 + distance, -4);
  ctx.lineTo(radius + 4 + distance, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawGame(ctx, canvas, W, H, gs, refs) {
  const { dashRef, mouseRef, joystickRef, shootStickRef, startTimeRef, frameCountRef, isMobile, tip, wpnIdx } = refs;
  const p = gs.player;
  const dn = Date.now();
  const retroCharacters = gs.visualPack === VISUAL_PACKS.RETRO;

  // ────────────────── RENDER ────────────────────────────────────────────
  const _rm = gs.reducedMotion === true;
  // Backing store may be DPR-scaled (S145); W/H stay CSS pixels so all game
  // math is unchanged — one root transform maps game space onto device pixels.
  const _dpr = W > 0 ? canvas.width / W : 1;
  ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
  // Degradation ladder step 2+: shadowBlur is the most expensive canvas state
  // in this renderer — an own-property override no-ops every write at once,
  // and deleting it restores the prototype accessor on recovery.
  const _perfStep = (typeof window !== "undefined" && window.__codPerfStep) || 0;
  if (_perfStep >= 2 && !ctx.__codShadowKill) {
    Object.defineProperty(ctx, "shadowBlur", { get() { return 0; }, set() {}, configurable: true });
    ctx.__codShadowKill = true;
  } else if (_perfStep < 2 && ctx.__codShadowKill) {
    delete ctx.shadowBlur;
    ctx.__codShadowKill = false;
  }
  ctx.save();
  if (!_rm && gs.screenShake > 0.5) {
    // Trauma-style shake: a directional bias (recoil kick / impact push)
    // blends with random jitter, then decays back to pure noise (S155).
    const _sm = gs.settScreenShakeMult ?? 1;
    const _mag = gs.screenShake * 2 * _sm;
    const _sdx = gs.shakeDirX || 0, _sdy = gs.shakeDirY || 0;
    ctx.translate(
      (_sdx * 0.6 + (Math.random() - 0.5) * (1 - Math.abs(_sdx) * 0.5)) * _mag,
      (_sdy * 0.6 + (Math.random() - 0.5) * (1 - Math.abs(_sdy) * 0.5)) * _mag,
    );
  }
  // ADS zoom: scale 1.28× centered on player for aim-down-sights effect
  if (gs.adsZoom && p) {
    ctx.translate(p.x, p.y);
    ctx.scale(1.28, 1.28);
    ctx.translate(-p.x, -p.y);
  }

  // Scrolling camera for Bot Royale: gs._royaleWorld carries the world size and
  // gs._camX / gs._camY track the camera offset (world-top-left shown at screen 0,0).
  // All values default to 0 for non-royale modes so zero-cost for every other mode.
  const _rwld = gs._royaleWorld;
  const _camX = _rwld ? Math.round(gs._camX || 0) : 0;
  const _camY = _rwld ? Math.round(gs._camY || 0) : 0;

  // Background — prerendered static arena layers (S155). Gradient, floor
  // zones, terrain, props, grid, and vignette are painted once per run into an
  // offscreen canvas (systems/backgroundLayer.js) and blitted here; combat
  // decals persist by stamping straight into that canvas.
  const _theme = ARENA_THEMES[gs.mapTheme] || ARENA_THEMES[0];
  const _arenaLayers = getArenaLayers(gs, W, H, _dpr, { theme: _theme, perfStep: _perfStep, retroCharacters });
  if (_rwld && (_camX > 0 || _camY > 0)) {
    // Tile the W×H background canvas to fill the scrolling viewport.
    // Two tiles in each axis cover any partial-scroll offset within a 1.8× world.
    const _bgX = -(_camX % W), _bgY = -(_camY % H);
    for (let _ty = 0; _ty <= 1; _ty++) {
      for (let _tx = 0; _tx <= 1; _tx++) {
        ctx.drawImage(_arenaLayers.underlay.canvas, Math.round(_bgX + _tx * W), Math.round(_bgY + _ty * H), W, H);
      }
    }
  } else {
    ctx.drawImage(_arenaLayers.underlay.canvas, 0, 0, W, H);
  }

  // ── Active dynamic objective (Hot Zone / Lockdown / Escort / Sniper / Bounty) ──
  const _obj = gs.activeObjective;
  if (_obj && !_obj.completed && !_obj.expired) {
    ctx.save();
    const _pulse = 0.55 + 0.3 * Math.sin(dn / 220);
    if (_obj.type === "hot_zone" && _obj.cx != null) {
      const grad = ctx.createRadialGradient(_obj.cx, _obj.cy, 0, _obj.cx, _obj.cy, _obj.r);
      grad.addColorStop(0, "rgba(255,102,0,0.18)");
      grad.addColorStop(0.7, "rgba(255,102,0,0.10)");
      grad.addColorStop(1, "rgba(255,102,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(_obj.cx, _obj.cy, _obj.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,102,0,${_pulse})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(_obj.cx, _obj.cy, _obj.r, 0, Math.PI * 2); ctx.stroke();
      // S145: rotating dashed marker ring makes the hotspot read as live.
      if (!_rm) {
        ctx.save();
        ctx.translate(_obj.cx, _obj.cy);
        ctx.rotate((dn / 900) % (Math.PI * 2));
        ctx.setLineDash([14, 18]); ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255,160,60,${_pulse * 0.8})`;
        ctx.beginPath(); ctx.arc(0, 0, _obj.r - 8, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.fillStyle = "rgba(255,102,0,0.85)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🔥 HOT ZONE x" + (_obj.scoreMult || 2), _obj.cx, _obj.cy - _obj.r - 8);
    } else if (_obj.type === "lockdown" && _obj.cx != null) {
      ctx.save();
      ctx.translate(_obj.cx, _obj.cy);
      if (!_rm) ctx.rotate((-dn / 1400) % (Math.PI * 2));
      ctx.strokeStyle = `rgba(136,204,255,${_pulse})`; ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.arc(0, 0, _obj.r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.fillStyle = "rgba(136,204,255,0.9)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🛡 LOCKDOWN · " + Math.ceil((_obj.timeLeft || 0) / 60) + "s", _obj.cx, _obj.cy - _obj.r - 8);
    } else if (_obj.type === "escort" && _obj.cart) {
      const _cartSprite = retroCharacters ? null : getWorldObjectSprite("escort-cart");
      if (_cartSprite) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(_cartSprite.image, _cartSprite.x, _cartSprite.y, _cartSprite.width, _cartSprite.height, _obj.cart.x - 20, _obj.cart.y - 20, 40, 40);
      } else {
        ctx.fillStyle = "rgba(170,68,255,0.95)"; ctx.font = "20px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🚚", _obj.cart.x, _obj.cart.y);
      }
      ctx.fillStyle = "rgba(170,68,255,0.95)"; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(170,68,255,0.85)"; ctx.font = "bold 10px sans-serif";
      ctx.fillText("ESCORT · HP " + Math.max(0, Math.round(_obj.cart.hp)), _obj.cart.x, _obj.cart.y - 22);
    } else if (_obj.type === "sniper" || _obj.type === "bounty") {
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(W / 2 - 130, 36, 260, 22);
      ctx.fillStyle = _obj.color || "#FFD700"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(_obj.label + " · " + Math.ceil((_obj.timeLeft || 0) / 60) + "s", W / 2, 51);
    }
    ctx.restore();
  }

  // ── Hazard tiles ──────────────────────────────────────────────────────────
  for (const hz of (gs.hazards || [])) {
    const _pulse = 0.5 + Math.sin((hz.pulseTimer || 0) / 120 * Math.PI * 2) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.35 + _pulse * 0.2;
    if (hz.type === "acid") {
      ctx.fillStyle = "#22FF44";
      ctx.shadowColor = "#22FF44"; ctx.shadowBlur = 12;
    } else if (hz.type === "electro") {
      ctx.fillStyle = "#FFFF00";
      ctx.shadowColor = "#FFFF00"; ctx.shadowBlur = 14;
    } else {
      ctx.fillStyle = "#886644";
      ctx.shadowColor = "#AA8855"; ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 + _pulse * 0.15;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Icon \u2014 sprite hazard marker (Modern); glyph fallback + Retro.
    ctx.globalAlpha = 0.5 + _pulse * 0.3;
    const _hzSprite = retroCharacters ? null : getWorldObjectSprite(
      hz.type === "acid" ? "hazard:poison" : hz.type === "electro" ? "hazard:shock" : "hazard:rock",
    );
    if (_hzSprite) {
      const _hzSize = hz.radius * 0.9;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(_hzSprite.image, _hzSprite.x, _hzSprite.y, _hzSprite.width, _hzSprite.height, hz.x - _hzSize / 2, hz.y - _hzSize / 2, _hzSize, _hzSize);
    } else {
      ctx.font = `${Math.floor(hz.radius * 0.5)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(hz.type === "acid" ? "\u2620" : hz.type === "electro" ? "\u26a1" : "\uD83E\uDEA8", hz.x, hz.y);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  }

  // Arena border (kept live — it pulses)
  const BORDER_CLR = gs.bossWave ? null : _theme.border;
  const bPulse = 0.25 + Math.sin(Date.now() / 900) * 0.12;
  ctx.strokeStyle = gs.bossWave ? `rgba(255,60,60,${bPulse})` : `${BORDER_CLR}${bPulse})`;
  ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, H - 8); ctx.lineWidth = 1;
  const cSz = 18; ctx.strokeStyle = gs.bossWave ? "#FF5555" : (BORDER_CLR + "0.9)");
  [[4,4,1,1],[W-4,4,-1,1],[4,H-4,1,-1],[W-4,H-4,-1,-1]].forEach(([cx,cy,sx,sy]) => {
    ctx.beginPath(); ctx.moveTo(cx + sx*cSz, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy*cSz); ctx.stroke();
  });

  // S145 ambient theme signature — stateless drifting motes (snow, dust,
  // stars, embers…) derived from time + index; no arrays, no allocation.
  // Off under reduced motion, boss waves, and perf step ≥2.
  if (!_rm && !gs.bossWave && _perfStep < 2) {
    const [ambC, ambA, ambPeriod] = _theme.ambient;
    const _isSnow = gs.mapTheme === 7;
    for (let _mi = 0; _mi < 14; _mi++) {
      const _seedX = ((_mi * 971 + 137) % 1000) / 1000;
      const _seedY = ((_mi * 613 + 389) % 1000) / 1000;
      const _t = (dn / ambPeriod + _mi * 0.17) % 1;
      const _mx = ((_seedX + _t * 0.22 + (_isSnow ? Math.sin(_t * 6.28 + _mi) * 0.02 : 0)) % 1) * W;
      const _my = _isSnow || gs.mapTheme === 5 ? ((_seedY + _t) % 1) * H : ((_seedY + _t * 0.35) % 1) * H;
      const _ms = 1 + (_mi % 3) * 0.7;
      ctx.globalAlpha = ambA * (0.6 + Math.sin(_t * 6.28) * 0.4 + 0.4);
      ctx.fillStyle = `rgb(${ambC})`;
      ctx.beginPath(); ctx.arc(_mx, _my, _ms, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Trail
  gs.trail.forEach(t => {
    ctx.globalAlpha = t.life / 15 * 0.2;
    ctx.fillStyle = dashRef.current.active > 0 ? "#00FFFF" : "#44AA44";
    ctx.beginPath(); ctx.arc(t.x, t.y, 10, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Pickups
  gs.pickups.forEach(pk => {
    const bob = Math.sin(Date.now() / 200 + pk.x) * 3;
    const ps = 1 + Math.sin(Date.now() / 300) * 0.15;
    ctx.save(); ctx.translate(pk.x, pk.y + bob); ctx.scale(ps, ps);
    const _pkEmojis = { health:"💊", ammo:"📦", speed:"⚡", guardian_angel:"😇", upgrade:"🔧", nuke:"☢️", rage:"🔥", magnet:"🧲", freeze:"❄️", loot:"💰" };
    const _pkColors = { health:"#0F0", ammo:"#0BF", speed:"#FF0", guardian_angel:"#FFD700", upgrade:"#AA44FF", nuke:"#F00", rage:"#FF4400", magnet:"#FF88FF", freeze:"#88CCFF", loot:"#FFD34F" };
    const em = _pkEmojis[pk.type] || "✨";
    const isSpecial = pk.type === "guardian_angel" || pk.type === "upgrade";
    const isNew = pk.type === "rage" || pk.type === "magnet" || pk.type === "freeze";
    // S145: sprite pickup pucks (Modern pack); emoji remains fallback + Retro.
    const _pkSprite = retroCharacters ? null : getWorldObjectSprite(`pickup:${pk.type}`);
    if (_pkSprite) {
      const _pkSize = isSpecial ? 40 : 34;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(_pkSprite.image, _pkSprite.x, _pkSprite.y, _pkSprite.width, _pkSprite.height, -_pkSize / 2, -_pkSize / 2, _pkSize, _pkSize);
    } else {
      ctx.font = isSpecial ? "28px serif" : "22px serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(em, 0, 0);
    }
    ctx.globalAlpha = (isSpecial || isNew) ? 0.25 + Math.sin(Date.now() / 200) * 0.12 : 0.15;
    ctx.fillStyle = _pkColors[pk.type] || "#FFF";
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    // New pickup types: extra outer glow ring
    if (isNew) {
      ctx.globalAlpha = 0.18 + Math.sin(Date.now() / 150) * 0.10;
      ctx.strokeStyle = _pkColors[pk.type]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    }
    // Respite window: soft teal beacon ring signals the breather
    if (gs._respiteLock) {
      ctx.globalAlpha = 0.08 + Math.sin(Date.now() / 250) * 0.07;
      ctx.strokeStyle = "#88FFCC"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  });

  // Grenades — sprite bomb with a spin (Modern); emoji fallback + Retro.
  gs.grenades.forEach(g => {
    ctx.save(); ctx.translate(g.x, g.y);
    const _gSprite = retroCharacters ? null : getWorldObjectSprite("grenade");
    if (_gSprite) {
      const _gSize = g.size * 2.4;
      ctx.rotate(((g.timer || 0) * 0.12) % (Math.PI * 2));
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(_gSprite.image, _gSprite.x, _gSprite.y, _gSprite.width, _gSprite.height, -_gSize / 2, -_gSize / 2, _gSize, _gSize);
    } else {
      ctx.font = (g.size * 2) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💣", 0, 0);
    }
    ctx.restore();
  });

  // Enemy bullets
  gs.enemyBullets.forEach(eb => {
    ctx.save(); ctx.translate(eb.x, eb.y);
    ctx.fillStyle = eb.color || "#F44"; ctx.shadowColor = eb.color || "#F44"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, 0, eb.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });

  // Obstacles — prerendered layer (systems/backgroundLayer.js), single blit
  if (_rwld && (_camX > 0 || _camY > 0)) {
    const _obX = -(_camX % W), _obY = -(_camY % H);
    for (let _ty = 0; _ty <= 1; _ty++) {
      for (let _tx = 0; _tx <= 1; _tx++) {
        ctx.drawImage(_arenaLayers.obstacles.canvas, Math.round(_obX + _tx * W), Math.round(_obY + _ty * H), W, H);
      }
    }
  } else {
    ctx.drawImage(_arenaLayers.obstacles.canvas, 0, 0, W, H);
  }

  // Fog of War overlay (wave event): draw dark fog, punch holes around player and near enemies
  if (gs.fogOfWar) {
    const _fog = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 200);
    _fog.addColorStop(0, "rgba(0,0,0,0)");
    _fog.addColorStop(1, "rgba(0,0,12,0.88)");
    ctx.fillStyle = _fog; ctx.fillRect(0, 0, W, H);
  }

  // Camera translate: applied after the prerendered background layers (which are
  // tiled in screen space above) so all world-space entities render at the correct
  // viewport position. Restored after floating texts; screen-space overlays
  // (radar, flash, vignette) follow that restore and are unaffected.
  const _hasCam = _camX !== 0 || _camY !== 0;
  if (_hasCam) { ctx.save(); ctx.translate(-_camX, -_camY); }

  // Beat-precision vulnerability: compute once per frame for the enemy loop
  // Window widens with precision streak: base 8 frames + 1 per 5 streak (max +4 at ≥20)
  let _beatVulnActive = false;
  let _beatVulnWindow = 8;
  try {
    const _bvBpm = getMusicBPM();
    const _bvFpb = Math.round(60 / _bvBpm * 60);
    const _bvPhase = (refs.frameCountRef?.current || 0) % _bvFpb;
    _beatVulnWindow = 8 + Math.min(4, Math.floor((gs.precisionStreak || 0) / 5));
    _beatVulnActive = _bvPhase < _beatVulnWindow;
  } catch {}

  drawModeLayer(ctx, gs, refs);

  // Enemies
  const _enemiesDraw = gs.enemies || [];
  for (let _ei = 0; _ei < _enemiesDraw.length; _ei++) {
    const e = _enemiesDraw[_ei];
    if (!e) continue;
    // Fog of War: skip rendering enemies beyond 195px (they become visible at ~160px)
    if (gs.fogOfWar && !e.isBossEnemy && Math.hypot(e.x - p.x, e.y - p.y) > 195) continue;
    ctx.save(); ctx.translate(e.x, e.y);
    const r = e.size / 2;
    const faceA = Math.atan2(p.y - e.y, p.x - e.x);
    const readability = getEnemyReadabilityStyle(e, dn);
    // Phantom elite: pulse between 15% and 100% opacity
    if (e.eliteType === "phantom") {
      ctx.globalAlpha = e.phantomVisible ? 0.95 : (0.15 + Math.sin(dn / 200) * 0.05);
    }
    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(0, r + 3, r * 0.7, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();

    if (readability?.backdropAlpha) {
      ctx.globalAlpha = readability.backdropAlpha;
      ctx.fillStyle = "#050505";
      ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Ground slam expanding shockwave ring
    if (e.groundSlamActive && e.groundSlamRadius > 0) {
      const ringAlpha = Math.max(0, 1 - e.groundSlamRadius / 230) * 0.75;
      ctx.globalAlpha = ringAlpha;
      ctx.strokeStyle = "#FF4400"; ctx.lineWidth = 7;
      ctx.shadowColor = "#FF4400"; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(0, 0, e.groundSlamRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // Boss: under-body glow pool
    if (e.isBossEnemy) {
      const rgb = e.enrageTriggered ? "255,80,0" : e.bossPhase2 ? "255,40,110" : "220,0,0";
      ctx.globalAlpha = 0.18 + Math.sin(dn / 200) * 0.06;
      ctx.fillStyle = `rgba(${rgb},1)`;
      ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // S155 phase-2 language: beat-synced additive aura ring — the lookahead
      // scheduler keeps getMusicBeat() honest, so the pulse sits on the music.
      if (e.bossPhase2 && !_rm && _perfStep < 2) {
        let _bt = 0;
        try {
          const _fpb = Math.max(1, Math.round(60 / getMusicBPM() * 60));
          _bt = 1 - ((frameCountRef?.current || 0) % _fpb) / _fpb;
        } catch { /* ignore */ }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.10 + _bt * 0.16;
        ctx.strokeStyle = "rgba(255,60,130,0.9)";
        ctx.lineWidth = 2.5 + _bt * 2;
        ctx.beginPath(); ctx.arc(0, 0, r + 14 + _bt * 8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // S145 single-layer policy: when the atlas sprite is decoded it IS the
    // body — the procedural orb, hand-drawn type details, eyes, and emoji
    // glyph render only as the instant-loading / load-failure fallback.
    const enemySprite = retroCharacters ? null
      : (e.isZombie && getRuntimeZombieSprite(e.zombieVariant, e.isBossEnemy)) || getRuntimeEnemySprite(e.typeIndex);
    if (retroCharacters) {
      drawRetroEnemyCharacter(ctx, e);
    } else {
    // Body base
    if (readability?.haloAlpha) {
      ctx.globalAlpha = readability.haloAlpha;
      ctx.fillStyle = readability.ringColor;
      ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (!enemySprite) drawShadedOrb(ctx, {
      radius: r,
      material: e.isBossEnemy ? "porcelain" : "enemyFlesh",
      baseColor: e.color,
      rimWidth: 2,
    });
    // Hit-flash white overlay (fallback body only; sprite path flashes via rim + alpha)
    if (!enemySprite && e.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.9, e.hitFlash / 12);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Chain enrage spawn: fade-in yellow/orange tint for 20 frames to signal kill-chain pressure
    if ((e._spawnFlashTimer || 0) > 0) {
      const _ef = e._spawnFlashTimer / 20;
      ctx.globalAlpha = _ef * 0.55;
      ctx.fillStyle = (e._spawnEnrageLevel || 0) >= 2 ? "#FF4400" : "#FFD700";
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Outer flash border preserves hit readability over the material pass.
    if (e.hitFlash > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }
    if (readability) {
      ctx.strokeStyle = readability.contrastColor;
      ctx.lineWidth = e.isBossEnemy ? 2.8 : 1.8;
      ctx.beginPath(); ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2); ctx.stroke();
    }

    // Type-specific visual details (fallback body only — the atlas art carries identity)
    if (!enemySprite && e.hitFlash <= 6) {
      switch (e.typeIndex) {
        case 0: { // Mall Cop — gold star badge on chest
          const bs = Math.max(5, r * 0.3);
          ctx.fillStyle = "#FFD700"; ctx.globalAlpha = 0.9; ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const a2 = ((i * 4 + 2) * Math.PI / 5) - Math.PI / 2;
            i === 0 ? ctx.moveTo(Math.cos(a1) * bs, r * 0.18 + Math.sin(a1) * bs)
                    : ctx.lineTo(Math.cos(a1) * bs, r * 0.18 + Math.sin(a1) * bs);
            ctx.lineTo(Math.cos(a2) * bs * 0.42, r * 0.18 + Math.sin(a2) * bs * 0.42);
          }
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; break;
        }
        case 1: { // Karen — spiky blonde hair
          ctx.strokeStyle = "#FFD700"; ctx.lineCap = "round";
          ctx.lineWidth = Math.max(2, r * 0.15);
          for (let i = 0; i < 6; i++) {
            const ha = -Math.PI + (i / 5) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ha) * (r - 2), Math.sin(ha) * (r - 2));
            ctx.lineTo(Math.cos(ha) * (r + 9 + (i % 2) * 5), Math.sin(ha) * (r + 9 + (i % 2) * 5));
            ctx.stroke();
          }
          ctx.lineCap = "butt"; break;
        }
        case 2: { // Florida Man — croc scale dots
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          CROC_SCALE_DOTS.forEach(([dx, dy]) => {
            ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.13, 0, Math.PI * 2); ctx.fill();
          }); break;
        }
        case 3: { // HOA President — clipboard
          ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
          ctx.fillRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.62); ctx.strokeRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.62);
          ctx.fillStyle = "rgba(40,40,40,0.55)";
          CLIPBOARD_ROW_OFFSETS.forEach(dy => ctx.fillRect(-r * 0.28, dy * r, r * 0.56, r * 0.11)); break;
        }
        case 5: { // IT Guy — thick glasses
          ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.fillStyle = "rgba(160,230,255,0.28)";
          SIGN_PAIR.forEach(s => {
            ctx.beginPath(); ctx.arc(s * r * 0.34, -r * 0.12, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          });
          ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.12); ctx.lineTo(r * 0.1, -r * 0.12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-r * 0.58, -r * 0.12); ctx.lineTo(-r * 0.76, -r * 0.22); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(r * 0.58, -r * 0.12); ctx.lineTo(r * 0.76, -r * 0.22); ctx.stroke(); break;
        }
        case 6: { // Gym Bro — bulging arms either side
          ctx.fillStyle = e.color; ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5;
          SIGN_PAIR.forEach(s => {
            ctx.beginPath(); ctx.ellipse(s * r * 0.92, r * 0.06, r * 0.32, r * 0.44, s * 0.22, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          }); break;
        }
        case 7: { // Influencer — animated ring-light halo
          ctx.strokeStyle = `rgba(255,220,50,${0.5 + Math.sin(dn / 180) * 0.3})`; ctx.lineWidth = 3.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(0, 0, r + 13, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); break;
        }
        case 8: { // Conspiracy Bro — tinfoil hat
          ctx.fillStyle = "rgba(210,210,220,0.88)"; ctx.strokeStyle = "rgba(160,160,170,0.6)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, -r - 15); ctx.lineTo(-r * 0.62, -r + 1); ctx.lineTo(r * 0.62, -r + 1);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
          [[-.28, -r - 7, -.18, -r + 1], [.12, -r - 9, .2, -r + 1]].forEach(([x1, y1, x2, y2]) => {
            ctx.beginPath(); ctx.moveTo(x1 * r, y1); ctx.lineTo(x2 * r, y2); ctx.stroke();
          }); break;
        }
        case 9: { // Landlord — gold $ on chest
          ctx.font = `bold ${Math.floor(r * 0.54)}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = "#FFD700"; ctx.globalAlpha = 0.82;
          ctx.fillText("$", r * 0.08, r * 0.2); ctx.globalAlpha = 1; break;
        }
        case 10: { // Crypto Bro — zigzag chart line
          ctx.strokeStyle = "#00FFD0"; ctx.lineWidth = 2; ctx.globalAlpha = 0.78; ctx.lineCap = "round";
          ctx.beginPath();
          CRYPTO_ZIGZAG_POINTS.forEach(([fx, fy], i) =>
            i === 0 ? ctx.moveTo(fx * r, fy * r) : ctx.lineTo(fx * r, fy * r));
          ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = "butt"; break;
        }
        case 12: { // YOLO Bomber — hazard stripes clipped to circle
          ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
          ctx.globalAlpha = 0.38;
          for (let i = -5; i <= 5; i++) {
            ctx.fillStyle = i % 2 === 0 ? "#FFD700" : "#CC1100";
            ctx.fillRect(-r + (i + 5) * (r * 0.22), -r, r * 0.22, r * 2);
          }
          ctx.globalAlpha = 1; ctx.restore(); break;
        }
        case 13: { // Sergeant Karen — rank chevrons
          ctx.strokeStyle = "rgba(255,255,255,0.78)"; ctx.lineWidth = 2; ctx.lineCap = "round";
          KAREN_CHEVRON_ROWS.forEach(f => {
            const cy = f * r;
            ctx.beginPath(); ctx.moveTo(-r * 0.32, cy); ctx.lineTo(0, cy - r * 0.23); ctx.lineTo(r * 0.32, cy); ctx.stroke();
          }); ctx.lineCap = "butt"; break;
        }
        default: break;
      }
    }

    // Eyes facing player (fallback body only; skip during hit flash)
    if (!enemySprite && e.hitFlash <= 4) {
      ctx.save(); ctx.rotate(faceA);
      const er = Math.max(1.8, r * 0.18);
      SIGN_PAIR.forEach(side => {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath(); ctx.ellipse(r * 0.42, side * r * 0.3, er * 1.4, er, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.isBossEnemy ? "#FF0000" : "#111";
        ctx.beginPath(); ctx.arc(r * 0.5, side * r * 0.3, er * 0.72, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.beginPath(); ctx.arc(r * 0.44, side * r * 0.3 - er * 0.3, er * 0.32, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    // Atlas sprite body with S145 procedural motion (velocity lean, hit
    // squash, idle breathing). RETRO pack never reaches this branch.
    if (enemySprite) {
      const spriteHeight = Math.max(e.isBossEnemy ? 92 : 58, r * (e.isBossEnemy ? 3.7 : 3.15));
      const spriteWidth = spriteHeight * (enemySprite.sourceWidth / enemySprite.sourceHeight);
      const motion = resolveSpriteMotion({
        frame: refs.frameCountRef?.current || 0,
        facingAngle: faceA,
        speed: e.speed || 0,
        hitFlash: e.hitFlash || 0,
        phase: e._motionPhase === undefined ? (e._motionPhase = motionPhaseSeed(e.x, e.y)) : e._motionPhase,
        reduced: _rm || _perfStep >= 3,
      });
      ctx.save();
      ctx.globalAlpha = e.hitFlash > 0 ? Math.max(0.45, 1 - e.hitFlash / 14) : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.rotate(motion.rotation);
      ctx.scale(motion.scaleX, motion.scaleY);
      // Karen v2 dedicated sprite upgrades both Karen bodies over the atlas cell.
      const karenSprite = (e.typeIndex === 1 || e.typeIndex === 13 || (e.isBossEnemy && e.typeIndex === 4))
        ? getRuntimeCharacterSprite("karen") : null;
      if (karenSprite) {
        ctx.drawImage(karenSprite, -spriteWidth / 2, -spriteHeight * 0.55 + motion.offsetY, spriteWidth, spriteHeight);
      } else {
        ctx.drawImage(
          enemySprite.image,
          enemySprite.sourceX, enemySprite.sourceY,
          enemySprite.sourceWidth, enemySprite.sourceHeight,
          -spriteWidth / 2, -spriteHeight * 0.55 + motion.offsetY,
          spriteWidth, spriteHeight,
        );
      }
      ctx.restore();
      // Hit-flash rim keeps damage readable over the sprite art.
      if (e.hitFlash > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.85, e.hitFlash / 10)})`;
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2); ctx.stroke();
      }
      // Impact sparks — stateless back-scatter toward the shooter for the
      // first frames of a fresh hit (S145 FX pass; off under perf pressure).
      if (e.hitFlash >= 9 && _perfStep < 1 && !_rm) {
        const _skT = (12 - e.hitFlash) / 3; // 0→1 across frames 12..9
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round"; ctx.lineWidth = 2;
        for (let _si = 0; _si < 4; _si++) {
          const _sa = faceA + (_si - 1.5) * 0.42;
          const _sd = r * 0.5 + _skT * 14;
          ctx.strokeStyle = `rgba(255,220,120,${0.8 - _skT * 0.7})`;
          ctx.beginPath();
          ctx.moveTo(Math.cos(_sa) * _sd, Math.sin(_sa) * _sd);
          ctx.lineTo(Math.cos(_sa) * (_sd + 6 + _skT * 6), Math.sin(_sa) * (_sd + 6 + _skT * 6));
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    }

    // Boss glow ring
    if (e.isBossEnemy) {
      const rgb = e.enrageTriggered ? "255,80,0" : "255,0,0";
      ctx.strokeStyle = `rgba(${rgb},${0.55 + Math.sin(dn / 200) * 0.25})`;
      ctx.lineWidth = e.enrageTriggered ? 4.5 : 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.stroke();
    }
    // Juggernaut (17): shield bar above HP bar
    if (e.typeIndex === 17 && e.isBossEnemy && (e.jugShieldMax || 0) > 0) {
      const sbw = e.size + 4;
      const shieldFrac = Math.max(0, (e.jugShield || 0) / e.jugShieldMax);
      // Shield bar track
      ctx.fillStyle = "#111"; ctx.fillRect(-sbw / 2, -r - 26, sbw, 5);
      ctx.fillStyle = shieldFrac > 0.5 ? "#00BFFF" : shieldFrac > 0 ? "#FF8800" : "#333";
      ctx.fillRect(-sbw / 2, -r - 26, sbw * shieldFrac, 5);
      ctx.strokeStyle = "rgba(0,191,255,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(-sbw / 2, -r - 26, sbw, 5);
      // Shield glow ring when active
      if ((e.jugShield || 0) > 0) {
        const sA = 0.35 + Math.sin(dn / 120) * 0.18;
        ctx.strokeStyle = `rgba(0,191,255,${sA})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r + 16, 0, Math.PI * 2); ctx.stroke();
      }
      // Charging wind-up warning arc
      if ((e.jugChargeWindup || 0) > 0) {
        const chPct = e.jugChargeWindup / 90;
        ctx.strokeStyle = `rgba(255,100,0,${0.6 + Math.sin(dn / 50) * 0.3})`; ctx.lineWidth = 5;
        ctx.shadowColor = "#FF6600"; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(0, 0, r + 28, -Math.PI/2, -Math.PI/2 + chPct * Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    // Summoner (18): invulnerability glow + summon count ring
    if (e.typeIndex === 18 && e.isBossEnemy) {
      if (e.summonerInvuln) {
        const invA = 0.45 + Math.sin(dn / 100) * 0.25;
        ctx.strokeStyle = `rgba(136,68,255,${invA})`; ctx.lineWidth = 5;
        ctx.shadowColor = "#8844FF"; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, r + 18, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.15; ctx.fillStyle = "#8844FF";
        ctx.beginPath(); ctx.arc(0, 0, r + 18, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
    }
    // Doomscroller (19): frozen "doomscrolling" indicator
    if (e.typeIndex === 19 && e.doomscrolling) {
      const zA = 0.6 + Math.sin(dn / 55) * 0.3;
      ctx.globalAlpha = zA;
      ctx.strokeStyle = "#7B68EE"; ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(0, 0, r + 13, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "#7B68EE";
      ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 2.5;
      ctx.strokeText("zzz 📱", 0, -r - 18);
      ctx.fillText("zzz 📱", 0, -r - 18);
      ctx.globalAlpha = 1;
    }
    // Splitter (16): pulsing split-warning aura at low HP
    if (e.typeIndex === 16 && e.splitOnDeath && !e.splitDone && e.health < e.maxHealth * 0.35) {
      const spA = 0.4 + Math.sin(dn / 80) * 0.35;
      ctx.strokeStyle = `rgba(255,102,136,${spA})`; ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Bullet ring warning — pulsing orange arc ~1s before ring fires
    if (e.bulletRingWarning) {
      const pulse = 0.45 + Math.sin(dn / 60) * 0.45;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#FF6600"; ctx.lineWidth = 4;
      ctx.shadowColor = "#FF6600"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, r + 80, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // Ground slam warning — faint expanding danger circle before slam
    if (e.groundSlamWarning) {
      const pulse = 0.15 + Math.sin(dn / 80) * 0.12;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#FF2200"; ctx.lineWidth = 5;
      ctx.shadowColor = "#FF2200"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, r + 100, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = pulse * 0.4;
      ctx.fillStyle = "#FF2200";
      ctx.beginPath(); ctx.arc(0, 0, r + 100, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // Shield pulse visual
    if (e.shieldPulseActive) {
      const sA = 0.55 + Math.sin(dn / 80) * 0.3;
      ctx.strokeStyle = `rgba(0,191,255,${sA})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.2; ctx.fillStyle = "#00BFFF";
      ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Enrage aura
    if (e.enrageTriggered) {
      const eA = 0.32 + Math.sin(dn / 70) * 0.18;
      ctx.strokeStyle = `rgba(255,100,0,${eA})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, Math.PI * 2); ctx.stroke();
    }
    // Sergeant aura
    if (e.typeIndex === 13) {
      ctx.strokeStyle = "rgba(255,136,0," + (0.3 + Math.sin(dn / 250) * 0.18) + ")";
      ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Shield Guy arc
    if (e.typeIndex === 11) {
      const sa = Math.atan2(p.y - e.y, p.x - e.x);
      ctx.strokeStyle = "rgba(120,170,255,0.8)"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, r + 9, sa - 0.9, sa + 0.9); ctx.stroke();
      ctx.lineWidth = 1;
    }
    // Ranged ring
    if (e.ranged && !e.isBossEnemy) {
      ctx.strokeStyle = "rgba(255,100,100," + (0.28 + Math.sin(dn / 300) * 0.15) + ")";
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();
      drawRangedAimTelegraph(ctx, e, p, r, dn);
    }
    // Elite variant ring — color + dash pattern for colorblind accessibility
    if (e.eliteType) {
      const eliteRgb = e.eliteType === "armored" ? "255,215,0" : e.eliteType === "fast" ? "0,229,255" : e.eliteType === "berserker" ? "255,0,200" : e.eliteType === "phantom" ? "180,80,255" : "255,100,0";
      const alpha = 0.72 + Math.sin(dn / 140) * 0.22;
      ctx.strokeStyle = `rgba(${eliteRgb},${alpha})`;
      ctx.lineWidth = 2.5;
      // Distinct dash pattern per type (colorblind-friendly)
      if (e.eliteType === "armored")        ctx.setLineDash([6, 4]);
      else if (e.eliteType === "fast")      ctx.setLineDash([2, 3]);
      else if (e.eliteType === "berserker") { ctx.setLineDash([]); ctx.lineWidth = 2; }
      else if (e.eliteType === "phantom")   ctx.setLineDash([4, 6]); // long gap = eerie
      else                                  ctx.setLineDash([]); // explosive = solid
      ctx.beginPath(); ctx.arc(0, 0, r + 11, 0, Math.PI * 2); ctx.stroke();
      // Berserker: second ring to distinguish
      if (e.eliteType === "berserker") {
        ctx.beginPath(); ctx.arc(0, 0, r + 16, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if (readability) {
      drawThreatBrackets(ctx, r, readability.ringColor, readability.marker);
    }

    // Emoji identity glyph — fallback/Retro only; sprite bodies carry their own identity.
    if (retroCharacters || !enemySprite) {
      ctx.font = Math.floor(r * 0.72) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = e.hitFlash > 6 ? 0.15 : 0.88;
      ctx.fillText(e.emoji, 0, 1);
      ctx.globalAlpha = 1;
    }
    // Chain enrage spawn label: ⚡ above enemy during first 20 frames
    if ((e._spawnFlashTimer || 0) > 0) {
      const _ef = e._spawnFlashTimer / 20;
      ctx.globalAlpha = _ef;
      ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillStyle = (e._spawnEnrageLevel || 0) >= 2 ? "#FF6622" : "#FFD700";
      ctx.fillText("⚡ ENRAGED", 0, -r - 4);
      ctx.globalAlpha = 1;
    }

    // HP bar
    if (gs.settShowEnemyHealthBars || e.health < e.maxHealth) {
      const bw = e.size + 4;
      ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-bw / 2, -r - 14, bw, 6);
      ctx.fillStyle = e.health > e.maxHealth * 0.5 ? "#00EE44" : e.health > e.maxHealth * 0.25 ? "#FFAA00" : "#FF2222";
      ctx.fillRect(-bw / 2, -r - 14, bw * Math.max(0, e.health / e.maxHealth), 6);
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(-bw / 2, -r - 14, bw, 6);
    }
    // Aim flow precision window highlight (streak >= 10, non-boss, within 200px)
    if (!e.isBossEnemy && (gs.precisionStreak || 0) >= 10 && Math.hypot(e.x - p.x, e.y - p.y) < 200) {
      const _pr = r * 0.35;
      ctx.globalAlpha = 0.22 + Math.sin(dn / 22) * 0.08;
      ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 1; ctx.shadowColor = "#FFFFFF"; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(0, 0, _pr, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // Beat-precision vulnerability ring: cyan pulse, thicker when streak widens the window
    if (!e.isBossEnemy && _beatVulnActive) {
      const _bvMastered = _beatVulnWindow > 8;
      ctx.globalAlpha = _bvMastered ? 0.75 : 0.55;
      ctx.strokeStyle = _bvMastered ? "#00FFDD" : "#00FFEE";
      ctx.lineWidth = _bvMastered ? 2.5 : 1.5;
      ctx.shadowColor = "#00FFEE";
      ctx.shadowBlur = _bvMastered ? 14 : 8;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // Boss ability telegraph bars (show next-ability cooldown as thin bar under HP bar)
    if (e.isBossEnemy) {
      const bw = e.size + 4;
      const _waveScale = (gs.currentWave || 1) >= 40 ? 1.4 : (gs.currentWave || 1) >= 30 ? 1.2 : 1.0;
      // Collect active ability cooldowns — show the one with most progress (nearest firing)
      const bars = [];
      if (e.hasBulletRing)  bars.push({ timer: e.bulletRingTimer || 0,  cap: Math.floor(360 * _waveScale), color: "#FF6600", label: "🔥" });
      if (e.hasGroundSlam && !e.groundSlamActive) bars.push({ timer: e.groundSlamTimer || 0, cap: Math.floor(420 * _waveScale), color: "#FF4400", label: "💥" });
      if (e.hasTeleport)    bars.push({ timer: e.teleportTimer || 0,    cap: Math.floor(480 * _waveScale), color: "#FF1493", label: "🌀" });
      if (bars.length > 0) {
        // Pick the bar with highest progress ratio
        bars.sort((a, b) => (b.timer / b.cap) - (a.timer / a.cap));
        const bar = bars[0];
        const ratio = Math.min(1, bar.timer / bar.cap);
        const by = -r - 22; // just above HP bar
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(-bw / 2, by, bw, 3);
        ctx.fillStyle = bar.color; ctx.fillRect(-bw / 2, by, bw * ratio, 3);
      }
    }
    // Name label (+ nemesis 🎯 indicator)
    const _isNemBoss = e.isBossEnemy && gs.nemesisBossType === e.typeIndex;
    ctx.fillStyle = _isNemBoss ? "#FF4400" : (e.isBossEnemy ? "#FF5555" : "rgba(255,255,255,0.85)");
    ctx.font = "bold " + (e.isBossEnemy ? 11 : 9) + "px monospace"; ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 2.5;
    const _nameStr = _isNemBoss ? `🎯 ${e.name}` : e.name;
    ctx.strokeText(_nameStr, 0, r + 14); ctx.fillText(_nameStr, 0, r + 14);
    ctx.restore();
  }

  // Railgun beams
  if (gs.beams && gs.beams.length > 0) {
    gs.beams.forEach(bm => {
      const alpha = bm.life / bm.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = bm.color; ctx.shadowColor = bm.color; ctx.shadowBlur = 20 * alpha; ctx.lineWidth = 3 + alpha * 4;
      ctx.beginPath(); ctx.moveTo(bm.x1, bm.y1); ctx.lineTo(bm.x2, bm.y2); ctx.stroke();
      // Bright core line
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = "#FFFFFF"; ctx.shadowBlur = 0; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bm.x1, bm.y1); ctx.lineTo(bm.x2, bm.y2); ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // Player bullets
  // S145 FX: weapon-tinted tracer trails drawn back along the velocity vector
  // (zero per-bullet memory). Additive blend; off at perf step ≥1 or reduced motion.
  const _tracersOn = _perfStep < 1 && !_rm;
  if (_tracersOn) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    gs.bullets.forEach(b => {
      const _bvx = b.dx ?? b.vx ?? 0, _bvy = b.dy ?? b.vy ?? 0;
      if (!_bvx && !_bvy) return;
      const _wpj = WEAPON_PROJECTILE[b.wpnIdx];
      const _tl = Math.min(4.5, 2.5 + (b.size || 4) * 0.25) * (_wpj?.trailMult || 1);
      const grad = ctx.createLinearGradient(b.x, b.y, b.x - _bvx * _tl, b.y - _bvy * _tl);
      grad.addColorStop(0, b.color || "#FFD700");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1.5, (b.size || 4) * 0.7);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - _bvx * _tl, b.y - _bvy * _tl); ctx.stroke();
    });
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  gs.bullets.forEach(b => {
    ctx.save(); ctx.translate(b.x, b.y);
    if (b.boomerang) {
      // Boomerang: spinning curved disc
      ctx.rotate(Date.now() / 80);
      ctx.fillStyle = b.returning ? "#FFD700" : b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.size * 1.4, b.size * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.ellipse(0, 0, b.size * 1.4, b.size * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      // S155 — weapon-specific projectile shapes; unknown weapons keep the orb.
      const _wpj = WEAPON_PROJECTILE[b.wpnIdx];
      const _bvx = b.vx || 0, _bvy = b.vy || 0;
      const _shape = _wpj?.shape || "orb";
      ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      if (_shape === "bolt" && (_bvx || _bvy)) {
        ctx.rotate(Math.atan2(_bvy, _bvx));
        const _st = _wpj.stretch || 2.2;
        ctx.beginPath(); ctx.ellipse(0, 0, b.size * _st * 0.6, b.size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.ellipse(b.size * _st * 0.18, 0, b.size * _st * 0.28, b.size * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      } else if (_shape === "rocket" && (_bvx || _bvy)) {
        ctx.rotate(Math.atan2(_bvy, _bvx));
        ctx.beginPath(); ctx.ellipse(0, 0, b.size * 1.5, b.size * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#802020"; // fins
        ctx.beginPath(); ctx.moveTo(-b.size * 1.2, 0); ctx.lineTo(-b.size * 1.9, -b.size * 0.8); ctx.lineTo(-b.size * 1.9, b.size * 0.8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#FFC24D"; // exhaust flicker
        ctx.globalAlpha = 0.75 + Math.random() * 0.25;
        ctx.beginPath(); ctx.arc(-b.size * 1.9, 0, b.size * (0.5 + Math.random() * 0.3), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (_shape === "pellet") {
        ctx.beginPath(); ctx.arc(0, 0, b.size * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(0, 0, b.size * 0.38, 0, Math.PI * 2); ctx.fill();
        if (_wpj.ring) {
          ctx.strokeStyle = b.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.arc(0, 0, b.size * 1.5, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (_shape === "spark") {
        ctx.rotate(Date.now() / 60 + (b.life || 0));
        ctx.beginPath();
        for (let _si = 0; _si < 8; _si++) {
          const _sr = _si % 2 === 0 ? b.size * 1.5 : b.size * 0.5;
          const _sa = (_si / 8) * Math.PI * 2;
          if (_si === 0) ctx.moveTo(Math.cos(_sa) * _sr, Math.sin(_sa) * _sr);
          else ctx.lineTo(Math.cos(_sa) * _sr, Math.sin(_sa) * _sr);
        }
        ctx.closePath(); ctx.fill();
      } else if (_shape === "note") {
        ctx.rotate(0.35);
        ctx.beginPath(); ctx.ellipse(0, b.size * 0.5, b.size * 0.8, b.size * 0.55, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(b.size * 0.55, -b.size * 1.3, Math.max(1.2, b.size * 0.24), b.size * 1.8);
      } else {
        if (_wpj?.confetti) ctx.fillStyle = `hsl(${(Date.now() / 4 + (b.life || 0) * 31) % 360},95%,65%)`;
        ctx.beginPath(); ctx.arc(0, 0, b.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  });

  // S155: brief explosion light halo (additive), same treatment as the muzzle
  if (gs.explosionFlash && !_rm && _perfStep < 2) {
    const _ef = gs.explosionFlash;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const _efR = 90 + _ef.life * 30;
    const _efG = ctx.createRadialGradient(_ef.x, _ef.y, 0, _ef.x, _ef.y, _efR);
    _efG.addColorStop(0, `rgba(255,190,80,${0.14 * _ef.life / 3})`);
    _efG.addColorStop(1, "rgba(255,190,80,0)");
    ctx.fillStyle = _efG;
    ctx.beginPath(); ctx.arc(_ef.x, _ef.y, _efR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Particles — additive glow (S145); when frame budget is hot, render only
  // every other particle, and drop the blend mode entirely at step ≥2.
  const _reduced = typeof window !== "undefined" && window.__codReducedEffects;
  const _pStride = _reduced ? 2 : 1;
  if (_perfStep < 2) ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < gs.particles.length; i += _pStride) {
    const pt = gs.particles[i];
    const _lf = pt.life / pt.maxLife;
    ctx.globalAlpha = _lf; ctx.fillStyle = pt.color;
    // S155 kinds — collapse to the classic circle at perf step ≥2.
    if (_perfStep < 2 && pt.kind === "spark" && (pt.vx || pt.vy)) {
      ctx.strokeStyle = pt.color; ctx.lineWidth = Math.max(1, pt.size * 0.4);
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x - pt.vx * 3, pt.y - pt.vy * 3); ctx.stroke();
    } else if (_perfStep < 2 && pt.kind === "smoke") {
      ctx.globalAlpha = _lf * 0.35;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (1.6 - _lf * 0.8), 0, Math.PI * 2); ctx.fill();
    } else if (_perfStep < 2 && (pt.kind === "debris" || pt.kind === "casing")) {
      ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot || 0);
      const _pw = pt.size * (pt.kind === "casing" ? 1.8 : 1.2);
      ctx.fillRect(-_pw / 2, -pt.size / 2, _pw, pt.size);
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * _lf, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  // Chain Lightning arcs
  if (gs.lightningArcs && gs.lightningArcs.length > 0) {
    gs.lightningArcs.forEach(arc => {
      const alpha = arc.life / arc.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#00E5FF"; ctx.shadowColor = "#00E5FF"; ctx.shadowBlur = 14; ctx.lineWidth = 2;
      const ldx = arc.x2 - arc.x1, ldy = arc.y2 - arc.y1;
      const steps = Math.max(3, Math.floor(Math.hypot(ldx, ldy) / 22));
      ctx.beginPath(); ctx.moveTo(arc.x1, arc.y1);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const jx = ((Math.sin(arc.x1 * 127.1 + arc.y1 * 311.7 + i * 74.3) * 43758.5453) % 1);
        const jy = ((Math.sin(arc.x2 * 127.1 + arc.y2 * 311.7 + i * 74.3) * 43758.5453) % 1);
        ctx.lineTo(arc.x1 + ldx * t + (jx - 0.5) * 18, arc.y1 + ldy * t + (jy - 0.5) * 18);
      }
      ctx.lineTo(arc.x2, arc.y2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // Dying enemy animations — the enemy's own sprite squash-falls (S145);
  // emoji rise-out remains the fallback and the Retro-pack look.
  (gs.dyingEnemies || []).forEach(de => {
    const t = de.life / de.maxLife; // 1→0
    const _deSprite = (!retroCharacters && de.typeIndex !== undefined)
      ? ((de.isZombie && getRuntimeZombieSprite(de.zombieVariant, de.isBossEnemy)) || getRuntimeEnemySprite(de.typeIndex))
      : null;
    ctx.save();
    if (_deSprite && !_rm) {
      const death = resolveSpriteDeath(1 - t);
      const _dh = Math.max(58, (de.size / 2) * 3.15);
      const _dw = _dh * (_deSprite.sourceWidth / _deSprite.sourceHeight);
      ctx.translate(de.x, de.y + death.offsetY);
      ctx.rotate(death.rotation);
      ctx.scale(death.scaleX, death.scaleY);
      ctx.globalAlpha = death.alpha;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(_deSprite.image, _deSprite.sourceX, _deSprite.sourceY, _deSprite.sourceWidth, _deSprite.sourceHeight, -_dw / 2, -_dh * 0.55, _dw, _dh);
    } else {
      ctx.translate(de.x, de.y - (1 - t) * 25);
      ctx.globalAlpha = t; ctx.scale(1 + (1 - t) * 0.6, 1 + (1 - t) * 0.6);
      ctx.font = (de.size * 0.55) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(de.emoji, 0, 0);
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  // Ghost race: render previous-run ghost at matching frame position
  if (gs.ghost && gs.ghost.length > 0) {
    const _gf = frameCountRef.current;
    // Binary-search for nearest ghost sample to current frame
    let _lo = 0, _hi = gs.ghost.length - 1, _mid;
    while (_lo < _hi) { _mid = (_lo + _hi) >> 1; if (gs.ghost[_mid].f < _gf) _lo = _mid + 1; else _hi = _mid; }
    const _gp = gs.ghost[Math.min(_lo, gs.ghost.length - 1)];
    if (_gp) {
      // Ghost still has frames left → draw ghost dot
      const _ghostAlive = _lo < gs.ghost.length - 1;
      ctx.save();
      ctx.globalAlpha = _ghostAlive ? 0.35 : 0.15;
      ctx.translate(_gp.x, _gp.y);
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(100,220,255,0.45)"; ctx.fill();
      ctx.strokeStyle = _ghostAlive ? "rgba(100,220,255,0.75)" : "rgba(100,220,255,0.25)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#88FFFF";
      ctx.fillText(_ghostAlive ? "GHOST" : "✓ BEAT", 0, -20);
      ctx.restore();

      // AHEAD / BEHIND indicator (top-centre, below wave bar)
      const _dist = Math.hypot(p.x - _gp.x, p.y - _gp.y);
      const _ahead = !_ghostAlive || _gf > _gp.f + 60; // ahead if ghost is dead or lagging 1s
      ctx.save();
      ctx.textAlign = "center"; ctx.font = "bold 10px monospace";
      ctx.fillStyle = _ahead ? "#00FF88" : "#FF4444";
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.9;
      ctx.fillText(_ahead ? "▲ AHEAD OF GHOST" : "▼ BEHIND GHOST  +" + Math.round(_dist) + "px", W / 2, isMobile ? 72 : 66);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // Player — layered soldier: shadow → legs → [rotate] → gun → vest → helmet
  ctx.save(); ctx.translate(p.x, p.y);
  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(2, 14, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Invincible blink / dash glow
  const _blink = p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0;
  if (_blink) ctx.globalAlpha = 0.35;
  if (dashRef.current.active > 0) { ctx.globalAlpha = _blink ? 0.35 : 0.68; ctx.shadowColor = "#00FFFF"; ctx.shadowBlur = 22; }
  // Adrenaline Rush speed-burst glow ring
  if ((gs.adrenalineRushTimer || 0) > 0) {
    const _rA = 0.55 + Math.sin(dn / 55) * 0.3;
    ctx.globalAlpha = _rA; ctx.strokeStyle = "#FF6600"; ctx.shadowColor = "#FF6600"; ctx.shadowBlur = 18; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = _blink ? 0.35 : 1;
  }
  // Rage glow ring
  if ((gs.rageTimer || 0) > 0) {
    const _rgA = 0.5 + Math.sin(dn / 40) * 0.35;
    ctx.globalAlpha = _rgA; ctx.strokeStyle = "#FF4400"; ctx.shadowColor = "#FF4400"; ctx.shadowBlur = 22; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = _blink ? 0.35 : 1;
  }
  // Freeze aura
  if ((gs.freezeTimer || 0) > 0) {
    const _fzA = 0.35 + Math.sin(dn / 90) * 0.20;
    ctx.globalAlpha = _fzA; ctx.strokeStyle = "#88CCFF"; ctx.shadowColor = "#88CCFF"; ctx.shadowBlur = 14; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = _blink ? 0.35 : 1;
  }
  // Time dilation aura — pulsing violet ring
  if ((gs.timeDilationTimer || 0) > 0) {
    const _tdA = 0.55 + Math.sin(dn / 25) * 0.30;
    ctx.globalAlpha = _tdA; ctx.strokeStyle = "#CC88FF"; ctx.shadowColor = "#CC88FF"; ctx.shadowBlur = 20; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = _blink ? 0.35 : 1;
  }
  // Aim flow state ring — precision streak visual (streak >= 5)
  const _ps = gs.precisionStreak || 0;
  if (_ps >= 5) {
    const _psNorm = Math.min(1, (_ps - 5) / 10);
    const _psAlpha = (0.22 + _psNorm * 0.55) * (0.7 + Math.sin(dn / 18) * 0.3);
    const _r = Math.round(0x88 + _psNorm * (0xFF - 0x88));
    const _g = Math.round(0xFF - _psNorm * (0xFF - 0x88));
    const _b = Math.round(0xFF - _psNorm * (0xFF - 0xFF));
    const _psColor = `rgb(${_r},${_g},${_b})`;
    ctx.globalAlpha = _psAlpha; ctx.strokeStyle = _psColor; ctx.shadowColor = _psColor; ctx.shadowBlur = 12 + _psNorm * 10; ctx.lineWidth = 1.5 + _psNorm;
    ctx.beginPath(); ctx.arc(0, 0, 27 + _psNorm * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = _blink ? 0.35 : 1;
  }
  if (retroCharacters) {
    drawRetroPlayerCharacter(ctx, { angle: p.angle, weapon: WEAPONS[wpnIdx], muzzleFlash: gs.muzzleFlash });
    if (gs.playerSkin) {
      ctx.font = "12px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(gs.playerSkin, 0, 0);
    }
  } else {
  // Legs — S155 walk cycle: stride phase accumulates from actual distance
  // traveled (not wall-clock), so steps land with movement speed and stop
  // when the player stops. Legs alternate along the movement direction;
  // idle keeps a subtle breathing shuffle. Frozen at perf step 3.
  {
    const _pdx = p.x - (gs._lastPlayerX ?? p.x);
    const _pdy = p.y - (gs._lastPlayerY ?? p.y);
    gs._lastPlayerX = p.x; gs._lastPlayerY = p.y;
    const _step = Math.hypot(_pdx, _pdy);
    const _moving = _step > 0.3 && _perfStep < 3;
    if (_moving) gs._strideDist = (gs._strideDist || 0) + _step;
    const _phase = ((gs._strideDist || 0) / 13) * Math.PI; // full cycle ≈ 26px
    const _lb = _moving ? Math.sin(_phase) * 5 : Math.sin(frameCountRef.current * 0.08) * 1.2;
    const _mvLen = _moving ? _step : 1;
    const _ux = _moving ? _pdx / _mvLen : 0.8, _uy = _moving ? _pdy / _mvLen : 0;
    ctx.fillStyle = "#284A28";
    ctx.beginPath(); ctx.ellipse(-5 + _ux * _lb, 11 + _uy * _lb * 0.55, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4 - _ux * _lb, 11 - _uy * _lb * 0.55, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  // The operative is an upright world character. Only the weapon pivots toward
  // aim; rotating the whole body made southward aim flip the soldier upside down.
  const operativeSprite = getRuntimeCharacterSprite("player");
  if (operativeSprite) {
    const previousSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.shadowColor = "rgba(0,0,0,0.58)"; ctx.shadowBlur = 7;
    ctx.drawImage(operativeSprite, -30, -34, 60, 60);
    ctx.shadowBlur = 0;
    ctx.imageSmoothingEnabled = previousSmoothing;
  } else {
    // Upright procedural fallback — still premium enough to remain readable
    // while the v3 raster source is loading or reduced-data mode is active.
    drawShadedOrb(ctx, { radius: 13, material: "combatGreen", squash: 0.85, rimWidth: 2 });
    ctx.strokeStyle = "rgba(18,45,18,0.7)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(3, 8); ctx.stroke();
    ctx.fillStyle = "rgba(28,55,28,0.8)"; ctx.fillRect(-8, -4, 5, 5);
    drawShadedOrb(ctx, { radius: 10, material: "combatGreen", rimWidth: 1.5 });
    ctx.fillStyle = "rgba(70,240,110,0.55)";
    ctx.beginPath(); ctx.ellipse(6, 0, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Player skin overlay remains upright with the character.
  if (gs.playerSkin) {
    ctx.font = "12px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(gs.playerSkin, 0, 0);
  }

  ctx.save();
  ctx.rotate(getPlayerRenderPose(p.angle).weaponAngle);
  const curWpn = WEAPONS[wpnIdx];
  const weaponAccent = buildWeaponAccent(curWpn);
  // Independent aim arm, grip, and weapon silhouette.
  ctx.strokeStyle = "rgba(230,235,220,0.82)"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(13, 0); ctx.stroke(); ctx.lineCap = "butt";
  ctx.fillStyle = "#2A313A"; ctx.fillRect(8, -3, 7, 7);
  // S145: dedicated weapon sprite (atlas, facing +x); procedural barrel stays
  // as the load-failure fallback so weapon identity never disappears.
  const weaponSprite = getWeaponSprite(wpnIdx);
  if (weaponSprite) {
    const _wH = 46;
    const _wW = _wH * (weaponSprite.width / weaponSprite.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(weaponSprite.image, weaponSprite.x, weaponSprite.y, weaponSprite.width, weaponSprite.height, 4, -_wH / 2 + 1, _wW, _wH);
  } else {
    drawWeaponBarrel(ctx, weaponAccent);
  }
  // Reset alpha before muzzle flash (so flash is always bright)
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (gs.muzzleFlash > 0) {
    const _mfX = weaponSprite ? 42 : 35;
    ctx.shadowColor = "#FFD740"; ctx.shadowBlur = gs.muzzleFlash * 5;
    // Star-burst muzzle: bright core + weapon-tinted spikes (S145 FX pass).
    ctx.fillStyle = `rgba(255,220,60,${gs.muzzleFlash / 4})`;
    ctx.beginPath(); ctx.arc(_mfX, 0, 4 + gs.muzzleFlash * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,240,150,${gs.muzzleFlash / 5})`;
    ctx.lineWidth = 2; ctx.lineCap = "round";
    const _mfLen = 6 + gs.muzzleFlash * 3;
    for (let _mi = 0; _mi < 3; _mi++) {
      const _ma = (_mi - 1) * 0.5;
      ctx.beginPath(); ctx.moveTo(_mfX + 2, 0);
      ctx.lineTo(_mfX + 2 + Math.cos(_ma) * _mfLen, Math.sin(_ma) * _mfLen); ctx.stroke();
    }
    ctx.lineCap = "butt"; ctx.shadowBlur = 0;
    // S155: additive light halo — the flash "illuminates" the floor around
    // the muzzle. Off under reduced motion (flash suppression) and perf ≥2.
    if (!_rm && _perfStep < 2) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const _mfR = 55 + gs.muzzleFlash * 16;
      const _halo = ctx.createRadialGradient(_mfX, 0, 0, _mfX, 0, _mfR);
      _halo.addColorStop(0, `rgba(255,214,96,${0.12 * (gs.muzzleFlash / 4)})`);
      _halo.addColorStop(1, "rgba(255,214,96,0)");
      ctx.fillStyle = _halo;
      ctx.beginPath(); ctx.arc(_mfX, 0, _mfR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
  }
  ctx.restore();

  // Floating texts
  gs.floatingTexts.forEach(ft => {
    const _ftBig = ft.big === true || (typeof ft.text === "string" && ft.text.includes("💥"));
    const maxLife = _ftBig ? 90 : ft.quote ? 110 : 60;
    ctx.globalAlpha = Math.min(1, ft.life / maxLife);
    ctx.fillStyle = ft.color; ctx.textAlign = "center";
    if (ft.quote) {
      ctx.font = "bold italic 16px monospace";
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4;
    } else if (_ftBig) {
      ctx.font = "bold 31px monospace";
      ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
    } else {
      ctx.font = "bold 13px monospace";
      ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    }
    ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillText(ft.text, ft.x, ft.y);
  });
  ctx.globalAlpha = 1;

  // Restore camera translate before screen-space overlays (radar, flash, vignette).
  if (_hasCam) ctx.restore();

  // Mini-radar — always screen-space; enemy positions are relative to player.
  // Scale the radar to show the full royale world (bots can be >W*0.6 away).
  const rs = 45, rx = W - rs - 8, ry = isMobile ? 52 : 48;
  const _radarScale = _rwld ? Math.max(W * 0.6, _rwld.W * 0.65) : W * 0.6;
  ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = gs.bossWave ? "#F00" : "#0F0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#0F0"; ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
  for (let _ri = 0; _ri < (gs.enemies || []).length; _ri++) {
    const e = gs.enemies[_ri];
    if (!e) continue;
    const edx = (e.x - p.x) / _radarScale * rs, edy = (e.y - p.y) / _radarScale * rs;
    if (Math.hypot(edx, edy) < rs - 2) {
      ctx.fillStyle = e.isBossEnemy ? "#FF00FF" : e.typeIndex >= 4 ? "#F00" : e.ranged ? "#F80" : "#FF0";
      ctx.beginPath(); ctx.arc(rx + edx, ry + edy, e.isBossEnemy ? 4 : 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Rage active: red pulse overlay
  if ((gs.rageTimer || 0) > 0) {
    const rageAlpha = Math.min(gs.rageTimer / 300, 1) * (0.06 + Math.sin(Date.now() / 120) * 0.03);
    ctx.fillStyle = `rgba(255,68,0,${rageAlpha})`; ctx.fillRect(0, 0, W, H);
  }
  // Freeze active: blue tint + frost vignette
  if ((gs.freezeTimer || 0) > 0) {
    const freezeAlpha = Math.min(gs.freezeTimer / 180, 1) * 0.10;
    ctx.fillStyle = `rgba(120,200,255,${freezeAlpha})`; ctx.fillRect(0, 0, W, H);
  }
  // Time dilation: purple vignette + chromatic edge + HUD countdown
  if ((gs.timeDilationTimer || 0) > 0) {
    const _td = gs.timeDilationTimer;
    const _tdAlpha = Math.min(_td / 360, 1) * 0.12;
    ctx.fillStyle = `rgba(160,80,255,${_tdAlpha})`; ctx.fillRect(0, 0, W, H);
    // Vignette edge
    const _vigGrad = ctx.createRadialGradient(W/2, H/2, H*0.25, W/2, H/2, H*0.75);
    _vigGrad.addColorStop(0, "rgba(0,0,0,0)");
    _vigGrad.addColorStop(1, `rgba(80,0,160,${Math.min(_td/360,1)*0.25})`);
    ctx.fillStyle = _vigGrad; ctx.fillRect(0, 0, W, H);
    // HUD countdown label
    const _secs = Math.ceil(_td / 60);
    ctx.globalAlpha = 0.92; ctx.font = "bold 13px 'Courier New',monospace";
    ctx.textAlign = "center"; ctx.fillStyle = "#CC88FF";
    ctx.shadowColor = "#CC88FF"; ctx.shadowBlur = 10;
    ctx.fillText(`⏳ BULLET TIME ${_secs}s`, W / 2, 52);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // Boss kill golden flash
  if (!_rm && (gs.bossKillFlash || 0) > 0) {
    ctx.fillStyle = `rgba(255,200,30,${(gs.bossKillFlash / 22) * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  // Critical-health visual: pulsing deep-red vignette when HP < 15%.
  if (!_rm && gs.criticalHealthVisualActive) {
    const _lsPulse = 0.20 + Math.sin(dn / 110) * 0.08;
    const _lsGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.68);
    _lsGrad.addColorStop(0, "rgba(0,0,0,0)");
    _lsGrad.addColorStop(1, `rgba(200,0,0,${_lsPulse})`);
    ctx.fillStyle = _lsGrad; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = _lsPulse * 0.55;
    ctx.strokeStyle = "#CC0000"; ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    ctx.restore();
  }
  // Heat Meter visual integration: a restrained palette lift at high tempo,
  // then a tiny hit-reactive edge split in overdrive.
  if (!_rm && (gs.heat || 0) >= 40) {
    const heat = Math.min(100, gs.heat || 0);
    const warmAlpha = heat >= 70 ? 0.08 : 0.045;
    ctx.fillStyle = `rgba(255,120,20,${warmAlpha})`;
    ctx.fillRect(0, 0, W, H);
    if (heat >= 70 && (gs.killFlash > 0 || gs.damageFlash > 0)) {
      const split = 2 + Math.sin(Date.now() / 45) * 1.5;
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(0,229,255,0.035)";
      ctx.fillRect(split, 0, W, H);
      ctx.fillStyle = "rgba(255,40,90,0.035)";
      ctx.fillRect(-split, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  // Run-arc atmospheric vignette: edge color shifts by act, deepens toward LEGEND
  if (!_rm && gs._runAct) {
    const _actColors = {
      'THE OPENER': [0, 68, 255],
      'THE GRIND':  [200, 100, 0],
      'THE PUSH':   [220, 40, 0],
      'THE LEGEND': [140, 0, 0],
    };
    const _actAlpha = {
      'THE OPENER': 0.04,
      'THE GRIND':  0.055,
      'THE PUSH':   0.08,
      'THE LEGEND': 0.12,
    };
    const _ac = _actColors[gs._runAct];
    const _aa = _actAlpha[gs._runAct] || 0;
    if (_ac && _aa > 0) {
      const _vKey = `${gs._runAct}:${W}:${H}`;
      if (!gs._runActVignetteStyle || gs._runActVignetteKey !== _vKey) {
        const _vgr = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.78);
        _vgr.addColorStop(0, `rgba(${_ac[0]},${_ac[1]},${_ac[2]},0)`);
        _vgr.addColorStop(1, `rgba(${_ac[0]},${_ac[1]},${_ac[2]},${_aa})`);
        gs._runActVignetteStyle = _vgr;
        gs._runActVignetteKey = _vKey;
      }
      ctx.fillStyle = gs._runActVignetteStyle;
      ctx.fillRect(0, 0, W, H);
    }
  }
  // Damage / kill flash
  if (!_rm && gs.damageFlash > 0) { ctx.fillStyle = "rgba(255,0,0," + (gs.damageFlash * 0.03) + ")"; ctx.fillRect(0, 0, W, H); }
  if (!_rm && gs.killFlash > 0) { ctx.fillStyle = "rgba(255,215,0," + (gs.killFlash * 0.015) + ")"; ctx.fillRect(0, 0, W, H); }
  // Mutation accept flash banner
  if (!_rm && (gs._mutationAcceptFlash?.framesLeft || 0) > 0) {
    const _maf = gs._mutationAcceptFlash;
    const _ft = Math.min(1, _maf.framesLeft / 18);
    ctx.fillStyle = `rgba(160,0,50,${_ft * 0.55})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = _ft;
    ctx.textAlign = "center";
    ctx.font = "bold 19px monospace"; ctx.fillStyle = "#FFF";
    ctx.shadowColor = "#FF2255"; ctx.shadowBlur = 18;
    ctx.fillText("☠ DIRTY DEAL SIGNED ☠", W / 2, H / 2 - 14);
    ctx.font = "bold 14px monospace"; ctx.fillStyle = "#FF88AA";
    ctx.shadowBlur = 0;
    ctx.fillText(_maf.label, W / 2, H / 2 + 12);
    ctx.globalAlpha = 1;
  }
  // Combo milestone fullscreen card — RAMPAGE/GODLIKE/UNSTOPPABLE
  if (!_rm && (gs._comboCardTimer || 0) > 0) {
    const _cct = gs._comboCardTimer;
    const _tier = gs._comboCardTier || 'rampage';
    const _color = _tier === 'unstoppable' ? '#FFD700' : _tier === 'godlike' ? '#FF0088' : '#FF6400';
    const _alpha = Math.min(1, _cct / 15) * (_cct < 20 ? _cct / 20 : 1);
    const _label = _tier === 'unstoppable' ? 'UNSTOPPABLE!!' : _tier === 'godlike' ? 'GODLIKE!!' : 'RAMPAGE!!';
    ctx.save();
    ctx.globalAlpha = _alpha * 0.85;
    ctx.fillStyle = `rgba(0,0,0,0.72)`;
    ctx.fillRect(0, H / 2 - 52, W, 104);
    ctx.strokeStyle = _color + '88';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, H / 2 - 52, W, 104);
    ctx.textAlign = 'center';
    ctx.shadowColor = _color;
    ctx.shadowBlur = 32;
    ctx.fillStyle = _color;
    ctx.font = `bold clamp(28px,6vw,48px) 'Courier New',monospace`;
    ctx.font = `bold ${Math.round(Math.min(W * 0.07, 48))}px 'Courier New',monospace`;
    ctx.fillText(_label, W / 2, H / 2 + 16);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // Boss wave red pulse
  if (!_rm && gs.bossWave) {
    ctx.fillStyle = "rgba(255,0,0," + (0.03 + Math.sin(Date.now() / 300) * 0.02) + ")";
    ctx.fillRect(0, 0, W, H);
  }

  // Touch joysticks
  const drawStick = (ref, baseColor) => {
    if (!ref.current.active) return;
    const j = ref.current, rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const cx = (j.startX - rect.left) * sx, cy = (j.startY - rect.top) * sy;
    ctx.globalAlpha = 0.15; ctx.fillStyle = baseColor;
    ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.45;
    const clampD = Math.min(Math.hypot(j.dx, j.dy), 50);
    const ang = Math.atan2(j.dy, j.dx);
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * clampD * sx, cy + Math.sin(ang) * clampD * sy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  };
  drawStick(joystickRef, "#FFF"); drawStick(shootStickRef, "#F66");

  // Wave kill attribution card (shows top-3 killed types after each wave)
  if (!_rm && (gs._waveKillFeed?.framesLeft || 0) > 0) {
    const _wkf = gs._waveKillFeed;
    const _ft = Math.min(1, _wkf.framesLeft / 18);
    const _bw = Math.min(W - 40, 380), _bh = 46, _bx = (W - _bw) / 2, _by = H / 2 + 20;
    ctx.globalAlpha = _ft * 0.88;
    ctx.fillStyle = "rgba(0,8,0,0.78)"; ctx.fillRect(_bx, _by, _bw, _bh);
    ctx.strokeStyle = "#2A6"; ctx.lineWidth = 1.5; ctx.strokeRect(_bx, _by, _bw, _bh);
    ctx.fillStyle = "#9BE7FF"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
    ctx.fillText("WAVE " + _wkf.wave + " — NEUTRALIZED", W / 2, _by + 14);
    ctx.fillStyle = "#DDD"; ctx.font = "bold 11px monospace";
    ctx.fillText(_wkf.text, W / 2, _by + 33);
    ctx.globalAlpha = 1;
  }

  // Boss Rush mode badge
  if (gs.bossRushMode) {
    ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = "#FF3333"; ctx.shadowColor = "#FF3333"; ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.8 + Math.sin(Date.now() / 300) * 0.2;
    ctx.fillText("☠ BOSS RUSH", W / 2, isMobile ? 60 : 54);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // Score attack countdown
  if (gs.scoreAttackMode && (gs.scoreAttackTimeLeft || 0) > 0) {
    const secs = Math.ceil(gs.scoreAttackTimeLeft / 60);
    const mins = Math.floor(secs / 60);
    const rem  = secs % 60;
    const urgent = secs <= 30;
    const timerStr = `⏱ ${mins}:${String(rem).padStart(2, "0")}`;
    ctx.font = "bold 15px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = urgent ? "#FF4444" : "#FFD700";
    ctx.shadowColor = urgent ? "#FF4444" : "#FFD700"; ctx.shadowBlur = urgent ? 16 : 8;
    if (urgent) {
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 120) * 0.3;
    }
    ctx.fillText(timerStr, W / 2, isMobile ? 48 : 42);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    // "SCORE ATTACK" label
    ctx.font = "bold 9px monospace"; ctx.fillStyle = urgent ? "#FF4444" : "#FF8800";
    ctx.fillText("SCORE ATTACK", W / 2, isMobile ? 60 : 54);
  }

  // Wave event banner (persists for the whole wave)
  if (gs.waveEvent) {
    const _evLabels = { fast_round: "⚡ FAST ROUND", siege: "🪖 SIEGE", elite_only: "👑 ELITE ONLY", fog_of_war: "🌫️ FOG OF WAR" };
    const _evColors = { fast_round: "#FF8800", siege: "#FF4444", elite_only: "#FFD700", fog_of_war: "#88CCFF" };
    const _evLabel = _evLabels[gs.waveEvent] || gs.waveEvent.toUpperCase();
    const _evColor = _evColors[gs.waveEvent] || "#FFF";
    const _blink = Math.sin(Date.now() / 400) > 0;
    ctx.globalAlpha = _blink ? 0.85 : 0.65;
    ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = _evColor;
    ctx.shadowColor = _evColor; ctx.shadowBlur = 10;
    ctx.fillText(_evLabel, W / 2, 28);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // Active weapon synergies (bottom-right)
  if (gs.activeSynergies && gs.activeSynergies.length > 0) {
    ctx.textAlign = "right"; ctx.globalAlpha = 0.85;
    let _sy = H - (isMobile ? 90 : 60);
    for (const syn of gs.activeSynergies) {
      ctx.font = "bold 9px monospace"; ctx.fillStyle = syn.color || "#FFD700";
      ctx.shadowColor = syn.color || "#FFD700"; ctx.shadowBlur = 6;
      ctx.fillText(syn.emoji + " " + syn.name.toUpperCase(), W - 10, _sy);
      _sy -= 13;
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // Arena layout name (first 4 seconds)
  if (gs._layoutName && (Date.now() - (gs._layoutShowTime || (gs._layoutShowTime = Date.now()))) < 4000) {
    ctx.globalAlpha = Math.max(0, 1 - (Date.now() - gs._layoutShowTime) / 4000) * 0.6;
    ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = "#AAA"; ctx.fillText("🗺 " + gs._layoutName, W / 2, H - 24);
    ctx.globalAlpha = 1;
  }

  // Tips (early waves)
  if (gs.currentWave <= 3) {
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#FFF"; ctx.font = "11px monospace"; ctx.textAlign = "center";
    ctx.fillText(tip, W / 2, H - 10); ctx.globalAlpha = 1;
  }

  // DPS counter (settings)
  if (gs.settShowDPS) {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const dps = elapsed > 1 ? Math.round(gs.totalDamage / elapsed) : 0;
    ctx.font = "bold 11px monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#FF6B35"; ctx.globalAlpha = 0.85;
    ctx.fillText("DPS " + dps.toLocaleString(), 12, H - 22); ctx.globalAlpha = 1;
  }

  // Custom crosshair
  const _ch = gs.settCrosshair;
  if (_ch && _ch !== "cross" && !isMobile) {
    const mx = mouseRef.current.x, my = mouseRef.current.y;
    ctx.save();
    ctx.strokeStyle = "#FFF"; ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
    if (_ch === "dot") { ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill(); }
    else if (_ch === "circle") { ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  ctx.restore();

  // ── ADS scope overlay (drawn in screen space, outside zoom) ──
  if (gs.adsZoom) {
    // Dark vignette around edges
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.min(W, H) * 0.65);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // Scope ring
    ctx.save();
    ctx.strokeStyle = "rgba(0,229,255,0.55)"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    const sr = Math.min(W, H) * 0.22;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, sr, 0, Math.PI * 2); ctx.stroke();
    // Crosshair lines through ring
    ctx.strokeStyle = "rgba(0,229,255,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - sr, H / 2); ctx.lineTo(W / 2 + sr, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - sr); ctx.lineTo(W / 2, H / 2 + sr); ctx.stroke();
    // Center dot
    ctx.fillStyle = "rgba(0,229,255,0.9)"; ctx.shadowColor = "#00E5FF"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    // ADS label
    ctx.font = "bold 10px 'Courier New',monospace"; ctx.fillStyle = "rgba(0,229,255,0.6)";
    ctx.textAlign = "center"; ctx.fillText("ADS", W / 2, H / 2 + sr + 18);
    ctx.restore();
  }

  // Player-relative threat compass — screen-space by contract. Enemy world
  // positions are transformed around the same ADS focus as the arena, then
  // bounded/aggregated after the world transform has been restored.
  const _offscreenArrows = getOffscreenThreatArrows(_enemiesDraw, W, H, {
    fogOfWar: Boolean(gs.fogOfWar),
    focusX: p?.x ?? W / 2,
    focusY: p?.y ?? H / 2,
    zoom: gs.adsZoom ? 1.28 : 1,
  });
  drawOffscreenThreatArrows(ctx, _offscreenArrows);
}


// ── S163 mode layer: zones, structures, allies ───────────────────────────
function drawModeLayer(ctx, gs, refs) {
  const frame = refs?.frameCountRef?.current || 0;
  // Flood ring (Bot Royale): everything outside the circle is under water.
  const flood = gs.flood;
  if (flood && Number.isFinite(flood.r)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-4000, -4000, 8000, 8000);
    ctx.arc(flood.cx, flood.cy, flood.r, 0, Math.PI * 2, true);
    ctx.fillStyle = `rgba(20,110,160,${0.28 + 0.06 * Math.sin(frame * 0.05)})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(flood.cx, flood.cy, flood.r, 0, Math.PI * 2);
    ctx.strokeStyle = "#33E6FF"; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -frame * 0.8; ctx.stroke();
    ctx.setLineDash([]);
    if (flood.targetR < flood.r) {
      ctx.beginPath(); ctx.arc(flood.cx, flood.cy, flood.targetR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  const zones = gs.zones || [];
  for (let i = 0; i < zones.length; i += 1) {
    const z = zones[i];
    if (!z || !z.active) continue;
    const captured = z.state === "captured";
    const lost = z.state === "lost";
    const contested = z.state === "contested";
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
    ctx.save();
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    ctx.fillStyle = captured ? "rgba(255,211,79,0.10)" : lost ? "rgba(255,68,68,0.10)" : contested ? `rgba(255,120,0,${0.10 + pulse * 0.08})` : "rgba(136,204,255,0.08)";
    ctx.fill();
    ctx.lineWidth = contested ? 3 : 2;
    ctx.strokeStyle = captured ? "#FFD34F" : lost ? "#FF4444" : contested ? "#FF8800" : "#88CCFF";
    ctx.setLineDash(captured ? [] : [10, 8]);
    ctx.lineDashOffset = -frame * 0.6;
    ctx.stroke();
    ctx.setLineDash([]);
    // Progress arc
    const pct = z.captureFrames ? Math.min(1, z.progress / z.captureFrames) : 0;
    if (pct > 0 && !captured) {
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius + 8, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#FFD34F";
      ctx.stroke();
    }
    if (z.pressure > 0 && !captured) {
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius + 16, -Math.PI / 2, -Math.PI / 2 + (z.pressure / 100) * Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#FF4444";
      ctx.stroke();
    }
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = captured ? "#FFD34F" : "#FFF";
    ctx.fillText((captured ? "👑 " : "") + (z.label || "ZONE"), z.x, z.y - z.radius - 12);
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(captured ? "✓" : `${Math.floor(z.progress / 60)}s`, z.x, z.y + 8);
    ctx.restore();
  }
  const structures = gs.structures || [];
  for (let i = 0; i < structures.length; i += 1) {
    const s = structures[i];
    if (!s || s.alive === false) continue;
    ctx.save();
    const w = s.w || 40, h = s.h || 40;
    ctx.fillStyle = s.kind === "door" ? "#6B4A2B" : s.kind === "exit" ? "rgba(255,211,79,0.25)" : "#3A4A5A";
    ctx.strokeStyle = s.kind === "exit" ? "#FFD34F" : "#DDD";
    ctx.lineWidth = 2;
    ctx.fillRect(s.x - w / 2, s.y - h / 2, w, h);
    ctx.strokeRect(s.x - w / 2, s.y - h / 2, w, h);
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF";
    ctx.fillText(s.kind === "door" ? "🚪" : s.kind === "exit" ? "🚽" : s.kind === "pump" ? "🔧" : "▣", s.x, s.y + 8);
    if (Number.isFinite(s.hp) && s.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(s.x - 30, s.y - h / 2 - 14, 60, 6);
      ctx.fillStyle = "#FFB347"; ctx.fillRect(s.x - 30, s.y - h / 2 - 14, 60 * Math.max(0, s.hp / s.maxHp), 6);
    }
    if (Number.isFinite(s.channel) && s.channelFrames) {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(s.x - 30, s.y - h / 2 - 14, 60, 6);
      ctx.fillStyle = "#FF6600"; ctx.fillRect(s.x - 30, s.y - h / 2 - 14, 60 * Math.min(1, s.channel / s.channelFrames), 6);
    }
    ctx.restore();
  }
  const allies = gs.allies || [];
  for (let i = 0; i < allies.length; i += 1) {
    const a = allies[i];
    if (!a) continue;
    ctx.save();
    const r = a.size / 2;
    if (a.downed) {
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(a.x, a.y, r + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "#FF4444"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (a.reviveProgress > 0) {
        ctx.beginPath(); ctx.arc(a.x, a.y, r + 10, -Math.PI / 2, -Math.PI / 2 + (a.reviveProgress / 90) * Math.PI * 2);
        ctx.strokeStyle = "#00E5FF"; ctx.lineWidth = 4; ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.arc(a.x, a.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = a.hitFlash > 0 ? "#FFF" : (a.color || "#9CFF8A"); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
    ctx.fillStyle = a.hitFlash > 0 ? "#FFFFFF" : "rgba(20,30,20,0.9)"; ctx.fill();
    ctx.font = `${Math.round(a.size * 0.8)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF";
    ctx.fillText(a.emoji || "🙂", a.x, a.y + a.size * 0.3);
    if (!a.downed && a.maxHealth) {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(a.x - r, a.y - r - 10, a.size, 4);
      ctx.fillStyle = a.health / a.maxHealth < 0.3 ? "#FF4444" : "#9CFF8A"; ctx.fillRect(a.x - r, a.y - r - 10, a.size * Math.max(0, a.health / a.maxHealth), 4);
    }
    ctx.font = "bold 9px 'Courier New', monospace";
    ctx.fillStyle = a.color || "#9CFF8A";
    ctx.fillText(a.name || "ALLY", a.x, a.y - r - 14);
    ctx.restore();
  }
}
