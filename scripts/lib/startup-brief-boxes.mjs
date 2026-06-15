const DEFAULT_WIDTH = 62;

function pad(value, width) {
  const str = String(value ?? '');
  return str.length >= width ? str.slice(0, width) : str + ' '.repeat(width - str.length);
}

function top(title, width) {
  const label = title ? `══ ${title} ` : '';
  return '╔' + label + '═'.repeat(Math.max(1, width + 2 - label.length)) + '╗';
}

function row(content, width) {
  return `║  ${pad(content, width)}  ║`;
}

function bot(width) {
  return '╚' + '═'.repeat(width + 2) + '╝';
}

function stripFence(text) {
  return String(text || '')
    .replace(/^```(?:[a-z]+)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function looksBoxed(text) {
  return /╔══\s*GENIUS HIT LIST|╔═+\s*GENIUS HIT LIST|║\s*GENIUS HIT LIST/.test(String(text || ''));
}

export function normalizeGeniusBlock(raw, options = {}) {
  const width = options.width || DEFAULT_WIDTH;
  const maxLines = options.maxLines || 8;
  const cleaned = stripFence(raw);
  if (!cleaned) {
    return [
      top('GENIUS HIT LIST', width),
      row('Run `node scripts/ops.mjs genius-list` to generate fresh recommendations.', width),
      bot(width),
    ].join('\n');
  }
  if (looksBoxed(cleaned)) return cleaned;

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);

  return [
    top('GENIUS HIT LIST', width),
    ...lines.map((line) => row(line, width)),
    bot(width),
  ].join('\n');
}

export function renderHumanPressureBlock(item, options = {}) {
  const width = options.width || DEFAULT_WIDTH;
  const out = [top('HUMAN PRESSURE', width)];
  if (item) {
    out.push(row(`Top item:      ${String(item.title || 'Untitled').slice(0, width - 15)}`, width));
    out.push(row(`Pressure:      ${item.pressureScore ?? '?'} · ${item.pressureBand || 'unknown'}`, width));
    out.push(row(`Next action:   ${String(item.nextAgentAction || 'Review pressure item.').slice(0, width - 15)}`, width));
  } else {
    out.push(row('No founder-action pressure queued in compiled signals.', width));
    out.push(row('Continue with the ranked genius list below.', width));
  }
  out.push(bot(width));
  return out.join('\n');
}
