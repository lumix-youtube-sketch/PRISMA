// (3) Chat: turn a free-text request ("нужен сыр без лактозы") into a structured
// catalog query {category, excludeAllergens, excludeCustom} and a facts-only
// reply line. Ranking by "usefulness"/health is forbidden — filtering by
// composition only.

import type Anthropic from "@anthropic-ai/sdk";
import type { RestrictionId } from "@foodguard/shared";
import { aiConfigured, callTool } from "./client";

const RESTRICTION_IDS: RestrictionId[] =
  ["gluten", "milk", "nuts", "peanut", "egg", "soy", "fish", "seafood", "honey", "sugar"];

const TOOL: Anthropic.Messages.Tool = {
  name: "report_query",
  description: "Разобрать запрос пользователя в структурированный фильтр по каталогу.",
  input_schema: {
    type: "object",
    properties: {
      category: { type: "string", description: "Категория товара (например: сыр, молоко, печенье, хлеб, йогурт)." },
      excludeAllergens: {
        type: "array",
        items: { type: "string", enum: RESTRICTION_IDS },
        description: "Ограничения, которых НЕ должно быть в составе.",
      },
      excludeCustom: { type: "string", description: "Произвольное исключение из текста, если это не из списка." },
      reply: { type: "string", description: "Короткий ответ пользователю. Только факты о составе, без оценок пользы." },
    },
    required: ["category", "excludeAllergens", "reply"],
  },
};

export interface ChatQuery {
  category: string;
  excludeAllergens: RestrictionId[];
  excludeCustom?: string;
  reply: string;
}

/** Keyword fallback when AI is unavailable: guess category + allergens by substring. */
function heuristicParse(message: string): ChatQuery {
  const m = message.toLowerCase();
  const category =
    ["сыр", "молок", "печень", "хлеб", "йогурт"].find((c) => m.includes(c)) ?? "";
  const map: [RegExp, RestrictionId][] = [
    [/глютен|пшениц|клейковин/, "gluten"],
    [/лактоз|молочн|без молок/, "milk"],
    [/орех/, "nuts"],
    [/арахис/, "peanut"],
    [/яйц|яич/, "egg"],
    [/соя|соев/, "soy"],
    [/рыб/, "fish"],
    [/морепродукт|креветк/, "seafood"],
    [/мёд|мед/, "honey"],
    [/сахар/, "sugar"],
  ];
  const excludeAllergens = map.filter(([re]) => re.test(m)).map(([, id]) => id);
  return {
    category: category === "молок" ? "молоко" : category === "печень" ? "печенье" : category,
    excludeAllergens,
    reply: "Показываю товары, в составе которых нет указанных ингредиентов.",
  };
}

export async function parseChatQuery(message: string): Promise<ChatQuery> {
  if (!aiConfigured()) return heuristicParse(message);
  try {
    const q = await callTool<ChatQuery>({
      system:
        "Пользователь ищет товар по составу. Определи категорию и какие ограничения исключить. " +
        "СТРОГО фильтр по составу: никаких «полезнее/лучше/рекомендую». В reply — только факты. " +
        "Если просят «без лактозы/молока» — excludeAllergens=[\"milk\"]; «без глютена» — [\"gluten\"]; и т.д.",
      content: [{ type: "text", text: message }],
      tool: TOOL,
      maxTokens: 512,
    });
    return { ...q, excludeAllergens: q.excludeAllergens ?? [] };
  } catch {
    return heuristicParse(message);
  }
}
