# Multiauth CLI (`multiauth-cli`)

A small, composable layer in front of **arbitrary** upstream command-line tools that use **one credential at a time** (API keys, tokens, or anything you map into a child `process.env`). You keep the upstream program unchanged; the wrapper **picks a credential from a pool** per run, can **round-robin** under parallel use, and on **recoverable** process output can **retry the same arguments** with the next pool entry. Full wiring can be declared in a **YAML or TOML profile file** so the same install can target different child CLIs without code forks.

**Use this when** you have multiple org accounts, keys, or “slots,” and you want a single, familiar process surface: same flags as the upstream, with load spreading and automatic failover at the process boundary.

**Do not** commit real secrets. Prefer environment injection in CI, or a local JSON accounts file with strict permissions.

## What you get

- **Key chain:** `MULTIAUTH_API_KEY` / `MULTIAUTH_API_KEYS`, optional JSON accounts when `MULTIAUTH_CONFIG=1` or `MULTIAUTH_CONFIG_PATH` is set (default file: `~/.cli-multiauth/accounts.json`).
- **Load spreading:** optional **round-robin** for the *first* key in each new OS process (file-locked counter under `~/.cli-multiauth/round-robin/`). Disable with `MULTIAUTH_RR=0` or `CLI_MULTIAUTH_RR=0`.
- **Failover:** on **recoverable** child output (see `isRetryableApiFailure` in the published API, or a profile-specific override), the wrapper re-runs the child with the **next** key. Each try is a **new** process.
- **Profile file (YAML or TOML):** set `MULTIAUTH_PROFILES_FILE` or use the default `~/.config/multiauth/profiles.yaml` (respects `XDG_CONFIG_HOME` on non-Windows; use a `.toml` path if you prefer). List named profiles: upstream (Node module, path, or `exec` prefix), child environment variable for the key, and optional **extra** substrings to treat as retriable. See **[examples/profiles.example.yaml](examples/profiles.example.yaml)** and **[examples/profiles.example.toml](examples/profiles.example.toml)**.
- **Run:** `multiauth run --profile <name> [upstream args...]`, or the `multiauth-run` binary. Set `MULTIAUTH_PROFILE` to default the profile.
- **Library + helpers:** `import` from the package, `multiauth-accounts` for the shared accounts JSON (names, keys, optional `email` metadata), and the core API in **[docs/INTEGRATION.md](docs/INTEGRATION.md)**.

**Limitation:** a retry is a new run of the child. Long-running or stateful work is not moved between pool entries automatically.

### Host tools vs shell

Editor-embedded or other **host** processes that call remote APIs **directly** do not use a PATH shim from this package. See **[docs/HOSTS.md](docs/HOSTS.md)**. Only **spawned** CLIs (profile-driven `multiauth run` or a shim) get pool + retry behavior here.

### One-shot setup (same result every time)

From a repository clone, after any pull:

- **Windows:** `pwsh -NoProfile -File scripts/setup.ps1` (optional: `-ShimName mycmd` to choose the command name on your `PATH`, default `u`)
- **Unix:** `bash scripts/setup.sh` (optional second arg: shim name)
- **Declarative (multi-shim, optional Cursor files, state for uninstall):** [examples/install.example.yaml](examples/install.example.yaml) and [docs/INSTALL.md](docs/INSTALL.md) — e.g. `setup.ps1 -Config path\\to\\install.yaml` or `bash scripts/setup.sh --config path/to/install.yaml`. Uninstall: [scripts/uninstall.mjs](scripts/uninstall.mjs) (or `uninstall.ps1` / `uninstall.sh`).

The classic flow runs `npm install`, `npm run build`, copies `examples/profiles.example.yaml` to the default config path if missing, and calls [scripts/install-shim.ps1](scripts/install-shim.ps1) or [scripts/install-shim.sh](scripts/install-shim.sh). Edit the profile file: set `upstream` to a `node_module` (any npm package that exposes a Node entry), `path`, or `exec`, and map `child.primary_env` to the env var your downstream reads for the active pool entry.

[scripts/install-shim.ps1](scripts/install-shim.ps1) writes a stable pair of shims in `%USERPROFILE%\.multiauth-cli\bin\` (or your `-BinDir`) and prepends **User** `PATH` when that directory is not already present. The same inputs yield the same files. **AGENTS.md** expects the agent to run these in the tool shell for routine setup.

A Bash variant with the same on-disk contract is [scripts/install-shim.sh](scripts/install-shim.sh). CI: `npm run verify:shim` rebuilds, installs a test shim (default name `u`), prepends `PATH`, and runs `u --help`.

## Public environment (unprefixed pool)

| Variable | Role |
|----------|------|
| `MULTIAUTH_API_KEY` | First key, or override when using a file |
| `MULTIAUTH_API_KEYS` | Extra keys (comma- or space-separated) |
| `MULTIAUTH_CONFIG` | Set `1` to use the accounts file path |
| `MULTIAUTH_CONFIG_PATH` | Explicit path to the accounts JSON (implies file mode) |
| `MULTIAUTH_VERBOSE` | `1` for per-attempt key logging |
| `MULTIAUTH_RR` | `0` to disable round-robin |
| `MULTIAUTH_PROFILES_FILE` | Path to the profile file (`.yaml` / `.yml` / `.toml`) |
| `MULTIAUTH_PROFILE` | Default profile name for `multiauth run` |

**Multiple pool entries (required for rotation):** put at least two keys in `MULTIAUTH_API_KEYS` (or comma- or space-separated) or the accounts file. A single key cannot advance the pool. When a pool entry is exhausted, rate-limited, or the child output matches retriable patterns, the next key is used (classifier in `src/classify.ts`, plus profile `retry.extra_substrings` when set).

## Integrating a program

See **[docs/INTEGRATION.md](docs/INTEGRATION.md)**. Implement a `CliAdapter` and call `runClWithMultiauth`, or describe the adapter in YAML and use `multiauth run`.

## Examples in this repository

**[examples/](examples/)** contains a **mock** upstream and a small runner. **[examples/profiles.example.yaml](examples/profiles.example.yaml)** shows a generic profile file shape. For a full walkthrough that uses a public CLI to run **`search`** (install, profile, keys, and troubleshooting), see **[docs/guides/wrap-firecrawl-search.md](docs/guides/wrap-firecrawl-search.md)**. Proprietary or one-off recipes can still live in a private `local/` directory: copy the examples, add your own `package.json` and wiring, and keep `local/` gitignored if needed. The `firecrawl-cli` package is listed only as a **devDependency** for that documented flow and local e2e checks, not a runtime requirement of the library.

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
