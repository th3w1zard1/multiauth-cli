#!/usr/bin/env node
import {
  loadAccounts,
  saveAccounts,
  mergeAdd,
  mergeDefault,
  printAccountsTable,
  resolveAccountsPath,
} from "./accounts-ops.js";
import { DEFAULT_ACCOUNTS_FILE, MULT } from "./env-config.js";

const rawArgv = process.argv.slice(2);
let filePath: string | undefined;
const argv: string[] = [];
for (let i = 0; i < rawArgv.length; i++) {
  const a = rawArgv[i]!;
  if (a === "--file" && rawArgv[i + 1] && !rawArgv[i + 1]!.startsWith("-")) {
    filePath = rawArgv[i + 1]!;
    i++;
    continue;
  }
  argv.push(a);
}

function fileOverrideFromEnv(): string | undefined {
  return process.env[MULT.path]?.trim() || undefined;
}

function help(): void {
  const p = fileOverrideFromEnv() || DEFAULT_ACCOUNTS_FILE();
  console.log(`multiauth-accounts — edit the multiauth credentials JSON (metadata only; not sent to APIs by this tool)

Usage:
  multiauth-accounts add --name <name> --api-key <secret> [--email <label>]
  multiauth-accounts list
  multiauth-accounts default <name>
  multiauth-accounts path
  multiauth-accounts --file <path> <command>   # override file for one invocation

The default file (unless --file or ${MULT.path} is set) is:
  ${p}

To use a file (instead of env keys only) with your wiring, set:
  ${MULT.useFile}=1
  (optional) ${MULT.path}=...`);
}

if (argv[0] === "-h" || argv[0] === "--help" || argv.length === 0) {
  help();
  process.exit(0);
}

const fileForOps = filePath || fileOverrideFromEnv();
const cmd = argv[0];

if (cmd === "path") {
  console.log(resolveAccountsPath(fileForOps));
  process.exit(0);
}

if (cmd === "add") {
  const tail = argv.slice(1);
  const nameI = tail.indexOf("--name");
  const keyI = tail.indexOf("--api-key");
  const emI = tail.indexOf("--email");
  const get = (i: number) =>
    i >= 0 && tail[i + 1] && !tail[i + 1]!.startsWith("-")
      ? tail[i + 1]!
      : undefined;
  const name = nameI >= 0 ? get(nameI) : undefined;
  const apiKey = keyI >= 0 ? get(keyI) : undefined;
  const email = emI >= 0 ? get(emI) : undefined;
  if (!name || !apiKey) {
    help();
    process.exit(1);
  }
  const data = await loadAccounts(fileForOps);
  const merged = mergeAdd(data, name, apiKey, email);
  if (!data.defaultAccount && merged.accounts.length === 1) {
    merged.defaultAccount = name;
  }
  await saveAccounts(merged, fileForOps);
  const shown = resolveAccountsPath(fileForOps);
  console.error(`Wrote account "${name}" to ${shown}`);
  process.exit(0);
}

if (cmd === "list") {
  const data = await loadAccounts(fileForOps);
  printAccountsTable(data);
  process.exit(0);
}

if (cmd === "default") {
  const name = argv[1];
  if (!name) {
    console.error("Usage: multiauth-accounts [options] default <name>");
    process.exit(1);
  }
  const data = await loadAccounts(fileForOps);
  const merged = mergeDefault(data, name);
  await saveAccounts(merged, fileForOps);
  console.error(`default account set to "${name}"`);
  process.exit(0);
}

help();
process.exit(1);
