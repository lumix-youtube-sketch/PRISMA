// (2) Analyze: match a composition against profiles and return strict JSON.
//
// Two layers:
//   1. Deterministic — the shared allergen dictionary. Every hit here is a hard,
//      explainable fact and is always included in the result.
//   2. Claude — fills in what the dictionary cannot catch (unusual wording,
//      compound/derivative names, transliterations) and writes plain-language,
//      facts-only explanations per profile.
//
// Final verdict per profile:
//   unsafe  — at least one direct allergen hit (deterministic, or Claude "direct")
//   caution — only indirect/trace possibilities ("может содержать следы", unclear)
//   safe    — nothing matched
//
// We never let Claude downgrade a deterministic hit: facts win.

import type Anthropic from "@anthropic-ai/sdk";
import type {
  AnalyzeResponse, Hit, Profile, ProfileResult, RestrictionId, Verdict,
} from "@foodguard/shared";
import { ALLERGEN_DICTIONARY, DISCLAIMER, matchIngredients } from "@foodguard/shared";
import { aiConfigured, callTool } from "./client";

const TOOL: Anthropic.Messages.Tool = {
  name: "report_analysis",
  description: "Вернуть результат сверки состава с ограничениями по каждому профилю.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            profileName: { type: "string" },
            verdict: { type: "string", enum: ["safe", "caution", "unsafe"] },
            hits: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ingredient: { type: "string", description: "Ингредиент из состава, который сработал." },
                  matchedRestriction: { type: "string", description: "Под какое ограничение он подпал." },
                  reason: { type: "string", description: "Короткий факт, почему (например: казеин — молочный белок)." },
                  severity: { type: "string", enum: ["direct", "trace"], description: "direct — прямой аллерген; trace — возможные следы/косвенно." },
                },
                required: ["ingredient", "matchedRestriction", "reason", "severity"],
              },
            },
            explanation: { type: "string", description: "Короткое объяснение простым языком. ТОЛЬКО факты о составе." },
          },
          required: ["profileName", "verdict", "hits", "explanation"],
        },
      },
    },
    required: ["results"],
  },
};

interface ClaudeHit extends Hit { severity: "direct" | "trace" }
interface ClaudeResult { profileName: string; verdict: Verdict; hits: ClaudeHit[]; explanation: string }
interface ClaudeResponse { results: ClaudeResult[] }

function activeRestrictionLabels(r: RestrictionId[]): string {
  return r.map((id) => `${id} (${ALLERGEN_DICTIONARY[id].label})`).join(", ") || "—";
}

function deterministicHits(ingredients: string[], p: Profile): Hit[] {
  return matchIngredients(ingredients, p.restrictions).map((h) => ({
    ingredient: h.ingredient,
    matchedRestriction: h.label,
    reason: `«${h.ingredient}» относится к ограничению «${h.label}».`,
  }));
}

/** Merge Claude's hits into the deterministic set, de-duplicating by ingredient+restriction. */
function mergeHits(base: Hit[], extra: ClaudeHit[]): { hits: Hit[]; hasDirect: boolean } {
  // Dedup by ingredient only: a deterministic hit (clean label) wins over Claude's
  // restatement of the same ingredient, so each triggered ingredient is listed once.
  const key = (ing: string) => ing.trim().toLowerCase().replace(/ё/g, "е");
  const seen = new Set(base.map((h) => key(h.ingredient)));
  const hits = [...base];
  let hasDirect = base.length > 0; // deterministic hits are all direct facts
  for (const h of extra) {
    if (h.severity === "direct") hasDirect = true;
    if (seen.has(key(h.ingredient))) continue;
    seen.add(key(h.ingredient));
    hits.push({ ingredient: h.ingredient, matchedRestriction: h.matchedRestriction, reason: h.reason });
  }
  return { hits, hasDirect };
}

function finalVerdict(hasDirect: boolean, hasAny: boolean): Verdict {
  if (hasDirect) return "unsafe";
  if (hasAny) return "caution";
  return "safe";
}

/** Offline / no-key fallback: deterministic-only analysis so the app still works. */
function deterministicOnly(ingredients: string[], profiles: Profile[]): AnalyzeResponse {
  const results: ProfileResult[] = profiles.map((p) => {
    const hits = deterministicHits(ingredients, p);
    const verdict = finalVerdict(hits.length > 0, hits.length > 0);
    const explanation = hits.length
      ? `Найдены ингредиенты под ваши ограничения: ${[...new Set(hits.map((h) => h.matchedRestriction))].join(", ")}.`
      : "По словарю ограничений совпадений в составе не найдено.";
    return { profileName: p.name, verdict, hits, explanation };
  });
  return { results, disclaimer: DISCLAIMER };
}

export async function analyze(
  ingredients: string[], profiles: Profile[], opts: { useAI?: boolean } = {},
): Promise<AnalyzeResponse> {
  const clean = ingredients.map((i) => i.trim()).filter(Boolean);
  if (!profiles.length) return { results: [], disclaimer: DISCLAIMER };

  // Deterministic base for every profile.
  const base = new Map<string, Hit[]>();
  for (const p of profiles) base.set(p.name, deterministicHits(clean, p));

  // ECONOMICS + ETHICS: free users get the deterministic dictionary ONLY — never
  // a paid AI call. The deep Claude pass runs only for Prisma+ (opts.useAI).
  if (opts.useAI === false || !aiConfigured()) return deterministicOnly(clean, profiles);

  const profileLines = profiles
    .map((p) => `- ${p.name}: ограничения = ${activeRestrictionLabels(p.restrictions)}${p.custom ? `; дополнительно: «${p.custom}»` : ""}`)
    .join("\n");

  const alreadyFound = profiles
    .map((p) => {
      const h = base.get(p.name)!;
      return `- ${p.name}: ${h.length ? h.map((x) => `${x.ingredient}→${x.matchedRestriction}`).join("; ") : "словарь ничего не нашёл"}`;
    })
    .join("\n");

  let claude: ClaudeResponse;
  try {
    claude = await callTool<ClaudeResponse>({
      system:
        "Сверь состав продукта с ограничениями каждого профиля. Найди ВСЕ ингредиенты, прямо или косвенно " +
        "(синонимы, производные, скрытые источники, транслитерации) нарушающие ограничения. " +
        "Детерминированный словарь уже нашёл часть совпадений — не теряй их, можешь только дополнять. " +
        "Помечай severity=direct для прямых аллергенов и severity=trace для возможных следов/косвенных. " +
        "В explanation — только факты о составе, простым языком, без советов и оценок пользы. Верни строго JSON по схеме tool.",
      content: [
        {
          type: "text",
          text:
            `СОСТАВ (по ингредиентам):\n${clean.map((i) => `• ${i}`).join("\n")}\n\n` +
            `ПРОФИЛИ:\n${profileLines}\n\n` +
            `УЖЕ НАЙДЕНО СЛОВАРЁМ (обязательно включи, если релевантно):\n${alreadyFound}`,
        },
      ],
      tool: TOOL,
      maxTokens: 2048,
    });
  } catch (err) {
    // Any AI failure must not take the feature down — fall back to facts.
    return deterministicOnly(clean, profiles);
  }

  const byName = new Map(claude.results.map((r) => [r.profileName, r]));
  const results: ProfileResult[] = profiles.map((p) => {
    const baseHits = base.get(p.name)!;
    const c = byName.get(p.name);
    const { hits, hasDirect } = mergeHits(baseHits, c?.hits ?? []);
    const verdict = finalVerdict(hasDirect, hits.length > 0);
    const explanation =
      c?.explanation?.trim() ||
      (hits.length
        ? `Найдены ингредиенты под ограничения: ${[...new Set(hits.map((h) => h.matchedRestriction))].join(", ")}.`
        : "Совпадений в составе не найдено.");
    return { profileName: p.name, verdict, hits, explanation };
  });

  return { results, disclaimer: DISCLAIMER };
}
