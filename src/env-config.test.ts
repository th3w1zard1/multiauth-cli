import { describe, it, expect, afterEach } from "vitest";
import { isRoundRobinEnabled, MULT } from "./env-config.js";

const R = MULT.rr;
const G = "CLI_MULTIAUTH_RR";

describe("isRoundRobinEnabled", () => {
  const s: Record<string, string | undefined> = {};
  afterEach(() => {
    for (const k of [R, G]) {
      if (s[k] === undefined) delete process.env[k];
      else process.env[k] = s[k];
    }
  });

  it("false for single key", () => {
    s[R] = process.env[R];
    s[G] = process.env[G];
    delete process.env[R];
    delete process.env[G];
    expect(isRoundRobinEnabled(1)).toBe(false);
  });

  it("false when global disables", () => {
    s[R] = process.env[R];
    s[G] = process.env[G];
    delete process.env[R];
    process.env[G] = "0";
    expect(isRoundRobinEnabled(2)).toBe(false);
  });

  it("true for multiple keys by default", () => {
    s[R] = process.env[R];
    s[G] = process.env[G];
    delete process.env[R];
    delete process.env[G];
    expect(isRoundRobinEnabled(3)).toBe(true);
  });
});
