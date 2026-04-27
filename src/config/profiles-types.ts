/**
 * On-disk profile file (YAML or TOML), version 1.
 * See examples/profiles.example.yaml and examples/profiles.example.toml
 */
export type UpstreamNodeModule = {
  type: "node_module";
  /** npm package name as resolvable from this install. */
  package: string;
  /** Relative to package root; default from package.json "main" or "dist/index.js". */
  main?: string;
};

export type UpstreamPath = {
  type: "path";
  /** Absolute or cwd-relative path to a Node entry script. */
  file: string;
};

export type UpstreamExec = {
  type: "exec";
  /** First token to spawn (e.g. npx, bash). */
  command: string;
  /** Inserted before user argv (e.g. ["-y", "pkg-name"]). */
  args_prefix: string[];
};

export type UpstreamSpec = UpstreamNodeModule | UpstreamPath | UpstreamExec;

export type ChildEnvSpec = {
  /** Single env var the child sees for the current pool key. */
  primary_env: string;
  /** Optional list var removed from the child env (pool list). */
  list_env?: string;
  /** Extra env keys to delete in the child (secrets / pool noise). */
  strip_env?: string[];
};

export type ProfileSpecV1 = {
  rr_id: string;
  log_prefix: string;
  /** Shown when no pool keys; default if omitted. */
  no_keys_message?: string;
  child: ChildEnvSpec;
  upstream: UpstreamSpec;
  retry?: {
    /** Case-insensitive substring extra checks (merged with built-in heuristics). */
    extra_substrings?: string[];
  };
};

export type ProfilesFileV1 = {
  version: 1;
  /** Reserved for future use (key env names, etc.). */
  defaults?: Record<string, unknown>;
  profiles: Record<string, ProfileSpecV1>;
};
