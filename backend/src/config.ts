import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// .env lives in the repo root, one level above /backend
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? "./data/foodguard.sqlite",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  webappUrl: process.env.WEBAPP_URL ?? "",
  catalogProvider: (process.env.CATALOG_PROVIDER ?? "mock") as "mock" | "vkusvill",
  devAuthBypass: process.env.DEV_AUTH_BYPASS === "true",
  devUserId: Number(process.env.DEV_USER_ID ?? 1),
};
