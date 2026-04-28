# Declarative install and uninstall

## Install (YAML)

After `npm run build` (or via `setup`), you can install **multiple shims**, optional default profile copy, and optional **Cursor** workspace files from one **YAML** manifest. See [examples/install.example.yaml](../examples/install.example.yaml) (copy and edit) or the minimal, **PATH-skipping** sample [examples/install.minimal.example.yaml](../examples/install.minimal.example.yaml) for smoke/CI. Keep any secret material out of version control.

- **Node:** `node scripts/apply-install.mjs path/to/install.yaml [package_root]` (default `package_root` = current working directory, or pass the clone root as the second argument).
- **Package.json:** `npm run apply-install -- path/to/install.yaml` (adds `--` before the file path; same working-directory rule as above).
- **Windows:** `pwsh -NoProfile -File scripts/setup.ps1 -Config path\\to\\install.yaml`
- **Unix / Git Bash:** `bash scripts/setup.sh --config path/to/install.yaml` or `MULTIAUTH_INSTALL_CONFIG=path/to/install.yaml bash scripts/setup.sh [repo_root]`

The run writes **`~/.config/multiauth/install-state.json`** (XDG: `$XDG_CONFIG_HOME/multiauth/…` on Unix) so a later **uninstall** can remove the same shims, PATH changes (Windows), optional Unix `path-export` script, and any generated Cursor files.

### `path` and `bin_dir`

- **Windows, `path.mode: prepend`:** the User `Path` is updated in the same way as [install-shim.ps1](../scripts/install-shim.ps1) (idempotent: no duplicate first segment).
- **Unix, `path.mode: prepend`:** a small `path-export.sh` is written (default: `~/.config/multiauth/path-export.sh`). **Source** it in your shell or merge its `export PATH=…` into your profile. The install script does not auto-edit `~/.bashrc` (avoids non-idempotent diffs to personal dotfiles).
- **Skip PATH:** set `path.mode: skip` to only write shims; add `~/.multiauth-cli/bin` to `PATH` yourself.
- **Custom bin directory:** set `bin_dir` in the YAML to an absolute path or a path under the package root when you need a non-default layout.

### Cursor: rules, plan doc, MCP handoff

`cursor.enabled: true` in the manifest copies templates (with simple `{{PLACEHOLDER}}` replacement for paths and shim names) to:

- **Rule:** default `.cursor/rules/multiauth-cli.mdc` (tune the agent to prefer your shell wrapper for spawned CLIs; it does not change host MCP or extension code paths).
- **Plan:** default `.cursor/plans/multiauth-wrapper.plan.md` (documentation / checklist, not a product-executable “plan” object).
- **MCP handoff:** a markdown file under the chosen `out_dir` explaining that MCP processes need their own config; use it as a **manual** merge note with your IDE’s MCP JSON.

[HOSTS.md](HOSTS.md) still applies: editor-embedded or MCP tool traffic is **not** the same as a `PATH` shim.

## Uninstall

- **Node:** `node scripts/uninstall.mjs` (reads the default `install-state.json`), or `node scripts/uninstall.mjs /path/to/saved/install-state.json`.
- **Package.json:** `npm run uninstall:recorded`
- **Wrapper scripts:** [uninstall.ps1](../scripts/uninstall.ps1) (Windows) or [uninstall.sh](../scripts/uninstall.sh) (Unix).

**Legacy** installs that only used `setup` without a YAML (single shim) **do not** create `install-state.json`. Remove the shim from `~/.multiauth-cli/bin` and adjust your `PATH` manually on Windows, or delete the `*.cmd` / `*.ps1` (or the Unix no-extension shim) the installer created by hand.

## Re-running and idempotence

- Re-running the **same** YAML rewrites the same shims, touches the same `path-export` and Cursor outputs, and overwrites the **state** file with a fresh manifest of what to remove on uninstall.
- Changing `shim` names in the YAML without uninstalling may leave old shim names on disk; use **uninstall** first, or remove stale files in `bin_dir` yourself.
