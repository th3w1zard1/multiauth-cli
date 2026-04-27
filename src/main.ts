#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const integrationDoc = join(here, "..", "docs", "INTEGRATION.md");

const a = process.argv[2];
if (a === "run" || a === "r") {
  const { runConfigMain } = await import("./run-config.js");
  const code = await runConfigMain(process.argv);
  process.exit(code);
}

const msg = `multiauth — generic CLI multiauth helpers (this message is all this command does).

Subcommands:
  run   Run an upstream from your profile file: multiauth run --profile <name> [upstream args...]
        Also available as: multiauth-run (same behavior)
        See profile file: $MULTIAUTH_PROFILES_FILE or default ~/.config/multiauth/profiles.yaml
        Set MULTIAUTH_PROFILE=name to pick a default profile.

Public API: import from your package name, e.g.:
  import { runClWithMultiauth } from "multiauth-cli"
  import type { CliAdapter } from "multiauth-cli/wrapper/types"

Key env: MULTIAUTH_API_KEY, MULTIAUTH_API_KEYS, MULTIAUTH_CONFIG, MULTIAUTH_CONFIG_PATH, MULTIAUTH_VERBOSE, MULTIAUTH_RR (see docs).

Helper: multiauth-accounts (add | list | default | path)

Read: ${integrationDoc}
`;

process.stdout.write(msg);
process.exit(0);
