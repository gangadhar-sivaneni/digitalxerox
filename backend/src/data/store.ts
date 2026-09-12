import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

/**
 * Minimal atomic JSON persistence layer.
 *
 * This is the local development / MVP store. It is deliberately behind a tiny
 * repository API (see repo.ts) so that it can be replaced by DynamoDB later
 * without touching business logic.
 *
 * Writes are synchronous and serialized (single process), then flushed via a
 * write-to-temp + rename so a crash mid-write cannot corrupt the file. On
 * Windows/OneDrive the rename can hit a brief EPERM lock over the destination
 * file, so the commit retries and falls back to an in-place write rather than
 * dropping a store update (payment settlement must never 500 on a transient
 * OS-level file lock).
 */
export class JsonStore<T> {
  private file: string;
  private data: T;

  constructor(file: string, seed: () => T) {
    this.file = file;
    this.data = loadOrSeed<T>(file, seed);
  }

  get(): T {
    return this.data;
  }

  save(): void {
    const dir = path.dirname(this.file);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = this.file + ".tmp";
    const data = JSON.stringify(this.data, null, 2);
    writeRetrySync(tmp, data);
    commitWrite(tmp, this.file, data);
  }

  /** Replaces the whole store (used by the CLI seed command). */
  replace(next: T): void {
    this.data = next;
    this.save();
  }
}

const RETRYABLE = new Set(["EPERM", "EBUSY", "EACCES"]);
const MAX_ATTEMPTS = 5;

function isRetryable(err: unknown): boolean {
  return RETRYABLE.has((err as NodeJS.ErrnoException)?.code ?? "");
}

function sleepSync(ms: number): void {
  const stop = Date.now() + ms;
  while (Date.now() < stop) {
    // busy-wait — nothing else can run during a sync write anyway
  }
}

function writeRetrySync(file: string, data: string): void {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      fs.writeFileSync(file, data, "utf8");
      return;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
      sleepSync(attempt * 60);
    }
  }
  throw lastErr;
}

function commitWrite(tmp: string, file: string, data: string): void {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
      sleepSync(attempt * 60);
    }
  }
  logger.warn("Atomic rename blocked; writing store in place", {
    file,
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  });
  fs.rmSync(tmp, { force: true });
  writeRetrySync(file, data);
}

function loadOrSeed<T>(file: string, seed: () => T): T {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw) as T;
      logger.info("Store loaded", { file });
      return parsed;
    }
  } catch (err) {
    logger.error("Failed to load store file — will re-seed", {
      file,
      error: err instanceof Error ? err.message : String(err),
    });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.rmSync(file, { force: true });
  }
  const seeded = seed();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(seeded, null, 2), "utf8");
  logger.info("Store seeded", { file });
  return seeded;
}