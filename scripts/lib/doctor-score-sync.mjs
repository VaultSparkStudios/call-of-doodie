import fs from "node:fs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function syncDoctorScore({ sourceStatusPath, targetStatusPath }) {
  const source = readJson(sourceStatusPath);
  const target = readJson(targetStatusPath);
  if (!source.doctorScore || typeof source.doctorScore !== "object") {
    throw new Error(`source doctorScore missing: ${sourceStatusPath}`);
  }

  const receipt = source.doctorScore;
  const doctorScore = {
    date: receipt.date,
    overallPass: receipt.overallPass ?? (receipt.failing === 0 && receipt.blockingFailing === 0),
    passing: receipt.passing,
    warning: receipt.warning,
    failing: receipt.failing,
    blockingFailing: receipt.blockingFailing,
    skipped: receipt.skipped,
    ran: receipt.ran,
    total: receipt.total,
    score: receipt.score,
  };
  const next = {
    ...target,
    doctorScore,
  };
  fs.writeFileSync(targetStatusPath, `${JSON.stringify(next, null, 2)}\n`);
  return doctorScore;
}
