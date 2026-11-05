// Telegram Mini App auth: validate initData (HMAC-SHA256 keyed by the bot token)
// and expose the telegram user id on the request. Profiles and all data hang off
// this id, so every /api route (except health/img) requires it.
//
// initData arrives in the `Authorization: tma <initData>` header (or `X-Init-Data`).
// Validation per Telegram docs:
//   secret = HMAC_SHA256(key="WebAppData", data=bot_token)
//   expected_hash = HMAC_SHA256(key=secret, data=data_check_string)
// where data_check_string is the sorted "key=value" lines (minus `hash`), joined by "\n".

import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config";
import { ensureUser } from "./db";

declare module "fastify" {
  interface FastifyRequest {
    userId: number;
  }
}

const MAX_AGE_SECONDS = 24 * 60 * 60; // reject initData older than a day

function parseInitData(initData: string): { params: URLSearchParams; hash: string | null } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  return { params, hash };
}

export function validateInitData(initData: string, botToken: string): number | null {
  if (!initData || !botToken) return null;
  const { params, hash } = parseInitData(initData);
  if (!hash) return null;

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  // constant-time compare
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "null");
    return user && typeof user.id === "number" ? user.id : null;
  } catch {
    return null;
  }
}

/** Fastify preHandler: resolve req.userId or reply 401. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Local dev escape hatch — never enable in production.
  if (config.devAuthBypass) {
    req.userId = config.devUserId;
    ensureUser(req.userId);
    return;
  }

  const header = (req.headers["authorization"] as string | undefined) ?? "";
  const initData =
    (header.toLowerCase().startsWith("tma ") ? header.slice(4) : "") ||
    (req.headers["x-init-data"] as string | undefined) ||
    "";

  const userId = validateInitData(initData, config.botToken);
  if (!userId) {
    reply.code(401).send({ error: "unauthorized", message: "Invalid Telegram initData." });
    return;
  }
  req.userId = userId;
  ensureUser(userId);
}
