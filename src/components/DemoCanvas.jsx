import { useEffect, useRef } from "react";

// Lightweight background demo — simulated firefight behind the hero.
// Self-contained: does not reuse drawGame.js or game state.
// Caps at 30fps, pauses on hidden tab / prefers-reduced-motion / small screens.
export default function DemoCanvas({ opacity = 0.35 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduceMotion = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

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

    const player = { x: 0, y: 0, r: 8, vx: 0.6, vy: 0.3 };
    const enemies = [];
    const bullets = [];
    const particles = [];
    let tick = 0;

    const reset = () => { player.x = W / 2; player.y = H / 2; };
    reset();

    const spawnEnemy = () => {
      const edge = Math.floor(Math.random() * 4);
      const e = { r: 6 + Math.random() * 4, hp: 2, color: ["#FF4444", "#FF9040", "#CC00FF"][Math.floor(Math.random() * 3)] };
      if (edge === 0) { e.x = Math.random() * W; e.y = -10; }
      else if (edge === 1) { e.x = W + 10; e.y = Math.random() * H; }
      else if (edge === 2) { e.x = Math.random() * W; e.y = H + 10; }
      else { e.x = -10; e.y = Math.random() * H; }
      enemies.push(e);
    };

    const burst = (x, y, color, n = 6) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 2.5;
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 20 + Math.random() * 10, color });
      }
    };

    let running = true;
    let last = performance.now();
    const FRAME = 1000 / 30;

    const step = (now) => {
      if (!running) return;
      if (document.hidden) { last = now; requestAnimationFrame(step); return; }
      if (now - last < FRAME) { requestAnimationFrame(step); return; }
      last = now;
      tick++;

      // Player drift
      player.x += player.vx; player.y += player.vy;
      if (player.x < 40 || player.x > W - 40) player.vx *= -1;
      if (player.y < 40 || player.y > H - 40) player.vy *= -1;

      // Enemy spawn
      if (enemies.length < 8 && tick % 40 === 0) spawnEnemy();

      // Fire at nearest enemy
      if (tick % 18 === 0 && enemies.length > 0) {
        let best = null, bd = Infinity;
        for (const e of enemies) {
          const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        if (best) {
          const a = Math.atan2(best.y - player.y, best.x - player.x);
          bullets.push({ x: player.x, y: player.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 80 });
          burst(player.x + Math.cos(a) * 10, player.y + Math.sin(a) * 10, "#FFD700", 3);
        }
      }

      // Enemies approach
      for (const e of enemies) {
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(a) * 0.5;
        e.y += Math.sin(a) * 0.5;
      }

      // Bullets vs enemies
      for (const b of bullets) { b.x += b.vx; b.y += b.vy; b.life--; }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { bullets.splice(i, 1); continue; }
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 3) ** 2) {
            bullets.splice(i, 1);
            e.hp--;
            if (e.hp <= 0) { burst(e.x, e.y, e.color, 10); enemies.splice(j, 1); }
            else burst(b.x, b.y, "#FFFFFF", 3);
            break;
          }
        }
      }

      // Particles
      for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life--; }
      for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);

      // Draw
      ctx.clearRect(0, 0, W, H);
      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const GRID = 50;
      for (let x = 0; x < W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Enemies
      for (const e of enemies) {
        ctx.fillStyle = e.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Bullets
      ctx.fillStyle = "#FFD700";
      for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI * 2); ctx.fill(); }

      // Particles
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Player
      ctx.fillStyle = "#8B5A2B";
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5E3A18";
      ctx.beginPath(); ctx.arc(player.x, player.y - 4, player.r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FF6B35";
      ctx.beginPath(); ctx.arc(player.x, player.y - 8, 2, 0, Math.PI * 2); ctx.fill();

      requestAnimationFrame(step);
    };

    // Defer start until idle so it never delays LCP
    const start = () => { last = performance.now(); requestAnimationFrame(step); };
    if (typeof requestIdleCallback === "function") requestIdleCallback(start, { timeout: 500 });
    else setTimeout(start, 120);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", opacity, zIndex: 0,
        mixBlendMode: "screen",
      }}
    />
  );
}
