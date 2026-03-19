import { WEAPONS } from "./constants.js";

export function drawGame(ctx, canvas, W, H, gs, refs) {
  const { dashRef, mouseRef, joystickRef, shootStickRef, startTimeRef, frameCountRef, isMobile, tip, wpnIdx } = refs;
  const p = gs.player;

  // ────────────────── RENDER ────────────────────────────────────────────
  ctx.save();
  if (gs.screenShake > 0.5) { const _sm = gs.settScreenShakeMult ?? 1; ctx.translate((Math.random() - 0.5) * gs.screenShake * 2 * _sm, (Math.random() - 0.5) * gs.screenShake * 2 * _sm); }

  // Background — per-theme gradient
  const THEME_BG = [
    ["#1e1e3a","#0e0e1a"], // office: dark indigo
    ["#0c1e0c","#060e06"], // bunker: deep military green
    ["#201508","#100a04"], // factory: dark amber
    ["#1a1008","#0a0804"], // ruins: dark sepia
    ["#261808","#140c04"], // desert: deep warm ochre
    ["#081a0c","#040e06"], // forest: deep forest green
    ["#060010","#020008"], // space: deep black-purple
    ["#0a1220","#050a14"], // arctic: cold midnight blue
  ];
  const [bgC0, bgC1] = gs.bossWave ? ["#1a0000","#0e0000"] : (THEME_BG[gs.mapTheme] || THEME_BG[0]);
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bgGrad.addColorStop(0, bgC0);
  bgGrad.addColorStop(1, bgC1);
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

  // ── Floor zone panels (room sections with tile grid, themed per run) ──
  const FZ_FILL = ["rgba(62,55,92,","rgba(35,62,35,","rgba(60,54,36,","rgba(72,46,22,","rgba(90,68,30,","rgba(28,62,28,","rgba(25,12,55,","rgba(40,60,90,"];
  const FZ_TILE = ["rgba(88,76,125,","rgba(50,85,50,","rgba(82,74,48,","rgba(98,62,28,","rgba(125,95,42,","rgba(42,90,42,","rgba(70,35,155,","rgba(65,100,148,"];
  const fzFill = gs.bossWave ? "rgba(82,22,22," : (FZ_FILL[gs.mapTheme] || FZ_FILL[0]);
  const fzTile = gs.bossWave ? "rgba(112,30,30," : (FZ_TILE[gs.mapTheme] || FZ_TILE[0]);
  (gs.floorZones || []).forEach(fz => {
    ctx.save(); ctx.translate(fz.x, fz.y); ctx.rotate(fz.rot);
    const ba = fz.alpha * 2.8 * (gs.bossWave ? 0.75 : 1);
    // Panel fill
    ctx.globalAlpha = ba;
    ctx.fillStyle = fzFill + "1)";
    ctx.beginPath(); ctx.roundRect(-fz.rx, -fz.ry, fz.rx * 2, fz.ry * 2, 5); ctx.fill();
    // Internal tile grid
    ctx.globalAlpha = ba * 0.5;
    ctx.strokeStyle = fzTile + "1)"; ctx.lineWidth = 0.7;
    const TS = 26;
    for (let tx = -fz.rx + TS; tx < fz.rx; tx += TS) { ctx.beginPath(); ctx.moveTo(tx, -fz.ry); ctx.lineTo(tx, fz.ry); ctx.stroke(); }
    for (let ty = -fz.ry + TS; ty < fz.ry; ty += TS) { ctx.beginPath(); ctx.moveTo(-fz.rx, ty); ctx.lineTo(fz.rx, ty); ctx.stroke(); }
    // Panel border
    ctx.globalAlpha = ba * 0.65; ctx.strokeStyle = fzTile + "1)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-fz.rx, -fz.ry, fz.rx * 2, fz.ry * 2, 5); ctx.stroke();
    ctx.globalAlpha = 1; ctx.restore();
  });

  // ── Terrain decorations (floor level, below grid) ──
  const TC = gs.bossWave ? { s:"#3a0808",c:"rgba(90,20,20,0.30)",r:"#4a2020",t:"#2a0a0a" } : [
    { s:"#1c1c3c", c:"rgba(70,70,115,0.28)",  r:"#2a2a4e", t:"#20203e" }, // office
    { s:"#0c200c", c:"rgba(40,100,40,0.28)",   r:"#182818", t:"#122012" }, // bunker
    { s:"#201408", c:"rgba(100,88,40,0.28)",   r:"#281a08", t:"#1e1408" }, // factory
    { s:"#1a1008", c:"rgba(90,65,35,0.28)",    r:"#241808", t:"#1a1208" }, // ruins
    { s:"#201408", c:"rgba(120,92,42,0.28)",   r:"#2a1a08", t:"#201408" }, // desert
    { s:"#0a1c0a", c:"rgba(38,90,38,0.28)",    r:"#101e10", t:"#0a160a" }, // forest
    { s:"#0e0820", c:"rgba(90,42,200,0.28)",   r:"#1a1030", t:"#0c0818" }, // space
    { s:"#0c1a28", c:"rgba(60,100,155,0.28)",  r:"#142230", t:"#0c1820" }, // arctic
  ][gs.mapTheme] || { s:"#1c1c3c",c:"rgba(70,70,115,0.28)",r:"#2a2a4e",t:"#20203e" };
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

  // ── Props (themed decorative emoji — no collision) ──
  (gs.props || []).forEach(pr => {
    ctx.save(); ctx.translate(pr.x, pr.y);
    ctx.globalAlpha = gs.bossWave ? 0.18 : 0.32;
    ctx.font = `${Math.floor(14 * (pr.scale || 1))}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(pr.emoji, 0, 0);
    ctx.globalAlpha = 1; ctx.restore();
  });

  const GRID_CLR = gs.bossWave ? "rgba(180,50,50,0.08)" : [
    "rgba(100,100,180,0.06)", // office
    "rgba(55,120,55,0.06)",   // bunker
    "rgba(140,115,55,0.06)",  // factory
    "rgba(120,85,45,0.06)",   // ruins
    "rgba(160,125,55,0.06)",  // desert
    "rgba(45,120,45,0.06)",   // forest
    "rgba(110,55,220,0.07)",  // space
    "rgba(70,120,190,0.06)",  // arctic
  ][gs.mapTheme] || "rgba(100,100,180,0.06)";
  const BORDER_CLR = gs.bossWave ? null : [
    "rgba(80,80,220,",  // office
    "rgba(55,160,55,",  // bunker
    "rgba(175,145,55,", // factory
    "rgba(155,110,55,", // ruins
    "rgba(200,155,55,", // desert
    "rgba(55,165,55,",  // forest
    "rgba(150,70,255,", // space
    "rgba(75,150,220,", // arctic
  ][gs.mapTheme] || "rgba(80,80,220,";
  ctx.strokeStyle = GRID_CLR;
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy < H; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

  // Arena border
  const bPulse = 0.25 + Math.sin(Date.now() / 900) * 0.12;
  ctx.strokeStyle = gs.bossWave ? `rgba(255,60,60,${bPulse})` : `${BORDER_CLR}${bPulse})`;
  ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, H - 8); ctx.lineWidth = 1;
  const cSz = 18; ctx.strokeStyle = gs.bossWave ? "#FF5555" : (BORDER_CLR + "0.9)");
  [[4,4,1,1],[W-4,4,-1,1],[4,H-4,1,-1],[W-4,H-4,-1,-1]].forEach(([cx,cy,sx,sy]) => {
    ctx.beginPath(); ctx.moveTo(cx + sx*cSz, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy*cSz); ctx.stroke();
  });

  // Theme atmosphere — radial vignette overlay tinted per map theme
  if (!gs.bossWave) {
    const VIGNETTE_CLR = [
      "60,60,120",   // office: cool indigo
      "20,55,20",    // bunker: military green
      "80,55,15",    // factory: amber soot
      "55,35,10",    // ruins: sepia brown
      "100,70,10",   // desert: warm ochre
      "10,50,10",    // forest: deep green
      "30,0,80",     // space: void purple
      "5,30,70",     // arctic: cold blue
    ];
    const vc = VIGNETTE_CLR[gs.mapTheme] || VIGNETTE_CLR[0];
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.72);
    vig.addColorStop(0, `rgba(${vc},0)`);
    vig.addColorStop(1, `rgba(${vc},0.22)`);
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
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
    const _pkEmojis = { health:"💊", ammo:"📦", speed:"⚡", guardian_angel:"😇", upgrade:"🔧", nuke:"☢️", rage:"🔥", magnet:"🧲", freeze:"❄️" };
    const _pkColors = { health:"#0F0", ammo:"#0BF", speed:"#FF0", guardian_angel:"#FFD700", upgrade:"#AA44FF", nuke:"#F00", rage:"#FF4400", magnet:"#FF88FF", freeze:"#88CCFF" };
    const em = _pkEmojis[pk.type] || "✨";
    const isSpecial = pk.type === "guardian_angel" || pk.type === "upgrade";
    const isNew = pk.type === "rage" || pk.type === "magnet" || pk.type === "freeze";
    ctx.font = isSpecial ? "28px serif" : "22px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(em, 0, 0);
    ctx.globalAlpha = (isSpecial || isNew) ? 0.25 + Math.sin(Date.now() / 200) * 0.12 : 0.15;
    ctx.fillStyle = _pkColors[pk.type] || "#FFF";
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    // New pickup types: extra outer glow ring
    if (isNew) {
      ctx.globalAlpha = 0.18 + Math.sin(Date.now() / 150) * 0.10;
      ctx.strokeStyle = _pkColors[pk.type]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  });

  // Grenades
  gs.grenades.forEach(g => {
    ctx.save(); ctx.translate(g.x, g.y);
    ctx.font = (g.size * 2) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("💣", 0, 0); ctx.restore();
  });

  // Enemy bullets
  gs.enemyBullets.forEach(eb => {
    ctx.save(); ctx.translate(eb.x, eb.y);
    ctx.fillStyle = eb.color || "#F44"; ctx.shadowColor = eb.color || "#F44"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, 0, eb.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });

  // Obstacles — themed, floor shadow + 3D top-left highlight + internal stripes
  const WALL_T = [
    ["rgba(50,50,90,0.95)",  "rgba(105,105,190,0.75)", "#6060CC", [88,88,155]],   // office
    ["rgba(30,56,30,0.95)",  "rgba(65,125,65,0.75)",   "#42AA42", [52,102,52]],   // bunker
    ["rgba(56,50,34,0.95)",  "rgba(125,110,68,0.75)",  "#A89540", [102,88,52]],   // factory
    ["rgba(66,44,22,0.95)",  "rgba(140,100,55,0.75)",  "#B88440", [115,78,40]],   // ruins
    ["rgba(90,72,38,0.95)",  "rgba(178,148,85,0.75)",  "#C8A855", [148,120,65]],  // desert: sand/sandstone
    ["rgba(24,54,24,0.95)",  "rgba(52,115,52,0.75)",   "#368A36", [44,90,44]],    // forest: bark green
    ["rgba(14,8,34,0.95)",   "rgba(65,32,140,0.75)",   "#7030C0", [52,24,112]],   // space: dark purple metal
    ["rgba(22,42,66,0.95)",  "rgba(55,95,148,0.75)",   "#4878B8", [44,76,118]],   // arctic: blue ice
  ];
  const wt = gs.bossWave
    ? ["rgba(76,20,20,0.95)", "rgba(165,45,45,0.75)", "#CC3030", [135,32,32]]
    : (WALL_T[gs.mapTheme] || WALL_T[0]);
  (gs.obstacles || []).forEach(ob => {
    // Cast shadow
    ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(ob.x + 5, ob.y + 5, ob.w, ob.h);
    // Main fill
    ctx.fillStyle = wt[0]; ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    // Internal stripe detail
    const [sr, sg, sb] = wt[3];
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.22)`; ctx.lineWidth = 1;
    const isH = ob.w > ob.h;
    const step = isH ? Math.max(6, Math.floor(ob.h / 3)) : Math.max(6, Math.floor(ob.w / 3));
    if (isH) { for (let sy = ob.y + step; sy < ob.y + ob.h - 1; sy += step) { ctx.beginPath(); ctx.moveTo(ob.x + 2, sy); ctx.lineTo(ob.x + ob.w - 2, sy); ctx.stroke(); } }
    else      { for (let sx = ob.x + step; sx < ob.x + ob.w - 1; sx += step) { ctx.beginPath(); ctx.moveTo(sx, ob.y + 2); ctx.lineTo(sx, ob.y + ob.h - 2); ctx.stroke(); } }
    // Top-left 3D highlight edge
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = `rgba(${Math.min(255,sr+50)},${Math.min(255,sg+50)},${Math.min(255,sb+50)},0.85)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ob.x, ob.y + ob.h); ctx.lineTo(ob.x, ob.y); ctx.lineTo(ob.x + ob.w, ob.y); ctx.stroke();
    ctx.globalAlpha = 1;
    // Glow outline
    ctx.strokeStyle = wt[1]; ctx.lineWidth = 2; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
    ctx.shadowColor = wt[2]; ctx.shadowBlur = 8; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h); ctx.shadowBlur = 0;
  });

  // Fog of War overlay (wave event): draw dark fog, punch holes around player and near enemies
  if (gs.fogOfWar) {
    const _fog = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 200);
    _fog.addColorStop(0, "rgba(0,0,0,0)");
    _fog.addColorStop(1, "rgba(0,0,12,0.88)");
    ctx.fillStyle = _fog; ctx.fillRect(0, 0, W, H);
  }

  // Enemies
  gs.enemies.forEach(e => {
    // Fog of War: skip rendering enemies beyond 195px (they become visible at ~160px)
    if (gs.fogOfWar && !e.isBossEnemy && Math.hypot(e.x - p.x, e.y - p.y) > 195) return;
    ctx.save(); ctx.translate(e.x, e.y);
    const r = e.size / 2;
    const faceA = Math.atan2(p.y - e.y, p.x - e.x);
    const dn = Date.now();

    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(0, r + 3, r * 0.7, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();

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
      const rgb = e.enrageTriggered ? "255,80,0" : "220,0,0";
      ctx.globalAlpha = 0.18 + Math.sin(dn / 200) * 0.06;
      ctx.fillStyle = `rgba(${rgb},1)`;
      ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Body base
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // Hit-flash white overlay
    if (e.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.9, e.hitFlash / 12);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Inner depth ring (darker ring for body volume)
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = r * 0.28;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Top-left highlight
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.28, r * 0.38, 0, Math.PI * 2); ctx.fill();
    // Outer border
    ctx.strokeStyle = e.hitFlash > 0 ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

    // Type-specific visual details
    if (e.hitFlash <= 6) {
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
          [[-0.38, 0], [0, -0.38], [0.38, 0], [0, 0.38], [0, 0]].forEach(([dx, dy]) => {
            ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.13, 0, Math.PI * 2); ctx.fill();
          }); break;
        }
        case 3: { // HOA President — clipboard
          ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
          ctx.fillRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.62); ctx.strokeRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.62);
          ctx.fillStyle = "rgba(40,40,40,0.55)";
          [-0.18, 0.03, 0.24].forEach(dy => ctx.fillRect(-r * 0.28, dy * r, r * 0.56, r * 0.11)); break;
        }
        case 5: { // IT Guy — thick glasses
          ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.fillStyle = "rgba(160,230,255,0.28)";
          [-1, 1].forEach(s => {
            ctx.beginPath(); ctx.arc(s * r * 0.34, -r * 0.12, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          });
          ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.12); ctx.lineTo(r * 0.1, -r * 0.12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-r * 0.58, -r * 0.12); ctx.lineTo(-r * 0.76, -r * 0.22); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(r * 0.58, -r * 0.12); ctx.lineTo(r * 0.76, -r * 0.22); ctx.stroke(); break;
        }
        case 6: { // Gym Bro — bulging arms either side
          ctx.fillStyle = e.color; ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5;
          [-1, 1].forEach(s => {
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
          [[-r*.44,-r*.08],[-r*.22,r*.22],[0,-r*.24],[r*.22,r*.08],[r*.44,-r*.28]].forEach(([x, y], i) =>
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
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
          [r * 0.36, r * 0.1].forEach(cy => {
            ctx.beginPath(); ctx.moveTo(-r * 0.32, cy); ctx.lineTo(0, cy - r * 0.23); ctx.lineTo(r * 0.32, cy); ctx.stroke();
          }); ctx.lineCap = "butt"; break;
        }
        default: break;
      }
    }

    // Eyes facing player (skip during hit flash)
    if (e.hitFlash <= 4) {
      ctx.save(); ctx.rotate(faceA);
      const er = Math.max(1.8, r * 0.18);
      [-1, 1].forEach(side => {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath(); ctx.ellipse(r * 0.42, side * r * 0.3, er * 1.4, er, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.isBossEnemy ? "#FF0000" : "#111";
        ctx.beginPath(); ctx.arc(r * 0.5, side * r * 0.3, er * 0.72, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.beginPath(); ctx.arc(r * 0.44, side * r * 0.3 - er * 0.3, er * 0.32, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
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
    }
    // Elite variant ring
    if (e.eliteType) {
      const eliteRgb = e.eliteType === "armored" ? "255,215,0" : e.eliteType === "fast" ? "0,229,255" : "255,100,0";
      ctx.strokeStyle = `rgba(${eliteRgb},${0.72 + Math.sin(dn / 140) * 0.22})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, r + 11, 0, Math.PI * 2); ctx.stroke();
    }

    // Emoji
    ctx.font = Math.floor(r * 0.72) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = e.hitFlash > 6 ? 0.15 : 0.88;
    ctx.fillText(e.emoji, 0, 1);
    ctx.globalAlpha = 1;

    // HP bar
    if (e.health < e.maxHealth) {
      const bw = e.size + 4;
      ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-bw / 2, -r - 14, bw, 6);
      ctx.fillStyle = e.health > e.maxHealth * 0.5 ? "#00EE44" : e.health > e.maxHealth * 0.25 ? "#FFAA00" : "#FF2222";
      ctx.fillRect(-bw / 2, -r - 14, bw * Math.max(0, e.health / e.maxHealth), 6);
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(-bw / 2, -r - 14, bw, 6);
    }
    // Name label
    ctx.fillStyle = e.isBossEnemy ? "#FF5555" : "rgba(255,255,255,0.85)";
    ctx.font = "bold " + (e.isBossEnemy ? 11 : 9) + "px monospace"; ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 2.5;
    ctx.strokeText(e.name, 0, r + 14); ctx.fillText(e.name, 0, r + 14);
    ctx.restore();
  });

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
      ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, b.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // Particles
  gs.particles.forEach(pt => {
    ctx.globalAlpha = pt.life / pt.maxLife; ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2); ctx.fill();
  });
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
        ctx.lineTo(arc.x1 + ldx * t + (Math.random() - 0.5) * 18, arc.y1 + ldy * t + (Math.random() - 0.5) * 18);
      }
      ctx.lineTo(arc.x2, arc.y2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // Dying enemy animations
  (gs.dyingEnemies || []).forEach(de => {
    const t = de.life / de.maxLife; // 1→0
    ctx.save(); ctx.translate(de.x, de.y - (1 - t) * 25);
    ctx.globalAlpha = t; ctx.scale(1 + (1 - t) * 0.6, 1 + (1 - t) * 0.6);
    ctx.font = (de.size * 0.55) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(de.emoji, 0, 0); ctx.restore();
  });
  ctx.globalAlpha = 1;

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
  // Legs (unrotated — bob south)
  const _lb = Math.sin(frameCountRef.current * 0.28) * 3.5;
  ctx.fillStyle = "#284A28";
  ctx.beginPath(); ctx.ellipse(-5 + _lb * 0.5, 11, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4 - _lb * 0.5, 11, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  // === Rotate to aim angle ===
  ctx.rotate(p.angle);
  const curWpn = WEAPONS[wpnIdx];
  // Gun grip + barrel
  ctx.fillStyle = "#444"; ctx.fillRect(8, -3, 6, 6);         // grip
  ctx.fillStyle = "#505050"; ctx.fillRect(13, -2.5, 16, 5);  // barrel body
  ctx.fillStyle = "#3A3A3A"; ctx.fillRect(24, -3.5, 6, 7);   // suppressor base
  ctx.fillStyle = curWpn.color; ctx.fillRect(28, -2.5, 6, 5); // muzzle color
  // Tactical vest body
  ctx.fillStyle = "#3A6A3A";
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#244E24"; ctx.lineWidth = 2; ctx.stroke();
  // Vest strap lines
  ctx.strokeStyle = "rgba(18,45,18,0.7)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(3, 8); ctx.stroke();
  // Small pouch on vest
  ctx.fillStyle = "rgba(28,55,28,0.8)";
  ctx.fillRect(-8, -4, 5, 5);
  ctx.strokeStyle = "rgba(18,45,18,0.5)"; ctx.lineWidth = 0.8; ctx.strokeRect(-8, -4, 5, 5);
  // Chest highlight
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath(); ctx.ellipse(-1, -3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Helmet
  ctx.fillStyle = "#2A5A2A";
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#183C18"; ctx.lineWidth = 1.5; ctx.stroke();
  // Helmet brim detail
  ctx.strokeStyle = "rgba(45,90,45,0.55)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
  // Visor slit (green HUD glow)
  ctx.fillStyle = "rgba(70,240,110,0.55)";
  ctx.beginPath(); ctx.ellipse(6, 0, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,200,80,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  // Helmet highlight
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath(); ctx.arc(-3, -4, 4, 0, Math.PI * 2); ctx.fill();
  // Player skin emoji overlay (prestige unlocks)
  if (gs.playerSkin) {
    ctx.font = "12px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(gs.playerSkin, 0, 0);
  }
  // Reset alpha before muzzle flash (so flash is always bright)
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (gs.muzzleFlash > 0) {
    ctx.shadowColor = "#FFD740"; ctx.shadowBlur = gs.muzzleFlash * 5;
    ctx.fillStyle = `rgba(255,220,60,${gs.muzzleFlash / 4})`;
    ctx.beginPath(); ctx.arc(35, 0, 5 + gs.muzzleFlash * 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Floating texts
  gs.floatingTexts.forEach(ft => {
    const maxLife = ft.big ? 90 : ft.quote ? 110 : 60;
    ctx.globalAlpha = Math.min(1, ft.life / maxLife);
    ctx.fillStyle = ft.color; ctx.textAlign = "center";
    if (ft.quote) {
      ctx.font = "bold italic 16px monospace";
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4;
    } else if (ft.big) {
      ctx.font = "bold 22px monospace";
      ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
    } else {
      ctx.font = "bold 13px monospace";
      ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    }
    ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillText(ft.text, ft.x, ft.y);
  });
  ctx.globalAlpha = 1;

  // Mini-radar
  const rs = 45, rx = W - rs - 8, ry = isMobile ? 52 : 48;
  ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = gs.bossWave ? "#F00" : "#0F0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#0F0"; ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
  gs.enemies.forEach(e => {
    const edx = (e.x - p.x) / (W * 0.6) * rs, edy = (e.y - p.y) / (H * 0.6) * rs;
    if (Math.hypot(edx, edy) < rs - 2) {
      ctx.fillStyle = e.isBossEnemy ? "#FF00FF" : e.typeIndex >= 4 ? "#F00" : e.ranged ? "#F80" : "#FF0";
      ctx.beginPath(); ctx.arc(rx + edx, ry + edy, e.isBossEnemy ? 4 : 2, 0, Math.PI * 2); ctx.fill();
    }
  });
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
  // Boss kill golden flash
  if ((gs.bossKillFlash || 0) > 0) {
    ctx.fillStyle = `rgba(255,200,30,${(gs.bossKillFlash / 22) * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  // Damage / kill flash
  if (gs.damageFlash > 0) { ctx.fillStyle = "rgba(255,0,0," + (gs.damageFlash * 0.03) + ")"; ctx.fillRect(0, 0, W, H); }
  if (gs.killFlash > 0) { ctx.fillStyle = "rgba(255,215,0," + (gs.killFlash * 0.015) + ")"; ctx.fillRect(0, 0, W, H); }
  // Boss wave red pulse
  if (gs.bossWave) {
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
}
