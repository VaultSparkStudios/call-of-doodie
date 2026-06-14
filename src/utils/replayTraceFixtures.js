import { encodeReplayCommandTrace } from "./replayCommandTrace.js";

export function richTraceEvents() {
  return [
    { frame: 0, action: "move", value: "n" },
    { frame: 18, action: "aim", value: "ne" },
    { frame: 24, action: "shoot", value: "w0" },
    { frame: 54, action: "move", value: "e" },
    { frame: 72, action: "dash", value: "e" },
    { frame: 90, action: "aim", value: "se" },
    { frame: 96, action: "shoot", value: "w0" },
  ];
}

export function basicTraceEvents() {
  return [
    { frame: 0, action: "move", value: "n" },
    { frame: 18, action: "shoot", value: "w0" },
    { frame: 36, action: "dash", value: "e" },
  ];
}

export function weakTraceEvents() {
  return [
    { frame: 12, action: "shoot", value: "w0" },
  ];
}

export function makeRichTrace() {
  return encodeReplayCommandTrace(richTraceEvents());
}

export function makeBasicTrace() {
  return encodeReplayCommandTrace(basicTraceEvents());
}

export function makeWeakTrace() {
  return encodeReplayCommandTrace(weakTraceEvents());
}

export function makeMalformedTrace() {
  const trace = makeWeakTrace();
  return { ...trace, body: "0.fly.nope", digest: "BAD" };
}

export function replayTraceFixtureTable() {
  return [
    { id: "rich", trace: makeRichTrace(), expectedEvidenceLevel: "rich", expectedValid: true },
    { id: "basic", trace: makeBasicTrace(), expectedEvidenceLevel: "basic", expectedValid: true },
    { id: "weak", trace: makeWeakTrace(), expectedEvidenceLevel: "weak", expectedValid: true },
    { id: "malformed", trace: makeMalformedTrace(), expectedEvidenceLevel: "none", expectedValid: false },
  ];
}
