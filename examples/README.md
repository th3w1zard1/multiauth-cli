# Examples

After `npm run build` from the repository root:

```bash
# Required: at least one key in the multiauth pool (space- or comma-separated)
set MULTIAUTH_API_KEYS=demo-one demo-two
node examples/run-upstream-mock.mjs
```

The mock upstream only checks that a token was injected; it does not call a remote service.

**Profile file:** copy **[profiles.example.yaml](profiles.example.yaml)** to `~/.config/multiauth/profiles.yaml` and replace placeholders with a real `node_module` name, a `path` entry, or an `exec` line. Then run `multiauth run --profile <name>` from a shell with pool keys in the environment.

**Private or product-specific** wiring: copy this folder into gitignored `local/`, add dependencies, and use the `CliAdapter` pattern in **[docs/INTEGRATION.md](../docs/INTEGRATION.md)** (or a YAML profile only, no new code).
