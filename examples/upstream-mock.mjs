#!/usr/bin/env node
/**
 * Fictional upstream: reads EXAMPLE_API_TOKEN, exits 0 on success.
 * For demos only; not a real product CLI.
 */
const t = process.env["EXAMPLE_API_TOKEN"];
if (!t?.trim()) {
  console.error("upstream-mock: missing EXAMPLE_API_TOKEN");
  process.exit(1);
}
if (process.argv.includes("--fail")) {
  console.error("upstream-mock: simulated 401");
  process.exit(1);
}
process.stdout.write(`ok token=${t.slice(0, 3)}…\n`);
process.exit(0);
