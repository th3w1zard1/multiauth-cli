/**
 * Declarative install: read a YAML config, run platform install-shim, optional profile copy,
 * optional Cursor-oriented templates, and write install-state.json for uninstall.
 * Usage: node scripts/apply-install.mjs <path-to-install.yaml> [packageRoot]
 * Env: MULTIAUTH_INSTALL_CONFIG=path (optional default config if argv omitted)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { dirname, isAbsolute, join, resolve } from "path";
import os from "os";
import YAML from "yaml";

function homedir() {
  return os.homedir();
}

function defaultConfigPath() {
  if (process.env.XDG_CONFIG_HOME) {
    return join(process.env.XDG_CONFIG_HOME, "multiauth", "path-export.sh");
  }
  return join(homedir(), ".config", "multiauth", "path-export.sh");
}

function defaultProfilesFile() {
  if (process.platform === "win32") {
    return join(homedir(), ".config", "multiauth", "profiles.yaml");
  }
  return join(
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
    "multiauth",
    "profiles.yaml",
  );
}

function statePath() {
  if (process.platform === "win32") {
    return join(homedir(), ".config", "multiauth", "install-state.json");
  }
  return join(
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
    "multiauth",
    "install-state.json",
  );
}

function defaultBinDir() {
  if (process.platform === "win32") {
    return join(homedir(), ".multiauth-cli", "bin");
  }
  return join(homedir(), ".multiauth-cli", "bin");
}

function readYamlPath(p) {
  const t = readFileSync(p, "utf8");
  return YAML.parse(t) ?? {};
}

function subst(text, map) {
  let out = text;
  for (const [k, v] of Object.entries(map)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

function ensureDir(p) {
  if (!existsSync(p)) {
    mkdirSync(p, { recursive: true });
  }
}

function main() {
  const configArg = process.argv[2] || process.env.MULTIAUTH_INSTALL_CONFIG;
  if (!configArg) {
    console.error(
      "Usage: node scripts/apply-install.mjs <install.yaml> [packageRoot]\n" +
        "  or set MULTIAUTH_INSTALL_CONFIG=path",
    );
    process.exit(1);
  }
  const cfgPath = resolve(configArg);
  if (!existsSync(cfgPath)) {
    console.error(`Config not found: ${cfgPath}`);
    process.exit(1);
  }
  const rootArg = process.argv[3] ? resolve(process.argv[3]) : process.cwd();
  const doc = readYamlPath(cfgPath);
  const pr = doc.package_root != null ? String(doc.package_root) : ".";
  const packageRoot = isAbsolute(pr) ? resolve(pr) : resolve(rootArg, pr);
  if (!existsSync(packageRoot)) {
    console.error(`package_root not found: ${packageRoot}`);
    process.exit(1);
  }

  const runnerRel = doc.runner || "dist/run-config-cli.js";
  const defaultRunner = resolve(packageRoot, runnerRel);
  if (!existsSync(defaultRunner)) {
    console.error(`Runner missing (run npm run build first): ${defaultRunner}`);
    process.exit(1);
  }

  const shims = Array.isArray(doc.shims) && doc.shims.length ? doc.shims : [{ name: "u" }];
  for (const s of shims) {
    if (!s?.name) {
      console.error("Each shims[] entry must have a name");
      process.exit(1);
    }
  }

  const binDir = doc.bin_dir
    ? resolve(
        isAbsolute(doc.bin_dir) ? doc.bin_dir : join(packageRoot, doc.bin_dir),
      )
    : defaultBinDir();
  const pathMode = (doc.path && doc.path.mode) || "prepend";
  const skipPath =
    pathMode === "skip" || (process.platform !== "win32" && pathMode === "prepend");

  const prof = doc.profiles || {};
  if (prof.copy_example_if_missing) {
    const ex = prof.example
      ? resolve(
          isAbsolute(prof.example)
            ? prof.example
            : join(packageRoot, prof.example),
        )
      : join(packageRoot, "examples", "profiles.example.yaml");
    const dest =
      prof.dest != null
        ? resolve(
            isAbsolute(prof.dest) ? prof.dest : join(packageRoot, prof.dest),
          )
        : defaultProfilesFile();
    if (existsSync(ex) && !existsSync(dest)) {
      ensureDir(dirname(dest));
      copyFileSync(ex, dest);
      console.log(`Created profile template: ${dest}`);
    } else if (!existsSync(ex)) {
      console.error(`Profile example not found: ${ex}`);
    }
  }

  const scriptDir = join(packageRoot, "scripts");
  const isWin = process.platform === "win32";
  const shimOut = [];
  for (const entry of shims) {
    const name = String(entry.name);
    const runner = entry.runner
      ? resolve(
          isAbsolute(entry.runner)
            ? entry.runner
            : join(packageRoot, entry.runner),
        )
      : defaultRunner;
    if (!existsSync(runner)) {
      console.error(`Runner for shim ${name} not found: ${runner}`);
      process.exit(1);
    }
    if (isWin) {
      const args = [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(scriptDir, "install-shim.ps1"),
        "-ShimName",
        name,
        "-RunnerJs",
        runner,
        "-BinDir",
        binDir,
      ];
      if (skipPath) {
        args.push("-SkipPath");
      }
      const r = spawnSync("pwsh", args, {
        stdio: "inherit",
        env: process.env,
        windowsHide: true,
      });
      if (r.status !== 0) {
        process.exit(r.status ?? 1);
      }
    } else {
      const r = spawnSync("bash", [
        join(scriptDir, "install-shim.sh"),
        name,
        runner,
        binDir,
      ], {
        stdio: "inherit",
        env: process.env,
      });
      if (r.status !== 0) {
        process.exit(r.status ?? 1);
      }
    }
    shimOut.push({ name, runner: resolve(runner) });
  }

  let pathExportFile = null;
  if (!isWin && pathMode === "prepend") {
    const p =
      (doc.path && doc.path.unix_path_export) != null
        ? resolve(
            isAbsolute(doc.path.unix_path_export)
              ? doc.path.unix_path_export
              : join(packageRoot, doc.path.unix_path_export),
          )
        : defaultConfigPath();
    pathExportFile = p;
    ensureDir(dirname(p));
    const line = `export PATH="${binDir}:$PATH"\n`;
    writeFileSync(p, line, { encoding: "utf8" });
    console.log(
      `Wrote ${p} — add 'source ${p}' to your shell if this bin is not on PATH yet.`,
    );
  }

  const cur = doc.cursor || {};
  const cursorFiles = [];
  if (cur.enabled) {
    const outDir = cur.out_dir
      ? resolve(
          isAbsolute(cur.out_dir) ? cur.out_dir : join(packageRoot, cur.out_dir),
        )
      : join(packageRoot, ".cursor", "multiauth");
    ensureDir(outDir);

    const subMap = {
      PACKAGE_ROOT: packageRoot,
      INSTALLED_BIN_DIR: binDir,
      SHIM_NAMES: shims.map((s) => s.name).join(", "),
    };

    const pieces = [
      {
        key: "rule",
        defaultTemplate: "examples/cursor/rule.example.mdc",
        defaultDest: join(packageRoot, ".cursor", "rules", "multiauth-cli.mdc"),
      },
      {
        key: "plan",
        defaultTemplate: "examples/cursor/plan.example.md",
        defaultDest: join(
          packageRoot,
          ".cursor",
          "plans",
          "multiauth-wrapper.plan.md",
        ),
      },
      {
        key: "mcp",
        defaultTemplate: "examples/cursor/mcp-handoff.example.md",
        defaultDest: join(outDir, "mcp-handoff.md"),
      },
    ];

    for (const p of pieces) {
      const block = cur[p.key] || {};
      if (!block.enabled) {
        continue;
      }
      const tpl = block.template
        ? resolve(
            isAbsolute(block.template)
              ? block.template
              : join(packageRoot, block.template),
        )
        : join(packageRoot, p.defaultTemplate);
      const dest =
        block.dest != null
          ? resolve(
              isAbsolute(block.dest) ? block.dest : join(packageRoot, block.dest),
            )
          : p.defaultDest;
      if (!existsSync(tpl)) {
        console.error(`Cursor template not found: ${tpl}`);
        process.exit(1);
      }
      ensureDir(dirname(dest));
      const body = subst(readFileSync(tpl, "utf8"), subMap);
      writeFileSync(dest, body, { encoding: "utf8" });
      console.log(`Wrote ${dest}`);
      cursorFiles.push(dest);
    }
  }

  const state = {
    version: 1,
    createdAt: new Date().toISOString(),
    platform: process.platform,
    packageRoot,
    binDir: resolve(binDir),
    pathSource: isWin
      ? pathMode === "prepend" && !skipPath
        ? "user"
        : "none"
      : pathMode === "prepend"
        ? "unix_path_export"
        : "none",
    pathPrepend: isWin && pathMode === "prepend" && !skipPath,
    pathExportFile: pathExportFile,
    shims: shimOut,
    cursorFiles,
  };
  const sp = statePath();
  ensureDir(dirname(sp));
  writeFileSync(sp, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8" });
  console.log(`Recorded install state: ${sp} (uninstall with scripts/uninstall.ps1 or uninstall.sh)`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
