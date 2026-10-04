import { useEffect, useRef, useState } from "react";
import DialogShell from "./DialogShell.jsx";
import { ZOMBIE_ROSTER, stepZombieEnemy } from "../systems/zombieMode.js";
import { drawZombieCreature } from "../systems/zombieRenderer.js";
import { BUILD_PROVENANCE } from "../config/buildProvenance.js";

const button = { minHeight: 44, maxWidth: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--cod-line)", background: "var(--cod-panel-soft)", color: "var(--cod-ink)", font: "inherit", cursor: "pointer" };
const freshTrial = spec => ({ frames: 0, player: { x: 270, y: 120 }, enemy: { x: 75, y: 120, size: spec.size, color: spec.color, speed: spec.speed, zombieVariant: spec.id, zombieTell: spec.tell, zombieClock: 0 }, bullets: [], hits: 0, windupHits: 0, cooldown: 0, dash: 0, dodges: 0, phases: [] });

export default function ZombiePractice({ onClose, reducedMotion = false }) {
  const [variant, setVariant] = useState("shambler");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [answer, setAnswer] = useState("");
  const [humor, setHumor] = useState("");
  const [phase, setPhase] = useState("Ready");
  const [operator, setOperator] = useState("unknown");
  const canvasRef = useRef(null), trialRef = useRef(null), movement = useRef(0);
  const spec = ZOMBIE_ROSTER.find(entry => entry.id === variant);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas.getContext("2d");
    const trial = freshTrial(spec); trialRef.current = trial;
    let handle, previous = null, accumulated = 0;
    const draw = () => {
      ctx.fillStyle = "#0b1b19"; ctx.fillRect(0, 0, 360, 240);
      ctx.strokeStyle = "#31574d"; ctx.lineWidth = 1;
      for (const y of [60, 120, 180]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(360, y); ctx.stroke(); }
      ctx.save(); ctx.translate(trial.enemy.x, trial.enemy.y); drawZombieCreature(ctx, trial.enemy, { frame: trial.frames, reducedMotion }); ctx.restore();
      ctx.fillStyle = trial.dash > 0 ? "#ffffff" : "#76e5ff"; ctx.beginPath(); ctx.arc(trial.player.x, trial.player.y, 10, 0, Math.PI * 2); ctx.fill();
      for (const bullet of trial.bullets) { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2); ctx.fill(); }
    };
    const step = () => {
      trial.frames++; trial.cooldown = Math.max(0, trial.cooldown - 1);
      if (trial.dash > 0) { trial.player.y += trial.dashDirection * 10; trial.dash--; }
      else trial.player.y += movement.current * 3;
      trial.player.y = Math.max(20, Math.min(220, trial.player.y));
      stepZombieEnemy(trial.enemy, { gs: { enemyBullets: trial.bullets, obstacles: [] }, target: trial.player, world: { W: 360, H: 240 } });
      const currentPhase = trial.enemy.zombieState;
      if (trial.phases.at(-1)?.phase !== currentPhase) { trial.phases.push({ phase: currentPhase, frame: trial.frames }); setPhase(currentPhase === "stalk" ? "Approach / reset" : currentPhase === "windup" ? "Warning" : "Attack"); }
      let hit = Math.hypot(trial.player.x - trial.enemy.x, trial.player.y - trial.enemy.y) < trial.enemy.size / 2 + 10;
      for (const bullet of trial.bullets) { bullet.x += bullet.vx; bullet.y += bullet.vy; bullet.life--; if (Math.hypot(trial.player.x - bullet.x, trial.player.y - bullet.y) < bullet.size + 10) { hit = true; bullet.life = 0; } }
      trial.bullets = trial.bullets.filter(bullet => bullet.life > 0);
      if (hit && !trial.cooldown && !trial.dash) { trial.hits++; trial.cooldown = 40; if (currentPhase === "windup") trial.windupHits++; }
    };
    const loop = time => {
      if (running) {
        accumulated += previous === null ? 0 : Math.min(100, time - previous);
        while (accumulated >= 1000 / 60 && trial.frames < 600) { step(); accumulated -= 1000 / 60; }
        if (trial.frames >= 600) {
          setResult({ schemaVersion: "zombie-practice-v1", build: BUILD_PROVENANCE, creature: spec.id, input: "player-operated-browser", assistance: "simplified-two-lane-unranked-drill", frames: trial.frames, hits: trial.hits, hitsDuringWarning: trial.windupHits, dodges: trial.dodges, phases: trial.phases, reducedMotion });
          setRunning(false);
        }
      }
      previous = time; draw(); handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    const keydown = event => { if (["ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault(); if (event.key === "ArrowUp") movement.current = -1; if (event.key === "ArrowDown") movement.current = 1; if (event.key === " ") dodge(); };
    const keyup = event => { if (["ArrowUp", "ArrowDown"].includes(event.key)) movement.current = 0; };
    function dodge() { if (running && trial.dash === 0) { trial.dash = 12; trial.dashDirection = trial.player.y >= 120 ? -1 : 1; trial.dodges++; } }
    window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
    return () => { cancelAnimationFrame(handle); movement.current = 0; window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); };
  }, [running, spec, reducedMotion]);

  const dodge = () => { const trial = trialRef.current; if (running && !trial.dash) { trial.dash = 12; trial.dashDirection = trial.player.y >= 120 ? -1 : 1; trial.dodges++; } };
  const exportResult = () => {
    const receipt = { ...result, operatorDeclared: operator, responses: { damageWindow: answer || null, recognitionCorrect: answer ? answer === "contact-and-projectiles" : null, humorRating: humor ? Number(humor) : null }, trust: "local-participant-response-not-a-score-or-proof-of-improvement" };
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "zombie-practice.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <DialogShell title="Creature practice" onClose={onClose} surface="site">
    <div style={{ width: "min(520px, 100%)", padding: 18, margin: "auto 0", borderRadius: 12, border: "1px solid var(--cod-line)", background: "var(--cod-panel-strong)", color: "var(--cod-ink)", boxSizing: "border-box", fontSize: 13, lineHeight: 1.55 }}>
    <h2>Know your plumbing problem</h2>
    <p>Watch the real creature animation and attack cycle, then dodge for ten seconds. This simplified practice room saves no score and sends nothing.</p>
    <label>Who is operating the controls? <select aria-label="Practice operator" value={operator} onChange={event => setOperator(event.target.value)} style={button}><option value="unknown">Unspecified</option><option value="human">Human participant</option><option value="browser-agent">Browser agent</option></select></label>
    <label>Creature <select aria-label="Practice creature" value={variant} disabled={running} onChange={event => { setVariant(event.target.value); setResult(null); setAnswer(""); setHumor(""); }} style={button}>{ZOMBIE_ROSTER.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
    <canvas ref={canvasRef} width={360} height={240} aria-label={`${spec.name} approach, warning and attack animation`} style={{ width: "100%", display: "block", margin: "12px 0", borderRadius: 10 }} />
    <p role="status">{running ? phase : result ? `Trial complete · ${result.hits} hits · ${result.dodges} dodges` : "Ready to practice"}{reducedMotion ? " · reduced motion" : ""}</p>
    <p>Arrow keys move up/down. Space dodges. Touch players can hold a direction and tap Dodge.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button style={button} disabled={running} onClick={() => { setResult(null); setAnswer(""); setHumor(""); setRunning(true); }}>START TEN-SECOND TRIAL</button>
      {[-1, 1].map(direction => <button key={direction} style={{ ...button, touchAction: "none" }} disabled={!running} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); movement.current = direction; }} onPointerUp={() => { movement.current = 0; }} onPointerCancel={() => { movement.current = 0; }}>{direction < 0 ? "MOVE UP" : "MOVE DOWN"}</button>)}
      <button style={button} disabled={!running} onClick={dodge}>DODGE</button>
    </div>
    {result && <fieldset style={{ marginTop: 14, borderColor: "var(--cod-line)" }}><legend>What could hurt you?</legend>
      {[['attack-only', 'Only the attack animation'], ['warning-only', 'Only the yellow warning'], ['contact-and-projectiles', 'Body contact at any time, plus fired projectiles']].map(([value, label]) => <label key={value} style={{ display: "block", padding: "8px 0" }}><input type="radio" name="damage-window" value={value} checked={answer === value} onChange={() => setAnswer(value)} /> {label}</label>)}
      {answer && <p role="status">{answer === "contact-and-projectiles" ? "Correct." : "Keep your distance."} Body contact can hurt during approach and warnings too. The yellow tell predicts the special attack; fired projectiles remain dangerous afterward.</p>}
      <label>How funny was the creature? <select aria-label="Creature humor rating" value={humor} onChange={event => setHumor(event.target.value)} style={button}><option value="">Optional</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>
      <p><button style={button} onClick={exportResult}>DOWNLOAD PRACTICE RESULT</button></p>
    </fieldset>}
    <p><button style={button} onClick={onClose}>BACK TO MENU</button></p>
    <details><summary>Compare sewer pacing</summary><p>Both unranked trials use Zombies / Normal / seed 42. Trial A introduces creatures by sewer depth; Trial B can introduce them earlier when pumps come online. Record escapes, hits during entrances and creatures seen separately from your humor rating.</p><p><a href="/?mode=zombies&seed=42&diff=normal&zombiePacing=time">TRIAL A · DEPTH PACING</a></p><p><a href="/?mode=zombies&seed=42&diff=normal&zombiePacing=pumps">TRIAL B · PUMP PACING</a></p><p>Trial B is an experimental local mode. The default game retains depth pacing.</p></details>
    </div>
  </DialogShell>;
}
