// Anthropic client + a typed tool-call helper. We force structured output by
// giving Claude a single tool and requiring it, then parse `tool_use.input`.
//
// The RED LINE is enforced here as a shared preamble prepended to every system
// prompt: facts about composition only, never diet/health advice or diagnosis.

import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";

export const RED_LINE = [
  "Ты — ассистент, который сверяет СОСТАВ продукта с ограничениями человека и сообщает ТОЛЬКО факты о составе.",
  "СТРОГО ЗАПРЕЩЕНО: давать советы по питанию или диете, оценивать «полезность»/«вредность», сравнивать продукты по пользе, ставить диагнозы, давать медицинские рекомендации.",
  "Разрешено: констатировать наличие/отсутствие ингредиента и его принадлежность к ограничению («казеин — молочный белок»).",
  "Решение всегда остаётся за пользователем. Если уместно — напоминай, что это не медицинская рекомендация.",
].join(" ");

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!config.anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY is not set — AI features are unavailable.");
  }
  if (!client) client = new Anthropic({ apiKey: config.anthropicKey });
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(config.anthropicKey);
}

type ContentBlock = Anthropic.Messages.MessageParam["content"];

export interface ToolCallOptions {
  system: string;
  content: ContentBlock; // user message content (text and/or image blocks)
  tool: Anthropic.Messages.Tool;
  maxTokens?: number;
}

/**
 * Call Claude forcing a single tool and return its typed `input`.
 * Throws if the model did not emit the tool (should not happen with tool_choice).
 */
export async function callTool<T>(opts: ToolCallOptions): Promise<T> {
  const resp = await getClient().messages.create({
    model: config.anthropicModel,
    max_tokens: opts.maxTokens ?? 1500,
    system: `${RED_LINE}\n\n${opts.system}`,
    tools: [opts.tool],
    tool_choice: { type: "tool", name: opts.tool.name },
    messages: [{ role: "user", content: opts.content }],
  });
  const block = resp.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error("Model did not return structured output.");
  return block.input as T;
}
