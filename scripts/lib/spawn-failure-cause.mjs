export function failureCause(r) {
  if (!r) return 'unknown-cause (no result)';
  const err = String(r.err ?? '').trim();
  if (err) return err;
  const parts = [];
  if (r.errorCode) parts.push(`errorCode=${r.errorCode}`);
  if (r.errorMessage) parts.push(String(r.errorMessage));
  if (r.signal) parts.push(`signal=${r.signal}`);
  if (r.code != null && r.code !== 0) parts.push(`exit=${r.code}`);
  const tail = String(r.out ?? '').trim().split(/\r?\n/).filter(Boolean).slice(-3).join(' | ');
  if (tail) parts.push(`stdout tail: ${tail}`);
  return parts.length
    ? `(stderr empty) ${parts.join(' · ')}`
    : 'unknown-cause (stderr empty, exit 0, no signal)';
}

export default { failureCause };
