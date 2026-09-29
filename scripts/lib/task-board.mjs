/**
 * task-board.mjs
 *
 * Shared TASK_BOARD parsing helpers used by startup, blocker, and queue flows.
 */

export function extractSection(markdown, heading) {
  const parts = String(markdown || '').split(/^## /m);
  const match = parts.find((part) => part.startsWith(heading));
  if (!match) return '';
  const nl = match.indexOf('\n');
  return nl === -1 ? '' : match.slice(nl + 1);
}

function stripMarkdown(value) {
  return String(value || '')
    .replace(/^\*\*(.*?)\*\*$/, '$1')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitCheckboxBody(body) {
  const normalized = String(body || '').trim();
  const bold = normalized.match(/^\*\*(.*?)\*\*(?:\s+[—-]\s+([\s\S]*))?$/);
  if (bold) {
    return {
      title: stripMarkdown(bold[1]),
      description: stripMarkdown(bold[2] || ''),
    };
  }
  const divider = normalized.match(/^([\s\S]*?)\s+[—]\s+([\s\S]+)$/);
  return {
    title: stripMarkdown(divider?.[1] || normalized),
    description: stripMarkdown(divider?.[2] || ''),
  };
}

/**
 * Parse every checkbox and numeric task-table row into one source-located AST.
 * Consumers may filter this model; they must not reinterpret Markdown privately.
 */
export function parseTaskBoardAst(markdown) {
  const nodes = [];
  const lines = String(markdown || '').split(/\r?\n/);
  let section = '(root)';
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    const heading = raw.match(/^#{2,6}\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    const checkbox = raw.match(/^- \[([ xX])\]\s+([\s\S]+)$/);
    if (checkbox) {
      const body = checkbox[2].trim();
      const fields = splitCheckboxBody(body);
      nodes.push({
        kind: 'checkbox',
        section,
        checked: checkbox[1].toLowerCase() === 'x',
        body,
        ...fields,
        tags: [...body.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]),
        line: index + 1,
        raw,
      });
    }
  }
  for (const row of parseTaskRows(markdown)) {
    nodes.push({ kind: 'table', checked: /done|shipped|complete/i.test(row.status), ...row });
  }
  return nodes.sort((left, right) => left.line - right.line);
}

export function parseSectionCheckboxItems(markdown, headings, { includeChecked = false } = {}) {
  const accepted = new Set(Array.isArray(headings) ? headings : [headings]);
  return parseTaskBoardAst(markdown).filter((node) => (
    node.kind === 'checkbox'
    && accepted.has(node.section)
    && (includeChecked || !node.checked)
  ));
}

export function reconcileTaskBoard(markdown) {
  const rawOpenCheckboxes = String(markdown || '').split(/\r?\n/).filter((line) => /^- \[ \]\s+/.test(line)).length;
  const parsedOpenCheckboxes = parseTaskBoardAst(markdown).filter((node) => node.kind === 'checkbox' && !node.checked).length;
  return {
    schemaVersion: 'taskboard-reconciliation-v1',
    ok: rawOpenCheckboxes === parsedOpenCheckboxes,
    rawOpenCheckboxes,
    parsedOpenCheckboxes,
  };
}

export function parseUnifiedItems(markdown) {
  const section = extractSection(markdown, 'Unified Genius List');
  if (!section) return [];

  const items = [];
  for (const line of section.split(/\r?\n/)) {
    if (!/^\|\s*[\d.]+\s*\|/.test(line)) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6 || cells[0] === '#') continue;
    const [rank, tier, category, status, effort, item] = cells;
    const titleMatch = item.match(/\*\*(.+?)\*\*/);
    items.push({
      rank,
      rankNumber: parseFloat(rank),
      tier,
      category,
      status,
      effort,
      item: item.replace(/\*\*/g, ''),
      rawItem: item,
      title: (titleMatch ? titleMatch[1] : item).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(),
    });
  }

  return items;
}

/**
 * Parse every numeric task row in every historical/current Markdown table.
 * Unlike parseUnifiedItems(), this is intentionally not scoped to the first
 * Unified Genius section: ops task --id must find an old committed ID without
 * loading the whole board into an agent's context.
 */
export function parseTaskRows(markdown) {
  const rows = [];
  let section = '(root)';
  const lines = String(markdown || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const heading = line.match(/^#{2,6}\s+(.+?)\s*$/);
    if (heading) section = heading[1].trim();
    if (!/^\|\s*\d+(?:\.\d+)?\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 6) continue;
    const [id, tier, category, status, effort, ...itemCells] = cells;
    const rawItem = itemCells.join(' | ').trim();
    const titleMatch = rawItem.match(/\*\*(.+?)\*\*/);
    rows.push({
      id,
      idNumber: Number(id),
      tier,
      category,
      status,
      effort,
      item: rawItem.replace(/\*\*/g, ''),
      rawItem,
      title: (titleMatch?.[1] || rawItem).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(),
      section,
      line: index + 1,
      raw: line,
    });
  }
  return rows;
}

export function findTaskRowsById(markdown, id) {
  const key = String(id ?? '').trim();
  return parseTaskRows(markdown).filter((row) => row.id === key);
}

export function parseHumanItems(markdown) {
  return parseSectionCheckboxItems(markdown, 'Human Action Required')
    .map((item) => {
      const searchable = `${item.title} ${item.description}`.trim();
      const ageMatch =
        searchable.match(/\((~?\d+)\s+sessions?\)/i) ||
        searchable.match(/\((\d+)\s+sessions?\s+old\)/i);
      const ageSessions = ageMatch ? parseInt(ageMatch[1].replace('~', ''), 10) : null;
      return {
        title: item.title,
        description: item.description,
        raw: item.body,
        line: item.line,
        tags: item.tags,
        ageSessions,
      };
    });
}

export function extractCurrentSessionIntent(markdown) {
  const match = String(markdown || '').match(/## Current Session Intent: Session \d+\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (!match) return '';
  return match[1].trim().replace(/\r?\n+/g, ' ');
}
