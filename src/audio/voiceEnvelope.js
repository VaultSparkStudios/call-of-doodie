// Short attack and a zero-ending release avoid discontinuities at voice edges.
// Return the stop time so every source remains alive through its release.
export function scheduleVoiceEnvelope(param, start, duration, peak) {
  const length = Math.max(0.008, duration);
  const attack = Math.min(0.004, length * 0.2);
  const end = start + length;
  param.setValueAtTime(0, start);
  param.linearRampToValueAtTime(Math.max(0.0001, peak), start + attack);
  param.exponentialRampToValueAtTime(0.0001, end);
  param.linearRampToValueAtTime(0, end + 0.006);
  return end + 0.006;
}
