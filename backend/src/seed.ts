import fs from "fs";
import { env } from "./config/env";
import { replaceStore } from "./data/repo";
import { logger } from "./utils/logger";

fs.rmSync(env.DOC_STORAGE, { recursive: true, force: true });
fs.mkdirSync(env.DOC_STORAGE, { recursive: true });
const db = replaceStore();
logger.info(`Seeded store: ${db.users.length} users, ${db.orders.length} orders, ${db.payments.length} payments`);