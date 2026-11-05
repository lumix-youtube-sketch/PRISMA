// (1) Vision: extract the ingredient list from a photo of a product label.
// Returns a clean array of ingredient strings in their original language (RU),
// split on the label's own separators. No judgement, no advice — extraction only.

import type Anthropic from "@anthropic-ai/sdk";
import { callTool } from "./client";

const TOOL: Anthropic.Messages.Tool = {
  name: "report_ingredients",
  description: "Вернуть распознанный состав продукта с фотографии этикетки.",
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean", description: "Удалось ли разобрать состав на фото." },
      productName: { type: "string", description: "Название продукта, если видно на упаковке." },
      ingredients: {
        type: "array",
        items: { type: "string" },
        description: "Список ингредиентов по отдельности, как написано на этикетке.",
      },
    },
    required: ["found", "ingredients"],
  },
};

export interface VisionResult {
  found: boolean;
  productName?: string;
  ingredients: string[];
}

/** @param imageBase64 raw base64 (no data: prefix). @param mediaType e.g. image/jpeg */
export async function extractIngredientsFromImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
): Promise<VisionResult> {
  return callTool<VisionResult>({
    system:
      "Тебе дают фото этикетки продукта. Найди блок «Состав:» и выпиши ингредиенты по отдельности, " +
      "сохраняя оригинальные формулировки на русском. Не добавляй то, чего нет на фото. " +
      "Если состав не виден или фото нечитаемо — верни found=false и пустой список.",
    content: [
      { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
      { type: "text", text: "Извлеки состав продукта с этой этикетки." },
    ],
    tool: TOOL,
    maxTokens: 1024,
  });
}
