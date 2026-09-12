import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..", "..");

/** Minimal .env loader (no external dependency). Never overrides real env vars. */
function loadDotEnv(): void {
  try {
    const file = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    for (const line of file.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // No .env file — rely on process.env only.
  }
}

loadDotEnv();

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? fallback : raw;
}

export const env = {
  NODE_ENV: str("NODE_ENV", "development"),
  PORT: num("PORT", 4000),
  API_PREFIX: str("API_PREFIX", "/api"),
  JWT_SECRET: str("JWT_SECRET", "dev-only-secret-change-me"),
  JWT_EXPIRES_IN: str("JWT_EXPIRES_IN", "7d"),
  DB_FILE: str("DB_FILE", path.join(ROOT, "storage", "db.json")),
  DOC_STORAGE: str("DOC_STORAGE", path.join(ROOT, "storage", "documents")),
  CORS_ORIGIN: str("CORS_ORIGIN", "*"),
  SHOP_CLOSED_MESSAGE: str("SHOP_CLOSED_MESSAGE", "The shop is currently closed."),
  RAZORPAY_KEY_ID: str("RAZORPAY_KEY_ID", ""),
  RAZORPAY_KEY_SECRET: str("RAZORPAY_KEY_SECRET", ""),
  RAZORPAY_API_BASE: str("RAZORPAY_API_BASE", "https://api.razorpay.com/v1"),
  RAZORPAY_WEBHOOK_SECRET: str("RAZORPAY_WEBHOOK_SECRET", ""),
  RAZORPAY_MOCK:
    str("RAZORPAY_MOCK", "") === "1"
      ? true
      : str("RAZORPAY_MOCK", "") === "0"
        ? false
        : !(str("RAZORPAY_KEY_ID", "") && str("RAZORPAY_KEY_SECRET", "")),
};

export { ROOT };