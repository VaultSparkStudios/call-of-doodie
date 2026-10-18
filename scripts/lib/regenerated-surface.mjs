import { EXPECTED_REGENERATIONS } from './suite-tree-purity.mjs';

export const VOLATILE_STAMP_FIELDS = Object.freeze([
  'generatedAt', '_generatedAt', 'generatedAtMs', 'generatedDate',
  'checkedAt', 'renderedAt', 'collectedAt', 'measuredAt', 'scannedAt',
  'builtAt', 'refreshedAt', 'ranAt', 'writtenAt', 'asOf',
  'updatedAt', '_updatedAt', 'lastUpdated', '_lastUpdated', '_updated',
]);

const PRODUCER_BY_PATH = new Map(EXPECTED_REGENERATIONS.map((e) => [e.path, e.by]));

export function stripVolatile(value, fields = VOLATILE_STAMP_FIELDS) {
  if (Array.isArray(value)) return value.map((v) => stripVolatile(v, fields));
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      if (fields.includes(k)) continue;
      out[k] = stripVolatile(value[k], fields);
    }
    return out;
  }
  return value;
}

export const DERIVED_AGE_FIELDS = Object.freeze(['ageHours', 'ageHuman', 'ageMinutes', 'ageSec', 'ageSeconds', 'ageDays', 'ageMs']);
export const AGE_ANCHOR_FIELDS = Object.freeze(['startedAt', 'since', 'firstSeen', 'firstSeenAt', 'createdAt', 'openedAt']);

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function maskAnchoredAges(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const outA = [], outB = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i < a.length && i < b.length) { const [x, y] = maskAnchoredAges(a[i], b[i]); outA.push(x); outB.push(y); }
      else if (i < a.length) outA.push(a[i]);
      else outB.push(b[i]);
    }
    return [outA, outB];
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const anchored = AGE_ANCHOR_FIELDS.some((k) => typeof a[k] === 'string' && a[k] !== '' && a[k] === b[k]);
    const outA = {}, outB = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const inBoth = Object.hasOwn(a, k) && Object.hasOwn(b, k);
      if (anchored && inBoth && DERIVED_AGE_FIELDS.includes(k)) continue;
      if (inBoth) { const [x, y] = maskAnchoredAges(a[k], b[k]); outA[k] = x; outB[k] = y; }
      else if (Object.hasOwn(a, k)) outA[k] = a[k];
      else outB[k] = b[k];
    }
    return [outA, outB];
  }
  return [a, b];
}

function canonical(value) {
  return JSON.stringify(stripVolatile(value));
}

export function compareModuloStamps(beforeText, afterText, fields = VOLATILE_STAMP_FIELDS) {
  let before, after;
  try { before = JSON.parse(beforeText); } catch { return { comparable: false, equivalent: false, reason: 'committed revision did not parse as JSON', changedKeys: [] }; }
  try { after = JSON.parse(afterText); } catch { return { comparable: false, equivalent: false, reason: 'working-tree revision did not parse as JSON', changedKeys: [] }; }

  const [maskedBefore, maskedAfter] = maskAnchoredAges(before, after);
  if (canonical(maskedBefore) === canonical(maskedAfter)) return { comparable: true, equivalent: true, reason: null, changedKeys: [] };
  return { comparable: true, equivalent: false, reason: 'content differs beyond volatile stamps', changedKeys: changedTopLevelKeys(maskedBefore, maskedAfter, fields) };
}

export function changedTopLevelKeys(before, after, fields = VOLATILE_STAMP_FIELDS) {
  const a = stripVolatile(before, fields);
  const b = stripVolatile(after, fields);
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return ['(whole document)'];
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const out = [];
  for (const k of keys) {
    const av = a[k], bv = b[k];
    if (JSON.stringify(av) === JSON.stringify(bv)) continue;
    const scalar = (v) => v === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof v);
    out.push(scalar(av) && scalar(bv) ? `${k} ${JSON.stringify(av)} -> ${JSON.stringify(bv)}` : k);
  }
  return out;
}

const GENERATED_BY_MARKER = /<!--\s*generated-by:\s*([^\s>]+)\s*-->/;

const DRIFT_TOKEN = /\d{4}-\d{2}-\d{2}T[\d:.]+Z|\b\d+(?:\.\d+)?\s*(?:ms|s|m|h|d)\b/g;

export function inbandProducer(text) {
  const m = String(text ?? '').match(GENERATED_BY_MARKER);
  return m ? m[1] : null;
}

export function compareMarkdownModuloDrift(beforeText, afterText) {
  if (typeof beforeText !== 'string' || typeof afterText !== 'string') {
    return { comparable: false, equivalent: false, reason: 'a revision was unreadable', changedKeys: [] };
  }

  if (!inbandProducer(beforeText) || !inbandProducer(afterText)) {
    return { comparable: false, equivalent: false, reason: 'no in-band generated-by marker — not eligible for drift masking', changedKeys: [] };
  }
  const a = beforeText.split(/\r?\n/);
  const b = afterText.split(/\r?\n/);
  if (a.length !== b.length) {
    return { comparable: true, equivalent: false, reason: 'line count differs', changedKeys: [`${a.length} -> ${b.length} lines`] };
  }
  const mask = (line) => line.replace(DRIFT_TOKEN, '\u0000');
  const changed = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (mask(a[i]) === mask(b[i])) continue;
    changed.push(`L${i + 1}: ${a[i].trim().slice(0, 60)} -> ${b[i].trim().slice(0, 60)}`);
    if (changed.length >= 4) break;
  }
  return changed.length
    ? { comparable: true, equivalent: false, reason: 'content differs beyond drifting measurements', changedKeys: changed }
    : { comparable: true, equivalent: true, reason: null, changedKeys: [] };
}

export function declaredProducer(path) {
  return PRODUCER_BY_PATH.get(path) ?? null;
}

export function classifyRegeneration({ path, beforeText, afterText } = {}) {
  const producer = declaredProducer(path);
  const isJson = /\.json$/i.test(String(path || ''));

  if (isJson && beforeText != null && afterText != null) {
    const cmp = compareModuloStamps(beforeText, afterText);
    if (cmp.comparable && cmp.equivalent) {
      return { regenerated: true, basis: 'content-equivalent', detail: 'identical once generation stamps are masked', changedKeys: [] };
    }
    if (cmp.comparable && !cmp.equivalent) {

      return { regenerated: false, basis: null, detail: `content changed: ${cmp.changedKeys.slice(0, 4).join(', ') || 'unknown fields'}`, changedKeys: cmp.changedKeys };
    }

  }

  if (/\.md$/i.test(String(path || '')) && beforeText != null && afterText != null) {
    const cmp = compareMarkdownModuloDrift(beforeText, afterText);
    if (cmp.comparable && cmp.equivalent) {
      return {
        regenerated: true,
        basis: 'content-equivalent-modulo-drift',
        detail: 'identical once drifting measurements are masked',
        changedKeys: [],
      };
    }
  }

  if (producer) {
    return { regenerated: true, basis: 'declared-producer', detail: `declared machine-written by ${producer}`, changedKeys: [] };
  }

  return { regenerated: false, basis: null, detail: 'no regeneration evidence and no declared producer', changedKeys: [] };
}

export default { VOLATILE_STAMP_FIELDS, stripVolatile, compareModuloStamps, changedTopLevelKeys, declaredProducer, inbandProducer, compareMarkdownModuloDrift, classifyRegeneration };
