// All /api routes. Authenticated routes use the requireUser preHandler; health
// and the image placeholder are public.

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AnalyzeRequest, Profile, RestrictionId } from "@foodguard/shared";
import { DISCLAIMER } from "@foodguard/shared";
import { config } from "../config";
import { requireUser } from "../auth";
import { placeholderSvg } from "../img";
import { lookupBarcode } from "../off";
import { catalog, filterSafe } from "../catalog";
import { analyze } from "../ai/analyze";
import { extractIngredientsFromImage } from "../ai/vision";
import { parseChatQuery } from "../ai/chat";
import { crowdRepo, diaryRepo, profilesRepo, scansRepo, subsRepo } from "../db";

/** Guard for Prisma+ features (AI / catalog). Free call -> 402 + paywall flag. */
async function requirePremium(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!subsRepo.isPremium(req.userId)) {
    reply.code(402).send({ error: "premium_required", plan: "prisma_plus" });
  }
}

export async function registerRoutes(app: FastifyInstance) {
  // ---- Public ----------------------------------------------------------------
  app.get("/api/health", async () => ({ ok: true, catalog: config.catalogProvider, disclaimer: DISCLAIMER }));

  app.get<{ Params: { seed: string } }>("/api/img/:seed", async (req, reply) => {
    reply.header("Content-Type", "image/svg+xml").header("Cache-Control", "public, max-age=86400");
    return placeholderSvg(decodeURIComponent(req.params.seed));
  });

  // ---- Authenticated ---------------------------------------------------------
  app.register(async (api) => {
    api.addHook("preHandler", requireUser);

    // Account + subscription (FREE)
    api.get("/api/me", async (req) => ({
      userId: req.userId,
      isPremium: subsRepo.isPremium(req.userId),
      subscription: subsRepo.get(req.userId),
    }));

    // DEMO checkout — flips the user to Prisma+ with no real payment.
    // TODO: replace with real billing (Telegram Stars / ЮKassa).
    api.post("/api/subscribe", async (req) => {
      subsRepo.activateDemo(req.userId);
      return { isPremium: true, subscription: subsRepo.get(req.userId) };
    });
    api.post("/api/unsubscribe", async (req) => {
      subsRepo.cancel(req.userId);
      return { isPremium: false };
    });

    // Profiles (FREE, unlimited)
    api.get("/api/profiles", async (req) => ({ profiles: profilesRepo.list(req.userId) }));

    api.post<{ Body: Profile }>("/api/profiles", async (req) =>
      ({ profile: profilesRepo.create(req.userId, req.body) }));

    api.put<{ Params: { id: string }; Body: Profile }>("/api/profiles/:id", async (req, reply) => {
      const updated = profilesRepo.update(req.userId, Number(req.params.id), req.body);
      if (!updated) return reply.code(404).send({ error: "not_found" });
      return { profile: updated };
    });

    api.delete<{ Params: { id: string } }>("/api/profiles/:id", async (req) =>
      ({ deleted: profilesRepo.remove(req.userId, Number(req.params.id)) }));

    // Product by barcode (OFF proxy + cache)
    api.get<{ Params: { barcode: string } }>("/api/product/:barcode", async (req) =>
      lookupBarcode(req.params.barcode));

    // Analyze a composition against profiles (deterministic + Claude)
    api.post<{ Body: AnalyzeRequest & { barcode?: string; productName?: string; imageUrl?: string; save?: boolean } }>(
      "/api/analyze",
      async (req) => {
        const { ingredients, profiles, barcode, productName, imageUrl, save } = req.body;
        // FREE -> deterministic dictionary only; Prisma+ -> deep Claude pass too.
        const useAI = subsRepo.isPremium(req.userId);
        const result = await analyze(ingredients ?? [], profiles ?? [], { useAI });
        if (save !== false) {
          scansRepo.add(req.userId, {
            source: barcode ? "barcode" : "photo",
            barcode, productName, imageUrl,
            ingredients: ingredients ?? [], results: result.results,
          });
        }
        return result;
      },
    );

    // Vision: extract composition from a label photo (base64) — PRISMA+
    api.post<{ Body: { imageBase64: string; mediaType?: "image/jpeg" | "image/png" | "image/webp" } }>(
      "/api/scan-photo",
      { preHandler: requirePremium },
      async (req, reply) => {
        const { imageBase64, mediaType } = req.body ?? {};
        if (!imageBase64) return reply.code(400).send({ error: "no_image" });
        const b64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
        return extractIngredientsFromImage(b64, mediaType);
      },
    );

    // Safe substitutions: category + exclusions -> filtered cards — PRISMA+
    api.post<{ Body: { category: string; excludeAllergens?: RestrictionId[]; excludeCustom?: string; limit?: number } }>(
      "/api/alternatives",
      { preHandler: requirePremium },
      async (req) => {
        const { category, excludeAllergens = [], excludeCustom, limit } = req.body ?? ({} as any);
        const candidates = await catalog.searchByCategory(category ?? "", { limit, excludeAllergens, excludeCustom });
        const products = filterSafe(candidates, excludeAllergens, excludeCustom);
        return { products, disclaimer: DISCLAIMER };
      },
    );

    // Chat filter: free text -> structured query -> filtered cards + facts reply — PRISMA+
    api.post<{ Body: { message: string } }>("/api/chat", { preHandler: requirePremium }, async (req, reply) => {
      const message = (req.body?.message ?? "").trim();
      if (!message) return reply.code(400).send({ error: "empty" });
      const query = await parseChatQuery(message);
      const candidates = await catalog.searchByCategory(query.category, {
        excludeAllergens: query.excludeAllergens, excludeCustom: query.excludeCustom,
      });
      const products = filterSafe(candidates, query.excludeAllergens, query.excludeCustom);
      scansRepo.add(req.userId, {
        source: "chat", productName: message,
        ingredients: [], results: [],
      });
      return { query, products, reply: query.reply, disclaimer: DISCLAIMER };
    });

    // History
    api.get("/api/history", async (req) => ({ scans: scansRepo.list(req.userId) }));

    // Diary
    api.get("/api/diary", async (req) => ({ entries: diaryRepo.list(req.userId) }));
    api.post<{ Body: { profileId?: number; productName: string; reaction: string; note?: string } }>(
      "/api/diary",
      async (req, reply) => {
        const b = req.body;
        if (!b?.productName || !b?.reaction) return reply.code(400).send({ error: "invalid" });
        return { id: diaryRepo.add(req.userId, b) };
      },
    );

    // Crowdsource: add/correct a composition (also backfills the cache)
    api.post<{ Body: { barcode?: string; productName?: string; ingredients: string[] } }>(
      "/api/crowd",
      async (req, reply) => {
        const b = req.body;
        if (!b?.ingredients?.length) return reply.code(400).send({ error: "no_ingredients" });
        return { id: crowdRepo.add(req.userId, b) };
      },
    );
  });
}
