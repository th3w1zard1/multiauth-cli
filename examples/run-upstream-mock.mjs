#!/usr/bin/env node
/**
 * After `npm run build`, run from repo root, e.g.:
 *   node examples/run-upstream-mock.mjs
 *   MULTIAUTH_API_KEYS="a b" node examples/run-upstream-mock.mjs
 * Copy this + upstream-mock.mjs into a gitignored `local/` folder to wrap a
 * real upstream CLI and add that CLI as a dependency.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runClWithMultiauth } from "../dist/wrapper/run.js";
import { isRetryableApiFailure } from "../dist/classify.js";
import { defaultMultiauthVerbose } from "../dist/env-config.js";

const here = dirname(fileURLToPath(import.meta.url));
const childEntry = join(here, "upstream-mock.mjs");

const adapter = {
  id: "example",
  rrProfile: "example-upstream",
  logPrefix: "example",
  noKeysMessage:
    "Set MULTIAUTH_API_KEY, MULTIAUTH_API_KEYS, or an accounts file (MULTIAUTH_CONFIG).",
  multiauthVerbose: defaultMultiauthVerbose,
  isRetryable: isRetryableApiFailure,
  resolveChildEntry: () => childEntry,
  prepareRun: async (apiKey) => {
    const env = { ...process.env };
    delete env["MULTIAUTH_API_KEYS"];
    delete env["MULTIAUTH_API_KEY"];
    env["EXAMPLE_API_TOKEN"] = apiKey;
    return { env, cleanup: async () => undefined };
  },
};

const code = await runClWithMultiauth(adapter, process.argv.slice(2));
process.exit(code);
