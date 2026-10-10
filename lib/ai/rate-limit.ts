// A small sliding-window limit per client, kept in memory. On serverless each instance keeps
// its own window, so this caps bursts rather than guaranteeing a global quota.
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function allow(key: string, limit = 10, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
