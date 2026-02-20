# AI Enterprise Advisor MVP

## Structure
- `apps/web`: Next.js 16 Web app (UI + API routes + tests)
- `apps/crawler`: Python crawler pipeline
- `supabase/migrations`: Database schema migrations

## Web development
- Install deps: `npm install`
- Copy env template: `cp apps/web/.env.example apps/web/.env.local`
- Configure Ark API in `apps/web/.env.local` (`ARK_API_KEY`, `ARK_BASE_URL`, `ARK_MODEL`)
- Configure Supabase in `apps/web/.env.local` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

Notes:
- If Supabase env is missing, APIs auto-fallback to local mock data.
- Ark model integration is enabled for advisor chain; if Ark fails it auto-fallbacks to rule-based logic.

## Run
- Dev: `npm --workspace @ai-advisor/web run dev -- --port 4173`
- Build: `npm --workspace @ai-advisor/web run build`
- Open: `http://127.0.0.1:4173` (自动跳转到 `/explore`)
- Detail routes:
  - 模型详情：`/models/:id`
  - 资讯详情：`/articles/:id`

## Test
- Unit: `npm --workspace @ai-advisor/web run test`
- E2E: `npm --workspace @ai-advisor/web run test:e2e`
- Supabase check: `npm --workspace @ai-advisor/web run check:supabase`
- Supabase seed: `npm --workspace @ai-advisor/web run seed:supabase`

## Crawler
- `cd apps/crawler`
- `python3 -m venv .venv`
- `.venv/bin/pip install -r requirements.txt`
- Export envs:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  - `ARK_API_KEY`
  - optional: `ARK_BASE_URL`, `ARK_MODEL`
- Full run: `PYTHONPATH=. .venv/bin/python main.py`
- Smoke run: `PYTHONPATH=. .venv/bin/python main.py --model-limit 2 --news-limit 1`
- Daily schedule: `.github/workflows/daily-crawl.yml` (`02:00 UTC`)

## Verification
See `docs/runbooks/mvp-verification.md`.
