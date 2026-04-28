/**
 * Remove shims, optional User PATH segment (Windows), path-export, and recorded Cursor files;
 * then delete install-state.json. Usage: node scripts/uninstall.mjs [path-to-install-state.json]
 */
import { existsSync, readFileSync, unlinkSync, rmdirSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import os from "os";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function defaultStatePath() {
  if (process.platform === "win32") {
    return join(os.homedir(), ".config", "multiauth", "install-state.json");
  }
  return join(
    process.env.XDG_CONFIG_HOME || join(os.homedir(), ".config"),
    "multiauth",
    "install-state.json",
  );
}

function removeIfExists(p) {
  if (p && existsSync(p)) {
    unlinkSync(p);
    console.log(`Removed: ${p}`);
  }
}

function removeUserPathWindows(binDir) {
  const script = join(__dirname, "uninstall-path.ps1");
  if (!existsSync(script)) {
    console.error(`Missing ${script}`);
    return;
  }
  const r = spawnSync(
    "pwsh",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      script,
      "-BinDir",
      resolve(binDir),
    ],
    { stdio: "inherit", windowsHide: true },
  );
  if (r.error || r.status !== 0) {
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        "-BinDir",
        resolve(binDir),
      ],
      { stdio: "inherit", windowsHide: true },
    );
  }
}

function main() {
  const sp = process.argv[2] ? resolve(process.argv[2]) : defaultStatePath();
  if (!existsSync(sp)) {
    console.error(
      `No install state at ${sp} — nothing to remove (or pass explicit state path).`,
    );
    process.exit(1);
  }
  let state;
  try {
    state = JSON.parse(readFileSync(sp, "utf8"));
  } catch {
    console.error(`Invalid state file: ${sp}`);
    process.exit(1);
  }
  if (state.version !== 1) {
    console.error(`Unknown state version: ${state.version}`);
    process.exit(1);
  }
  if (state.platform && state.platform !== process.platform) {
    console.error(
      `Warning: state was written on ${state.platform}, this is ${process.platform} — paths may be wrong.`,
    );
  }
  const binDir = state.binDir;
  const isWin = process.platform === "win32";

  for (const s of state.shims || []) {
    const n = s.name;
    if (isWin) {
      removeIfExists(join(binDir, `${n}.cmd`));
      removeIfExists(join(binDir, `${n}.ps1`));
    } else {
      removeIfExists(join(binDir, n));
    }
  }
  for (const f of [state.pathExportFile, ...(state.cursorFiles || [])].filter(
    Boolean,
  )) {
    removeIfExists(f);
  }
  if (isWin && state.pathPrepend) {
    removeUserPathWindows(binDir);
  }
  if (binDir && existsSync(binDir)) {
    try {
      const left = readdirSync(binDir);
      if (left.length === 0) {
        rmdirSync(binDir);
        console.log(`Removed empty directory: ${binDir}`);
      }
    } catch {
      // ignore
    }
  }
  if (existsSync(sp)) {
    unlinkSync(sp);
    console.log(`Removed state: ${sp}`);
  }
  console.log("Uninstall complete.");
}

main();
