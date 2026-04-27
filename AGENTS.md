# Agent instructions

## No manual user steps (mandatory)

**Do not** ask the person to run commands, fix `PATH`, run installers, or paste one-off setup blocks. They should not be given terminal work, one-off setup, or “run this once” handoffs.

- **You** (the agent) use the tool shell: run `npm install`, `npm test`, `npm run build`, execute shims in `scripts/`, set session environment variables, verify with `Get-Command` where useful, and report what happened.
- **Exceptions:** Only when something requires human identity (a password, OAuth in a browser) may you ask for the **minimum** human action — never for routine project setup.

**Do not** emit sections like “What you should run” or checklists the human must type. Repository docs describe what scripts do; the agent is expected to run them, not the reader.

## Repository context

- Package name: `multiauth-cli` — pool + wrapper layer, `multiauth-accounts`, optional `multiauth` / `multiauth-run` and legacy bins, and generic installers under [scripts/install-shim.ps1](scripts/install-shim.ps1) and [scripts/install-shim.sh](scripts/install-shim.sh).
- Prefer: run from a clone or `npx` where the task allows; do not require a global install unless the task really needs it and the agent can do it in the tool shell.
- **PATH / shims:** When touching shim or PATH behavior, run `npm run build`, then `scripts/verify-shim.ps1` (or a targeted `install-shim.ps1` with concrete `-ShimName` and `-RunnerJs` arguments). Re-read user `PATH` from the process environment and confirm the intended shim is the one resolved. For a legacy `firecrawl` shim, `verify-shim` expects the related optional `optionalDependencies` entry to be present; otherwise use a `multiauth-run` or profile-based test instead.

## Learned user preferences

- For published documentation and package examples, keep copy generic; do not name example CLIs, credential product names, or third-party “credit” or quota product lines as if they were the core purpose of the tool.
- Favor a stable, deterministic setup story: the same `install-shim` inputs should yield the same artifact layout and PATH outcome.

## Learned workspace facts

- When a wrapped process returns 4xx-style or known retriable child output, the multiauth layer is expected to try the next member of the key pool when one is available.
- First-party setup scripts in `scripts/` are intended to be idempotent: repeat runs are safe and should not add duplicate PATH entries when the same bin directory is already in front of `PATH` for the user or session.
- User rule alignment: a real environment with shell access—execute, do not hand setup back to the user for routine work.

## Reference

- [README.md](README.md) and [docs/INTEGRATION.md](docs/INTEGRATION.md) for the public contract.
