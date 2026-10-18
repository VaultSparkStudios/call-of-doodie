function finiteNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function declaredPercent(meter) {
  const raw = finiteNumber(meter?.pctUsed);
  if (raw == null) return null;
  if (meter?.pctUnit === 'fraction') return raw * 100;
  if (meter?.pctUnit === 'percent' || meter?.live === true) return raw;
  // The renderer's local heuristic historically returned a 0–1 fraction.
  return meter?.live === false && raw <= 1 ? raw * 100 : raw;
}

// context-meter uses 2/3 to route closeout, while still emitting measured JSON.
export function parseContextMeterResult(result = {}) {
  if (![0, 2, 3].includes(result.status) || !result.stdout) return null;
  try {
    const value = JSON.parse(result.stdout);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value;
  } catch { return null; }
}

export function formatContextPercent(percent) {
  const numeric = finiteNumber(percent);
  if (numeric == null) return 'unknown';
  const value = Math.max(0, numeric);
  if (value > 0 && value < 10) {
    return value.toFixed(1).replace(/\.0$/, '');
  }
  return String(Math.round(value));
}

/**
 * Normalize context-meter data for display.
 *
 * usedTokens / limit is the source of truth whenever both are valid. pctUsed
 * is retained only to expose disagreement; this avoids ambiguous 0.6 values
 * being interpreted as either 0.6% or 60%.
 */
export function normalizeContextMeterView(meter = {}, { fallbackLimit = 200000 } = {}) {
  const limit = Math.max(1, finiteNumber(meter.limit) ?? finiteNumber(fallbackLimit) ?? 200000);
  const measured = meter.measured_ok !== false && meter.live !== false;
  const rawUsed = finiteNumber(meter.usedTokens);
  const usedTokens = measured && rawUsed != null ? Math.max(0, rawUsed) : null;
  const declared = measured ? declaredPercent(meter) : null;
  const hasTokenRatio = usedTokens != null && finiteNumber(meter.limit) > 0;
  const pctUsed = hasTokenRatio ? (usedTokens / limit) * 100 : declared == null ? null : Math.max(0, declared);
  const declaredDelta = declared == null || pctUsed == null ? null : Math.abs(declared - pctUsed);

  return {
    usedTokens,
    limit,
    remainingTokens: usedTokens == null ? null : Math.max(0, limit - usedTokens),
    pctUsed,
    fraction: pctUsed == null ? null : clamp(pctUsed / 100, 0, 1),
    displayPercent: formatContextPercent(pctUsed),
    declaredPercent: declared,
    declaredDelta,
    coherent: declaredDelta == null || declaredDelta <= 0.2,
  };
}
