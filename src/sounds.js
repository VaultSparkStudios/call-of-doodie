// ===== WEB AUDIO SYNTHESIS — zero dependencies, no files needed =====
let audioCtx = null;
let muted = false;

export function setMuted(val) { muted = val; }
export function getMuted() { return muted; }

function _rand(min, max) {
  return min + Math.random() * (max - min);
}

function _pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function _maybe(chance) {
  return Math.random() < chance;
}

function _detune(freq, cents) {
  return freq * Math.pow(2, cents / 1200);
}

// iOS / Safari require AudioContext to be created & resumed inside a user gesture.
// This one-shot listener fires on first pointer interaction and unlocks audio globally.
function _unlockAudio() {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* ignore */ }
  }
}
document.addEventListener("pointerdown", _unlockAudio, { once: true });

function getCtx() {
  if (muted) return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  // Resume if suspended (browser autoplay policy / iOS background)
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Re-unlock on visibility change (iOS suspends AudioContext when app backgrounds)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
});

// ===== SPATIAL AUDIO =====
// Converts world-space X into a stereo pan value in [-0.85, 0.85].
// Returns 0 (center) if position/canvas data is missing.
function _pan(x, W) {
  if (x == null || !W) return 0;
  return Math.max(-0.85, Math.min(0.85, ((x - W / 2) / (W / 2)) * 0.8));
}

// Creates a StereoPannerNode → destination chain and returns it as a sink node.
// Falls back to ctx.destination if StereoPannerNode is unsupported.
function _destAt(pan) {
  const ctx = getCtx();
  if (!ctx) return null;
  try {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(ctx.destination);
    return p;
  } catch {
    return ctx.destination;
  }
}

function tone(freq, duration, type = "square", vol = 0.08, freqEnd = null, startDelay = 0, dest = null) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest || ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + startDelay;
    const cents = duration <= 0.45 ? _rand(-9, 9) : _rand(-3, 3);
    const startFreq = _detune(freq, cents);
    const endFreq = freqEnd !== null ? _detune(freqEnd, cents * 0.6) : null;
    osc.frequency.setValueAtTime(startFreq, t);
    if (endFreq !== null) osc.frequency.linearRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(vol * _rand(0.92, 1.08), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch {}
}

function noise(duration, vol = 0.15, startDelay = 0, dest = null) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(sampleRate * duration);
    const buf = ctx.createBuffer(1, samples, sampleRate);
    const data = buf.getChannelData(0);
    const color = _rand(0.4, 1.3);
    for (let i = 0; i < samples; i++) {
      const fade = Math.max(0, 1 - (i / samples) * (2.0 + color));
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(dest || ctx.destination);
    const t = ctx.currentTime + startDelay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.start(t);
  } catch {}
}

function chirp(freqs, duration = 0.06, type = "triangle", vol = 0.05, gap = 0.04, dest = null) {
  freqs.forEach((f, i) => tone(f, duration * _rand(0.85, 1.15), type, vol, null, i * gap, dest));
}

function impact(root, dest = null, strength = 1) {
  noise(0.08 * strength, 0.045 * strength, 0, dest);
  tone(root, 0.09 * strength, "sawtooth", 0.055 * strength, root * 0.45, 0, dest);
}

// ===== EXPORTED SOUND FUNCTIONS =====

export function soundShoot(weaponIdx) {
  const micro = _rand(-18, 18);
  switch (weaponIdx) {
    case 0:
      tone(_detune(_pick([660, 700, 740]), micro), 0.045, "square", 0.055, 500);
      if (_maybe(0.35)) tone(1040, 0.025, "triangle", 0.018, 760, 0.018);
      break;          // Banana Blaster: quick pew
    case 1:
      impact(120, null, 1.35); tone(95, 0.32, "sawtooth", 0.12, 48); noise(0.18, 0.11, 0.03); break; // RPG: low thud
    case 2:
      tone(_pick([1280, 1400, 1520]), 0.016, "square", 0.038, 900);
      if (_maybe(0.3)) tone(2800, 0.012, "triangle", 0.014, 1800, 0.006);
      break;       // Minigun: high tick
    case 3:
      tone(_pick([230, 260, 290]), 0.11, "square", 0.075, 170); noise(0.035, 0.025, 0.02); break;           // Plunger: thwonk
    case 4:
      noise(0.025, 0.17); tone(_pick([2400, 2600, 2900]), 0.045, "sawtooth", 0.088, 360); tone(120, 0.06, "sine", 0.025, 70, 0.015); break; // Sniper-ator: sharp crack
    case 5:
      tone(_pick([540, 600, 680]), 0.016, "square", 0.044, 1800); noise(0.018, 0.018, 0.004); break; // Squirt Gun: high squirt tick
    case 6:
      noise(0.085, 0.145); chirp([900, 1250, 1600].sort(() => Math.random() - 0.5), 0.025, "square", 0.024, 0.018); tone(300, 0.05, "square", 0.045, 180); break; // Confetti Cannon: pop blast
    case 7:
      chirp(_pick([[1200, 1000, 900], [1320, 990, 760], [1100, 1450, 880]]), 0.04, "square", 0.052, 0.038); break; // Shock Zapper: triple zap
    case 8:
      tone(_pick([520, 600, 680]), 0.26, "sawtooth", 0.085, 160); noise(0.16, 0.045, 0.04); if (_maybe(0.4)) tone(980, 0.08, "triangle", 0.02, 520, 0.11); break; // Boomerang: whoosh sweep
    case 9:
      tone(55, 0.18, "sawtooth", 0.15, 180); chirp([4200, 2500, 1200], 0.045, "square", 0.055, 0.025); noise(0.06, 0.14, 0.01); break; // Railgun: deep electric rail discharge
    case 10:
      chirp(_pick([[2200, 3300], [2400, 1900, 3100], [1800, 2600]]), 0.035, "triangle", 0.058, 0.035); break; // Ricochet Pistol: metallic high ping
    case 11:
      tone(_pick([160, 180, 205]), 0.12, "sawtooth", 0.095, 120); tone(_pick([220, 260, 310]), 0.08, "square", 0.055, 150, 0.055); break; // Nuclear Kazoo: low nasal honk
    default: tone(600, 0.05, "square", 0.06);
  }
}

export function soundHit(isCrit) {
  if (isCrit) {
    tone(_pick([392, 440, 494]), 0.04, "square", 0.07);
    tone(_pick([784, 880, 988]), 0.08, "triangle", 0.06, 660, 0.02);
    if (_maybe(0.45)) tone(1320, 0.035, "sine", 0.028, 990, 0.06);
  } else {
    tone(_pick([150, 180, 210]), 0.03, "sawtooth", 0.047, 90);
  }
}

// Spatially positioned variants — pass world x and canvas W for stereo pan.
export function soundHitAt(isCrit, x, W) {
  const d = _destAt(_pan(x, W));
  if (isCrit) {
    tone(_pick([392, 440, 494]), 0.04, "square", 0.07, null, 0, d);
    tone(_pick([784, 880, 988]), 0.08, "triangle", 0.06, 660, 0.02, d);
    if (_maybe(0.45)) tone(1320, 0.035, "sine", 0.028, 990, 0.06, d);
  } else {
    tone(_pick([150, 180, 210]), 0.03, "sawtooth", 0.047, 90, 0, d);
  }
}

export function soundEnemyDeathAt(typeIndex, x, W, combo = 0) {
  const d = _destAt(_pan(x, W));
  switch (typeIndex) {
    case 0: case 13: case 14:
      tone(100, 0.14, "sawtooth", 0.09, 50, 0, d); noise(0.07, 0.06, 0, d); break;
    case 1: case 4:
      tone(900, 0.10, "square", 0.07, 250, 0, d); tone(1100, 0.08, "square", 0.05, 200, 0.04, d); break;
    case 2: case 6:
      noise(0.12, 0.11, 0, d); tone(180, 0.09, "sawtooth", 0.06, 70, 0, d); break;
    case 3: case 9: case 15:
      tone(880, 0.10, "triangle", 0.07, 660, 0, d); tone(660, 0.08, "triangle", 0.05, 440, 0.06, d); break;
    case 5: case 7:
      tone(1800, 0.06, "square", 0.05, 600, 0, d); break;
    case 8:
      tone(400, 0.07, "sine", 0.06, 180, 0, d); tone(1200, 0.05, "square", 0.04, 400, 0.05, d); break;
    case 10:
      tone(1200, 0.10, "square", 0.07, 150, 0, d); break;
    case 11:
      noise(0.05, 0.08, 0, d); tone(350, 0.09, "square", 0.06, 260, 0, d); break;
    case 12:
      noise(0.18, 0.13, 0, d); tone(90, 0.14, "sawtooth", 0.07, 35, 0, d); break;
    case 19:
      tone(880, 0.04, "square", 0.06, 400, 0, d);
      tone(600, 0.10, "triangle", 0.04, 150, 0.04, d);
      noise(0.05, 0.025, 0.06, d); break;
    case 20:
      tone(1800, 0.05, "square", 0.07, 100, 0, d);
      tone(1100, 0.06, "square", 0.05, 80, 0.04, d);
      tone(500, 0.09, "sawtooth", 0.06, 40, 0.09, d);
      noise(0.14, 0.08, 0.10, d); break;
    default:
      tone(300, 0.08, "triangle", 0.05, 120, 0, d); break;
  }
  // Kill-chain escalation: additive pitch marker that rises with combo tier
  if (combo >= 5) {
    const tier = Math.min(3, Math.floor(combo / 5));
    const pitchHz = _detune(880, tier * 80); // +80 cents per 5-combo tier
    tone(pitchHz, 0.06, "triangle", 0.03 + tier * 0.01, null, 0, d);
    if (combo >= 10) tone(pitchHz * 2, 0.05, "sine", 0.018, null, 0.02, d);
    if (combo >= 15) tone(52, 0.18, "sawtooth", 0.07, 35, 0, d);
  }
}

export function soundPickupAt(type, x, W) {
  const d = _destAt(_pan(x, W));
  switch (type) {
    case "health":        tone(_pick([494, 523, 587]), 0.15, "triangle", 0.08, 659, 0, d); break;
    case "ammo":          chirp(_pick([[660, 880], [590, 740], [700, 990]]), 0.09, "square", 0.055, 0.055, d); break;
    case "speed":         chirp(_pick([[880, 1100], [988, 1320], [784, 1175]]), 0.07, "triangle", 0.06, 0.045, d); break;
    case "nuke":          tone(_pick([64, 72, 80]), 0.9, "sawtooth",   0.18, 36, 0, d); noise(0.5, 0.15, 0, d); break;
    case "guardian_angel":
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "sine", 0.09, null, i * 0.09, d)); break;
    case "upgrade":
      [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, "triangle", 0.08, null, i * 0.07, d)); break;
    case "rage":          tone(500, 0.08, "sawtooth", 0.08, 1200, 0, d); tone(800, 0.12, "square", 0.07, 1600, 0.06, d); break;
    case "magnet":        tone(440, 0.10, "sine", 0.07, 880, 0, d); tone(880, 0.08, "sine", 0.05, 1320, 0.08, d); break;
    case "freeze":        tone(1600, 0.14, "triangle", 0.07, 350, 0, d); tone(1200, 0.10, "triangle", 0.05, 280, 0.08, d); break;
    case "time_dilation": tone(600, 0.55, "sine", 0.07, 200, 0, d); tone(1200, 0.30, "triangle", 0.05, 600, 0.10, d); tone(300, 0.45, "sine", 0.04, 80, 0.20, d); break;
    default:              tone(880, 0.10, "triangle", 0.06, 1100, 0, d); break;
  }
}

export function soundGrenadeAt(x, W) {
  const d = _destAt(_pan(x, W));
  noise(0.45, 0.22, 0, d);
  tone(_pick([64, 72, 80, 92]), 0.42, "sawtooth", 0.10, 36, 0, d);
  tone(180, 0.08, "square", 0.035, 60, 0.035, d);
}

export function soundDeath() {
  tone(_pick([240, 280, 320]), 0.6, "sawtooth", 0.12, 50);
  tone(_pick([120, 150, 180]), 0.8, "square",   0.06, 40, 0.1);
  noise(0.28, 0.045, 0.12);
}

export function soundLevelUp() {
  chirp(_pick([[523, 659, 784, 1047], [587, 740, 880, 1175], [494, 622, 740, 988]]), 0.14, "triangle", 0.085, 0.08);
  if (_maybe(0.35)) tone(1568, 0.16, "sine", 0.025, null, 0.32);
}

export function soundPickup(type) {
  switch (type) {
    case "health":        tone(_pick([494, 523, 587]), 0.15, "triangle", 0.08, 659); break;
    case "ammo":          chirp(_pick([[660, 880], [590, 740], [700, 990]]), 0.09, "square", 0.055, 0.055); break;
    case "speed":         chirp(_pick([[880, 1100], [988, 1320], [784, 1175]]), 0.07, "triangle", 0.06, 0.045); break;
    case "nuke":          tone(_pick([64, 72, 80]), 0.9, "sawtooth",   0.18, 36); noise(0.5, 0.15); break;
    case "guardian_angel":
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "sine", 0.09, null, i * 0.09));
      break;
    case "upgrade":
      [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, "triangle", 0.08, null, i * 0.07));
      break;
    case "rage":          tone(500, 0.08, "sawtooth", 0.08, 1200); tone(800, 0.12, "square", 0.07, 1600, 0.06); break;
    case "magnet":        tone(440, 0.10, "sine", 0.07, 880); tone(880, 0.08, "sine", 0.05, 1320, 0.08); break;
    case "freeze":        tone(1600, 0.14, "triangle", 0.07, 350); tone(1200, 0.10, "triangle", 0.05, 280, 0.08); break;
    case "time_dilation": tone(600, 0.55, "sine", 0.07, 200); tone(1200, 0.30, "triangle", 0.05, 600, 0.10); tone(300, 0.45, "sine", 0.04, 80, 0.20); break;
    default:              tone(880, 0.10, "triangle", 0.06, 1100);
  }
}

export function soundGrenade() {
  noise(0.45, 0.22);
  tone(_pick([64, 72, 80, 92]), 0.42, "sawtooth", 0.10, 36);
  tone(180, 0.08, "square", 0.035, 60, 0.035);
}

export function soundBossWave() {
  tone(_pick([62, 70, 80]),  1.4, "sawtooth", 0.14, 48);
  tone(120, 0.6, "square",   0.08, 90, 0.35);
  tone(_pick([180, 200, 240]), 0.4, "triangle", 0.06, 140, 0.7);
  noise(0.22, 0.055, 0.18);
}

export function soundAchievement() {
  chirp(_pick([[660, 830, 1000, 1320], [784, 988, 1175, 1568], [587, 740, 988, 1480]]), 0.13, "sine", 0.075, 0.07);
}

export function soundReload() {
  tone(_pick([300, 350, 410]), 0.075, "square", 0.048, 550);
  noise(0.025, 0.025, 0.07);
  tone(_pick([590, 650, 720]), 0.055, "square", 0.038, null, 0.14);
}

export function soundDash() {
  tone(_pick([1800, 2200, 2600]), 0.13, "sine", 0.068, 380);
  noise(0.055, 0.025, 0.01);
}

export function soundBossKill() {
  noise(0.34, 0.13);
  chirp(_pick([[300, 400, 500, 700, 1000], [247, 330, 494, 740, 988], [392, 523, 659, 880, 1175]]), 0.18, "triangle", 0.078, 0.06);
}

export function soundWaveClear() {
  chirp(_pick([[440, 550, 660], [494, 622, 740], [392, 523, 784]]), 0.15, "triangle", 0.068, 0.1);
}

// Rising pitch click for each precision streak hit. streakLevel 1–N raises pitch.
export function soundPrecisionClick(streakLevel = 1) {
  const freq = 440 + Math.min(streakLevel, 20) * 40;
  tone(freq, 0.04, "sine", 0.045);
}

// Bright lock sound at streak=5 (glow ring activation threshold).
export function soundPrecisionLock() {
  tone(880, 0.06, "sine", 0.065);
  tone(1320, 0.08, "triangle", 0.04, null, 0.04);
}

// Boss grudge recognition sting: tier 1 (grudge, ≥2 session deaths) = descending minor 3rd;
// tier 2 (nemesis, ≥3 session deaths) = descending tritone + bass pulse.
export function soundBossGrudge(tier = 1) {
  if (tier >= 2) {
    tone(440, 0.10, "sawtooth", 0.08);
    tone(311, 0.12, "sawtooth", 0.07, null, 0.08);
    tone(185, 0.18, "square",   0.10, null, 0.18);
    tone(92,  0.30, "sawtooth", 0.06, null, 0.25);
  } else {
    tone(440, 0.10, "sine", 0.07);
    tone(330, 0.22, "sawtooth", 0.08, null, 0.08);
  }
}

// Combo decay tension: ticking blip that pitches up as timer expires (for combos ≥10).
// framesLeft: remaining frames on the combo timer.
export function soundComboTick(framesLeft = 15) {
  const pitch = 220 + Math.max(0, 30 - framesLeft) * 22;
  tone(pitch, 0.03, "square", 0.045);
}

// Combo break sting: descending glide on chain reset. count = the lost streak.
export function soundComboBreak(count = 5) {
  const vol = Math.min(0.10, 0.04 + count * 0.003);
  if (count >= 15) {
    tone(440, 0.06, "sawtooth", vol);
    tone(311, 0.10, "sawtooth", vol * 0.85, null, 0.05);
    tone(220, 0.20, "square",   vol * 0.70, null, 0.12);
  } else {
    tone(330, 0.08, "sine", vol);
    tone(220, 0.16, "sawtooth", vol * 0.8, null, 0.06);
  }
}

// Kill-chain escalation audio: level 1 (ENRAGED) = ascending tritone stab; level 2 (FURIOUS) = two-pulse alarm.
export function soundChainEscalate(level) {
  if (level === 1) {
    tone(220, 0.05, "sawtooth", 0.06);
    tone(311, 0.09, "sawtooth", 0.05, null, 0.05);
    tone(440, 0.13, "square",   0.04, null, 0.09);
  } else if (level === 2) {
    tone(146, 0.06, "sawtooth", 0.09);
    tone(195, 0.07, "sawtooth", 0.07, null, 0.04);
    tone(146, 0.06, "sawtooth", 0.08, null, 0.14);
    tone(195, 0.07, "sawtooth", 0.07, null, 0.18);
  }
}

export function soundPerkSelect() {
  const root = _pick([392, 440, 494]);
  tone(root, 0.1, "sine", 0.075);
  tone(root * 1.5, 0.15, "triangle", 0.066, null, 0.08);
  tone(root * 2, 0.2, "sine", 0.055, null, 0.18);
}

export function soundUIOpen() {
  tone(_pick([760, 800, 880]), 0.055, "square", 0.036, 1000);
  tone(_pick([1120, 1200, 1320]), 0.045, "triangle", 0.028, null, 0.048);
}

export function soundUIClose() {
  tone(_pick([940, 1000, 1080]), 0.05, "square", 0.036, 680);
  if (_maybe(0.3)) tone(520, 0.035, "triangle", 0.018, 380, 0.045);
}

// Per-enemy-type death synths — 8 distinct sound groups
export function soundEnemyDeath(typeIndex) {
  switch (typeIndex) {
    case 0: case 13: case 14: // mall cop, sergeant karen, life coach — low thud
      tone(100, 0.14, "sawtooth", 0.09, 50); noise(0.07, 0.06); break;
    case 1: case 4: // karen, mega karen — shrill screech
      tone(900, 0.10, "square", 0.07, 250); tone(1100, 0.08, "square", 0.05, 200, 0.04); break;
    case 2: case 6: // florida man, gym bro — grunt thud
      noise(0.12, 0.11); tone(180, 0.09, "sawtooth", 0.06, 70); break;
    case 3: case 9: case 15: // hoa president, landlord, tech ceo — bureaucratic ding
      tone(880, 0.10, "triangle", 0.07, 660); tone(660, 0.08, "triangle", 0.05, 440, 0.06); break;
    case 5: case 7: // it guy, influencer — digital blip
      tone(1800, 0.06, "square", 0.05, 600); break;
    case 8: // conspiracy bro — weird alien blip
      tone(400, 0.07, "sine", 0.06, 180); tone(1200, 0.05, "square", 0.04, 400, 0.05); break;
    case 10: // crypto bro — descending beep (number go down)
      tone(1200, 0.10, "square", 0.07, 150); break;
    case 11: // shield guy — metallic clank
      noise(0.05, 0.08); tone(350, 0.09, "square", 0.06, 260); break;
    case 12: // yolo bomber — mini-explosion
      noise(0.18, 0.13); tone(90, 0.14, "sawtooth", 0.07, 35); break;
    case 19: // Doomscroller — notification buzz + sad descending chime
      tone(880, 0.04, "square", 0.06, 400);
      tone(600, 0.10, "triangle", 0.04, 150, 0.04);
      noise(0.05, 0.025, 0.06);
      break;
    case 20: // The Algorithm — glitchy error cascade (content_terminated)
      tone(1800, 0.05, "square", 0.07, 100);
      tone(1100, 0.06, "square", 0.05, 80, 0.04);
      tone(500, 0.09, "sawtooth", 0.06, 40, 0.09);
      noise(0.14, 0.08, 0.10);
      break;
    default: // fallback — generic pop
      tone(300, 0.08, "triangle", 0.05, 120); break;
  }
}

// Distinct sound when a Summoner's summoned minion is destroyed
export function soundSummonDismissed() {
  tone(_pick([720, 800, 880]), 0.14, "sine", 0.07, 200);
  tone(_pick([1100, 1200, 1320]), 0.09, "triangle", 0.05, 350, 0.06);
  noise(0.07, 0.035, 0.03);
}

export function soundGamepadConnect() {
  chirp(_pick([[440, 660, 880], [494, 740, 988], [392, 587, 784]]), 0.08, "triangle", 0.05, 0.075);
}

// ── Last Stand + Adaptive Soundtrack ──

export function soundLastStand() {
  // Dramatic descending crash: announces critical HP threshold
  tone(_pick([660, 700, 740]), 0.45, "sawtooth", 0.11, 110);
  tone(_pick([330, 370, 400]), 0.32, "square", 0.07, 55, 0.05);
  noise(0.30, 0.13, 0.08);
}

export function soundHeartbeatPulse() {
  // Single low double-thump; called periodically while in last-stand mode
  tone(78, 0.10, "sine", 0.13, 52);
  tone(68, 0.09, "sine", 0.08, 42, 0.11);
}

export function soundBossFinale() {
  // Rising tension chord when boss HP crosses 10%
  [220, 277, 330, 440].forEach((f, i) => tone(f, 0.55, "sawtooth", 0.04, f * 1.5, i * 0.10));
  noise(0.18, 0.055, 0.14);
}

export function soundGamepadDisconnect() {
  chirp(_pick([[880, 600, 360], [740, 494, 294], [988, 660, 392]]), 0.08, "triangle", 0.045, 0.075);
}

// ===== AMBIENT ROOM TONE =====
// Low-volume procedural ambience per map theme. Layered under music.
// 0=office 1=bunker 2=factory 3=ruins 4=desert 5=forest

let _ambientActive = false;
let _ambientTheme = 0;
let _ambientBeat = 0;
let _ambientTimer = null;

let _dangerDrone = null;
let _dangerGain = null;

const _AMBIENT_TICK = [900, 700, 550, 1400, 1900, 950, 1100, 1600]; // ms between ticks per theme

function _playAmbientTick(theme, beat) {
  const ctx = getCtx();
  if (!ctx) return;
  const b = beat % 8;
  switch (theme) {
    case 0: // office — HVAC hiss + rare keyboard click
      noise(0.5, 0.007);
      if (b === 0) tone(1500, 0.012, "square", 0.003);
      break;
    case 1: // bunker — deep drone + distant metal thud
      tone(38, 0.6, "sine", 0.013, 32);
      if (b === 0) { noise(0.10, 0.018); tone(80, 0.08, "sawtooth", 0.007, 50); }
      break;
    case 2: // factory — machinery hum + steam burst
      tone(58, 0.45, "sawtooth", 0.013, 54);
      if (b % 2 === 0) noise(0.06, 0.017);
      if (b === 0) tone(110, 0.05, "square", 0.006, 88);
      break;
    case 3: // ruins — wind + drip echo
      noise(0.6, 0.005);
      if (b === 0) tone(750, 0.04, "sine", 0.007, 280);
      if (b === 4) tone(380, 0.06, "sine", 0.005, 140);
      break;
    case 4: // desert — wind sweep + heat shimmer tone
      noise(0.8, 0.004);
      if (b === 0) tone(200, 0.38, "sine", 0.005, 110);
      break;
    case 5: // forest — cricket chirp + soft breeze
      tone(3800 + (b % 3) * 180, 0.055, "sine", 0.006);
      if (b === 0) noise(0.20, 0.004);
      break;
    case 6: // space — low sine hum + electronic blip
      tone(28, 0.9, "sine", 0.010, 24);
      if (b === 0) tone(880, 0.04, "sine", 0.004, 660);
      if (b === 4) tone(1320, 0.03, "triangle", 0.003, 990);
      break;
    case 7: // arctic — wind howl + ice creak
      noise(0.9, 0.005);
      if (b === 0) tone(160, 0.45, "sine", 0.006, 100);
      if (b === 4) tone(400, 0.06, "triangle", 0.004, 320); // ice creak
      break;
    default:
      break;
  }
}

export function startAmbient(themeIndex) {
  stopAmbient();
  _ambientActive = true;
  _ambientTheme = themeIndex ?? 0;
  _ambientBeat = 0;
  _tickAmbient();
}

export function stopAmbient() {
  _ambientActive = false;
  if (_ambientTimer) { clearTimeout(_ambientTimer); _ambientTimer = null; }
  stopDangerDrone();
}

export function stopDangerDrone() {
  try {
    if (_dangerGain) {
      const ctx = getCtx();
      if (ctx) _dangerGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    }
  } catch { /* ignore */ }
}

export function setDangerIntensity(level) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (!_dangerDrone) {
      _dangerDrone = ctx.createOscillator();
      _dangerGain = ctx.createGain();
      _dangerDrone.type = "sine";
      _dangerDrone.frequency.value = 55;
      _dangerDrone.connect(_dangerGain);
      _dangerGain.connect(ctx.destination);
      _dangerGain.gain.value = 0;
      _dangerDrone.start();
    }
    const targetVol = Math.max(0, Math.min(0.06, level * 0.06));
    _dangerGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 0.5);
  } catch { /* ignore */ }
}

function _tickAmbient() {
  if (!_ambientActive) return;
  _playAmbientTick(_ambientTheme, _ambientBeat);
  _ambientBeat++;
  _ambientTimer = setTimeout(_tickAmbient, _AMBIENT_TICK[_ambientTheme] ?? 900);
}

// ===== BACKGROUND MUSIC =====
// Procedural 8-beat loop — kicks, snares, hats, bass. No audio files.
let _musicActive = false;
let _musicBoss = false;
let _musicBeat = 0;
let _musicTimer = null;
let _musicVibe = "action";
// Reactive combo tier: 0=normal, 1=action-bump, 2=intense
let _musicComboTier = 0;

/**
 * Drive the music energy tier from combo count.
 * tier 0 = use player's chosen vibe as-is
 * tier 1 = boost chill→action (combo 2-4)
 * tier 2 = force intense     (combo 5+)
 * retro / spooky / boss are never overridden.
 */
export function setMusicTier(tier) {
  _musicComboTier = Math.max(0, Math.min(2, tier));
}

export const MUSIC_VIBES = [
  { id: "chill",   name: "Chill",   emoji: "😌" },
  { id: "action",  name: "Action",  emoji: "⚡" },
  { id: "intense", name: "Intense", emoji: "🔥" },
  { id: "retro",   name: "Retro",   emoji: "👾" },
  { id: "spooky",  name: "Spooky",  emoji: "👻" },
];

// Per-vibe beat functions — each has a genuinely distinct feel
function _beatChill(ctx, beat, bar) {
  // 72 BPM · sine-only · no snare · deep drone bass · chord pads
  if (bar === 0 || bar === 4) tone(50, beat * 0.65, "sine", 0.07, 32);
  if (bar === 2 || bar === 6) noise(beat * 0.08, 0.018); // whisper brush
  const bass = [41,41,44,41,37,37,44,41];
  tone(bass[bar], beat * 0.75, "sine", 0.055, bass[bar] * 0.93);
  if (bar === 0) { tone(220, beat * 3.8, "sine", 0.011); tone(277, beat * 3.8, "sine", 0.008); tone(330, beat * 3.8, "sine", 0.006); }
  if (bar === 4) { tone(196, beat * 3.8, "sine", 0.011); tone(247, beat * 3.8, "sine", 0.008); }
}

function _beatAction(ctx, beat, bar) {
  // 108 BPM · original default — unchanged
  const vol = 1.0;
  if (bar === 0 || bar === 4) { tone(75, beat * 0.45, "sine", 0.10 * vol, 38); noise(beat * 0.18, 0.07 * vol); }
  if (bar === 2 || bar === 6) { noise(beat * 0.22, 0.08 * vol); tone(220, beat * 0.15, "square", 0.03 * vol, 160); }
  if (bar % 2 === 1) tone(7500, beat * 0.06, "square", 0.012 * vol, 5000);
  tone(9000, beat * 0.03, "square", 0.008 * vol, 7000);
  const bass = [55, 55, 65, 55, 49, 55, 58, 55];
  tone(bass[bar], beat * 0.38, "sawtooth", 0.065 * vol, bass[bar] * 0.88);
}

function _beatIntense(ctx, beat, bar) {
  // 150 BPM · kick every beat · sawtooth everything · synth stab · lead riff
  tone(62, beat * 0.32, "sine", 0.14, 28); noise(beat * 0.10, 0.10); // kick every beat
  if (bar === 2 || bar === 6) { noise(beat * 0.20, 0.13); tone(180, beat * 0.09, "sawtooth", 0.04, 110); }
  if (bar % 2 === 1) { noise(beat * 0.07, 0.05); tone(8000, beat * 0.025, "square", 0.011, 5500); }
  tone(10000, beat * 0.02, "square", 0.009, 7000);
  const bass = [55, 73, 82, 73, 49, 65, 82, 65];
  tone(bass[bar], beat * 0.30, "sawtooth", 0.095, bass[bar] * 0.84);
  if (bar === 0) { tone(330, beat * 0.07, "sawtooth", 0.04, 260); tone(415, beat * 0.07, "sawtooth", 0.03, 330); }
  const riff = [0, 392, 0, 466, 0, 392, 349, 0];
  if (riff[bar]) tone(riff[bar], beat * 0.11, "sawtooth", 0.026, riff[bar] * 0.9);
}

function _beatRetro(ctx, beat, bar) {
  // 120 BPM · square waves ONLY · chiptune percussion · arpeggio melody
  if (bar === 0 || bar === 4) { tone(120, beat * 0.10, "square", 0.10, 38); noise(beat * 0.05, 0.08); }
  if (bar === 2 || bar === 6) { noise(beat * 0.09, 0.10); tone(440, beat * 0.07, "square", 0.025, 220); }
  if (bar % 2 === 1) tone(6500, beat * 0.035, "square", 0.01, 4200);
  const bass = [110,110,131,110,98,110,131,147];
  tone(bass[bar], beat * 0.26, "square", 0.052, bass[bar] * 0.91);
  const arp  = [330, 392, 440, 392, 330, 294, 330, 392];
  const arp2 = [262, 330, 349, 330, 262, 247, 262, 330];
  tone(arp[bar],  beat * 0.17, "square", 0.022, arp[bar]  * 0.95);
  tone(arp2[bar] * 2, beat * 0.09, "square", 0.011);
}

function _beatSpooky(ctx, beat, bar) {
  // 82 BPM · NO kick · minor key drone · eerie descending sine melody · dissonance
  if (bar === 0) { tone(28, beat * 0.9, "sine", 0.09, 22); noise(beat * 0.45, 0.028); }
  if (bar === 2 || bar === 6) noise(beat * 0.12, 0.020);
  const drone = [41,41,41,44,37,37,41,41];
  tone(drone[bar], beat * 0.92, "sine", 0.052, drone[bar] * 0.96);
  const mel = [440, 415, 392, 415, 370, 370, 392, 415];
  if (bar % 2 === 0) tone(mel[bar], beat * 1.7, "sine", 0.017, mel[bar] * 0.93);
  if (bar === 4) tone(466, beat * 0.55, "sine", 0.012, 415); // tritone tension
  if (bar === 0) tone(1760, beat * 0.28, "sine", 0.007, 1320); // ethereal ping
}

function _beatBoss(ctx, beat, bar) {
  // Boss override — original boss mode, vol boosted
  const vol = 1.4;
  if (bar === 0 || bar === 4) { tone(75, beat * 0.45, "sine", 0.10 * vol, 38); noise(beat * 0.18, 0.07 * vol); }
  if (bar === 2 || bar === 6) { noise(beat * 0.22, 0.08 * vol); tone(220, beat * 0.15, "square", 0.03 * vol, 160); }
  if (bar % 2 === 1) tone(7500, beat * 0.06, "square", 0.012 * vol, 5000);
  tone(9000, beat * 0.03, "square", 0.008 * vol, 7000);
  const bass = [55, 65, 73, 65, 49, 58, 73, 58];
  tone(bass[bar], beat * 0.38, "sawtooth", 0.065 * vol, bass[bar] * 0.88);
  if (bar === 0) tone(330, beat * 0.12, "square", 0.025, 280);
}

export function getMusicVibe() { return _musicVibe; }
export function setMusicVibe(vibe) { _musicVibe = vibe; }
export function getMusicBeat() { return _musicBeat; }
export function getMusicBPM() {
  const vibe = _musicBoss ? "boss" : (_musicVibe || "action");
  return _BPM[vibe] || 108;
}

export function startMusic(isBossWave = false) {
  if (_musicActive) return;
  _musicActive = true;
  _musicBoss = isBossWave;
  _musicBeat = 0;
  _scheduleMusicBeat();
}

export function stopMusic() {
  _musicActive = false;
  if (_musicTimer) { clearTimeout(_musicTimer); _musicTimer = null; }
}

export function setMusicIntensity(isBossWave) {
  _musicBoss = isBossWave;
}

const _BPM = { chill: 72, action: 108, intense: 150, retro: 120, spooky: 82, boss: 138 };

function _scheduleMusicBeat() {
  if (!_musicActive) return;
  const ctx = getCtx();
  let vibe = _musicBoss ? "boss" : (_musicVibe || "action");
  // Reactive: boost energy based on combo streak — never override retro/spooky/boss.
  // Tier 1 (8+ combo): escalate chill → action.
  // Tier 2 (15+ combo): escalate chill/action → intense.
  if (!_musicBoss && vibe !== "retro" && vibe !== "spooky") {
    if (_musicComboTier >= 2) {
      if (vibe === "chill" || vibe === "action") vibe = "intense";
    } else if (_musicComboTier >= 1 && vibe === "chill") {
      vibe = "action";
    }
  }
  const beat = 60 / (_BPM[vibe] || 108);
  const bar = _musicBeat % 8;
  if (ctx) {
    switch (vibe) {
      case "chill":   _beatChill(ctx, beat, bar);   break;
      case "action":  _beatAction(ctx, beat, bar);  break;
      case "intense": _beatIntense(ctx, beat, bar); break;
      case "retro":   _beatRetro(ctx, beat, bar);   break;
      case "spooky":  _beatSpooky(ctx, beat, bar);  break;
      case "boss":    _beatBoss(ctx, beat, bar);    break;
      default:        _beatAction(ctx, beat, bar);
    }
  }
  _musicBeat++;
  _musicTimer = setTimeout(_scheduleMusicBeat, beat * 1000 - 8);
}
