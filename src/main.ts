#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const integrationDoc = join(here, "..", "docs", "INTEGRATION.md");

const msg = `multiauth — generic CLI multiauth helpers (this command only prints this message).

Public API: import from your dependency’s package name, e.g.:
  import { runClWithMultiauth } from "multiauth-cli"
  import type { CliAdapter } from "multiauth-cli/wrapper/types"

Key env: MULTIAUTH_API_KEY, MULTIAUTH_API_KEYS, MULTIAUTH_CONFIG, MULTIAUTH_CONFIG_PATH, MULTIAUTH_VERBOSE, MULTIAUTH_RR (see docs).

Helper: multiauth-accounts (add | list | default | path)

Read: ${integrationDoc}
`;

process.stdout.write(msg);
process.exit(0);
