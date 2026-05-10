// Highlight GIF encoder Web Worker.
// Receives a list of RGBA frames + dimensions; returns an encoded GIF blob.
//
// Message in:  { frames: [{ data: Uint8Array, ts: number }, ...], width, height, delay? }
// Message out: { ok: true, bytes: Uint8Array } | { ok: false, error: string }

import { GIFEncoder, quantize, applyPalette } from "gifenc";

self.onmessage = async (ev) => {
  const { frames, width, height, delay = 100 } = ev.data || {};
  try {
    if (!frames || frames.length === 0) {
      self.postMessage({ ok: false, error: "no frames" });
      return;
    }
    const enc = GIFEncoder();
    const sample = frames[Math.floor(frames.length / 2)];
    const palette = quantize(new Uint8Array(sample.data), 256);
    for (let i = 0; i < frames.length; i++) {
      const rgba = new Uint8Array(frames[i].data);
      const index = applyPalette(rgba, palette);
      enc.writeFrame(index, width, height, { palette, delay });
    }
    enc.finish();
    const bytes = enc.bytes();
    self.postMessage({ ok: true, bytes }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message || err) });
  }
};
