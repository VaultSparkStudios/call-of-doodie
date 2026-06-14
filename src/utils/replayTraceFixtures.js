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
    {
      id: "rich",
      trace: makeRichTrace(),
      expectedEvidenceLevel: "rich",
      expectedValid: true,
      expectedPressure: { pressureClass: "medium", commandCount: 7, finalWave: 1, finalScore: 793 },
    },
    {
      id: "basic",
      trace: makeBasicTrace(),
      expectedEvidenceLevel: "basic",
      expectedValid: true,
      expectedPressure: { pressureClass: "low", commandCount: 3, finalWave: 1, finalScore: 632 },
    },
    {
      id: "weak",
      trace: makeWeakTrace(),
      expectedEvidenceLevel: "weak",
      expectedValid: true,
      expectedPressure: { pressureClass: "low", commandCount: 1, finalWave: 1, finalScore: 515 },
    },
    {
      id: "malformed",
      trace: makeMalformedTrace(),
      expectedEvidenceLevel: "none",
      expectedValid: false,
      expectedPressure: { pressureClass: "none", commandCount: 0, finalWave: 1, finalScore: 420 },
    },
  ];
}
