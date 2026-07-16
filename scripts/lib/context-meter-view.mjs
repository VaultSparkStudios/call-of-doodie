function finiteNumber(value) {
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

export function formatContextPercent(percent) {
  const value = clamp(finiteNumber(percent) ?? 0, 0, 100);
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
  const usedTokens = clamp(finiteNumber(meter.usedTokens) ?? 0, 0, limit);
  const ratioPercent = (usedTokens / limit) * 100;
  const declared = declaredPercent(meter);
  const hasTokenRatio = finiteNumber(meter.usedTokens) != null && finiteNumber(meter.limit) != null;
  const pctUsed = clamp(hasTokenRatio ? ratioPercent : (declared ?? ratioPercent), 0, 100);
  const declaredDelta = declared == null ? null : Math.abs(clamp(declared, 0, 100) - pctUsed);

  return {
    usedTokens,
    limit,
    remainingTokens: Math.max(0, limit - usedTokens),
    pctUsed,
    fraction: pctUsed / 100,
    displayPercent: formatContextPercent(pctUsed),
    declaredPercent: declared,
    declaredDelta,
    coherent: declaredDelta == null || declaredDelta <= 0.2,
  };
}
