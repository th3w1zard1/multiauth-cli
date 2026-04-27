import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { buildAttemptOrder, parseKeyList, resolveKeyChainAsync } from "./keys.js";
import { MULT } from "./env-config.js";

const ENV_SNAPSHOT_KEYS = [
  MULT.primary,
  MULT.list,
  MULT.useFile,
  MULT.path,
] as const;

function snapshotEnvs() {
  const s: Record<string, string | undefined> = {};
  for (const k of ENV_SNAPSHOT_KEYS) s[k] = process.env[k];
  return s;
}
function restoreEnvs(s: Record<string, string | undefined>) {
  for (const k of ENV_SNAPSHOT_KEYS) {
    if (s[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = s[k];
    }
  }
}

describe("parseKeyList", () => {
  it("splits on comma and whitespace", () => {
    expect(parseKeyList("a,b, c\n")).toEqual(["a", "b", "c"]);
  });
});

describe("buildAttemptOrder", () => {
  it("rotates so startIndex is first", () => {
    expect(buildAttemptOrder(["a", "b", "c"], 0)).toEqual(["a", "b", "c"]);
    expect(buildAttemptOrder(["a", "b", "c"], 1)).toEqual(["b", "c", "a"]);
    expect(buildAttemptOrder(["a", "b", "c"], 2)).toEqual(["c", "a", "b"]);
  });
});

describe("resolveKeyChainAsync", () => {
  let snap: Record<string, string | undefined>;
  beforeEach(() => {
    snap = snapshotEnvs();
    delete process.env[MULT.useFile];
    delete process.env[MULT.path];
    delete process.env[MULT.primary];
    delete process.env[MULT.list];
  });
  afterEach(() => {
    restoreEnvs(snap!);
  });

  it("env only: primary then additional", async () => {
    process.env[MULT.primary] = "k1";
    process.env[MULT.list] = "k2,k3";
    const { keys, source } = await resolveKeyChainAsync();
    expect(source).toBe("env_only");
    expect(keys).toEqual(["k1", "k2", "k3"]);
  });

  it("env only: no primary, all from MULTIAUTH_API_KEYS", async () => {
    process.env[MULT.list] = "a b";
    const { keys } = await resolveKeyChainAsync();
    expect(keys).toEqual(["a", "b"]);
  });
});
