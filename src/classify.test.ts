import { describe, it, expect } from "vitest";
import { isRetryableApiFailure } from "./classify.js";

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

  it("does not treat arbitrary errors as retriable", () => {
    expect(isRetryableApiFailure(1, "Cannot parse URL")).toBe(false);
  });

  it("does not treat 404 as retriable for fallback", () => {
    expect(isRetryableApiFailure(1, "404: Resource not found")).toBe(false);
  });
});
