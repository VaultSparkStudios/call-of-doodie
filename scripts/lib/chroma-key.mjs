const KEY_DOMINANCE_THRESHOLD = 16;
const ALPHA_NOISE_FLOOR = 8;

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function median(values) {
  const sorted = values.sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sampleBorderKey(data, width, height, channels) {
  const samples = [[], [], []];
  const band = Math.max(1, Math.min(width, height, 6));
  const step = Math.max(1, Math.floor(Math.min(width, height) / 256));
  const add = (x, y) => {
    const offset = (y * width + x) * channels;
    for (let channel = 0; channel < 3; channel += 1) samples[channel].push(data[offset + channel]);
  };
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < band; y += 1) {
      add(x, y);
      add(x, height - 1 - y);
    }
  }
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < band; x += 1) {
      add(x, y);
      add(width - 1 - x, y);
    }
  }
  return samples.map((channel) => Math.round(median(channel)));
}

function spillChannels(key) {
  const maximum = Math.max(...key);
  if (maximum < 128) return [];
  return key.flatMap((value, index) => (value >= maximum - 16 && value >= 128 ? [index] : []));
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function softAlpha(distance, transparentThreshold, opaqueThreshold) {
  if (distance <= transparentThreshold) return 0;
  if (distance >= opaqueThreshold) return 255;
  return clamp(255 * smoothstep((distance - transparentThreshold) / (opaqueThreshold - transparentThreshold)));
}

function dominanceAlpha(rgb, key, spill) {
  const ordinary = [0, 1, 2].filter((index) => !spill.includes(index));
  const keyStrength = spill.length > 1
    ? Math.min(...spill.map((index) => rgb[index]))
    : rgb[spill[0]];
  const ordinaryStrength = Math.max(0, ...ordinary.map((index) => rgb[index]));
  const dominance = keyStrength - ordinaryStrength;
  if (dominance <= 0) return 255;
  const denominator = Math.max(1, Math.max(...key) - ordinaryStrength);
  return clamp(255 * (1 - Math.min(1, dominance / denominator)));
}

export function removeChromaKey(raw, {
  transparentThreshold = 12,
  opaqueThreshold = 220,
  despill = true,
} = {}) {
  const { data, info: { width, height, channels } } = raw;
  if (channels < 3) throw new Error("Chroma-key input must contain RGB channels.");
  const key = sampleBorderKey(data, width, height, channels);
  const spill = spillChannels(key);
  const output = Buffer.alloc(width * height * 4);
  let transparentPixels = 0;
  let partialPixels = 0;

  for (let source = 0, target = 0; source < data.length; source += channels, target += 4) {
    const rgb = [data[source], data[source + 1], data[source + 2]];
    const distance = Math.max(...rgb.map((value, index) => Math.abs(value - key[index])));
    const ordinary = [0, 1, 2].filter((index) => !spill.includes(index));
    const dominance = spill.length
      ? Math.min(...spill.map((index) => rgb[index])) - Math.max(0, ...ordinary.map((index) => rgb[index]))
      : 0;
    const keyLike = distance <= 32 || dominance >= KEY_DOMINANCE_THRESHOLD;
    let alpha = keyLike
      ? Math.min(softAlpha(distance, transparentThreshold, opaqueThreshold), dominanceAlpha(rgb, key, spill))
      : 255;
    if (channels === 4) alpha = Math.round(alpha * data[source + 3] / 255);
    if (alpha > 0 && alpha <= ALPHA_NOISE_FLOOR) alpha = 0;
    if (alpha === 0) transparentPixels += 1;
    else if (alpha < 255) partialPixels += 1;

    if (despill && keyLike && alpha < 252) {
      const anchor = Math.max(...ordinary.map((index) => rgb[index]));
      const cap = Math.max(0, anchor - 1);
      for (const index of spill) rgb[index] = Math.min(rgb[index], cap);
    }
    output[target] = alpha === 0 ? 0 : rgb[0];
    output[target + 1] = alpha === 0 ? 0 : rgb[1];
    output[target + 2] = alpha === 0 ? 0 : rgb[2];
    output[target + 3] = alpha;
  }

  return {
    data: output,
    info: { width, height, channels: 4 },
    receipt: { key, transparentPixels, partialPixels, totalPixels: width * height },
  };
}
