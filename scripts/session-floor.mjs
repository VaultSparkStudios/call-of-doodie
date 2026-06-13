#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const JSON_MODE = process.argv.includes("--json");
const closeoutGate = process.argv.includes("--closeout-gate");
const shippedArg = process.argv.find((arg) => arg.startsWith("--shipped="));
const shipped = Number(shippedArg?.split("=")[1] || process.argv[process.argv.indexOf("--shipped") + 1] || 0);

function contextMeter() {
  const result = spawnSync(process.execPath, ["scripts/context-meter.mjs", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

const meter = contextMeter();
const pctUsed = Number(meter?.pctUsed || 0);
const shouldStop = pctUsed >= 75 || (closeoutGate && shipped <= 0 && pctUsed < 1);
const payload = {
  schemaVersion: "1.0",
  verdict: shouldStop ? "STOP" : "CONTINUE",
  shipped,
  pctUsed,
  amortization: {
    shipped,
    contextPctUsed: pctUsed,
    shippedPerContextPct: pctUsed > 0 ? Number((shipped / pctUsed).toFixed(2)) : shipped,
  },
};

if (JSON_MODE) console.log(JSON.stringify(payload, null, 2));
else console.log(`${payload.verdict} · shipped=${shipped} · context=${pctUsed}%`);

if (closeoutGate && shouldStop && shipped <= 0) process.exit(11);
process.exit(shouldStop ? 0 : 10);
