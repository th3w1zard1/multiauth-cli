import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isRetryableApiFailure } from "../classify.js";
import { defaultMultiauthVerbose, MULT } from "../env-config.js";
import type { CliAdapter } from "../wrapper/types.js";
import { resolvePathEntry } from "./load-profiles.js";
import type { ProfileSpecV1 } from "./profiles-types.js";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const DEFAULT_NO_KEYS =
  "No API keys: set MULTIAUTH_API_KEY / MULTIAUTH_API_KEYS or use an accounts file. See multiauth-cli docs.";

function resolveNodeModuleEntrySync(spec: { package: string; main?: string }): string {
  const pkgJson = require.resolve(`${spec.package}/package.json`, {
    paths: [process.cwd(), here, dirname(here)],
  } as { paths: string[] });
  const root = dirname(pkgJson);
  if (spec.main?.trim()) {
    return join(root, spec.main.trim());
  }
  const raw = readFileSync(pkgJson, "utf8");
  const j = JSON.parse(raw) as { main?: string };
  if (j.main && typeof j.main === "string") {
    return join(root, j.main);
  }
  return join(root, "dist", "index.js");
}

function stripForChild(
  spec: ProfileSpecV1,
  base: NodeJS.ProcessEnv,
  apiKey: string,
): NodeJS.ProcessEnv {
  const o = { ...base } as NodeJS.ProcessEnv;
  o[MULT.primary] = undefined;
  delete o[MULT.primary];
  o[MULT.list] = undefined;
  delete o[MULT.list];
  if (spec.child.list_env) {
    o[spec.child.list_env] = undefined;
    delete o[spec.child.list_env];
  }
  for (const k of spec.child.strip_env ?? []) {
    o[k] = undefined;
    delete o[k];
  }
  o[spec.child.primary_env] = apiKey;
  return o;
}

function buildRetryable(spec: ProfileSpecV1) {
  const extra = spec.retry?.extra_substrings?.filter((s) => s.trim().length) ?? [];
  if (extra.length === 0) {
    return isRetryableApiFailure;
  }
  return (exitCode: number, combined: string): boolean => {
    if (isRetryableApiFailure(exitCode, combined)) {
      return true;
    }
    if (exitCode === 0) {
      return false;
    }
    const t = combined.toLowerCase();
    return extra.some((s) => t.includes(s.toLowerCase()));
  };
}

/**
 * Synchronous `CliAdapter` for a profile (entry resolution and spawn args are fixed).
 */
export function cliAdapterFromProfile(name: string, spec: ProfileSpecV1): CliAdapter {
  const { upstream } = spec;
  const retry = buildRetryable(spec);
  const noKeys = spec.no_keys_message?.trim() || DEFAULT_NO_KEYS;

  if (upstream.type === "node_module") {
    let entry: string;
    try {
      entry = resolveNodeModuleEntrySync({ package: upstream.package, main: upstream.main });
    } catch (e) {
      throw new Error(
        `Profile "${name}": could not resolve node module "${upstream.package}": ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
    return {
      id: name,
      rrProfile: spec.rr_id,
      logPrefix: spec.log_prefix,
      noKeysMessage: noKeys,
      multiauthVerbose: defaultMultiauthVerbose,
      isRetryable: retry,
      resolveChildEntry: () => entry,
      prepareRun: async (apiKey) => ({
        env: stripForChild(spec, process.env, apiKey),
        cleanup: async () => undefined,
      }),
    };
  }

  if (upstream.type === "path") {
    const entry = resolvePathEntry(upstream.file);
    return {
      id: name,
      rrProfile: spec.rr_id,
      logPrefix: spec.log_prefix,
      noKeysMessage: noKeys,
      multiauthVerbose: defaultMultiauthVerbose,
      isRetryable: retry,
      resolveChildEntry: () => entry,
      prepareRun: async (apiKey) => ({
        env: stripForChild(spec, process.env, apiKey),
        cleanup: async () => undefined,
      }),
    };
  }

  if (upstream.type === "exec") {
    return {
      id: name,
      rrProfile: spec.rr_id,
      logPrefix: spec.log_prefix,
      noKeysMessage: noKeys,
      multiauthVerbose: defaultMultiauthVerbose,
      isRetryable: retry,
      getSpawnCommand: () => upstream.command,
      buildSpawnArgList: (userArgv) => [...upstream.args_prefix, ...userArgv],
      resolveChildEntry: () => process.execPath,
      prepareRun: async (apiKey) => ({
        env: stripForChild(spec, process.env, apiKey),
        cleanup: async () => undefined,
      }),
    };
  }

  const _exhaustive: never = upstream;
  return _exhaustive;
}
