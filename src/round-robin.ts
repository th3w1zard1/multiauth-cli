import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { lock } from "proper-lockfile";

const STATE_DIR = () => join(homedir(), ".cli-multiauth", "round-robin");

function stateFilePath(profile: string): string {
  const safe = profile.replace(/[^a-z0-9_-]/gi, "_");
  return join(STATE_DIR(), `${safe}.json`);
}

export interface RrState {
  seq: number;
}

/**
 * Picks a starting key index in `0..keyCount-1` (round-robin) and atomically
 * advances a shared monotonic counter on disk. Parallel processes serialize on
 * the per-profile file lock; each acquire is O(1) with short waits.
 */
export async function acquireRrStartIndex(
  profile: string,
  keyCount: number,
): Promise<number> {
  if (keyCount <= 0) return 0;
  if (keyCount === 1) return 0;

  await mkdir(STATE_DIR(), { recursive: true });
  const path = stateFilePath(profile);
  if (!(await fileExists(path))) {
    await writeFile(path, `{"seq":0}\n`, "utf8");
  }

  const release = await lock(path, {
    retries: {
      retries: 20,
      minTimeout: 50,
      maxTimeout: 2000,
    },
  });
  try {
    let state: RrState = { seq: 0 };
    try {
      const raw = await readFile(path, "utf8");
      state = JSON.parse(raw) as RrState;
    } catch {
      /* new file */
    }
    if (typeof state.seq !== "number" || !Number.isFinite(state.seq) || state.seq < 0) {
      state.seq = 0;
    }
    const start = state.seq % keyCount;
    state.seq += 1;
    await writeFile(path, JSON.stringify(state, null, 2) + "\n", "utf8");
    return start;
  } finally {
    await release();
  }
}

/** @internal for tests: reset or read state (no lock) */
export async function debugResetRrState(profile: string): Promise<void> {
  const path = stateFilePath(profile);
  try {
    await rm(path, { force: true });
    await rm(`${path}.lock`, { force: true });
  } catch {
    /* */
  }
}

async function fileExists(f: string): Promise<boolean> {
  try {
    await stat(f);
    return true;
  } catch {
    return false;
  }
}
