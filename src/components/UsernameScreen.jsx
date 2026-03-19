import { useEffect, useRef, useState } from "react";
import VirtualKeyboard from "./VirtualKeyboard.jsx";

// Enemy cast for the mini battle scene
const MINI_ENEMIES = [
  { emoji: "👮", speed: 1.2 }, { emoji: "💇‍♀️", speed: 0.9 },
  { emoji: "🐊", speed: 2.0 }, { emoji: "💻", speed: 1.5 },
  { emoji: "💪", speed: 1.8 }, { emoji: "🤳", speed: 2.2 },
  { emoji: "📈", speed: 3.0 }, { emoji: "📋", speed: 0.6 },
  { emoji: "🛸", speed: 1.6 }, { emoji: "🏠", speed: 0.5 },
];

const QUICK_TIPS = [
  { icon: "🎮", label: "WASD / STICK", sub: "Move" },
  { icon: "🖱️", label: "CLICK / AIM",  sub: "Shoot" },
  { icon: "💨", label: "SPACE / R3",   sub: "Dash" },
  { icon: "💣", label: "G / Q / B",    sub: "Grenade" },
];

export default function UsernameScreen({ username, setUsername, onContinue }) {
  const canvasRef      = useRef(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [gpConnected,  setGpConnected]  = useState(false);

  // ── Gamepad connection detection ────────────────────────────────────────
  useEffect(() => {
    let lastConnected = false;
    let lastA = false;

    const id = setInterval(() => {
      const gp = navigator.getGamepads?.()[0];
      const connected = !!gp;
      if (connected !== lastConnected) { lastConnected = connected; setGpConnected(connected); }

      // A button opens keyboard when not already showing
      if (gp) {
        const aNow = gp.buttons[0]?.pressed;
        if (aNow && !lastA && !showKeyboard) setShowKeyboard(true);
        lastA = !!aNow;
      }
    }, 100);
    return () => clearInterval(id);
  }, [showKeyboard]);

  // ── Mini battle canvas ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let w = 0, h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width  = Math.round(w * devicePixelRatio);
      canvas.height = Math.round(h * devicePixelRatio);
      ctx.resetTransform();
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let frame = 0, enemies = [], bullets = [], particles = [], popups = [];
    let shootTimer = 0, spawnTimer = 20, playerAngle = 0;

    const spawnEnemy = () => {
      if (w === 0) return;
      const d = MINI_ENEMIES[Math.floor(Math.random() * MINI_ENEMIES.length)];
      const groundY = h * 0.72;
      enemies.push({ x: w + 50, y: groundY - 4, speed: d.speed * 0.55, size: 26 + Math.random() * 10, emoji: d.emoji, hp: 3, maxHp: 3, wobble: Math.random() * Math.PI * 2, dead: false, deadTimer: 0 });
    };

    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;
      const groundY = h * 0.72;
      const px = w * 0.17, py = groundY - 4;

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.028)"; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Ground line
      ctx.save(); ctx.strokeStyle = "rgba(255,107,53,0.18)"; ctx.lineWidth = 1;
      ctx.setLineDash([6, 12]); ctx.beginPath(); ctx.moveTo(0, groundY + 8); ctx.lineTo(w, groundY + 8); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();

      if (--spawnTimer <= 0) { spawnEnemy(); spawnTimer = 75 + Math.floor(Math.random() * 55); }

      if (--shootTimer <= 0) {
        let target = null, minDist = Infinity;
        enemies.forEach(e => { if (e.dead) return; const d = Math.hypot(e.x - px, e.y - py); if (d < minDist) { minDist = d; target = e; } });
        if (target) { playerAngle = Math.atan2(target.y - py, target.x - px); bullets.push({ x: px + Math.cos(playerAngle) * 22, y: py + Math.sin(playerAngle) * 22, vx: Math.cos(playerAngle) * 9, vy: Math.sin(playerAngle) * 9, life: 90 }); shootTimer = 16; }
        else { shootTimer = 5; }
      }

      enemies = enemies.filter(e => !(e.dead && e.deadTimer <= 0));
      enemies.forEach(e => {
        if (e.dead) { e.deadTimer--; ctx.save(); ctx.globalAlpha = Math.max(0, e.deadTimer / 22); ctx.font = `${e.size}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("💀", e.x, e.y - (22 - e.deadTimer) * 1.2); ctx.restore(); return; }
        e.x -= e.speed; e.wobble += 0.04;
        const wy = Math.sin(e.wobble) * 2.5;
        ctx.save(); ctx.beginPath(); ctx.ellipse(e.x, groundY + 7, e.size * 0.38, 4.5, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fill(); ctx.restore();
        if (e.hp < e.maxHp) { const bw = e.size; ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(e.x - bw / 2, e.y - e.size / 2 - 14, bw, 5); ctx.fillStyle = "#FF4444"; ctx.fillRect(e.x - bw / 2, e.y - e.size / 2 - 14, bw * (e.hp / e.maxHp), 5); }
        ctx.font = `${e.size}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.emoji, e.x, e.y + wy);
        if (e.x < -70) e.dead = true;
      });

      bullets = bullets.filter(b => b.life > 0);
      bullets.forEach(b => {
        b.x += b.vx; b.y += b.vy; b.life--;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#FF8800"; ctx.beginPath(); ctx.arc(b.x - b.vx * 1.5, b.y - b.vy * 1.5, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.shadowColor = "#FFE135"; ctx.shadowBlur = 10; ctx.fillStyle = "#FFE135"; ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        enemies.forEach(e => {
          if (e.dead || b.life <= 0) return;
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.size / 2 + 2) {
            b.life = 0; e.hp--;
            for (let i = 0; i < 5; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 3, life: 16, maxLife: 16, text: ["✦", "★", "✸"][Math.floor(Math.random() * 3)] });
            if (e.hp <= 0) { e.dead = true; e.deadTimer = 22; popups.push({ x: e.x, y: e.y - 28, vy: -0.65, life: 48, text: "+100" }); }
          }
        });
      });

      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life--; ctx.save(); ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = "#FFD700"; ctx.font = "11px serif"; ctx.textAlign = "center"; ctx.fillText(p.text, p.x, p.y); ctx.restore(); });

      popups = popups.filter(p => p.life > 0);
      popups.forEach(p => { p.y += p.vy; p.life--; ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 16); ctx.font = "bold 13px 'Courier New', monospace"; ctx.fillStyle = "#FFD700"; ctx.shadowColor = "rgba(255,215,0,0.7)"; ctx.shadowBlur = 8; ctx.textAlign = "center"; ctx.fillText(p.text, p.x, p.y); ctx.restore(); });

      // Player shadow + glow
      ctx.save(); ctx.beginPath(); ctx.ellipse(px, groundY + 7, 18, 5, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill(); ctx.restore();
      const bob = Math.sin(frame * 0.09) * 3;
      ctx.save(); ctx.beginPath(); ctx.arc(px, py + bob, 24, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,107,53,0.1)"; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(px, py + bob); ctx.font = "34px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🎖️", 0, 0); ctx.restore();

      // Muzzle flash
      if (shootTimer > 12) {
        ctx.save(); ctx.globalAlpha = ((shootTimer - 12) / 4) * 0.9;
        ctx.beginPath(); ctx.arc(px + Math.cos(playerAngle) * 24, py + bob + Math.sin(playerAngle) * 24, 9, 0, Math.PI * 2);
        ctx.fillStyle = "#FFE135"; ctx.shadowColor = "#FFE135"; ctx.shadowBlur = 14; ctx.fill(); ctx.restore();
      }

      // Bottom fade
      const grad = ctx.createLinearGradient(0, h * 0.38, 0, h);
      grad.addColorStop(0, "rgba(10,10,10,0)"); grad.addColorStop(0.45, "rgba(10,10,10,0.82)"); grad.addColorStop(1, "rgba(10,10,10,0.98)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const valid = username.trim().length >= 2;

  return (
    <div style={{ width: "100%", height: "100dvh", background: "#0a0a0a", fontFamily: "'Courier New', monospace", position: "relative", overflow: "hidden", userSelect: "none", WebkitUserSelect: "none" }}>
      {/* Canvas battle scene */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Virtual keyboard overlay */}
      {showKeyboard && (
        <VirtualKeyboard
          value={username}
          onChange={setUsername}
          onConfirm={() => { if (valid) { setShowKeyboard(false); onContinue(); } }}
          maxLength={20}
          title="ENTER YOUR CALLSIGN"
        />
      )}

      {/* Title */}
      <div style={{ position: "absolute", top: "9%", left: 0, right: 0, textAlign: "center", pointerEvents: "none", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "#FF6B35", letterSpacing: 6, marginBottom: 8, opacity: 0.85 }}>VAULTSPARK STUDIOS PRESENTS</div>
        <h1 style={{ fontSize: "clamp(30px,8.5vw,62px)", fontWeight: 900, margin: 0, background: "linear-gradient(180deg,#FFD700,#FF6B00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -2, filter: "drop-shadow(0 0 28px rgba(255,107,0,0.85))" }}>
          CALL OF DOODIE
        </h1>
        <div style={{ fontSize: "clamp(9px,2.2vw,14px)", color: "#FF6B35", marginTop: 4, letterSpacing: 3, opacity: 0.9 }}>
          MODERN WARFARE ON MOM'S WIFI
        </div>
      </div>

      {/* Callsign panel */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, display: "flex", justifyContent: "center", padding: "0 20px 36px", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>

          <div style={{ fontSize: 10, color: "#FF6B35", letterSpacing: 4, fontWeight: 900, marginBottom: 12 }}>
            ▸ CHOOSE YOUR CALLSIGN, SOLDIER
          </div>

          <input
            type="text"
            value={username}
            maxLength={20}
            onChange={e => setUsername(e.target.value)}
            placeholder="xX_N00bSlayer_Xx"
            style={{ width: "100%", padding: "13px 16px", fontSize: 18, fontFamily: "'Courier New', monospace", background: "rgba(255,255,255,0.06)", border: `2px solid ${valid ? "#FF6B35" : "rgba(255,255,255,0.18)"}`, borderRadius: 8, color: "#FFD700", textAlign: "center", outline: "none", letterSpacing: 2, boxSizing: "border-box", transition: "border-color 0.2s" }}
            onFocus={e  => { e.target.style.borderColor = "#FF6B35"; }}
            onBlur={e   => { e.target.style.borderColor = valid ? "#FF6B35" : "rgba(255,255,255,0.18)"; }}
            onKeyDown={e => { if (e.key === "Enter" && valid) onContinue(); }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", margin: "5px 0 10px", padding: "0 3px" }}>
            <span>2 – 20 characters</span>
            <span style={{ color: username.length > 0 ? "#FF6B35" : "#555" }}>{username.length}/20</span>
          </div>

          {/* Controller keyboard button */}
          {gpConnected && (
            <button
              onClick={() => setShowKeyboard(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "7px", marginBottom: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 6, color: "#FF6B35", fontSize: 11, fontWeight: 700, fontFamily: "'Courier New',monospace", cursor: "pointer", letterSpacing: 1 }}
            >
              🎮 OPEN ON-SCREEN KEYBOARD <span style={{ color: "#555", fontSize: 10 }}>(or press A)</span>
            </button>
          )}

          {/* Quick tips */}
          <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
            {QUICK_TIPS.map(tip => (
              <div key={tip.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 6, padding: "6px 10px", textAlign: "center", minWidth: 64 }}>
                <div style={{ fontSize: 15 }}>{tip.icon}</div>
                <div style={{ fontSize: 8, color: "#FF6B35", fontWeight: 900, letterSpacing: 0.5, marginTop: 3, lineHeight: 1.3 }}>{tip.label}</div>
                <div style={{ fontSize: 9, color: "#666", marginTop: 1 }}>{tip.sub}</div>
              </div>
            ))}
          </div>

          <button
            onClick={onContinue}
            disabled={!valid}
            style={{ width: "100%", padding: "15px", fontSize: 17, fontWeight: 900, fontFamily: "'Courier New', monospace", letterSpacing: 3, borderRadius: 8, border: "none", cursor: valid ? "pointer" : "not-allowed", background: valid ? "linear-gradient(180deg,#FF6B35,#CC4400)" : "rgba(255,255,255,0.05)", color: valid ? "#FFF" : "#333", boxShadow: valid ? "0 0 28px rgba(255,107,53,0.45)" : "none", transition: "all 0.2s" }}
          >
            LOCK IN &amp; DEPLOY ▶
          </button>

        </div>
      </div>
    </div>
  );
}
