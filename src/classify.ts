/**
 * Whether we should try the next API key for this exit code and captured output.
 * `combined` is typically stdout+stderr (case-insensitive matching).
 */
export function isRetryableApiFailure(
  exitCode: number,
  combined: string,
): boolean {
  if (exitCode === 0) return false;

  const t = combined.toLowerCase();

  if (hasHttpClientErrorStatus(t)) {
    return true;
  }

  if (
    t.includes(" 401") ||
    t.includes("status: 401") ||
    t.includes("status 401") ||
    t.includes("error 401")
  ) {
    return true;
  }

  if (t.includes(" 402") || t.includes("status: 402") || t.includes("error 402")) {
    return true;
  }

  if (
    t.includes(" 403") ||
    t.includes("status: 403") ||
    t.includes("status 403") ||
    t.includes("forbidden")
  ) {
    return true;
  }

  if (
    t.includes(" 429") ||
    t.includes("status: 429") ||
    t.includes("status 429") ||
    t.includes("too many requests")
  ) {
    return true;
  }

  if (t.includes(" 408") || (t.includes("timeout") && t.includes("request"))) {
    return true;
  }

  if (
    t.includes("unauthorized") ||
    t.includes("not authorized") ||
    t.includes("invalid api key") ||
    t.includes("api key is invalid")
  ) {
    return true;
  }

  if (t.includes("rate limit") || t.includes("ratelimit") || t.includes("rate-limited")) {
    return true;
  }

  if (
    t.includes("insufficient") ||
    t.includes("out of credit") ||
    t.includes("not enough credit") ||
    t.includes("payment required") ||
    t.includes("no credit") ||
    t.includes("quota exceeded")
  ) {
    return true;
  }

  return false;
}

/**
 * True when output looks like an HTTP 400–499 client error (axios, fetch, curl, APIs).
 * Used so the multiauth wrapper can rotate keys on auth / quota / plan / WAF responses.
 */
export function hasHttpClientErrorStatus(lowerCombined: string): boolean {
  const ctx =
    /(?:status|http|https|request|axios|fetch|curl|api|error|failed|response|code|forbidden|unauthorized|client)/u;
  for (const line of lowerCombined.split(/\r?\n/u)) {
    if (!ctx.test(line)) continue;
    const m = line.match(/\b(4[0-9]{2})\b/u);
    if (!m) continue;
    const n = Number.parseInt(m[1]!, 10);
    if (n >= 400 && n <= 499) return true;
  }
  const loose = lowerCombined.match(
    /(?:status\s*code|statuscode|status)[\s:=]+(4[0-9]{2})\b/u,
  );
  if (loose) {
    const n = Number.parseInt(loose[1]!, 10);
    if (n >= 400 && n <= 499) return true;
  }
  return false;
}
