# Examples

After `npm run build` from the repo root:

```bash
# Required: at least one key in the multiauth chain (comma/space-separated)
set MULTIAUTH_API_KEYS=demo-one demo-two
node examples/run-upstream-mock.mjs
```

The mock upstream only checks that a token was injected; it does not call any vendor API.

For a **real** CLI (e.g. Firecrawl), copy these files into gitignored `local/`, add `firecrawl-cli` as a **local** dependency, resolve the real entry with `createRequire`, and in `prepareRun` set `FIRECRAWL_API_KEY` (and strip `FIRECRAWL_API_KEYS` / multiauth metadata) while keys still come from `MULTIAUTH_*` + optional accounts file.
