# Integrating a CLI with the multiauth wrapper

From a dependent package, after you install the published module:

```ts
import { runClWithMultiauth, loadProfilesFile, cliAdapterFromProfile } from "multiauth-cli";
import type { CliAdapter } from "multiauth-cli/wrapper/types";
```

(Use your published package name; `package.json` `exports` include these paths.)

## Config-driven runs (no code adapter)

1. Add `~/.config/multiauth/profiles.yaml` (or set `MULTIAUTH_PROFILES_FILE`). See **[examples/profiles.example.yaml](../examples/profiles.example.yaml)**.
2. Run: `multiauth run --profile <name> -- [downstream args]` or the `multiauth-run` binary. Default profile name: `MULTIAUTH_PROFILE` in the environment.
3. Pool / accounts resolution is unchanged: `resolveKeyChainAsync` uses the same `MULTIAUTH_*` and optional JSON file as a coded adapter.

`loadProfilesFile` and `cliAdapterFromProfile` are available to embed the same profile shape in a host application.

## Contract (in-process `CliAdapter`)

1. **Resolve a key list** with `resolveKeyChainAsync` from the package root (or reimplement) using `MULTIAUTH_*` env and optional JSON accounts.
2. **Build an attempt order:** optional round-robin `startIndex` — `isRoundRobinEnabled` + `acquireRrStartIndex(adapter.rrProfile, n)` + `buildAttemptOrder`.
3. **For each attempt:** `adapter.prepareRun(secret)` returns `{ env, cleanup }`. The child is spawned; `cleanup` always runs when the attempt finishes.
4. **Spawn** `getSpawnCommand?.() ?? process.execPath`. Argument list: `buildSpawnArgList?.(userArgv) ?? [ childEntry, ...userArgv ]` so non-Node upstreams (e.g. an `npx` line) are supported. Keep the downstream `argv` semantics clear for your use case.
5. **Classify** stdout+stderr with `isRetryable` (default: `isRetryableApiFailure`). A YAML profile can add `retry.extra_substrings` merged in when using `cliAdapterFromProfile`.

`adapter.id` is for logging only. `adapter.rrProfile` must be stable for that wiring so round-robin files do not collide with unrelated tools.

## `CliAdapter` (see `src/wrapper/types.ts`)

| Field | Role |
|-------|------|
| `id` | Short label for logs. |
| `rrProfile` | File-backed round-robin state id (per upstream / wiring). |
| `prepareRun` | Injects the secret into `env` and/or a temp file tree. |
| `resolveChildEntry` | Path to the script passed to the spawn command; ignored when `buildSpawnArgList` is set, but should still return a value. |
| `buildSpawnArgList` | Optional. Full argv after the spawn command (e.g. `npx` + prefix + user args). |
| `isRetryable` | Optional. |
| `getSpawnCommand` | Optional; e.g. `npx` instead of `node`. |
| `multiauthVerbose` / `logPrefix` / `noKeysMessage` | UX. |

## Minimal example (fictional upstream)

The upstream reads `EXAMPLE_API_TOKEN` and is a single Node file.

```ts
// my-thin-cli.ts
import { runClWithMultiauth } from "multiauth-cli";
import type { CliAdapter } from "multiauth-cli/wrapper/types";
import { isRetryableApiFailure } from "multiauth-cli";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const mockUpstream = fileURLToPath(
  new URL("./upstream-mock.mjs", import.meta.url),
);

const adapter: CliAdapter = {
  id: "acme",
  rrProfile: "acme",
  logPrefix: "acme",
  noKeysMessage:
    "Set MULTIAUTH_API_KEY / MULTIAUTH_API_KEYS or accounts + MULTIAUTH_CONFIG.",
  multiauthVerbose: () => process.env["MULTIAUTH_VERBOSE"] === "1",
  isRetryable: isRetryableApiFailure,
  resolveChildEntry: () => mockUpstream,
  prepareRun: async (token) => {
    const env = { ...process.env } as NodeJS.ProcessEnv;
    delete env["MULTIAUTH_API_KEYS"];
    env["EXAMPLE_API_TOKEN"] = token;
    return { env, cleanup: async () => undefined };
  },
};

const code = await runClWithMultiauth(adapter, process.argv.slice(2));
process.exit(code);
```

Wire your `package.json` `bin` to the compiled `my-thin-cli.js`. The repo’s **[examples/](../examples/)** directory mirrors this pattern for a self-contained demo after `npm run build`.

## Optional published bins

- **`multiauth run` / `multiauth-run`** — always available; use the YAML profile file and `MULTIAUTH_PROFILE` / `--profile`.
- **Legacy** — a separate bin may load an `optionalDependencies` child CLI. If that child is not installed, install it in your environment or use a `path` or `exec` profile instead.

`scripts/install-shim.ps1` and `scripts/install-shim.sh` are generic: pass any built `dist/*.js` and a shim name. The legacy `Install-FirecrawlShim.ps1` is a small helper that points at the optional `dist\firecrawl-main.js` entry and names the shim on disk.

## References in this repository

- `src/wrapper/run.ts` — `runClWithMultiauth`
- `src/keys.ts` — env + file resolution
- `src/env-config.ts` — `MULT` names and round-robin toggles
- `src/round-robin.ts` — cross-process counter
- `src/config/` — YAML load + `cliAdapterFromProfile`
- `src/run-config.ts` — `multiauth run` / `multiauth-run`
- `examples/` — mock upstream + example profile file
