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
    if (looksLikeAuthOrBilling(t)) {
      return true;
    }
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

function looksLikeAuthOrBilling(t: string): boolean {
  return (
    t.includes("unauthorized") ||
    t.includes("forbidden") ||
    t.includes("key") ||
    t.includes("token") ||
    t.includes("permission") ||
    t.includes("credit") ||
    t.includes("plan") ||
    t.includes("subscribe")
  );
}
