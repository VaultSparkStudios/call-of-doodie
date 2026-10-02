/** Per-isolate burst guard. Identity verification and edge rules remain authoritative. */
export function createLocalRateLimiter(limitPerMinute, maxKeys = 2048) {
  const buckets = new Map();
  return (key, now = Date.now()) => {
    const minute = Math.floor(now / 60000);
    const existing = buckets.get(key);
    if (existing?.minute === minute) {
      existing.count += 1;
      return existing.count <= limitPerMinute;
    }
    if (buckets.size >= maxKeys) {
      for (const [candidate, bucket] of buckets) {
        if (bucket.minute !== minute) buckets.delete(candidate);
      }
    }
    // Never reset every client's budget when the map reaches capacity.
    if (buckets.size >= maxKeys && !buckets.has(key)) return false;
    buckets.set(key, { minute, count: 1 });
    return true;
  };
}
