import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadProfilesFile } from "./load-profiles.js";
import { parseRunArgs } from "../run-config.js";

describe("loadProfilesFile", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ma-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads a minimal valid file", async () => {
    const f = join(dir, "p.yaml");
    await writeFile(
      f,
      `
version: 1
profiles:
  a:
    rr_id: r1
    log_prefix: t
    child:
      primary_env: K1
    upstream:
      type: path
      file: /tmp/x.js
`,
      "utf8",
    );
    const d = await loadProfilesFile(f);
    expect(d.profiles.a.rr_id).toBe("r1");
    expect(d.profiles.a.upstream).toEqual({
      type: "path",
      file: "/tmp/x.js",
    });
  });
});

describe("parseRunArgs", () => {
  it("extracts --profile and passthrough", () => {
    const p = parseRunArgs(["--profile", "a", "scrape", "u"]);
    expect(p).toEqual({ profile: "a", rest: ["scrape", "u"] });
  });
  it("rejects if no profile", () => {
    expect(() => parseRunArgs(["x"])).toThrow(/Specify a profile/);
  });
});
