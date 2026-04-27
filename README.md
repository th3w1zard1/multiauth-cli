# Multiauth CLI (`multiauth-cli`)

A small, composable layer in front of **arbitrary** upstream command-line tools that use **one credential at a time** (API keys, tokens, or anything you map into a child `process.env`). You keep the upstream program unchanged; the wrapper **picks a credential from a pool** per run, can **round-robin** under parallel use, and on **recoverable** process output can **retry the same arguments** with the next credential. Full wiring can be declared in a **YAML profile file** so the same install can target different child CLIs without code forks.

**Use this when** you have multiple org accounts, keys, or “slots,” and you want a single, familiar process surface: same flags as the upstream, with load spreading and automatic failover at the process boundary.

**Do not** commit real secrets. Prefer environment injection in CI, or a local JSON accounts file with strict permissions.

## What you get

- **Key chain:** `MULTIAUTH_API_KEY` / `MULTIAUTH_API_KEYS`, optional JSON accounts when `MULTIAUTH_CONFIG=1` or `MULTIAUTH_CONFIG_PATH` is set (default file: `~/.cli-multiauth/accounts.json`).
- **Load spreading:** optional **round-robin** for the *first* key in each new OS process (file-locked counter under `~/.cli-multiauth/round-robin/`). Disable with `MULTIAUTH_RR=0` or `CLI_MULTIAUTH_RR=0`.
- **Failover:** on **recoverable** child output (see `isRetryableApiFailure` in the published API, or a profile-specific override), the wrapper re-runs the child with the **next** key. Each try is a **new** process.
- **Profile file (YAML):** set `MULTIAUTH_PROFILES_FILE` or use the default `~/.config/multiauth/profiles.yaml` (respects `XDG_CONFIG_HOME` on non-Windows). List named profiles: upstream (Node module, path, or `exec` prefix), child environment variable for the key, and optional **extra** substrings to treat as retriable. See **[examples/profiles.example.yaml](examples/profiles.example.yaml)**.
- **Run:** `multiauth run --profile <name> [upstream args...]`, or the `multiauth-run` binary, or an optional legacy bin that targets one optional `optionalDependencies` CLIs. Set `MULTIAUTH_PROFILE` to default the profile.
- **Library + helpers:** `import` from the package, `multiauth-accounts` for the shared accounts JSON (names, keys, optional `email` metadata), and the core API in **[docs/INTEGRATION.md](docs/INTEGRATION.md)**.

**Limitation:** a retry is a new run of the child. Long-running or stateful work is not moved between pool entries automatically.

### IDE / MCP and your terminal

Remote editors may run separate helper processes with their own key configuration. Those paths are separate from a shell where you have installed a **local PATH shim** for this package. A problem in the IDE’s helper is fixed in the IDE, not by changes here.

### Windows: PATH shims (deterministic)

[scripts/install-shim.ps1](scripts/install-shim.ps1) writes a stable pair of shims in a user bin directory (by default `%USERPROFILE%\.multiauth-cli\bin\`) and prepends that path to the **user** `PATH` only when the directory is not already first. The same command line produces the same files. From a repository clone, run it after `npm run build` and point `-RunnerJs` at any built entry under `dist\` (e.g. `run-config-cli.js` for profile-based runs). **AGENTS.md** in this repository expects the agent to perform install/verify in the tool shell, not a human to copy steps.

A Bash variant with the same file-content contract is [scripts/install-shim.sh](scripts/install-shim.sh) (suitable for Git Bash / WSL / macOS / Linux). CI can run `npm run verify:shim` to rebuild, create the legacy `firecrawl` shim, prepend process `PATH`, and exercise `--version` on the shim; that check requires the optional `optionalDependencies` child CLI to be present for that specific legacy path.

## Public environment (unprefixed pool)

| Variable | Role |
|----------|------|
| `MULTIAUTH_API_KEY` | First key, or override when using a file |
| `MULTIAUTH_API_KEYS` | Extra keys (comma- or space-separated) |
| `MULTIAUTH_CONFIG` | Set `1` to use the accounts file path |
| `MULTIAUTH_CONFIG_PATH` | Explicit path to the accounts JSON (implies file mode) |
| `MULTIAUTH_VERBOSE` | `1` for per-attempt key logging |
| `MULTIAUTH_RR` | `0` to disable round-robin |
| `MULTIAUTH_PROFILES_FILE` | Path to the YAML profile file (see above) |
| `MULTIAUTH_PROFILE` | Default profile name for `multiauth run` |

**Compatibility (pool only):** if the primary `MULTIAUTH_*` keys are not set, the key resolver can read from other env names in use on existing machines. See the source in `src/keys.ts` if you need the exact list.

**Multiple pool entries (required for rotation):** put at least two keys in `MULTIAUTH_API_KEYS` (or comma- or space-separated) or the accounts file. A single key cannot advance the pool. When a pool entry is exhausted, rate-limited, or the child output matches retriable patterns, the next key is used (classifier in `src/classify.ts`, plus profile `retry.extra_substrings` when set).

## Integrating a program

See **[docs/INTEGRATION.md](docs/INTEGRATION.md)**. Implement a `CliAdapter` and call `runClWithMultiauth`, or describe the adapter in YAML and use `multiauth run`.

## Examples in this repository

**[examples/](examples/)** contains a **mock** upstream and a small runner. **[examples/profiles.example.yaml](examples/profiles.example.yaml)** shows a generic profile file shape. Proprietary or product-specific recipes belong in a **private** `local/` directory: copy the examples, add your own `package.json` and wiring, and keep `local/` gitignored if needed.

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
