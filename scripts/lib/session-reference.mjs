export function extractSessionId(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object") {
    return extractSessionId(value.session ?? value.id ?? value.label ?? "");
  }

  const text = String(value).trim();
  const leading = text.match(/^(?:Session\s+|S)(\d+)\b/i);
  if (leading) return Number(leading[1]);

  const named = text.match(/\bSession\s+(\d+)\b/i);
  if (named) return Number(named[1]);

  const shorthand = text.match(/\bS(\d+)\b/i);
  return shorthand ? Number(shorthand[1]) : null;
}
