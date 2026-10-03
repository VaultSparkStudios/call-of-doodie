import { midiHz } from "./scoreComposer.js";

// Separate music instrument rack: filtered voices, stereo placement, filtered
// space, and explicit cancellation. SFX synthesis remains independent.
export function createScoreSynth(ctx, destination) {
  const output = ctx.createGain();
  output.gain.value = 0.8;
  output.connect(destination);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.28;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.24;
  const wet = ctx.createGain();
  wet.gain.value = 0.16;
  const echoFilter = ctx.createBiquadFilter();
  echoFilter.type = "lowpass";
  echoFilter.frequency.value = 2400;
  delay.connect(echoFilter);
  echoFilter.connect(feedback);
  feedback.connect(delay);
  echoFilter.connect(wet);
  wet.connect(output);
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 1907;
  for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741824 - 1; }
  const voices = new Set();
  let closed = false;
  function play(event, time, secondsPerStep) {
    if (closed || voices.size >= 96) return;
    const name = event.instrument;
    const percussion = ["snare", "hat", "metal", "crash"].includes(name);
    const source = percussion ? ctx.createBufferSource() : ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    // A source can start one sample before a fractional automation boundary.
    // Zero the intrinsic value too, preventing a full-volume one-sample click.
    gain.gain.value = 0;
    const panner = ctx.createStereoPanner();
    panner.pan.value = event.pan;
    const t = time + event.offset * secondsPerStep;
    const duration = Math.max(0.03, event.length * secondsPerStep);
    filter.type = percussion ? "highpass" : "lowpass";
    filter.frequency.setValueAtTime(percussion ? name === "hat" ? 6800 : name === "metal" ? 1800 : 950 : name === "bass" ? 720 : name === "pad" ? 1700 : 4600, t);
    filter.Q.value = name === "metal" ? 5 : name === "bass" ? 1.2 : 0.5;
    if (percussion) source.buffer = buffer;
    else {
      source.type = name === "kick" || name === "bell" ? "sine" : name === "chip" ? "square" : name === "bass" || name === "groan" ? "sawtooth" : "triangle";
      const hz = name === "kick" ? 145 : midiHz(event.note);
      source.frequency.setValueAtTime(hz, t);
      if (name === "kick") source.frequency.exponentialRampToValueAtTime(38, t + 0.11);
      if (name === "groan") source.frequency.exponentialRampToValueAtTime(hz * 0.48, t + duration);
      if (name === "bell") source.frequency.exponentialRampToValueAtTime(hz * 0.996, t + duration);
      if (name === "bass" || name === "pluck") filter.frequency.exponentialRampToValueAtTime(name === "bass" ? 180 : 620, t + duration);
    }
    const attack = name === "pad" ? 0.12 : 0.005;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(event.volume, t + Math.min(attack, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(output);
    if (["lead", "bell", "pluck", "pad", "groan"].includes(name)) panner.connect(delay);
    const voice = { source, filter, gain, panner };
    voices.add(voice);
    source.onended = () => { for (const node of Object.values(voice)) node.disconnect(); voices.delete(voice); };
    source.start(t);
    source.stop(t + duration + 0.025);
  }
  function silence() {
    for (const voice of [...voices]) {
      try { voice.source.stop(); } catch { /* already ended */ }
      for (const node of Object.values(voice)) node.disconnect();
      voices.delete(voice);
    }
  }
  function dispose() {
    closed = true;
    silence();
    for (const node of [output, delay, feedback, wet, echoFilter]) node.disconnect();
  }
  return { play, silence, dispose, get voiceCount() { return voices.size; } };
}
