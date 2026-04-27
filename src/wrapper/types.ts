export type PrepareResult = {
  env: NodeJS.ProcessEnv;
  /** Always call after the child process exits. */
  cleanup: () => Promise<void>;
};

export type CliAdapter = {
  /**
   * Short name for logging only (e.g. "acme" or "demo-mock"). Does not
   * affect which env keys are read: key resolution is always
   * `resolveKeyChainAsync` / `MULTIAUTH_*` (see `src/keys.ts`).
   */
  id: string;
  /**
   * Round-robin state is keyed by this (files under
   * `~/.cli-multiauth/round-robin/{rrProfile}.json`). Use a stable id per
   * wiring / upstream so parallel runs of different CLIs do not share one
   * counter unless you want that.
   */
  rrProfile: string;
  /**
   * Build a child `process.env` and optional per-run temp home or config files
   * if the upstream only reads from disk.
   */
  prepareRun: (apiKey: string) => Promise<PrepareResult>;
  resolveChildEntry: () => string;
  /** If omitted, uses `isRetryableApiFailure` from `classify.ts`. */
  isRetryable?: (exitCode: number, combinedOut: string) => boolean;
  /**
   * If set, used as the spawn `command` instead of `node` to run the upstream
   * entry (e.g. when the upstream bundle is not a plain Node script).
   */
  getSpawnCommand?: () => string;
  multiauthVerbose: () => boolean;
  logPrefix: string;
  noKeysMessage: string;
};
