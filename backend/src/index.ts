import fs from "fs";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

for (const dir of [env.DB_FILE, env.DOC_STORAGE]) {
  const target = dir.endsWith(".json")
    ? dir.slice(0, dir.lastIndexOf("/"))
    : dir;
  fs.mkdirSync(target, { recursive: true });
}

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Digital Xerox API ready → http://localhost:${env.PORT}${env.API_PREFIX}`);
});

