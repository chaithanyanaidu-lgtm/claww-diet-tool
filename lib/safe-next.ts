/**
 * Keeps post-sign-in redirects on this site: only same-origin paths like "/plans" are allowed,
 * never "//evil.com" or "https://…". Anything else falls back to `fallback`.
 */
export function safeNext(value: unknown, fallback = "/plans"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  try {
    const url = new URL(value, "http://x");
    return url.host === "x" ? url.pathname + url.search : fallback;
  } catch {
    return fallback;
  }
}
