import { describe, it, expect, vi } from "vitest";
import { createScoreSynth } from "./scoreSynth.js";

function device() {
  const nodes = [];
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => {
    const result = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), gain: parameter(), frequency: parameter(), pan: parameter(), delayTime: parameter(), Q: parameter() };
    nodes.push(result);
    return result;
  };
  return { nodes, ctx: { sampleRate: 200, createGain: node, createDelay: node, createBiquadFilter: node, createStereoPanner: node, createOscillator: node, createBufferSource: node, createBuffer: () => ({ getChannelData: () => new Float32Array(200) }) } };
}
const note = { instrument: "lead", note: 64, length: 1, volume: 0.04, pan: 0.3, offset: 0.1 };
describe("music instrument lifecycle", () => {
  it("schedules voices against absolute audio time and frees every voice node", () => {
    const { ctx, nodes } = device();
    const rack = createScoreSynth(ctx, {});
    rack.play(note, 12, 0.25);
    const source = nodes.find(item => item.start.mock.calls.length);
    expect(source.start).toHaveBeenCalledWith(12.025);
    expect(source.stop.mock.calls[0][0]).toBeCloseTo(12.3);
    expect(nodes.at(-2).gain.value).toBe(0);
    expect(rack.voiceCount).toBe(1);
    source.onended();
    expect(rack.voiceCount).toBe(0);
    expect(nodes.slice(-4).every(item => item.disconnect.mock.calls.length)).toBe(true);
  });
  it("cancels even future voices and disconnects the feedback graph on stop", () => {
    const { ctx, nodes } = device();
    const rack = createScoreSynth(ctx, {});
    rack.play(note, 20, 0.25);
    rack.dispose();
    expect(rack.voiceCount).toBe(0);
    expect(nodes.every(item => item.disconnect.mock.calls.length)).toBe(true);
    const count = nodes.length;
    rack.play(note, 21, 0.25);
    expect(nodes.length).toBe(count);
  });
  it("bounds the graph during dense or delayed audio workloads", () => {
    const { ctx } = device();
    const rack = createScoreSynth(ctx, {});
    for (let i = 0; i < 140; i++) rack.play(note, i, 0.25);
    expect(rack.voiceCount).toBe(96);
    rack.silence();
    expect(rack.voiceCount).toBe(0);
  });
});
