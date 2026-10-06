/**
 * Parse the top-level on declaration from a GitHub Actions workflow without a
 * YAML dependency. Only direct children of on: are returned, so nested keys
 * such as branches, paths, and shell heredoc content cannot become triggers.
 */

function stripYamlComment(line) {
  let single = false;
  let double = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !double) {
      // YAML escapes a single quote inside a single-quoted scalar by doubling it.
      if (single && line[i + 1] === "'") { i++; continue; }
      single = !single;
    } else if (ch === '"' && !single && line[i - 1] !== '\\') {
      double = !double;
    } else if (ch === '#' && !single && !double) {
      return line.slice(0, i);
    }
  }
  return line;
}

function unquote(value) {
  const text = String(value || '').trim();
  if (text.length >= 2 && ((text[0] === "'" && text.at(-1) === "'") || (text[0] === '"' && text.at(-1) === '"'))) {
    return text.slice(1, -1);
  }
  return text;
}

function parseInlineTriggers(value) {
  const triggers = new Set();
  const text = stripYamlComment(value).trim();
  if (!text) return triggers;

  if (text.startsWith('[') && text.endsWith(']')) {
    for (const item of text.slice(1, -1).split(',')) {
      const trigger = unquote(item);
      if (trigger) triggers.add(trigger);
    }
    return triggers;
  }

  if (text.startsWith('{') && text.endsWith('}')) {
    const body = text.slice(1, -1);
    for (const match of body.matchAll(/(?:^|,)\s*(?:(['"])([^'"]+)\1|([A-Za-z0-9_-]+))\s*:/g)) {
      const trigger = match[2] || match[3];
      if (trigger) triggers.add(trigger);
    }
    return triggers;
  }

  const trigger = unquote(text);
  if (trigger) triggers.add(trigger);
  return triggers;
}

export function parseWorkflowTriggers(source) {
  const lines = String(source || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rootLine = stripYamlComment(lines[i]);
    const root = rootLine.match(/^(?:on|'on'|"on")\s*:\s*(.*?)\s*$/);
    if (!root) continue;

    const inline = parseInlineTriggers(root[1]);
    if (inline.size) return inline;

    const candidates = [];
    for (let j = i + 1; j < lines.length; j++) {
      const line = stripYamlComment(lines[j]);
      if (!line.trim()) continue;
      if (/^\S/.test(line)) break;
      const key = line.match(/^(\s+)(?:(['"])([^'"]+)\2|([A-Za-z0-9_-]+))\s*:/);
      if (!key) continue;
      candidates.push({ indent: key[1].length, trigger: key[3] || key[4] });
    }

    if (!candidates.length) return new Set();
    const directIndent = Math.min(...candidates.map(({ indent }) => indent));
    return new Set(candidates.filter(({ indent }) => indent === directIndent).map(({ trigger }) => trigger));
  }
  return new Set();
}

const CADENCE_LABELS = [
  ['workflow_dispatch', 'manual'],
  ['push', 'push'],
  ['pull_request', 'PR'],
  ['pull_request_target', 'PR'],
  ['repository_dispatch', 'repository dispatch'],
  ['workflow_call', 'reusable workflow call'],
  ['workflow_run', 'workflow run'],
  ['schedule', 'scheduled'],
];

export function workflowCadenceLabel(triggers) {
  const remaining = new Set(triggers || []);
  const labels = [];
  for (const [trigger, label] of CADENCE_LABELS) {
    if (!remaining.delete(trigger)) continue;
    if (!labels.includes(label)) labels.push(label);
  }
  for (const trigger of [...remaining].sort()) labels.push(trigger.replaceAll('_', ' '));
  return labels.length ? labels.join(' + ') : 'event trigger';
}

export function workflowTriggerClass(triggers) {
  const set = new Set(triggers || []);
  if (set.has('schedule')) return 'scheduled';
  const withoutManual = new Set([...set].filter((trigger) => trigger !== 'workflow_dispatch'));
  if (withoutManual.size === 0 && set.has('workflow_dispatch')) return 'manual-only';
  if (withoutManual.size === 0) return 'none';
  if ([...withoutManual].every((trigger) => trigger === 'workflow_call')) return 'reusable';
  return 'event-driven';
}
