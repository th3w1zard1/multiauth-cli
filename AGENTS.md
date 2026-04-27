# Agent instructions

## No manual user steps (mandatory)

**Do not** tell the user to run commands, fix PATH, run installers, or copy-paste setup blocks themselves. The human should not be asked to perform terminal work, one-off setup, or "run this once" instructions.

- **You** (the agent) use the terminal and tools: run `npm install`, `npm run build`, `npm test`, execute `scripts/Install-FirecrawlShim.ps1` when needed, adjust environment variables in the session, verify with `Get-Command`, and report outcomes.
- **Exceptions:** Only when an action is impossible without human identity (e.g. typing a password into a third-party site, OAuth in browser) may you ask for the minimum human action, and only then—never for routine dev or repo setup.

**Never** output sections like "What you should run", "Run this in your terminal", or imperative setup checklists for the user to follow. If documentation in the repo lists how something works, keep it **descriptive** (what the script installs, which env vars exist), not a substitute for the agent doing the work in-session.

## Repository context

- This package: `multiauth-cli` — wrapper layer, `multiauth-firecrawl`, accounts helper, PowerShell PATH shim under `scripts/`.
- Favor: run from clone or `npx` where possible; do not require global install unless the task explicitly needs it and you can perform the install in the tool shell.

## Reference

- User rule alignment: a real environment with shell access—execute, don’t delegate setup to the user.
