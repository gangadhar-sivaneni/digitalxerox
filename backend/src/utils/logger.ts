/* Small structured logger. Never logs passwords, tokens or secrets. */
/* eslint-disable no-console */

function ts(): string {
  return new Date().toISOString();
}

export const logger = {
  info(msg: string, meta?: unknown): void {
    console.log(`[${ts()}] INFO  ${msg}${meta ? " " + stringify(meta) : ""}`);
  },
  warn(msg: string, meta?: unknown): void {
    console.warn(`[${ts()}] WARN  ${msg}${meta ? " " + stringify(meta) : ""}`);
  },
  error(msg: string, meta?: unknown): void {
    console.error(`[${ts()}] ERROR ${msg}${meta ? " " + stringify(meta) : ""}`);
  },
};

function stringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}