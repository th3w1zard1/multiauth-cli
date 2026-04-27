import { readFile, stat } from "node:fs/promises";

import type { AccountsFile } from "./accounts-schema.js";
import { DEFAULT_ACCOUNTS_FILE, MULT } from "./env-config.js";

export { DEFAULT_ACCOUNTS_FILE };

export interface ResolvedKeyList {
  keys: string[];
  source: "env_only" | "file" | "file_and_env";
}

/**
 * Splits a comma- or whitespace-separated list of API keys; drops empty parts.
 */
export function parseKeyList(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(/[,\s]+/u)
    .map((k) => k.trim())
    .filter(Boolean);
}

function keysFromEnv(): string[] {
  const primary = process.env[MULT.primary]?.trim();
  const rest = parseKeyList(process.env[MULT.list]);
  const out: string[] = [];
  if (primary) out.push(primary);
  for (const k of rest) {
    if (!out.includes(k)) out.push(k);
  }
  if (!primary && rest.length) {
    return rest;
  }
  return out;
}

async function readAccountsFile(path: string): Promise<AccountsFile> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as AccountsFile;
}

/**
 * Resolves ordered credentials from `MULTIAUTH_*` env and optional JSON file.
 */
export async function resolveKeyChainAsync(): Promise<ResolvedKeyList> {
  const path = process.env[MULT.path]?.trim();
  const useFile = process.env[MULT.useFile] === "1" || Boolean(path);

  if (!useFile) {
    const k = keysFromEnv();
    return { keys: k, source: "env_only" };
  }

  const p = path || DEFAULT_ACCOUNTS_FILE();
  if (!(await fileExists(p))) {
    const fromEnv = keysFromEnv();
    if (fromEnv.length) {
      return { keys: fromEnv, source: "file_and_env" };
    }
    throw new Error(
      `${MULT.useFile} is on but no file at ${p} and no ${MULT.primary} / ${MULT.list} in env`,
    );
  }

  const data = await readAccountsFile(p);
  if (!data.accounts?.length) {
    const fromEnv = keysFromEnv();
    if (fromEnv.length) {
      return { keys: fromEnv, source: "file_and_env" };
    }
    throw new Error(
      `${MULT.useFile} is on but no accounts in ${p} and no env keys set`,
    );
  }

  let ordered = orderAccountsByDefault(data);
  const shellKey = process.env[MULT.primary]?.trim();
  if (shellKey && !ordered.includes(shellKey)) {
    ordered = [shellKey, ...ordered];
  } else if (shellKey && ordered[0] !== shellKey) {
    ordered = [shellKey, ...ordered.filter((x) => x !== shellKey)];
  }

  const fromEnvFallback = parseKeyList(process.env[MULT.list]);
  for (const k of fromEnvFallback) {
    if (!ordered.includes(k)) ordered.push(k);
  }

  return { keys: ordered, source: "file" };
}

async function fileExists(f: string): Promise<boolean> {
  try {
    await stat(f);
    return true;
  } catch {
    return false;
  }
}

function orderAccountsByDefault(data: AccountsFile): string[] {
  const { accounts, defaultAccount } = data;
  const byName = new Map(accounts.map((a) => [a.name, a.apiKey]));
  if (defaultAccount) {
    const first = byName.get(defaultAccount);
    const rest = accounts
      .filter((a) => a.name !== defaultAccount)
      .map((a) => a.apiKey);
    if (first) {
      return [first, ...rest];
    }
  }
  return accounts.map((a) => a.apiKey);
}

export function buildAttemptOrder(
  keys: string[],
  startIndex: number,
): string[] {
  const n = keys.length;
  if (n === 0) return [];
  const s = ((startIndex % n) + n) % n;
  return Array.from({ length: n }, (_, j) => keys[(s + j) % n]!);
}
