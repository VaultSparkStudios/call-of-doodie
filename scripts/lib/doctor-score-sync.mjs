import fs from "node:fs";
import { updateProjectStatusFile } from "./write-project-status.mjs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function syncDoctorScore({ sourceStatusPath, targetStatusPath }) {
  const source = readJson(sourceStatusPath);
  if (!source.doctorScore || typeof source.doctorScore !== "object") {
    throw new Error(`source doctorScore missing: ${sourceStatusPath}`);
  }

  const receipt = source.doctorScore;
  const blockingFailing = Number(receipt.blockingFailing ?? receipt.failing ?? 0);
  const doctorScore = {
    date: receipt.date,
    ...(receipt.ranAt ? { ranAt: receipt.ranAt } : {}),
    // Doctor's closeout gate is blockingFailing, not the aggregate advisory count.
    // Derive this value so older receipts cannot turn a non-blocking advisory into
    // a false release failure—or preserve a stale true when a blocker exists.
    overallPass: blockingFailing === 0,
    passing: receipt.passing,
    warning: receipt.warning,
    failing: receipt.failing,
    blockingFailing,
    ...(receipt.advisoryFailing !== undefined
      ? { advisoryFailing: receipt.advisoryFailing }
      : {}),
    skipped: receipt.skipped,
    ran: receipt.ran,
    total: receipt.total,
    score: receipt.score,
  };
  updateProjectStatusFile(targetStatusPath, (target) => ({ ...target, doctorScore }), { touchLastUpdated: false });
  return doctorScore;
}
