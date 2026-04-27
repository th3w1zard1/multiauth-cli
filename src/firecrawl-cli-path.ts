import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/**
 * Resolves the installed `firecrawl-cli` main entry (same as the global `firecrawl` bin).
 */
export function resolveFirecrawlCliEntry(): string {
  const pkgJson = require.resolve("firecrawl-cli/package.json");
  const root = dirname(pkgJson);
  return join(root, "dist", "index.js");
}
