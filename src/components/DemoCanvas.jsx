import { useEffect, useRef } from "react";

// Cinematic home-screen backdrop — simulated firefight with boss encounters.
// Self-contained: does not reuse drawGame.js or game state.
// Caps at 30fps, pauses on hidden tab / prefers-reduced-motion.
export default function DemoCanvas({ opacity = 0.35 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduceMotion = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const smallScreen = typeof window !== "undefined"
      && window.matchMedia?.("(max-width: 760px)").matches;
    if (reduceMotion || smallScreen) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Simulation state ──────────────────────────────────────────────────
    let wave = 1;
    let score = 0;
    let shakeMag = 0, shakeX = 0, shakeY = 0;
    let tick = 0;
    let bossSpawnCd = 320;

    const player = { x: 0, y: 0, vx: 0.9, vy: 0.55, angle: 0, r: 8 };
    const enemies = [];
    const bullets = [];
    const particles = [];
    let boss = null;

    // Enemy variants: grunt (circle), elite (diamond)
    const ETYPES = [
      { shape: "circle",  r: 7,  maxHp: 2, speed: 1.05, col: "#FF4444", hlCol: "#FF8888" },
      { shape: "diamond", r: 9,  maxHp: 3, speed: 0.65, col: "#CC44FF", hlCol: "#EE88FF" },
    ];

    const resetPlayer = () => {
      player.x = W * 0.44 + (Math.random() > 0.5 ? 40 : -40);
      player.y = H * 0.52 + (Math.random() > 0.5 ? 30 : -30);
    };

    const spawnEnemy = () => {
      const t = ETYPES[Math.random() < 0.65 ? 0 : 1];
      const side = tick % 4;
      const e = { ...t, hp: t.maxHp, flashFrames: 0 };
      if      (side === 0) { e.x = Math.random() * W; e.y = -16; }
      else if (side === 1) { e.x = W + 16; e.y = Math.random() * H; }
      else if (side === 2) { e.x = Math.random() * W; e.y = H + 16; }
      else                 { e.x = -16; e.y = Math.random() * H; }
      enemies.push(e);
    };

    const spawnBoss = () => {
      boss = { x: W + 70, y: H * 0.44, r: 30, hp: 22, maxHp: 22, pulseT: 0, entering: true };
    };

    const burst = (x, y, col, n = 7, spd = 2.8) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.55;
        const s = spd * (0.5 + Math.random());
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 22 + Math.random() * 14, ml: 36, col, sz: 1.5 + Math.random() * 1.5 });
      }
    };

    const bigBurst = (x, y, col) => {
      burst(x, y, col, 20, 5);
      burst(x, y, "#FFD700", 10, 3.5);
      burst(x, y, "#FFFFFF", 5, 6);
      shakeMag = 7;
    };

    // ── Glow helpers (no shadowBlur — uses layered alpha circles) ─────────
    const glowCircle = (x, y, r, col, glowR, alpha = 0.9) => {
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };

    const glowDiamond = (x, y, r, col, alpha = 0.9) => {
      const rOuter = r * 1.7, wOuter = r * 1.2;
      ctx.globalAlpha = alpha * 0.16;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y - rOuter); ctx.lineTo(x + wOuter, y);
      ctx.lineTo(x, y + rOuter); ctx.lineTo(x - wOuter, y);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y);
      ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y);
      ctx.closePath(); ctx.fill();
    };

    let running = true, last = performance.now();
    const FRAME = 1000 / 30;

    const step = (now) => {
      if (!running) return;
      if (document.hidden) { last = now; requestAnimationFrame(step); return; }
      if (now - last < FRAME) { requestAnimationFrame(step); return; }
      last = now;
      tick++;

      // Wave progression
      wave = 1 + Math.floor(tick / 200);

      // Player drift + bounce
      player.x += player.vx;
      player.y += player.vy;
      const pad = 68;
      if (player.x < pad || player.x > W - pad) {
        player.vx *= -1;
        player.x = Math.max(pad, Math.min(W - pad, player.x));
      }
      if (player.y < pad || player.y > H - pad) {
        player.vy *= -1;
        player.y = Math.max(pad, Math.min(H - pad, player.y));
      }

      // Enemy spawn
      const maxEnemies = 5 + Math.min(wave, 5);
      if (enemies.length < maxEnemies && tick % 46 === 0) spawnEnemy();

      // Boss spawn
      bossSpawnCd--;
      if (!boss && bossSpawnCd <= 0) { spawnBoss(); bossSpawnCd = 520; }

      // Boss movement
      if (boss) {
        boss.pulseT++;
        if (boss.entering) {
          boss.x -= 1.4;
          if (boss.x <= W * 0.77) boss.entering = false;
        } else {
          const ba = Math.atan2(player.y - boss.y, player.x - boss.x);
          boss.x += Math.cos(ba) * 0.3;
          boss.y += Math.sin(ba) * 0.3;
        }
      }

      // Aim at nearest target (boss priority)
      let tgt = boss || null;
      let tDist = tgt ? Math.hypot(tgt.x - player.x, tgt.y - player.y) : Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < tDist) { tDist = d; tgt = e; }
      }
      if (tgt) player.angle = Math.atan2(tgt.y - player.y, tgt.x - player.x);

      // Shoot
      const fireRate = boss ? 16 : 22;
      if (tick % fireRate === 0 && tgt) {
        const shotCount = boss ? 2 : 1;
        for (let i = 0; i < shotCount; i++) {
          const fa = player.angle + (Math.random() - 0.5) * 0.15;
          bullets.push({ x: player.x, y: player.y, vx: Math.cos(fa) * 8, vy: Math.sin(fa) * 8, life: 52 });
        }
        burst(player.x + Math.cos(player.angle) * 13, player.y + Math.sin(player.angle) * 13, "#FF9900", 3, 1.3);
      }

      // Enemy movement + flash decay
      for (const e of enemies) {
        const ea = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(ea) * e.speed;
        e.y += Math.sin(ea) * e.speed;
        if (e.flashFrames > 0) e.flashFrames--;
      }

      // Bullet update + collisions
      for (const b of bullets) { b.x += b.vx; b.y += b.vy; b.life--; }
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) {
          bullets.splice(bi, 1); continue;
        }
        let hit = false;
        // vs boss
        if (boss && !hit && (b.x - boss.x) ** 2 + (b.y - boss.y) ** 2 < (boss.r + 4) ** 2) {
          bullets.splice(bi, 1); hit = true;
          boss.hp--;
          burst(b.x, b.y, "#FF6600", 4, 1.5);
          if (boss.hp <= 0) { bigBurst(boss.x, boss.y, "#FF4400"); score += 500; boss = null; }
        }
        // vs enemies
        for (let ei = enemies.length - 1; ei >= 0 && !hit; ei--) {
          const e = enemies[ei];
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 3) ** 2) {
            bullets.splice(bi, 1); hit = true;
            e.hp--; e.flashFrames = 4;
            if (e.hp <= 0) {
              burst(e.x, e.y, e.col, 10, 2.5);
              burst(e.x, e.y, "#FFD700", 4, 1.5);
              enemies.splice(ei, 1);
              score += e.r > 8 ? 150 : 100;
              shakeMag = Math.max(shakeMag, 1.8);
            } else {
              burst(b.x, b.y, "#FFFFFF", 2, 1.2);
            }
          }
        }
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.92; p.vy *= 0.92;
        p.life--;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      // Screen shake decay
      if (shakeMag > 0.15) {
        shakeX = (Math.random() - 0.5) * shakeMag;
        shakeY = (Math.random() - 0.5) * shakeMag;
        shakeMag *= 0.68;
      } else {
        shakeMag = 0; shakeX = 0; shakeY = 0;
      }

      // ── DRAW ─────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Tactical grid
      ctx.strokeStyle = "rgba(255,107,53,0.05)";
      ctx.lineWidth = 1;
      const GS = 55;
      for (let gx = 0; gx < W + GS; gx += GS) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H + GS; gy += GS) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
      // Grid crossing dots
      ctx.fillStyle = "rgba(255,107,53,0.07)";
      for (let gx = GS / 2; gx < W; gx += GS) {
        for (let gy = GS / 2; gy < H; gy += GS) {
          ctx.fillRect(gx - 1, gy - 1, 2, 2);
        }
      }

      // Boss entry flash
      if (boss?.entering) {
        ctx.globalAlpha = 0.03 + Math.abs(Math.sin(tick * 0.45)) * 0.03;
        ctx.fillStyle = "#FF2200";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Enemies
      for (const e of enemies) {
        const col = e.flashFrames > 0 ? e.hlCol : e.col;
        if (e.shape === "diamond") {
          glowDiamond(e.x, e.y, e.r, col);
        } else {
          glowCircle(e.x, e.y, e.r, col, e.r * 1.9);
        }
        // Damage HP bar
        if (e.hp < e.maxHp) {
          const bw = e.r * 2.4, bh = 2, bx = e.x - bw / 2, by = e.y - e.r - 5;
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = "#440000"; ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = "#FF4444"; ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalAlpha = 1;

      // Boss
      if (boss) {
        const pulse = 0.5 + Math.sin(boss.pulseT * 0.11) * 0.35;
        // Pulsing halo
        ctx.globalAlpha = 0.16 * pulse;
        ctx.fillStyle = "#FF6600";
        ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r * 2.4, 0, Math.PI * 2); ctx.fill();
        // Body — heavy octagon
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "#FF2200";
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const r = boss.r * (i % 2 === 0 ? 1 : 0.8);
          if (i === 0) ctx.moveTo(boss.x + Math.cos(a) * r, boss.y + Math.sin(a) * r);
          else ctx.lineTo(boss.x + Math.cos(a) * r, boss.y + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        // Boss border glow ring
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "#FF8800"; ctx.lineWidth = 2;
        ctx.stroke();
        // Boss HP bar
        const bhpW = 100, bhpH = 5;
        const bhpX = boss.x - bhpW / 2, bhpY = boss.y - boss.r - 12;
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#1a0000"; ctx.fillRect(bhpX, bhpY, bhpW, bhpH);
        ctx.fillStyle = "#FF2200"; ctx.fillRect(bhpX, bhpY, bhpW * (boss.hp / boss.maxHp), bhpH);
        ctx.strokeStyle = "rgba(255,34,0,0.35)"; ctx.lineWidth = 1;
        ctx.strokeRect(bhpX, bhpY, bhpW, bhpH);
        ctx.globalAlpha = 0.85;
        ctx.save();
        ctx.fillStyle = "#FF8800"; ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
        ctx.fillText("⚠ BOSS", boss.x, bhpY - 3);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Bullets with glow halo
      for (const b of bullets) {
        const fadeAlpha = Math.min(1, b.life / 8);
        // Outer glow
        ctx.globalAlpha = fadeAlpha * 0.14;
        ctx.fillStyle = "#FFD700";
        ctx.beginPath(); ctx.arc(b.x, b.y, 5.5, 0, Math.PI * 2); ctx.fill();
        // Core
        ctx.globalAlpha = fadeAlpha * 0.95;
        ctx.fillStyle = "#FFD700";
        ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Particles
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, (p.life / p.ml) * 0.88);
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
      }
      ctx.globalAlpha = 1;

      // Player — orange glow circle + weapon direction indicator
      // Outer halo
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#FF6B35";
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r * 2.2, 0, Math.PI * 2); ctx.fill();
      // Body
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#FF6B35";
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
      // Weapon line
      const wx1 = player.x + Math.cos(player.angle) * (player.r + 2);
      const wy1 = player.y + Math.sin(player.angle) * (player.r + 2);
      const wx2 = player.x + Math.cos(player.angle) * (player.r + 16);
      const wy2 = player.y + Math.sin(player.angle) * (player.r + 16);
      // Gun glow
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(wx1, wy1); ctx.lineTo(wx2, wy2); ctx.stroke();
      // Gun core
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wx1, wy1); ctx.lineTo(wx2, wy2); ctx.stroke();
      // Player ring
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#FF9060"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // Score + wave HUD chip (top-right corner)
      ctx.save();
      const hudW = 110, hudH = 42, hudX = W - hudW - 10, hudY = 10;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,107,53,0.1)";
      ctx.fillRect(hudX, hudY, hudW, hudH);
      ctx.strokeStyle = "rgba(255,107,53,0.22)"; ctx.lineWidth = 1;
      ctx.strokeRect(hudX, hudY, hudW, hudH);
      ctx.fillStyle = "#FF9060"; ctx.font = "bold 8px monospace"; ctx.textAlign = "right";
      ctx.fillText(`WAVE ${wave}`, hudX + hudW - 8, hudY + 15);
      ctx.fillStyle = "#FFD700"; ctx.font = "bold 12px monospace";
      ctx.fillText(String(score).padStart(7, "0"), hudX + hudW - 8, hudY + 33);
      ctx.restore();

      ctx.restore(); // shake restore

      requestAnimationFrame(step);
    };

    // Place player after W/H are known
    resetPlayer();

    const start = () => { last = performance.now(); requestAnimationFrame(step); };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(start, { timeout: 500 });
    } else {
      setTimeout(start, 120);
    }

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="home-demo-canvas"
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", opacity, zIndex: 0,
        mixBlendMode: "screen",
      }}
    />
  );
}
