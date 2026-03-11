// ===== WEB AUDIO SYNTHESIS — zero dependencies, no files needed =====
let audioCtx = null;
let muted = false;

export function setMuted(val) { muted = val; }
export function getMuted() { return muted; }

function getCtx() {
  if (muted) return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration, type = "square", vol = 0.08, freqEnd = null, startDelay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + startDelay;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== null) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch {}
}

function noise(duration, vol = 0.15, startDelay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(sampleRate * duration);
    const buf = ctx.createBuffer(1, samples, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - (i / samples) * 2.5);
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime + startDelay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.start(t);
  } catch {}
}

// ===== EXPORTED SOUND FUNCTIONS =====

export function soundShoot(weaponIdx) {
  switch (weaponIdx) {
    case 0: tone(700, 0.05, "square", 0.06, 500); break;          // Banana Blaster: quick pew
    case 1: tone(120, 0.35, "sawtooth", 0.13, 60); noise(0.2, 0.1); break; // RPG: low thud
    case 2: tone(1400, 0.018, "square", 0.04, 1000); break;       // Minigun: high tick
    case 3: tone(280, 0.12, "square", 0.08, 180); break;           // Plunger: thwonk
    default: tone(600, 0.05, "square", 0.06);
  }
}

export function soundHit(isCrit) {
  if (isCrit) {
    tone(440, 0.04, "square", 0.07);
    tone(880, 0.08, "triangle", 0.06, 660, 0.02);
  } else {
    tone(180, 0.03, "sawtooth", 0.05, 100);
  }
}

export function soundDeath() {
  tone(280, 0.6, "sawtooth", 0.12, 50);
  tone(150, 0.8, "square",   0.06, 40, 0.1);
}

export function soundLevelUp() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, "triangle", 0.09, null, i * 0.08));
}

export function soundPickup(type) {
  switch (type) {
    case "health":        tone(523, 0.15, "triangle", 0.08, 659); break;
    case "ammo":          tone(660, 0.12, "square",   0.07, 880); break;
    case "speed":         tone(880, 0.08, "triangle", 0.07, 1100); break;
    case "nuke":          tone(80, 0.9, "sawtooth",   0.18, 40); noise(0.5, 0.15); break;
    case "guardian_angel":
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "sine", 0.09, null, i * 0.09));
      break;
    case "upgrade":
      [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, "triangle", 0.08, null, i * 0.07));
      break;
    default:              tone(880, 0.10, "triangle", 0.06, 1100);
  }
}

export function soundGrenade() {
  noise(0.45, 0.22);
  tone(80, 0.4, "sawtooth", 0.10, 40);
}

export function soundBossWave() {
  tone(80,  1.4, "sawtooth", 0.14, 55);
  tone(120, 0.6, "square",   0.08, 90, 0.35);
  tone(200, 0.4, "triangle", 0.06, 150, 0.7);
}

export function soundAchievement() {
  [660, 830, 1000, 1320].forEach((f, i) => tone(f, 0.13, "sine", 0.08, null, i * 0.07));
}

export function soundReload() {
  tone(350, 0.08, "square", 0.05, 550);
  tone(650, 0.06, "square", 0.04, null, 0.14);
}

export function soundDash() {
  tone(2200, 0.14, "sine", 0.07, 400);
}

export function soundBossKill() {
  noise(0.3, 0.12);
  [300, 400, 500, 700, 1000].forEach((f, i) => tone(f, 0.18, "triangle", 0.08, null, i * 0.06));
}

export function soundWaveClear() {
  [440, 550, 660].forEach((f, i) => tone(f, 0.15, "triangle", 0.07, null, i * 0.1));
}

export function soundPerkSelect() {
  tone(440, 0.1, "sine", 0.08);
  tone(660, 0.15, "triangle", 0.07, null, 0.08);
  tone(880, 0.2, "sine", 0.06, null, 0.18);
}
