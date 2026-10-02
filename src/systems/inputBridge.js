import { releaseInputState } from "./inputLifecycle.js";

export function markInputActivity(inputActivityRef, source) {
  const key = ["keyboard", "mouse", "touch", "gamepad"].includes(source) ? source : "keyboard";
  inputActivityRef.current[key] = Date.now();
}

export function releaseAllInputs(refs, inputReleaseReceiptRef, reason = "explicit", scopes) {
  const receipt = releaseInputState(refs, { reason, scopes });
  inputReleaseReceiptRef.current = receipt;
  return receipt;
}

export function sampleCommandTrace({ action, bucket, interval = 30, lastTraceAimRef, lastTraceMoveRef, frameCountRef, recordCommandTrace }) {
  const state = action === "aim" ? lastTraceAimRef.current : lastTraceMoveRef.current;
  const frame = frameCountRef.current;
  if (bucket !== state.bucket || frame - state.frame >= interval) {
    state.bucket = bucket;
    state.frame = frame;
    recordCommandTrace(action, bucket);
  }
}
