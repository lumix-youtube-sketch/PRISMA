// Telegram Mini App integration. We read the official global `window.Telegram.WebApp`,
// which is populated by telegram.org/js/telegram-web-app.js (loaded in index.html).
// That script is what injects initData / platform from the real launch — without
// it the page has no Telegram context.

interface TgThemeParams { [k: string]: string | undefined }
interface TgWebApp {
  initData: string;
  platform: string;
  colorScheme?: "light" | "dark";
  themeParams?: TgThemeParams;
  ready(): void;
  expand(): void;
  openLink?(url: string): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
}

function tg(): TgWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
}

export function initTelegram() {
  const w = tg();
  try {
    w?.ready();
    w?.expand();
    w?.setHeaderColor?.("#f4f0ea");
    w?.setBackgroundColor?.("#f4f0ea");
  } catch {
    // Not in Telegram (plain browser) — fine.
  }
  // Prism is intentionally a single warm, light aesthetic — no dark variant.
  document.documentElement.dataset.theme = "light";
}

/** Raw initData query string — sent to the backend for HMAC validation. */
export const initData = () => {
  try { return tg()?.initData ?? ""; } catch { return ""; }
};

/** Platform string ("ios"/"android"/"tdesktop"/"macos"/"web"/… or "unknown"). */
export function tgPlatform(): string {
  try { return tg()?.platform || "unknown"; } catch { return "unknown"; }
}

/** True when running as a real Telegram Mini App. */
export function isInTelegram(): boolean {
  if (tgPlatform() !== "unknown") return true;
  return initData().length > 0;
}

/** Local dev host — where the backend allows DEV_AUTH_BYPASS. */
export const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

export const BOT_LINK = "https://t.me/prismru_bot";

/** Open an external URL — via Telegram's native handler in the Mini App, else a new tab. */
export function openLink(url: string) {
  try {
    const w = tg();
    if (w?.openLink) { w.openLink(url); return; }
  } catch { /* not in Telegram */ }
  window.open(url, "_blank", "noopener,noreferrer");
}
