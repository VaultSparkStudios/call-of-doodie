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
    case 6: noise(0.09, 0.14); tone(300, 0.05, "square", 0.05, 180); break; // Confetti Cannon: pop blast
    case 7: tone(1200, 0.04, "square", 0.06, 900); tone(1000, 0.04, "triangle", 0.04, 800, 0.04); tone(900, 0.04, "square", 0.05, 700, 0.08); break; // Shock Zapper: triple zap
    case 8: tone(600, 0.28, "sawtooth", 0.09, 180); noise(0.18, 0.04, 0.04); break; // Boomerang: WHOOSH sweep
    case 9: noise(0.07, 0.20); tone(3200, 0.05, "sawtooth", 0.09, 700); break;      // Railgun: sharp CRACK
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

export function soundUIOpen() {
  tone(800, 0.06, "square", 0.04, 1000);
  tone(1200, 0.05, "triangle", 0.03, null, 0.05);
}

export function soundUIClose() {
  tone(1000, 0.05, "square", 0.04, 700);
}

// ===== AMBIENT ROOM TONE =====
// Low-volume procedural ambience per map theme. Layered under music.
// 0=office 1=bunker 2=factory 3=ruins 4=desert 5=forest

let _ambientActive = false;
let _ambientTheme = 0;
let _ambientBeat = 0;
let _ambientTimer = null;

const _AMBIENT_TICK = [900, 700, 550, 1400, 1900, 950]; // ms between ticks per theme

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
  const vibe = _musicBoss ? "boss" : (_musicVibe || "action");
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
