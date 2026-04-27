import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import toml from "toml";
import { parse as parseYaml } from "yaml";

import type { ProfilesFileV1, ProfileSpecV1, UpstreamSpec } from "./profiles-types.js";
import { MULT } from "../env-config.js";
import { resolveProfilesFilePath } from "./paths.js";

export class ProfileLoadError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProfileLoadError";
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function expectUpstream(s: unknown, ctx: string): UpstreamSpec {
  if (!isRecord(s)) throw new ProfileLoadError(`${ctx}: upstream must be an object`);
  const t = s.type;
  if (t === "node_module") {
    const pkg = s.package;
    if (typeof pkg !== "string" || !pkg.trim()) {
      throw new ProfileLoadError(`${ctx}.upstream: node_module needs non-empty "package"`);
    }
    const main = s.main;
    if (main !== undefined && (typeof main !== "string" || !main.trim())) {
      throw new ProfileLoadError(`${ctx}.upstream: "main" must be a string when set`);
    }
    return {
      type: "node_module",
      package: pkg.trim(),
      main: main?.trim(),
    };
  }
  if (t === "path") {
    const file = s.file;
    if (typeof file !== "string" || !file.trim()) {
      throw new ProfileLoadError(`${ctx}.upstream: path needs non-empty "file"`);
    }
    return { type: "path", file: file.trim() };
  }
  if (t === "exec") {
    const command = s.command;
    if (typeof command !== "string" || !command.trim()) {
      throw new ProfileLoadError(`${ctx}.upstream: exec needs non-empty "command"`);
    }
    const ap = s.args_prefix;
    if (!Array.isArray(ap) || ap.some((x) => typeof x !== "string")) {
      throw new ProfileLoadError(
        `${ctx}.upstream: exec needs "args_prefix" as a string array`,
      );
    }
    return { type: "exec", command: command.trim(), args_prefix: ap };
  }
  throw new ProfileLoadError(`${ctx}.upstream: invalid type: ${String(t)}`);
}

function expectProfile(
  p: unknown,
  name: string,
): ProfileSpecV1 {
  if (!isRecord(p)) {
    throw new ProfileLoadError(`Profile "${name}" must be an object`);
  }
  const rr_id = p.rr_id;
  const log_prefix = p.log_prefix;
  if (typeof rr_id !== "string" || !rr_id.trim()) {
    throw new ProfileLoadError(`Profile "${name}": "rr_id" is required`);
  }
  if (typeof log_prefix !== "string" || !log_prefix.trim()) {
    throw new ProfileLoadError(`Profile "${name}": "log_prefix" is required`);
  }
  if (!isRecord(p.child)) {
    throw new ProfileLoadError(`Profile "${name}": "child" object is required`);
  }
  const pe = p.child.primary_env;
  if (typeof pe !== "string" || !pe.trim()) {
    throw new ProfileLoadError(`Profile "${name}": child.primary_env is required`);
  }
  const le = p.child.list_env;
  if (le !== undefined && (typeof le !== "string" || !le.trim())) {
    throw new ProfileLoadError(`Profile "${name}": child.list_env must be a string or omitted`);
  }
  const se = p.child.strip_env;
  if (
    se !== undefined &&
    (!Array.isArray(se) || se.some((x) => typeof x !== "string"))
  ) {
    throw new ProfileLoadError(`Profile "${name}": child.strip_env must be string[] or omitted`);
  }
  const nkm = p.no_keys_message;
  if (nkm !== undefined && (typeof nkm !== "string" || !nkm.length)) {
    throw new ProfileLoadError(`Profile "${name}": no_keys_message must be a non-empty string or omitted`);
  }
  const retry = p.retry;
  if (retry !== undefined) {
    if (!isRecord(retry)) {
      throw new ProfileLoadError(`Profile "${name}": retry must be an object or omitted`);
    }
    const ess = retry.extra_substrings;
    if (
      ess !== undefined &&
      (!Array.isArray(ess) || ess.some((x) => typeof x !== "string"))
    ) {
      throw new ProfileLoadError(
        `Profile "${name}": retry.extra_substrings must be string[] or omitted`,
      );
    }
  }

  const up = expectUpstream(p.upstream, `Profile "${name}"`);

  const out: ProfileSpecV1 = {
    rr_id: rr_id.trim(),
    log_prefix: log_prefix.trim(),
    no_keys_message: nkm,
    child: {
      primary_env: pe.trim(),
      list_env: le?.trim(),
      strip_env: se as string[] | undefined,
    },
    upstream: up,
  };
  if (isRecord(p.retry) && Array.isArray(p.retry.extra_substrings)) {
    out.retry = { extra_substrings: p.retry.extra_substrings as string[] };
  }
  return out;
}

export async function loadProfilesFile(
  filePath: string = resolveProfilesFilePath(),
): Promise<ProfilesFileV1> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (e) {
    throw new ProfileLoadError(
      `Cannot read profiles file: ${filePath} — set ${MULT.profilesFile} or create the file. Hint: use examples/profiles.example.yaml as a template.`,
      e,
    );
  }
  const lower = filePath.toLowerCase();
  let doc: unknown;
  try {
    if (lower.endsWith(".toml") || lower.endsWith(".tml")) {
      doc = toml.parse(raw) as unknown;
    } else {
      doc = parseYaml(raw);
    }
  } catch (e) {
    throw new ProfileLoadError(
      `Invalid ${lower.endsWith(".toml") || lower.endsWith(".tml") ? "TOML" : "YAML"} in ${filePath}`,
      e,
    );
  }
  if (!isRecord(doc)) {
    throw new ProfileLoadError(`Top-level value in ${filePath} must be a mapping`);
  }
  if (doc.version !== 1) {
    throw new ProfileLoadError(`Expected version: 1 in ${filePath}`);
  }
  const pr = doc.profiles;
  if (!isRecord(pr)) {
    throw new ProfileLoadError(`"profiles" mapping is required in ${filePath}`);
  }
  const profiles: Record<string, ProfileSpecV1> = {};
  for (const [k, v] of Object.entries(pr)) {
    profiles[k] = expectProfile(v, k);
  }
  if (Object.keys(profiles).length === 0) {
    throw new ProfileLoadError(`At least one profile is required in ${filePath}`);
  }
  return { version: 1, defaults: doc.defaults as Record<string, unknown> | undefined, profiles };
}

export function resolvePathEntry(file: string, cwd: string = process.cwd()): string {
  if (isAbsolute(file)) return file;
  return resolve(cwd, file);
}
