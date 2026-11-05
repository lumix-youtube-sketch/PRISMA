// Minimal grammY bot: a /start that opens the Mini App via an inline button.
// The bot only launches the WebApp — all real logic lives in the API. If no
// token or WEBAPP_URL is set, the bot is skipped so the API still runs.

import { Bot, InlineKeyboard } from "grammy";
import { config } from "./config";

export function startBot(): Bot | null {
  if (!config.botToken) {
    console.warn("[bot] TELEGRAM_BOT_TOKEN not set — bot disabled, API runs standalone.");
    return null;
  }
  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    const text =
      "👋 Это Prisma — проверка состава под ваши ограничения.\n\n" +
      "Сканируйте штрихкод или фото этикетки — покажем, что сработало под ваш профиль, " +
      "и предложим безопасные замены.\n\n" +
      "⚠️ Это не медицинская рекомендация. При сомнениях — обратитесь к врачу.";
    if (config.webappUrl) {
      await ctx.reply(text, {
        reply_markup: new InlineKeyboard().webApp("Открыть Prisma", config.webappUrl),
      });
    } else {
      await ctx.reply(text + "\n\n(WEBAPP_URL не задан — кнопка появится после деплоя фронтенда.)");
    }
  });

  bot.start({ onStart: (me) => console.log(`[bot] @${me.username} is running`) });
  return bot;
}
