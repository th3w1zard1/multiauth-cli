# Examples

After `npm run build` from the repo root:

```bash
# Required: at least one key in the multiauth chain (comma/space-separated)
set MULTIAUTH_API_KEYS=demo-one demo-two
node examples/run-upstream-mock.mjs
```

The mock upstream only checks that a token was injected; it does not call any vendor API.

For **Firecrawl**, this package already ships `multiauth-firecrawl` (and optional PATH shims via `scripts/Install-FirecrawlShim.ps1`). Keys: `MULTIAUTH_*` only; the child sees a single `FIRECRAWL_API_KEY` per attempt.

To experiment with another vendor in private, copy these files into gitignored `local/` and adapt the adapter pattern from `src/adapters/firecrawl-adapter.ts`.
