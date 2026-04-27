import { homedir } from "node:os";
import { join } from "node:path";

/** Public env var names (no third-party product coupling). */
export const MULT = {
  primary: "MULTIAUTH_API_KEY",
  list: "MULTIAUTH_API_KEYS",
  useFile: "MULTIAUTH_CONFIG",
  path: "MULTIAUTH_CONFIG_PATH",
  verbose: "MULTIAUTH_VERBOSE",
  /** Set to "0" to disable round-robin. */
  rr: "MULTIAUTH_RR",
  /**
   * Path to YAML file defining upstream profiles (see multiauth run).
   * Default: `~/.config/multiauth/profiles.yaml` (with XDG_CONFIG_HOME on Unix).
   */
  profilesFile: "MULTIAUTH_PROFILES_FILE",
  /** Which profile in that file to use. */
  profile: "MULTIAUTH_PROFILE",
} as const;

export const DEFAULT_ACCOUNTS_FILE = () =>
  join(homedir(), ".cli-multiauth", "accounts.json");

const GLOBAL_RR = "CLI_MULTIAUTH_RR";

export function isRoundRobinEnabled(keyCount: number): boolean {
  if (keyCount <= 1) return false;
  if (process.env[GLOBAL_RR]?.trim() === "0") return false;
  if (process.env[MULT.rr]?.trim() === "0") return false;
  return true;
}

export function defaultMultiauthVerbose(): boolean {
  return process.env[MULT.verbose]?.trim() === "1";
}
