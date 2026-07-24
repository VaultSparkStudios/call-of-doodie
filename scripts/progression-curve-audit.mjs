import { buildProgressionRunway } from "../src/utils/progressionCurve.js";

function numberArg(name, fallback = 0) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

const receipt = buildProgressionRunway({
  totalKills: numberArg("--kills"),
  careerPoints: numberArg("--points"),
});

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
