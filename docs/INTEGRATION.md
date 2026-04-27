# Integrating a CLI with the multiauth wrapper

From a dependent package, after you install the published module:

```ts
import { runClWithMultiauth } from "multiauth-cli";
import type { CliAdapter } from "multiauth-cli/wrapper/types";
```

(Use your published package name; `package.json` `exports` include these paths.)

## Contract

1. **Resolve a key list** with `resolveKeyChainAsync` from the package root (or reimplement) using `MULTIAUTH_*` env and optional JSON accounts.
2. **Build an attempt order:** optional round-robin `startIndex` — `isRoundRobinEnabled` + `acquireRrStartIndex(adapter.rrProfile, n)` + `buildAttemptOrder`.
3. **For each attempt:** `adapter.prepareRun(secret)` returns `{ env, cleanup }`. The child is spawned; `cleanup` always runs when the attempt finishes.
4. **Spawn** `getSpawnCommand?.() ?? process.execPath` with `[ childEntry, ...userArgv ]`. Keep the upstream argv unmodified.
5. **Classify** stdout+stderr with `isRetryable` (default: `isRetryableApiFailure`).

`adapter.id` is for logging only. `adapter.rrProfile` must be stable for that wiring so round-robin files do not collide with unrelated tools.

## `CliAdapter` (see `src/wrapper/types.ts`)

| Field | Role |
|-------|------|
| `id` | Short label for logs. |
| `rrProfile` | File-backed round-robin state id (per upstream / wiring). |
| `prepareRun` | Injects the secret into `env` and/or a temp file tree. |
| `resolveChildEntry` | Path to the upstream’s main script. |
| `isRetryable` | Optional. |
| `getSpawnCommand` | Optional; non-Node runtimes. |
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

Wire your `package.json` `bin` to the compiled `my-thin-cli.js`. The repo’s **[examples/](examples/)** directory mirrors this pattern for a self-contained demo after `npm run build`.

## References in this repository

- `src/wrapper/run.ts` — `runClWithMultiauth`
- `src/keys.ts` — env + file resolution
- `src/env-config.ts` — `MULT` names and round-robin toggles
- `src/round-robin.ts` — cross-process counter
- `examples/` — mock upstream + runner (copy to `local/` for private vendor wiring)
