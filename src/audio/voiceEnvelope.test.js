import { describe, expect, it, vi } from "vitest";
import { scheduleVoiceEnvelope } from "./voiceEnvelope.js";
describe("voice edge smoothing", () => {
  it.each([0.001, 0.016, 0.3, 3])("keeps %s-second voices silent at both edges with ordered ramps", duration => {
    const events=[];
    const param=Object.fromEntries(["setValueAtTime","linearRampToValueAtTime","exponentialRampToValueAtTime"].map(name=>[name,vi.fn((value,time)=>events.push({name,value,time}))]));
    const stop=scheduleVoiceEnvelope(param,10,duration,0.08);
    expect(events[0]).toMatchObject({value:0,time:10});
    expect(events[1].value).toBe(0.08);
    expect(events.at(-1)).toMatchObject({value:0,time:stop});
    for(let i=1;i<events.length;i++)expect(events[i].time).toBeGreaterThan(events[i-1].time);
    expect(stop).toBeCloseTo(10+Math.max(0.008,duration)+0.006);
  });
});
