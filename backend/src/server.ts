import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config";
import { getDb } from "./db";
import { registerRoutes } from "./routes";
import { startBot } from "./bot";

const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 }); // 8MB for base64 label photos

await app.register(cors, { origin: true });

getDb(); // open connection + apply schema on boot
await registerRoutes(app);

await app.listen({ port: config.port, host: "0.0.0.0" });
app.log.info(`FoodGuard API on :${config.port} (catalog=${config.catalogProvider}, devBypass=${config.devAuthBypass})`);

startBot();
