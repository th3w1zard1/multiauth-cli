# Declarative wrapper install + Cursor

This is a **workspace plan outline** (documentation). It is not an executable “Cursor plan” in the product sense, but a checklist you or an agent can follow to keep the shell, profile file, and optional project artifacts in sync.

## Objectives

1. **One profile file** (YAML or TOML) describing: upstream `node_module` / `path` / `exec`, the child’s credential env, optional retry substrings.
2. **Shims** on the user’s PATH that call the built `run-config-cli.js` (or `multiauth run`) so all terminal runs get pool + failover.
3. **Optional** project files under `.cursor/`: a rule, this plan, and a handoff doc for **merging** MCP/IDE settings manually (MCP are separate processes; see `docs/HOSTS.md`).

## Steps

- Run the repo `setup` script with a **declarative** config, or the legacy one-shot: `setup.ps1` / `setup.sh` (see [README.md](../../README.md)).
- Edit the installed profile file (e.g. under `~/.config/multiauth/`) to point `upstream` at the real child CLI; never commit real secrets.
- Re-run setup after `git pull` to rebuild; install config should stay idempotent.
- To remove shims and recorded Cursor artifacts, run `uninstall.ps1` / `uninstall.sh` (state file under the config directory).

## Rollback

- [docs/INSTALL.md](../../docs/INSTALL.md) — uninstall, PATH, and which files are tracked in `install-state.json`.
