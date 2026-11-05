# FoodGuard — Telegram Mini App

Scans a product's ingredients, checks them against personal/family restriction profiles,
and shows safe substitutions. Facts about composition only — no diet or health advice.

## Structure
- `shared/`   — types + allergen dictionary (used by both sides)
- `backend/`  — Fastify API, grammY bot, SQLite, Claude, CatalogProvider
- `frontend/` — React + Vite Mini App

## Run
```bash
npm install
cp .env.example .env        # fill ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN
npm run dev:backend         # http://localhost:3001/api/health
npm run dev:frontend        # http://localhost:5173 (proxies /api to backend)
```
Local dev outside Telegram: set `DEV_AUTH_BYPASS=true` in `.env` (never in prod).
Telegram needs HTTPS: expose the frontend via a tunnel and put the URL in `WEBAPP_URL`.

## Red line
Never advise on diet, rate "healthiness", or diagnose. Every AI prompt must contain this ban.
