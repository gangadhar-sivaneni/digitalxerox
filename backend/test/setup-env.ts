import fs from "fs";
import os from "os";
import path from "path";

// Must run before app modules are imported: env.ts + repo.ts read these at
// import time, so tests get an isolated, fresh store instead of prod data.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-test-"));
process.env.DB_FILE = path.join(dir, "db.json");
process.env.DOC_STORAGE = path.join(dir, "docs");
process.env.JWT_SECRET = "test-secret-not-for-prod";
process.env.NODE_ENV = "test";
// Razorpay tests never touch the real gateway: force mock regardless of .env keys.
process.env.RAZORPAY_MOCK = "1";