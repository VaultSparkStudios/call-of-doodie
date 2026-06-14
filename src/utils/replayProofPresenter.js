import { buildReplayProofReceipt, buildReplayProofTrend } from "./replayCommandTrace.js";

export function buildReplayProofPresenter({ traceEvidence = null, runHistory = [] } = {}) {
  const receipt = traceEvidence ? buildReplayProofReceipt(traceEvidence) : null;
  const trendRuns = [
    ...(receipt ? [{ traceReceipt: receipt }] : []),
    ...(Array.isArray(runHistory) ? runHistory : []),
  ];
  const trend = buildReplayProofTrend(trendRuns);
  const shareStamp = receipt
    ? `REPLAY PROOF ${receipt.score}% · ${trend.detail.toUpperCase()}`
    : "";

  return {
    receipt,
    trend,
    shareStamp,
  };
}
