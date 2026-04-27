#!/usr/bin/env node
import { runClWithMultiauth } from "./wrapper/run.js";
import { cliAdapterFromProfile } from "./config/adapter-profile.js";
import { loadProfilesFile, ProfileLoadError } from "./config/load-profiles.js";
import { defaultProfilesYamlPath, resolveProfilesFilePath } from "./config/paths.js";
import { MULT } from "./env-config.js";

function printRunHelp(): void {
  const def = defaultProfilesYamlPath();
  process.stdout.write(
    `Usage: multiauth run --profile <name> [upstream args...]\n` +
      `       multiauth-run --profile <name> [upstream args...]\n\n` +
      `Environment:\n` +
      `  ${MULT.profile}     Default profile name (optional if --profile is set)\n` +
      `  ${MULT.profilesFile}  Profile file (default: ${def}; also .toml supported)\n` +
      `  ${MULT.primary}, ${MULT.list}, ...  — see README (key pool)\n`,
  );
}

/**
 * Parse `argv` after the `run` subcommand: supports `--profile <name>`, `-p <name>`.
 * Remaining args are passed to the upstream.
 */
export function parseRunArgs(argv: string[]): { profile: string; rest: string[] } {
  const out: string[] = [];
  let profile: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--profile" || a === "-p") {
      const p = argv[i + 1];
      if (!p) {
        throw new Error("Missing value after --profile / -p");
      }
      profile = p;
      i++;
      continue;
    }
    if (a.startsWith("--profile=")) {
      profile = a.slice("--profile=".length).trim();
      if (!profile) {
        throw new Error("Empty --profile=");
      }
      continue;
    }
    out.push(a);
  }
  if (!profile?.trim()) {
    const pf = process.env[MULT.profile]?.trim();
    if (pf) {
      profile = pf;
    }
  }
  if (!profile?.trim()) {
    throw new Error(
      `Specify a profile: multiauth run --profile <name> [...] or set ${MULT.profile} in the environment`,
    );
  }
  return { profile: profile.trim(), rest: out };
}

export async function runConfigMain(argv: string[] = process.argv): Promise<number> {
  // strip node + script: .../node multiauth run p ...
  const args = argv.slice(2);
  if (args[0] === "run") {
    args.shift();
  }
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printRunHelp();
    return 0;
  }
  let parsed: { profile: string; rest: string[] };
  try {
    parsed = parseRunArgs(args);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return 1;
  }
  const file = resolveProfilesFilePath();
  let data;
  try {
    data = await loadProfilesFile(file);
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      console.error(e.message);
    } else {
      console.error(e);
    }
    return 1;
  }
  const spec = data.profiles[parsed.profile];
  if (!spec) {
    const names = Object.keys(data.profiles).join(", ");
    console.error(
      `Unknown profile "${parsed.profile}" in ${file}. Available: ${names}`,
    );
    return 1;
  }
  let adapter;
  try {
    adapter = cliAdapterFromProfile(parsed.profile, spec);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return 1;
  }
  return runClWithMultiauth(adapter, parsed.rest);
}
