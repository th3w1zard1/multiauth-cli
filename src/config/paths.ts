import { homedir } from "node:os";
import { join } from "node:path";

import { MULT } from "../env-config.js";

/** Default path for `multiauth run` profile YAML. */
export function defaultProfilesYamlPath(): string {
  const xdg =
    process.platform !== "win32"
      ? process.env.XDG_CONFIG_HOME?.trim()
      : undefined;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(base, "multiauth", "profiles.yaml");
}

export function resolveProfilesFilePath(): string {
  const p = process.env[MULT.profilesFile]?.trim();
  return p && p.length > 0 ? p : defaultProfilesYamlPath();
}
