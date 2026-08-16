// ===== AUDIO BUS GRAPH =====
// master GainNode → DynamicsCompressor (limiter) → ctx.destination, with four
// submix GainNodes (sfx / music / ambient / ui) feeding master. Every voice in
// sounds.js routes through a submix so volume sliders, mute, ducking, and the
// low-HP music filter act on whole categories instead of individual nodes.

let _graph = null;

// Also serves as the pending-volume store for setBusVolume calls that arrive
// before the AudioContext (and therefore the graph) exists.
const DEFAULT_VOLUMES = { master: 1, sfx: 1, music: 0.8, ambient: 0.7, ui: 1 };

export function initBusGraph(ctx) {
  if (_graph && _graph.ctx === ctx) return _graph;
  try {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);

    const master = ctx.createGain();
    master.connect(limiter);

    const prev = _graph;
    const volumes = { ...DEFAULT_VOLUMES, ...(prev ? prev.volumes : null) };
    const mutedFlag = prev ? prev.muted : false;
    master.gain.value = mutedFlag ? 0 : volumes.master;

    // Music routes through a lowpass so last-stand can sweep the cutoff down.
    const musicFilter = ctx.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 18000;
    musicFilter.connect(master);

    const buses = {
      sfx: ctx.createGain(),
      music: ctx.createGain(),
      ambient: ctx.createGain(),
      ui: ctx.createGain(),
    };
    buses.sfx.connect(master);
    buses.music.connect(musicFilter);
    buses.ambient.connect(master);
    buses.ui.connect(master);
    for (const kind of ["sfx", "music", "ambient", "ui"]) {
      buses[kind].gain.value = volumes[kind];
    }

    _graph = { ctx, master, limiter, musicFilter, buses, volumes, muted: mutedFlag };
  } catch {
    _graph = null;
  }
  return _graph;
}

export function getBusGraph() {
  return _graph;
}

// Returns the submix node for a category, or null when no graph exists yet
// (callers fall back to ctx.destination so audio still works graph-less).
export function busDest(kind) {
  return _graph ? _graph.buses[kind] || _graph.buses.sfx : null;
}

export function setBusVolume(kind, vol) {
  const n = Number(vol);
  const v = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1));
  if (!_graph) {
    DEFAULT_VOLUMES[kind] = v; // picked up when initBusGraph runs
    return;
  }
  _graph.volumes[kind] = v;
  try {
    if (kind === "master") {
      if (!_graph.muted) _graph.master.gain.setTargetAtTime(v, _graph.ctx.currentTime, 0.02);
    } else if (_graph.buses[kind]) {
      _graph.buses[kind].gain.setTargetAtTime(v, _graph.ctx.currentTime, 0.02);
    }
  } catch { /* ignore */ }
}

export function setMasterMuted(mutedFlag) {
  if (!_graph) return;
  _graph.muted = !!mutedFlag;
  try {
    const target = _graph.muted ? 0 : _graph.volumes.master;
    _graph.master.gain.setTargetAtTime(target, _graph.ctx.currentTime, 0.02);
  } catch { /* ignore */ }
}

// Sidechain-style duck: dip the music bus and recover over releaseMs.
// amount is linear (0.5 ≈ −6 dB). Safe to call rapidly; ramps re-target.
export function duckMusic(amount = 0.5, releaseMs = 300) {
  if (!_graph) return;
  try {
    const g = _graph.buses.music.gain;
    const now = _graph.ctx.currentTime;
    const base = _graph.volumes.music;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(base * amount, now, 0.015);
    g.setTargetAtTime(base, now + releaseMs / 1000, 0.08);
  } catch { /* ignore */ }
}

// Low-HP treatment: sweep the music lowpass down when entering last stand,
// restore when leaving. Pure bus-level effect — zero per-frame cost.
export function setMusicLowpass(active) {
  if (!_graph) return;
  try {
    const f = _graph.musicFilter.frequency;
    const now = _graph.ctx.currentTime;
    f.cancelScheduledValues(now);
    f.setTargetAtTime(active ? 900 : 18000, now, active ? 0.12 : 0.25);
  } catch { /* ignore */ }
}
