import { describe, it, expect, afterEach } from "vitest";
import { acquireRrStartIndex, debugResetRrState } from "./round-robin.js";

const PROFILE = "vitest-rr-profile-xyz";

describe("acquireRrStartIndex", () => {
  afterEach(async () => {
    await debugResetRrState(PROFILE);
  });

  it("increments round index modulo keyCount (sequential)", async () => {
    expect(await acquireRrStartIndex(PROFILE, 3)).toBe(0);
    expect(await acquireRrStartIndex(PROFILE, 3)).toBe(1);
    expect(await acquireRrStartIndex(PROFILE, 3)).toBe(2);
    expect(await acquireRrStartIndex(PROFILE, 3)).toBe(0);
  });

  it("returns 0 for single key without advancing meaningfully", async () => {
    expect(await acquireRrStartIndex(PROFILE, 1)).toBe(0);
    expect(await acquireRrStartIndex(PROFILE, 1)).toBe(0);
  });
});
