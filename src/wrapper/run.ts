import { spawn } from "node:child_process";
import { acquireRrStartIndex } from "../round-robin.js";
import { isRoundRobinEnabled } from "../env-config.js";
import { buildAttemptOrder, resolveKeyChainAsync } from "../keys.js";
import type { CliAdapter } from "./types.js";
import { isRetryableApiFailure } from "../classify.js";

function maskKey(k: string): string {
  if (k.length <= 8) return "****";
  return `${k.slice(0, 3)}...${k.slice(-4)}`;
}

/**
 * Tries keys in an order: round-robin start index (when enabled), then the rest
 * in order for retriable failures. Full process restart for each key attempt.
 */
export async function runClWithMultiauth(
  adapter: CliAdapter,
  argv: string[],
): Promise<number> {
  const { keys, source } = await resolveKeyChainAsync();
  if (keys.length === 0) {
    console.error(adapter.noKeysMessage);
    return 1;
  }

  const V = () => adapter.multiauthVerbose();
  const n = keys.length;
  const rr = isRoundRobinEnabled(n);
  const start = rr
    ? await acquireRrStartIndex(adapter.rrProfile, n)
    : 0;
  const order = buildAttemptOrder(keys, start);

  if (V()) {
    console.error(
      `[${adapter.logPrefix}] key source: ${source}, count=${n}, rr=${rr} startIndex=${start} profile=${adapter.rrProfile}`,
    );
  }

  const childEntry = adapter.resolveChildEntry();
  const spawnCommand = adapter.getSpawnCommand?.() ?? process.execPath;
  const shouldRetry = adapter.isRetryable ?? isRetryableApiFailure;

  for (let j = 0; j < order.length; j++) {
    const apiKey = order[j]!;
    const { env, cleanup } = await adapter.prepareRun(apiKey);
    try {
      if (V()) {
        console.error(
          `[${adapter.logPrefix}] try key ${j + 1}/${n} (${maskKey(apiKey)})`,
        );
      }

      const outParts: string[] = [];
      const errParts: string[] = [];

      const result = await new Promise<{ code: number; combined: string }>(
        (resolve, reject) => {
          const child = spawn(spawnCommand, [childEntry, ...argv], {
            env,
            stdio: ["inherit", "pipe", "pipe"],
            shell: false,
          });
          child.stdout?.on("data", (b: Buffer) => {
            outParts.push(b.toString());
            process.stdout.write(b);
          });
          child.stderr?.on("data", (b: Buffer) => {
            errParts.push(b.toString());
            process.stderr.write(b);
          });
          child.on("error", reject);
          child.on("close", (code, signal) => {
            let exit = code;
            if (code === null || code === undefined) {
              exit = signal ? 1 : 0;
            }
            const combined = outParts.join("") + errParts.join("");
            resolve({ code: exit as number, combined });
          });
        },
      );

      if (result.code === 0) {
        return 0;
      }
      if (!shouldRetry(result.code, result.combined) || j === order.length - 1) {
        return result.code;
      }
      if (V()) {
        console.error(
          `[${adapter.logPrefix}] retriable error; trying next key if available`,
        );
      } else if (n > 1) {
        console.error(
          `[${adapter.logPrefix}] this credential failed (credits, auth, or rate limits); ` +
            `trying key ${j + 2}/${n}. Set MULTIAUTH_VERBOSE=1 for details.`,
        );
      }
    } finally {
      await cleanup();
    }
  }
  throw new Error("unreachable");
}
