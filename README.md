# Multiauth CLI (`multiauth-cli`)

A small, composable layer in front of **arbitrary** upstream CLIs that use **one credential at a time** (API keys, bearer tokens, or anything you map into a child `process.env` or a temp config file). You keep the upstream tool unchanged; the wrapper **selects a credential per invocation**, can **round-robin** across many parallel processes, and on **retriable** errors can **retry the same argv** with the next credential in your pool.

**Use it when** you have multiple org accounts, keys, or “slots,” and you want a single, familiar CLI surface: same flags as upstream, with rotation and failover at the process boundary.

**Do not** commit real secrets. Prefer env injection in CI, or a local accounts file with restricted permissions.

## What you get

- **Key chain:** `MULTIAUTH_API_KEY` / `MULTIAUTH_API_KEYS`, optional JSON accounts when `MULTIAUTH_CONFIG=1` or `MULTIAUTH_CONFIG_PATH` is set (default file: `~/.cli-multiauth/accounts.json`).
- **Load spreading:** optional **round-robin** for the *first* key per new OS process (file-locked counter under `~/.cli-multiauth/round-robin/`). Disable with `MULTIAUTH_RR=0` or `CLI_MULTIAUTH_RR=0`.
- **Failover:** on **recoverable** output (see `isRetryableApiFailure` in `src/classify.ts` or your adapter override), the wrapper re-runs the child on the next key. Each retry is a **new** child process.
- **Library + bins:** `import` from this package, or use `multiauth` (prints pointers) and `multiauth-accounts` to edit the shared accounts JSON (names/keys; optional `email` as metadata only).

**Limitation:** a retry is a new run of the child. Long-running or stateful work is not migrated between credentials automatically.

## Public env (no third-party prefix)

| Variable | Role |
|----------|------|
| `MULTIAUTH_API_KEY` | First key, or override when using a file |
| `MULTIAUTH_API_KEYS` | Extra keys (comma- or space-separated) |
| `MULTIAUTH_CONFIG` | Set `1` to use the accounts file path |
| `MULTIAUTH_CONFIG_PATH` | Explicit path to accounts JSON (implies file mode) |
| `MULTIAUTH_VERBOSE` | `1` for per-attempt key logging |
| `MULTIAUTH_RR` | `0` to disable round-robin |

## Integrating a CLI

See **[docs/INTEGRATION.md](docs/INTEGRATION.md)**. Implement a `CliAdapter` and call `runClWithMultiauth` from the package root export or `multiauth-cli/wrapper/run`.

## Examples in this repo

The **[examples/](examples/)** folder has a **mock “upstream”** and a small runner that uses the built `dist/` files. **Vendor-specific** wiring (real upstream CLIs) belongs in a **private** `local/` directory: copy the examples there, add dependencies, and add `local/` to your global gitignore (this repo already ignores it).

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
