# Wrap `firecrawl` search (multiauth + profile)

This guide is for people who are new to **multiauth-cli** and want a concrete path: run **[firecrawl-cli](https://www.npmjs.com/package/firecrawl-cli)** (command `npx -y firecrawl-cli` or a local `node_modules` install) **through the wrapper** so the same `search` (and `scrape`, `crawl`, etc.) you already know gets **one API key at a time**, optional **round-robin** across keys, and **retries** when the process output looks like a recoverable API failure.

You need a key from the Firecrawl product you use: create one in the [Firecrawl app](https://firecrawl.dev) and treat it like any other API secret.

## What you will have at the end

- A **profile** (YAML) that points `upstream` at the `firecrawl-cli` package and sets `child.primary_env` to `FIRECRAWL_API_KEY` (what the CLI reads).
- Your **pool of keys** supplied the usual multiauth way: `MULTIAUTH_API_KEY`, `MULTIAUTH_API_KEYS`, and/or a JSON file via `MULTIAUTH_CONFIG_PATH` (see the repository [README.md](../../README.md)). The wrapper injects the **active** key into `FIRECRAWL_API_KEY` for that process.
- A command line that is **identical to the upstream** after the profile, for example:

```bash
# Same flags as: npx -y firecrawl-cli search …
node dist/run-config-cli.js --profile fc_search search "example query" --limit 2 --json
# or, after a shim:   u --profile fc_search search "…"  …
```

## 1) Clone, install, build

From a clone of this repository:

```bash
npm install
npm run build
```

## 2) Install the Firecrawl CLI in this project

**Option A — local dev (recommended in this walkthrough, reproducible in CI)**

```bash
npm i -D firecrawl-cli@1.16.0
```

(You may use another version; keep it pinned if you need stability.)

**Option B — `npx` on every run**

Use a profile of type `exec` with `command: npx` and `args_prefix: ["-y", "firecrawl-cli@1.16.0"]` instead of `node_module` (slower first run, no `package.json` entry). The repository ships the **node_module** example in [examples/profiles.firecrawl.example.yaml](../../examples/profiles.firecrawl.example.yaml); copy it and only switch `upstream` if you prefer `exec`.

## 3) Add the example profile to the config path the CLI reads

Default profile file: **`~/.config/multiauth/profiles.yaml`** (on Windows, `%USERPROFILE%\.config\multiauth\profiles.yaml`).

- Copy the contents of [examples/profiles.firecrawl.example.yaml](../../examples/profiles.firecrawl.example.yaml) into that file (merge the `fc_search` profile with your other profiles if you already have a file), **or** set the env var to point at the example file in the clone:

  ```bash
  # Bash (for this shell only)
  export MULTIAUTH_PROFILES_FILE=/absolute/path/to/multiauth-cli/examples/profiles.firecrawl.example.yaml
  ```

  ```powershell
  # Windows PowerShell (this session)
  $env:MULTIAUTH_PROFILES_FILE = "C:\path\to\multiauth-cli\examples\profiles.firecrawl.example.yaml"
  ```

## 4) Set keys (one key is enough; two or more enable rotation and failover)

**Single key (quickest for a first test)**

```bash
export MULTIAUTH_API_KEY="your_firecrawl_key_here"
```

**Multiple keys (comma or space list)**

```bash
export MULTIAUTH_API_KEY="key_one"
export MULTIAUTH_API_KEYS="key_two,key_three"
```

The child process still only sees one key in **`FIRECRAWL_API_KEY`**. Do **not** commit keys; use a secret store or a local, gitignored file if you use `multiauth-accounts` / the accounts JSON (see the main [README.md](../../README.md) and [INTEGRATION.md](../INTEGRATION.md)).

## 5) Run a web search (proof)

**Important:** the arguments after the profile are passed **unchanged** to the Firecrawl CLI — here we use the `search` subcommand and a small `--limit` for a quick test.

```bash
node dist/run-config-cli.js --profile fc_search search "multiauth key rotation" --limit 1 --json
```

You should see **JSON (or an error) on stdout** from the upstream CLI, similar to a direct `npx -y firecrawl-cli search …` run, but with multiauth handling keys and optional retries. If the key is missing, you will see a short error and the `no_keys_message` from the profile.

### What success looks like

- Exit code `0` and a JSON object containing search result items (or an empty `data` if the product returns none).
- With `MULTIAUTH_VERBOSE=1`, the wrapper logs which pool entry it used (key masked), useful when debugging multiple keys.

### If it fails

| Symptom | What to check |
|--------|----------------|
| "No API keys" / similar | `MULTIAUTH_API_KEY` or the accounts file is empty or not loaded; see [README — Public environment](../../README.md). |
| 401 / unauthorized in stderr | The value in the pool is not a valid key for the API URL you are using. |
| Module not found for `firecrawl-cli` | Run `npm i -D firecrawl-cli` in the repo, or change the profile to `exec` + `npx` as in §2. |
| Slow first run with `npx` | Use **Option A** and `node_module` in the profile. |

## 6) Optional: declarative shims, PATH, and Cursor

If you also want a short command (for example `u` instead of the long `node dist/…` line) or a recorded uninstall:

- [docs/INSTALL.md](../INSTALL.md) — YAML install manifest, `apply-install.mjs`, `uninstall.mjs`, optional `.cursor` rule/plan handoff.
- The scripts do **not** reconfigure the Firecrawl **MCP** server; editor-hosted tools still use their own env ([HOSTS.md](../HOSTS.md)).

## 7) Example captured output (shape)

Search output shape depends on the product version. With `--json`, a typical result includes a `success` field and a list of `data` or similar (see the upstream CLI and API docs for the current schema). The block below is illustrative; run the command in §5 in your own environment to see a live response.

### E2E check in this repository

After `npm i -D firecrawl-cli@1.16.0` and `npm run build`, a full run of:

`node dist/run-config-cli.js --profile fc_search search "TypeScript language" --limit 1 --json` using `examples/profiles.firecrawl.example.yaml` and `MULTIAUTH_PROFILES_FILE` completed the **entire** chain: profile load → `node ./node_modules/.../dist/index.js` → `search` → upstream response. The API returned a **credits** message (exhausted or low balance), not a “missing key” error — that confirms **authentication and wiring**; with a funded account you should get `success: true` and result rows instead.

Example stderr-style line (wording from the product; do not treat as stable API):

`Error: Insufficient credits to perform this request. … (upgrade, or lower limits)`

```json
{
  "success": true,
  "data": [
    {
      "url": "https://…",
      "title": "…"
    }
  ]
}
```

---

**Summary:** `npm i -D firecrawl-cli` → add `fc_search` from the example profile → set `MULTIAUTH_API_KEY` (and optionally `MULTIAUTH_API_KEYS`) → run `node dist/run-config-cli.js --profile fc_search search "…" --json`. Use [README.md](../../README.md) and [docs/INSTALL.md](../INSTALL.md) for pools, shims, and removal.
