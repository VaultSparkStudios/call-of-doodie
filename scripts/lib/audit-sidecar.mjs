import fs from "node:fs";
import path from "node:path";

export function findLatestAuditSidecar(root = process.cwd()) {
  const docs = path.join(root, "docs");
  if (!fs.existsSync(docs)) return null;
  const files = fs.readdirSync(docs)
    .filter((name) => /^AUDIT_\d{4}-\d{2}-\d{2}(?:_\d+)?\.json$/.test(name))
    .map((name) => {
      const fullPath = path.join(docs, name);
      const match = name.match(/^AUDIT_(\d{4}-\d{2}-\d{2})(?:_(\d+))?\.json$/);
      return {
        name,
        fullPath,
        date: match?.[1] || "",
        ordinal: Number(match?.[2] || 1),
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) =>
      b.date.localeCompare(a.date)
      || b.ordinal - a.ordinal
      || b.name.localeCompare(a.name));
  return files[0] || null;
}

export function readAuditSidecar(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function getAuditItems(audit) {
  return Array.isArray(audit?.items) ? audit.items : Array.isArray(audit?.candidates) ? audit.candidates : [];
}

export function appendExecution(filePath, entry) {
  const audit = readAuditSidecar(filePath);
  audit.executionLog = Array.isArray(audit.executionLog) ? audit.executionLog : [];
  const index = audit.executionLog.findIndex((item) => item.slug === entry.slug);
  if (index >= 0) audit.executionLog[index] = { ...audit.executionLog[index], ...entry };
  else audit.executionLog.push(entry);
  const items = getAuditItems(audit);
  const item = items.find((candidate) => candidate.slug === entry.slug);
  if (item && entry.status) item.status = entry.status;
  fs.writeFileSync(filePath, `${JSON.stringify(audit, null, 2)}\n`);
  return audit;
}
