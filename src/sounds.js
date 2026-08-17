// ===== WEB AUDIO SYNTHESIS — zero dependencies, no files needed =====
import {
  initBusGraph, busDest, setBusVolume, setMasterMuted, duckMusic, setMusicLowpass,
} from "./audio/audioBus.js";
import { buildOperationReinforcementCue, getOperationObjectiveMotif } from "./systems/operationAudioDirector.js";

export { setBusVolume, duckMusic, setMusicLowpass };

let audioCtx = null;
let muted = false;

export function setMuted(val) {
  muted = val;
  setMasterMuted(val);
  // Muted sessions shouldn't burn the audio thread: suspend the context and
  // let the next getCtx()/unmute resume it (context exists from a gesture, so
  // resume is allowed).
  try {
    if (audioCtx) {
      if (val && audioCtx.state === "running") audioCtx.suspend();
      else if (!val && audioCtx.state === "suspended") audioCtx.resume();
    }
  } catch { /* ignore */ }
}
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
function _createAudioContext() {
  if (audioCtx) return audioCtx;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* ignore */ }
  if (audioCtx) {
    initBusGraph(audioCtx);
    _prewarmNoiseBuffers(audioCtx);
  }
  return audioCtx;
}

// ===== BUS ROUTING =====
// Voices default onto the sfx submix; music/ambient/UI code temporarily
// switches the default with _withBus so every primitive lands on the right
// category without threading a dest through all ~60 call sites.
let _activeBus = "sfx";

// Extra scheduling delay (seconds) applied to every primitive — set by the
// music lookahead scheduler so beat functions land on absolute audio-clock
// times without every tone()/noise() call site knowing about it.
let _scheduleOffset = 0;

function _withBus(kind, fn) {
  const prev = _activeBus;
  _activeBus = kind;
  try { fn(); } finally { _activeBus = prev; }
}

function _defaultDest(ctx) {
  return busDest(_activeBus) || ctx.destination;
}

// ===== CACHED NOISE BUFFERS =====
// Three 1-second buffers of differently-colored noise, rendered once at
// prewarm. noise() plays a random slice instead of synthesizing samples on the
// main thread per event (previously a GC/jank source on kill waves).
const _noiseBuffers = [];

function _prewarmNoiseBuffers(ctx) {
  if (_noiseBuffers.length) return;
  try {
    for (const color of [0.45, 0.85, 1.25]) {
      const samples = Math.floor(ctx.sampleRate * 1.0);
      const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < samples; i++) {
        const white = Math.random() * 2 - 1;
        // color < 1 → brighter (mostly white); color > 1 → darker (one-pole lowpassed)
        last = last + Math.min(0.9, color * 0.45) * (white - last);
        data[i] = color > 0.8 ? last * 1.6 : white;
      }
      _noiseBuffers.push(buf);
    }
  } catch { /* ignore */ }
}

function _unlockAudio() {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  if (!audioCtx) _createAudioContext();
}
if (typeof document !== "undefined") document.addEventListener("pointerdown", _unlockAudio, { once: true });

// Construct the context during an idle slice so the first meaningful mobile
// interaction does not pay device/audio-backend initialization synchronously.
// Browsers that forbid pre-gesture creation still use the pointerdown fallback.
if (typeof window !== "undefined") {
  const prewarm = () => { if (!muted) _createAudioContext(); };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(prewarm, { timeout: 750 });
  else window.setTimeout(prewarm, 500);
}

function getCtx() {
  if (muted) return null;
  if (!audioCtx && !_createAudioContext()) return null;
  // Resume if suspended (browser autoplay policy / iOS background)
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Re-unlock on visibility change (iOS suspends AudioContext when app backgrounds)
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
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

// Round-robin pool of StereoPannerNodes permanently connected to the sfx bus.
// Reusing 8 panners (instead of allocating one per event and leaking it into
// the graph) bounds node count; two overlapping sounds occasionally sharing a
// pan position is inaudible in practice.
const _pannerPool = [];
let _pannerIdx = 0;
const PANNER_POOL_SIZE = 8;

function _destAt(pan) {
  const ctx = getCtx();
  if (!ctx) return null;
  try {
    if (_pannerPool.length < PANNER_POOL_SIZE) {
      const p = ctx.createStereoPanner();
      p.connect(busDest("sfx") || ctx.destination);
      _pannerPool.push(p);
    }
    const p = _pannerPool[_pannerIdx % _pannerPool.length];
    _pannerIdx++;
    p.pan.setValueAtTime(pan, ctx.currentTime);
    return p;
  } catch {
    return busDest("sfx") || ctx.destination;
  }
}

function tone(freq, duration, type = "square", vol = 0.08, freqEnd = null, startDelay = 0, dest = null) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest || _defaultDest(ctx));
    osc.type = type;
    const t = ctx.currentTime + startDelay + _scheduleOffset;
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
    _prewarmNoiseBuffers(ctx);
    if (!_noiseBuffers.length) return;
    const buf = _pick(_noiseBuffers);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(dest || _defaultDest(ctx));
    const t = ctx.currentTime + startDelay + _scheduleOffset;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const maxOffset = Math.max(0, buf.duration - duration - 0.01);
    src.start(t, _rand(0, maxOffset), duration + 0.02);
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

export function soundBossWave() {
  tone(_pick([62, 70, 80]),  1.4, "sawtooth", 0.14, 48);
  tone(120, 0.6, "square",   0.08, 90, 0.35);
  tone(_pick([180, 200, 240]), 0.4, "triangle", 0.06, 140, 0.7);
  noise(0.22, 0.055, 0.18);
  duckMusic(0.4, 600);
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
  duckMusic(0.35, 550);
}

export function soundWaveClear() {
  chirp(_pick([[440, 550, 660], [494, 622, 740], [392, 523, 784]]), 0.15, "triangle", 0.068, 0.1);
  duckMusic(0.6, 260);
}

export function soundOperationObjective(verb) {
  const motif = getOperationObjectiveMotif(verb);
  if (!motif) return false;
  _withBus("sfx", () => {
    chirp(motif.notes, motif.duration, motif.type, motif.volume, motif.gap);
    if (motif.accentNoise > 0) noise(0.045, motif.accentNoise, motif.duration);
  });
  duckMusic(0.72, 180);
  return true;
}

export function soundOperationReinforcement(reinforcementCount = 1) {
  const cue = buildOperationReinforcementCue(reinforcementCount);
  _withBus("sfx", () => {
    tone(cue.startFrequency, cue.duration, "square", cue.volume, cue.endFrequency);
    tone(cue.endFrequency * 1.5, cue.duration * 0.75, "sawtooth", cue.volume * 0.58, cue.endFrequency, 0.08);
    noise(0.08, cue.volume * 0.42, 0.03);
  });
  duckMusic(0.58, 220);
  return cue;
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
  _withBus("ui", () => {
    tone(_pick([760, 800, 880]), 0.055, "square", 0.036, 1000);
    tone(_pick([1120, 1200, 1320]), 0.045, "triangle", 0.028, null, 0.048);
  });
}

export function soundUIClose() {
  _withBus("ui", () => {
    tone(_pick([940, 1000, 1080]), 0.05, "square", 0.036, 680);
    if (_maybe(0.3)) tone(520, 0.035, "triangle", 0.018, 380, 0.045);
  });
}

// Menu navigation blips — subtle, routed through the ui submix so the UI
// volume slider governs them independently of combat.
export function soundUIHover() {
  _withBus("ui", () => tone(_pick([1180, 1240, 1320]), 0.03, "sine", 0.018, 1050));
}

export function soundUISelect() {
  _withBus("ui", () => {
    tone(_pick([680, 720, 760]), 0.045, "triangle", 0.032, 900);
    tone(1360, 0.035, "sine", 0.018, null, 0.035);
  });
}

export function soundUIConfirm() {
  _withBus("ui", () => {
    chirp(_pick([[520, 780], [560, 840], [490, 735]]), 0.06, "triangle", 0.032, 0.05);
  });
}

export function soundUIDeny() {
  _withBus("ui", () => {
    tone(220, 0.07, "square", 0.032, 180);
    tone(165, 0.09, "square", 0.026, 140, 0.06);
  });
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

// ── Combat coverage (S155 audio overhaul) ──

// Player took damage — filtered thump + descending blip. Throttled internally
// so contact-damage swarms don't machine-gun the cue; music ducks briefly so
// the hit always reads through a busy mix.
let _lastPlayerHurtAt = 0;
export function soundPlayerHurt(severity = 1) {
  const now = Date.now();
  if (now - _lastPlayerHurtAt < 200) return;
  _lastPlayerHurtAt = now;
  const s = Math.max(0.4, Math.min(2, severity));
  noise(0.09 * s, 0.11 * s);
  tone(_pick([180, 200, 220]), 0.12 * s, "sawtooth", 0.09 * s, 70);
  tone(90, 0.10 * s, "sine", 0.06 * s, 55, 0.02);
  duckMusic(0.45, 260);
}

export function soundLowAmmo() {
  tone(_pick([1300, 1400]), 0.03, "square", 0.03, 1100);
}

export function soundEmptyMag() {
  // Dry mechanical click — unmistakably "nothing happened".
  tone(2400, 0.014, "square", 0.035, 1800);
  tone(320, 0.03, "square", 0.028, 260, 0.018);
}

export function soundWeaponSwap(weaponIdx = 0) {
  // Racking chunk pitched slightly by weapon index so swaps feel distinct.
  const base = 340 + (weaponIdx % 6) * 40;
  noise(0.03, 0.03);
  tone(base, 0.05, "square", 0.045, base * 1.5);
  tone(base * 1.8, 0.04, "square", 0.032, null, 0.06);
}

export function soundEnemyShootAt(x, W) {
  const d = _destAt(_pan(x, W));
  tone(_pick([420, 460, 500]), 0.035, "sawtooth", 0.028, 300, 0, d);
}

export function soundEnemyTelegraph(x, W) {
  // Short rising warble marking a wind-up — spatialized toward the threat.
  const d = _destAt(_pan(x, W));
  tone(280, 0.09, "triangle", 0.035, 420, 0, d);
  tone(560, 0.06, "sine", 0.022, 700, 0.07, d);
}

export function soundWaveAnnounce(waveNum = 1) {
  // Riser into the wave banner; every 5th wave gets a heavier tail.
  tone(196, 0.22, "sawtooth", 0.05, 392);
  tone(294, 0.16, "triangle", 0.04, 440, 0.10);
  if (waveNum % 5 === 0) tone(98, 0.30, "sawtooth", 0.06, 65, 0.16);
  duckMusic(0.6, 220);
}

export function soundCoinAt(x, W) {
  const d = _destAt(_pan(x, W));
  tone(_pick([1568, 1760]), 0.05, "triangle", 0.038, null, 0, d);
  tone(2093, 0.06, "sine", 0.026, null, 0.035, d);
}

export function soundShopPurchase() {
  _withBus("ui", () => {
    chirp([784, 988, 1319], 0.07, "triangle", 0.045, 0.05);
    tone(1568, 0.09, "sine", 0.03, null, 0.16);
  });
}

export function soundShopDeny() {
  soundUIDeny();
}

// Boss phase-2 escalation sting — descending minor-second saw stack over a sub
// drop. Replaces the celebratory wave-clear chirp that previously (and
// confusingly) played on this threat escalation.
export function soundBossPhase2() {
  tone(466, 0.16, "sawtooth", 0.07, 440);
  tone(440, 0.22, "sawtooth", 0.06, 415, 0.10);
  tone(78, 0.5, "sine", 0.11, 40, 0.06);
  noise(0.18, 0.07, 0.10);
  duckMusic(0.4, 420);
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
    // Actually release the oscillator after the fade instead of letting it run
    // (and dangle) for the rest of the page's life.
    const drone = _dangerDrone;
    const gain = _dangerGain;
    _dangerDrone = null;
    _dangerGain = null;
    if (drone) {
      setTimeout(() => {
        try { drone.stop(); drone.disconnect(); if (gain) gain.disconnect(); } catch { /* ignore */ }
      }, 350);
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
      _dangerGain.connect(busDest("ambient") || ctx.destination);
      _dangerGain.gain.value = 0;
      _dangerDrone.start();
    }
    const targetVol = Math.max(0, Math.min(0.06, level * 0.06));
    _dangerGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 0.5);
  } catch { /* ignore */ }
}

function _tickAmbient() {
  if (!_ambientActive) return;
  if (!muted) _withBus("ambient", () => _playAmbientTick(_ambientTheme, _ambientBeat));
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
 * Drive the music energy tier from the heat meter (heatTier 0/1/2).
 * tier 0 = use player's chosen vibe as-is
 * tier 1 = escalate chill → action
 * tier 2 = escalate chill/action → intense
 * retro / spooky / boss are never overridden.
 * Changes are quantized to the next bar boundary by the scheduler so the
 * escalation lands musically instead of cutting mid-phrase.
 */
export function setMusicTier(tier) {
  const t = Math.max(0, Math.min(2, tier));
  if (t === _musicComboTier) { _pendingTier = null; return; }
  _pendingTier = t;
}

export const MUSIC_VIBES = [
  { id: "chill",   name: "Chill",   emoji: "😌" },
  { id: "action",  name: "Action",  emoji: "⚡" },
  { id: "intense", name: "Intense", emoji: "🔥" },
  { id: "retro",   name: "Retro",   emoji: "👾" },
  { id: "spooky",  name: "Spooky",  emoji: "👻" },
];

// ===== MUSIC DEPTH (S155) =====
// Each vibe now plays a 4-bar cycle (A · A · B · A-with-fill) over a chord
// progression instead of a single looping bar, which stretches the perceived
// loop from ~3–4s to ~25–30s. `chord` is a frequency ratio applied to bass and
// melody voices; `section` is 0 = A, 1 = B (variation), 2 = fill bar.
// Progressions are i–i–bVI–bVII style minor loops, voiced in the low octave.
const _PROGRESSIONS = {
  chill:   [1, 1, 0.8909, 0.7937],   // i · i · bVII · bVI
  action:  [1, 0.7937, 0.8909, 1],   // i · bVI · bVII · i
  intense: [1, 1.1892, 0.8909, 1],   // i · bIII · bVII · i
  retro:   [1, 0.8909, 0.7937, 0.8909], // i · bVII · bVI · bVII
  spooky:  [1, 1, 1.0595, 1],        // i · i · bii (dissonant lean) · i
  boss:    [1, 0.7937, 1.1892, 0.8909], // i · bVI · bIII · bVII
};

// Shared fill: bars 6–7 of the fill section get a drum roll + pitch run.
function _drumFill(beat, bar, chord, base = 220, punch = 1) {
  if (bar === 6) {
    noise(beat * 0.08, 0.06 * punch);
    noise(beat * 0.08, 0.05 * punch, beat * 0.5);
  } else if (bar === 7) {
    noise(beat * 0.06, 0.07 * punch);
    noise(beat * 0.06, 0.06 * punch, beat * 0.33);
    noise(beat * 0.06, 0.05 * punch, beat * 0.66);
    tone(base * chord, beat * 0.3, "triangle", 0.03 * punch, base * chord * 1.5);
  }
}

// Heat-tier energy overlay — layered on top of EVERY vibe (including retro/
// spooky/boss, which previously had zero adaptivity). Tier 1 adds an offbeat
// hat + soft pulse; tier 2 adds a driving eighth-note bass and extra kick.
function _tierOverlay(beat, bar, tier, chord, type) {
  if (tier >= 1) {
    tone(6800, beat * 0.03, type, 0.008, 5200, beat * 0.5);
  }
  if (tier >= 2) {
    tone(110 * chord, beat * 0.14, type === "sine" ? "triangle" : "sawtooth", 0.028, 104 * chord);
    tone(110 * chord, beat * 0.14, type === "sine" ? "triangle" : "sawtooth", 0.022, 104 * chord, beat * 0.5);
    if (bar % 2 === 0) { tone(60, beat * 0.2, "sine", 0.05, 34); }
  }
}

function _beatChill(ctx, beat, bar, chord = 1, section = 0) {
  // 72 BPM · sine-only · no snare · deep drone bass · chord pads
  if (bar === 0 || bar === 4) tone(50 * chord, beat * 0.65, "sine", 0.07, 32 * chord);
  if (bar === 2 || bar === 6) noise(beat * 0.08, 0.018); // whisper brush
  const bass = [41,41,44,41,37,37,44,41];
  tone(bass[bar] * chord, beat * 0.75, "sine", 0.055, bass[bar] * chord * 0.93);
  if (bar === 0) { tone(220 * chord, beat * 3.8, "sine", 0.011); tone(277 * chord, beat * 3.8, "sine", 0.008); tone(330 * chord, beat * 3.8, "sine", 0.006); }
  if (bar === 4) { tone(196 * chord, beat * 3.8, "sine", 0.011); tone(247 * chord, beat * 3.8, "sine", 0.008); }
  if (section === 1) {
    // B section: gentle 2-note answer melody over the pads
    const answer = [0, 330, 0, 392, 0, 330, 294, 0];
    if (answer[bar]) tone(answer[bar] * chord, beat * 1.4, "sine", 0.012, answer[bar] * chord * 0.97);
  }
  if (section === 2) _drumFill(beat, bar, chord, 165, 0.4);
}

function _beatAction(ctx, beat, bar, chord = 1, section = 0) {
  // 108 BPM · original default groove, now progression-aware
  const vol = 1.0;
  if (bar === 0 || bar === 4) { tone(75, beat * 0.45, "sine", 0.10 * vol, 38); noise(beat * 0.18, 0.07 * vol); }
  if (bar === 2 || bar === 6) { noise(beat * 0.22, 0.08 * vol); tone(220, beat * 0.15, "square", 0.03 * vol, 160); }
  if (bar % 2 === 1) tone(7500, beat * 0.06, "square", 0.012 * vol, 5000);
  tone(9000, beat * 0.03, "square", 0.008 * vol, 7000);
  const bass = [55, 55, 65, 55, 49, 55, 58, 55];
  tone(bass[bar] * chord, beat * 0.38, "sawtooth", 0.065 * vol, bass[bar] * chord * 0.88);
  if (section === 1) {
    // B section: syncopated extra kick + call-response stab
    if (bar === 3 || bar === 7) tone(75, beat * 0.3, "sine", 0.07, 40);
    if (bar === 1 || bar === 5) tone(262 * chord, beat * 0.12, "square", 0.02, 220 * chord);
  }
  if (section === 2) _drumFill(beat, bar, chord, 220, 0.8);
}

function _beatIntense(ctx, beat, bar, chord = 1, section = 0) {
  // 150 BPM · kick every beat · sawtooth everything · synth stab · lead riff
  tone(62, beat * 0.32, "sine", 0.14, 28); noise(beat * 0.10, 0.10); // kick every beat
  if (bar === 2 || bar === 6) { noise(beat * 0.20, 0.13); tone(180, beat * 0.09, "sawtooth", 0.04, 110); }
  if (bar % 2 === 1) { noise(beat * 0.07, 0.05); tone(8000, beat * 0.025, "square", 0.011, 5500); }
  tone(10000, beat * 0.02, "square", 0.009, 7000);
  const bass = [55, 73, 82, 73, 49, 65, 82, 65];
  tone(bass[bar] * chord, beat * 0.30, "sawtooth", 0.095, bass[bar] * chord * 0.84);
  if (bar === 0) { tone(330 * chord, beat * 0.07, "sawtooth", 0.04, 260 * chord); tone(415 * chord, beat * 0.07, "sawtooth", 0.03, 330 * chord); }
  const riff = section === 1
    ? [466, 0, 392, 0, 523, 0, 466, 392]  // B: inverted, busier riff
    : [0, 392, 0, 466, 0, 392, 349, 0];
  if (riff[bar]) tone(riff[bar] * chord, beat * 0.11, "sawtooth", 0.026, riff[bar] * chord * 0.9);
  if (section === 2) _drumFill(beat, bar, chord, 330, 1.1);
}

function _beatRetro(ctx, beat, bar, chord = 1, section = 0) {
  // 120 BPM · square waves ONLY · chiptune percussion · arpeggio melody
  if (bar === 0 || bar === 4) { tone(120, beat * 0.10, "square", 0.10, 38); noise(beat * 0.05, 0.08); }
  if (bar === 2 || bar === 6) { noise(beat * 0.09, 0.10); tone(440, beat * 0.07, "square", 0.025, 220); }
  if (bar % 2 === 1) tone(6500, beat * 0.035, "square", 0.01, 4200);
  const bass = [110,110,131,110,98,110,131,147];
  tone(bass[bar] * chord, beat * 0.26, "square", 0.052, bass[bar] * chord * 0.91);
  const arp  = section === 1
    ? [440, 523, 587, 523, 440, 392, 440, 523]  // B: arpeggio up a fourth
    : [330, 392, 440, 392, 330, 294, 330, 392];
  const arp2 = [262, 330, 349, 330, 262, 247, 262, 330];
  tone(arp[bar] * chord,  beat * 0.17, "square", 0.022, arp[bar] * chord * 0.95);
  tone(arp2[bar] * chord * 2, beat * 0.09, "square", 0.011);
  if (section === 2) _drumFill(beat, bar, chord, 262, 0.9);
}

function _beatSpooky(ctx, beat, bar, chord = 1, section = 0) {
  // 82 BPM · NO kick · minor key drone · eerie descending sine melody · dissonance
  if (bar === 0) { tone(28, beat * 0.9, "sine", 0.09, 22); noise(beat * 0.45, 0.028); }
  if (bar === 2 || bar === 6) noise(beat * 0.12, 0.020);
  const drone = [41,41,41,44,37,37,41,41];
  tone(drone[bar] * chord, beat * 0.92, "sine", 0.052, drone[bar] * chord * 0.96);
  const mel = section === 1
    ? [370, 392, 415, 392, 440, 415, 392, 370]  // B: rising unease
    : [440, 415, 392, 415, 370, 370, 392, 415];
  if (bar % 2 === 0) tone(mel[bar] * chord, beat * 1.7, "sine", 0.017, mel[bar] * chord * 0.93);
  if (bar === 4) tone(466 * chord, beat * 0.55, "sine", 0.012, 415 * chord); // tritone tension
  if (bar === 0) tone(1760, beat * 0.28, "sine", 0.007, 1320); // ethereal ping
  if (section === 2 && bar === 7) tone(233 * chord, beat * 1.2, "sine", 0.02, 220 * chord); // fill: low moan
}

function _beatBoss(ctx, beat, bar, chord = 1, section = 0) {
  // Boss override — original boss mode, vol boosted, progression-aware
  const vol = 1.4;
  if (bar === 0 || bar === 4) { tone(75, beat * 0.45, "sine", 0.10 * vol, 38); noise(beat * 0.18, 0.07 * vol); }
  if (bar === 2 || bar === 6) { noise(beat * 0.22, 0.08 * vol); tone(220, beat * 0.15, "square", 0.03 * vol, 160); }
  if (bar % 2 === 1) tone(7500, beat * 0.06, "square", 0.012 * vol, 5000);
  tone(9000, beat * 0.03, "square", 0.008 * vol, 7000);
  const bass = [55, 65, 73, 65, 49, 58, 73, 58];
  tone(bass[bar] * chord, beat * 0.38, "sawtooth", 0.065 * vol, bass[bar] * chord * 0.88);
  if (bar === 0) tone(330 * chord, beat * 0.12, "square", 0.025, 280 * chord);
  if (section === 1 && (bar === 1 || bar === 5)) {
    // B section: menacing brass-ish stab pair
    tone(196 * chord, beat * 0.2, "sawtooth", 0.035, 185 * chord);
    tone(247 * chord, beat * 0.2, "sawtooth", 0.028, 233 * chord);
  }
  if (section === 2) _drumFill(beat, bar, chord, 196, 1.3);
}

export function getMusicVibe() { return _musicVibe; }
export function setMusicVibe(vibe) {
  if (_musicActive) _pendingVibe = vibe; // land it on the next bar boundary
  else _musicVibe = vibe;
}
export function getMusicBeat() { return _musicBeat; }
export function getMusicBPM() {
  const vibe = _musicBoss ? "boss" : (_musicVibe || "action");
  return _BPM[vibe] || 108;
}

// ===== LOOKAHEAD SCHEDULER =====
// Two-clock pattern: a coarse setInterval tick schedules every beat whose
// AudioContext-clock time falls inside the lookahead window, using absolute
// times. The old setTimeout(beat*1000 - 8) chain drifted under load, which
// desynced beat-kill coin rewards and beat visuals from the audible pulse.
const _MUSIC_TICK_MS = 25;
const _MUSIC_LOOKAHEAD_S = 0.12;
let _nextBeatTime = 0;
let _pendingVibe = null;
let _pendingTier = null;
let _pendingBoss = null;

export function startMusic(isBossWave = false) {
  if (_musicActive) return;
  _musicActive = true;
  _musicBoss = isBossWave;
  _musicBeat = 0;
  _pendingVibe = _pendingTier = _pendingBoss = null;
  const ctx = getCtx();
  _nextBeatTime = ctx ? ctx.currentTime + 0.05 : 0;
  _musicTimer = setInterval(_schedulerTick, _MUSIC_TICK_MS);
}

export function stopMusic() {
  _musicActive = false;
  if (_musicTimer) { clearInterval(_musicTimer); _musicTimer = null; }
}

// Boss transitions are quantized to the next beat (a full-bar wait is too slow
// for a boss entrance); a short duck softens the swap into a pseudo-crossfade.
export function setMusicIntensity(isBossWave) {
  if (!_musicActive) { _musicBoss = isBossWave; return; }
  if (isBossWave === _musicBoss) { _pendingBoss = null; return; }
  _pendingBoss = isBossWave;
}

const _BPM = { chill: 72, action: 108, intense: 150, retro: 120, spooky: 82, boss: 138 };

function _resolveVibe() {
  let vibe = _musicBoss ? "boss" : (_musicVibe || "action");
  if (!_musicBoss && vibe !== "retro" && vibe !== "spooky") {
    if (_musicComboTier >= 2) {
      if (vibe === "chill" || vibe === "action") vibe = "intense";
    } else if (_musicComboTier >= 1 && vibe === "chill") {
      vibe = "action";
    }
  }
  return vibe;
}

function _playBeat(ctx, vibe, beat, bar) {
  // 4-bar cycle: A · A · B · A+fill, over the vibe's chord progression.
  const cycleBar = Math.floor(_musicBeat / 8) % 4;
  const chord = (_PROGRESSIONS[vibe] || _PROGRESSIONS.action)[cycleBar] ?? 1;
  const section = cycleBar === 2 ? 1 : cycleBar === 3 ? 2 : 0;
  switch (vibe) {
    case "chill":   _beatChill(ctx, beat, bar, chord, section);   break;
    case "action":  _beatAction(ctx, beat, bar, chord, section);  break;
    case "intense": _beatIntense(ctx, beat, bar, chord, section); break;
    case "retro":   _beatRetro(ctx, beat, bar, chord, section);   break;
    case "spooky":  _beatSpooky(ctx, beat, bar, chord, section);  break;
    case "boss":    _beatBoss(ctx, beat, bar, chord, section);    break;
    default:        _beatAction(ctx, beat, bar, chord, section);
  }
  // Heat adaptivity for every vibe — including retro/spooky/boss, whose core
  // pattern identity stays untouched (the escalation is additive layers).
  if (_musicComboTier > 0) {
    _tierOverlay(beat, bar, _musicComboTier, chord, vibe === "chill" || vibe === "spooky" ? "sine" : "square");
  }
}

function _schedulerTick() {
  if (!_musicActive) return;
  const ctx = getCtx();
  if (!ctx) return; // muted/suspended — recovery clause below re-anchors on resume
  if (_nextBeatTime < ctx.currentTime - 0.25) {
    // Tab throttling or a long suspend left us behind; re-anchor instead of
    // burst-scheduling a backlog of beats.
    _nextBeatTime = ctx.currentTime + 0.02;
  }
  while (_nextBeatTime < ctx.currentTime + _MUSIC_LOOKAHEAD_S) {
    const bar = _musicBeat % 8;
    if (bar === 0) {
      if (_pendingVibe != null) { _musicVibe = _pendingVibe; _pendingVibe = null; }
      if (_pendingTier != null) { _musicComboTier = _pendingTier; _pendingTier = null; }
    }
    if (_pendingBoss != null) {
      _musicBoss = _pendingBoss;
      _pendingBoss = null;
      duckMusic(0.5, 320);
    }
    const vibe = _resolveVibe();
    const beat = 60 / (_BPM[vibe] || 108);
    const delay = Math.max(0, _nextBeatTime - ctx.currentTime);
    _scheduleOffset = delay;
    try {
      _withBus("music", () => _playBeat(ctx, vibe, beat, bar));
    } finally {
      _scheduleOffset = 0;
    }
    _musicBeat++;
    _nextBeatTime += beat;
  }
}
