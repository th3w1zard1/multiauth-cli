import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";

import type { AccountsFile, AccountEntry } from "./accounts-schema.js";
import { DEFAULT_ACCOUNTS_FILE, MULT } from "./env-config.js";

const CURRENT_VERSION = 1 as const;

function emptyFile(): AccountsFile {
  return { version: 1, accounts: [] };
}

export function resolveAccountsPath(fileOverride?: string): string {
  if (fileOverride?.trim()) {
    return fileOverride.trim();
  }
  return process.env[MULT.path]?.trim() || DEFAULT_ACCOUNTS_FILE();
}

export async function loadAccounts(fileOverride?: string): Promise<AccountsFile> {
  const path = resolveAccountsPath(fileOverride);
  try {
    const raw = await readFile(path, "utf8");
    const d = JSON.parse(raw) as AccountsFile;
    if (d.version !== 1) throw new Error("Unsupported accounts file version");
    d.accounts = d.accounts || [];
    return d;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      return emptyFile();
    }
    throw e;
  }
}

export async function saveAccounts(
  data: AccountsFile,
  fileOverride?: string,
): Promise<void> {
  const path = resolveAccountsPath(fileOverride);
  await mkdir(dirname(path), { recursive: true });
  const json =
    JSON.stringify(
      { ...data, version: CURRENT_VERSION, accounts: data.accounts },
      null,
      2,
    ) + "\n";
  await writeFile(path, json, "utf8");
  try {
    await chmod(path, 0o600);
  } catch {
    /* Windows may ignore; ignore */
  }
}

export function maskApiKey(k: string): string {
  if (k.length <= 6) return "****";
  return `${k.slice(0, 2)}****${k.slice(-4)}`;
}

export function printAccountsTable(data: AccountsFile): void {
  const wName = 16;
  const wKey = 20;
  const wEm = 28;
  const hasEmail = data.accounts.some((a) => a.email);
  if (hasEmail) {
    console.log(
      `${"NAME".padEnd(wName)} ${"EMAIL".padEnd(wEm)} ${"API_KEY".padEnd(wKey)} ${"DEF"}`,
    );
  } else {
    console.log(
      `${"NAME".padEnd(wName)} ${"API_KEY".padEnd(wKey)} ${"DEFAULT"}`,
    );
  }
  const def = data.defaultAccount;
  for (const a of data.accounts) {
    const isDef = a.name === def;
    if (hasEmail) {
      const em = (a.email ?? "—").slice(0, wEm).padEnd(wEm);
      console.log(
        `${a.name.slice(0, wName).padEnd(wName)} ${em} ${maskApiKey(a.apiKey).padEnd(wKey)} ${isDef ? "yes" : "no"}`,
      );
    } else {
      console.log(
        `${a.name.slice(0, wName).padEnd(wName)} ${maskApiKey(a.apiKey).padEnd(wKey)} ${isDef ? "yes" : "no"}`,
      );
    }
  }
  if (data.accounts.length === 0) {
    console.log("(no accounts)");
  }
}

export function mergeAdd(
  data: AccountsFile,
  name: string,
  apiKey: string,
  email?: string,
): AccountsFile {
  if (!name?.trim() || !apiKey?.trim()) {
    throw new Error("--name and --api-key are required for add");
  }
  const others = data.accounts.filter(
    (x) => x.name.toLowerCase() !== name.toLowerCase(),
  );
  const next: AccountEntry = { name: name.trim(), apiKey: apiKey.trim() };
  if (email?.trim()) next.email = email.trim();
  return { ...data, accounts: [...others, next] };
}

export function mergeDefault(data: AccountsFile, name: string): AccountsFile {
  const n = name.trim();
  if (!n) throw new Error("name required");
  if (!data.accounts.some((a) => a.name === n)) {
    throw new Error(`no account named "${n}"`);
  }
  return { ...data, defaultAccount: n };
}
