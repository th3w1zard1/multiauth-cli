import { describe, it, expect } from "vitest";
import { hasHttpClientErrorStatus, isRetryableApiFailure } from "./classify.js";

describe("isRetryableApiFailure", () => {
  it("returns false when the output does not match any retriable pattern", () => {
    expect(isRetryableApiFailure(1, "all good")).toBe(false);
  });

  it("retries on 401 in output", () => {
    expect(
      isRetryableApiFailure(1, "Request failed: status 401 Unauthorized"),
    ).toBe(true);
  });

  it("retries on rate limit", () => {
    expect(isRetryableApiFailure(1, "Error: rate limit exceeded")).toBe(true);
  });

  it("retries on insufficient / credits", () => {
    expect(
      isRetryableApiFailure(1, "Insufficient credits to complete the request"),
    ).toBe(true);
  });

  it("retries on Firecrawl preflight: Not enough credits (plural)", () => {
    expect(
      isRetryableApiFailure(
        1,
        "Error: Not enough credits. Need 1, have 0.",
      ),
    ).toBe(true);
  });

  it("does not treat arbitrary errors as retriable", () => {
    expect(isRetryableApiFailure(1, "Cannot parse URL")).toBe(false);
  });

  it("retries axios-style 403 (multiauth key rotation)", () => {
    expect(
      isRetryableApiFailure(
        1,
        "Request failed with status code 403",
      ),
    ).toBe(true);
  });

  it("retries 404 when framed as HTTP client error", () => {
    expect(
      isRetryableApiFailure(1, "API error: status 404 for GET /v1/search"),
    ).toBe(true);
  });

  it("retries 451 in API response text", () => {
    expect(
      isRetryableApiFailure(1, '{"error":"blocked","httpStatus":451}'),
    ).toBe(true);
  });
});

describe("hasHttpClientErrorStatus", () => {
  it("detects status code in line", () => {
    expect(hasHttpClientErrorStatus("request failed with status code 418")).toBe(
      true,
    );
  });

  it("ignores 404 in prose without HTTP context", () => {
    expect(hasHttpClientErrorStatus("the year 404 was long ago")).toBe(false);
  });
});
