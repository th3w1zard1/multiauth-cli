import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

const OPTIONAL_PKG = "firecrawl-cli";

/**
 * Resolves the optional `firecrawl-cli` main entry, if installed
 * (optionalDependencies). If missing, throws with a hint to install it or
 * use `multiauth run` with a profile pointing at another module or path.
 */
export function resolveFirecrawlCliEntry(): string {
  try {
    const pkgJson = require.resolve(`${OPTIONAL_PKG}/package.json`);
    const root = dirname(pkgJson);
    return join(root, "dist", "index.js");
  } catch {
    throw new Error(
      `Optional module "${OPTIONAL_PKG}" is not installed. ` +
        `From this package: npm i ${OPTIONAL_PKG}, or use multiauth run with a profile that targets a different node_module, path, or exec upstream (see examples/profiles.example.yaml).`,
    );
  }
}
