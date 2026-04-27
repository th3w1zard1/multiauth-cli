export { runClWithMultiauth } from "./wrapper/run.js";
export type { CliAdapter, PrepareResult } from "./wrapper/types.js";
export {
  buildAttemptOrder,
  parseKeyList,
  resolveKeyChainAsync,
  type ResolvedKeyList,
  DEFAULT_ACCOUNTS_FILE,
} from "./keys.js";
export { acquireRrStartIndex, debugResetRrState } from "./round-robin.js";
export {
  hasHttpClientErrorStatus,
  isCreditPlanOrAuthExhausted,
  isRetriableLimitOrExhausted,
  isRetryableApiFailure,
} from "./classify.js";
export {
  MULT,
  isRoundRobinEnabled,
  defaultMultiauthVerbose,
} from "./env-config.js";
export { loadProfilesFile, ProfileLoadError } from "./config/load-profiles.js";
export { cliAdapterFromProfile } from "./config/adapter-profile.js";
export { defaultProfilesYamlPath, resolveProfilesFilePath } from "./config/paths.js";
export type { ProfilesFileV1, ProfileSpecV1, UpstreamSpec } from "./config/profiles-types.js";
