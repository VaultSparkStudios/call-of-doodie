import { describe, expect, it } from "vitest";
import { removeChromaKey } from "./chroma-key.mjs";

function syntheticMatte() {
  const width = 5;
  const height = 5;
  const data = Buffer.alloc(width * height * 3);
  for (let offset = 0; offset < data.length; offset += 3) {
    data[offset] = 0;
    data[offset + 1] = 255;
    data[offset + 2] = 0;
  }
  const set = (x, y, rgb) => {
    const offset = (y * width + x) * 3;
    data.set(rgb, offset);
  };
  set(2, 2, [220, 32, 24]);
  set(2, 1, [42, 185, 36]);
  return { data, info: { width, height, channels: 3 } };
}

describe("deterministic chroma-key matte", () => {
  it("samples the border, preserves subject color, softens edges, and despills", () => {
    const result = removeChromaKey(syntheticMatte(), { transparentThreshold: 12, opaqueThreshold: 220, despill: true });
    const pixel = (x, y) => Array.from(result.data.slice((y * 5 + x) * 4, (y * 5 + x + 1) * 4));
    expect(result.receipt.key).toEqual([0, 255, 0]);
    expect(pixel(0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(2, 2)).toEqual([220, 32, 24, 255]);
    const edge = pixel(2, 1);
    expect(edge[3]).toBeGreaterThan(0);
    expect(edge[3]).toBeLessThan(255);
    expect(edge[1]).toBeLessThanOrEqual(Math.max(edge[0], edge[2]) - 1);
  });

  it("produces byte-identical output and receipts for identical input", () => {
    const first = removeChromaKey(syntheticMatte(), { transparentThreshold: 12, opaqueThreshold: 220, despill: true });
    const second = removeChromaKey(syntheticMatte(), { transparentThreshold: 12, opaqueThreshold: 220, despill: true });
    expect(first.data.equals(second.data)).toBe(true);
    expect(first.receipt).toEqual(second.receipt);
  });
});
