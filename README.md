# Multiauth CLI (`multiauth-cli`)

A small, composable layer in front of **arbitrary** upstream CLIs that use **one credential at a time** (API keys, bearer tokens, or anything you map into a child `process.env` or a temp config file). You keep the upstream tool unchanged; the wrapper **selects a credential per invocation**, can **round-robin** across many parallel processes, and on **retriable** errors can **retry the same argv** with the next credential in your pool.

**Use it when** you have multiple org accounts, keys, or “slots,” and you want a single, familiar CLI surface: same flags as upstream, with rotation and failover at the process boundary.

**Do not** commit real secrets. Prefer env injection in CI, or a local accounts file with restricted permissions.

## What you get

- **Key chain:** `MULTIAUTH_API_KEY` / `MULTIAUTH_API_KEYS`, optional JSON accounts when `MULTIAUTH_CONFIG=1` or `MULTIAUTH_CONFIG_PATH` is set (default file: `~/.cli-multiauth/accounts.json`).
- **Load spreading:** optional **round-robin** for the *first* key per new OS process (file-locked counter under `~/.cli-multiauth/round-robin/`). Disable with `MULTIAUTH_RR=0` or `CLI_MULTIAUTH_RR=0`.
- **Failover:** on **recoverable** output (see `isRetryableApiFailure` in `src/classify.ts` or your adapter override), the wrapper re-runs the child on the next key. Each retry is a **new** child process.
- **Library + bins:** `import` from this package, or use `multiauth` (prints pointers) and `multiauth-accounts` to edit the shared accounts JSON (names/keys; optional `email` as metadata only).
- **Firecrawl CLI (bundled):** the `multiauth-firecrawl` command runs upstream `firecrawl-cli` with keys from `MULTIAUTH_*` mapped to `FIRECRAWL_API_KEY` per attempt. On HTTP **4xx–style** errors in stderr/stdout, the wrapper tries the **next** key when multiple keys are configured.

**Limitation:** a retry is a new run of the child. Long-running or stateful work is not migrated between credentials automatically.

### Windows: wrapped `firecrawl` and PATH

`scripts/Install-FirecrawlShim.ps1` writes `%USERPROFILE%\.multiauth-cli\bin\firecrawl.cmd` and `firecrawl.ps1` that invoke `dist\firecrawl-main.js`, and prepends that directory to **User** `PATH` so it sorts **before** other shims (e.g. KPatcher, npm globals). When run from a clone, the script picks up sibling `dist\` automatically. CI / agents: `npm run verify:shim` rebuilds, writes shims, prepends **process** `PATH`, prints `Get-Command firecrawl`, and runs `firecrawl --version`. See **AGENTS.md** — agents perform install/verify, not the user.

**Cursor / MCP:** the Firecrawl MCP server uses its own API key in MCP settings. It does **not** go through this wrapper; fix 403 there by updating MCP credentials or plan. Terminal `firecrawl` after the shim uses multiauth rotation.

## Public env (no third-party prefix)

| Variable | Role |
|----------|------|
| `MULTIAUTH_API_KEY` | First key, or override when using a file |
| `MULTIAUTH_API_KEYS` | Extra keys (comma- or space-separated) |
| `MULTIAUTH_CONFIG` | Set `1` to use the accounts file path |
| `MULTIAUTH_CONFIG_PATH` | Explicit path to accounts JSON (implies file mode) |
| `MULTIAUTH_VERBOSE` | `1` for per-attempt key logging |
| `MULTIAUTH_RR` | `0` to disable round-robin |

**Backwards compatibility:** if `MULTIAUTH_*` keys are unset, the resolver also reads **`FIRECRAWL_API_KEY`** / **`FIRECRAWL_API_KEYS`** so existing Firecrawl env still works through the wrapper.

**Multiple keys (required for fallback):** put **two or more** keys in `MULTIAUTH_API_KEYS` (space- or comma-separated) or in the accounts file, or in `FIRECRAWL_API_KEYS` when using that path. A single key cannot rotate. When one key is out of credits, rate-limited, or hits 4xx/typical API errors, the next key is tried (see `src/classify.ts`).

## Integrating a CLI

See **[docs/INTEGRATION.md](docs/INTEGRATION.md)**. Implement a `CliAdapter` and call `runClWithMultiauth` from the package root export or `multiauth-cli/wrapper/run`.

## Examples in this repo

The **[examples/](examples/)** folder has a **mock “upstream”** and a small runner that uses the built `dist/` files; see **[examples/README.md](examples/README.md)** for the required env vars. **Vendor-specific** wiring (real upstream CLIs) belongs in a **private** `local/` directory: copy the examples there, add dependencies, and keep `local/` gitignored (this repo already ignores it).

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
