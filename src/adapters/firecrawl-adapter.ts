import { resolveFirecrawlCliEntry } from "../firecrawl-cli-path.js";
import type { CliAdapter } from "../wrapper/types.js";
import { defaultMultiauthVerbose } from "../env-config.js";

const PRIMARY = "FIRECRAWL_API_KEY";
const LIST = "FIRECRAWL_API_KEYS";

function stripForChild(
  base: NodeJS.ProcessEnv,
  primaryEnv: string,
  apiKey: string,
): NodeJS.ProcessEnv {
  const o = { ...base } as NodeJS.ProcessEnv;
  o[LIST] = undefined;
  delete o[LIST];
  o[primaryEnv] = apiKey;
  return o;
}

export function getFirecrawlAdapter(): CliAdapter {
  return {
    id: "firecrawl",
    rrProfile: "firecrawl",
    logPrefix: "multiauth-firecrawl",
    noKeysMessage:
      "No API keys: set MULTIAUTH_API_KEY / MULTIAUTH_API_KEYS or MULTIAUTH_CONFIG (+ accounts file). See multiauth-cli README.",
    multiauthVerbose: defaultMultiauthVerbose,
    resolveChildEntry: () => resolveFirecrawlCliEntry(),
    prepareRun: async (apiKey) => ({
      env: stripForChild(process.env, PRIMARY, apiKey),
      cleanup: async () => undefined,
    }),
  };
}
