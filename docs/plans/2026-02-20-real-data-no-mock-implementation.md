# Real Data Only / No-Mock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 AI Enterprise Advisor 改造为“0 mock / 全真实数据”模式，模型与资讯均由爬虫采集并经 Ark 总结后入库，Web 端仅消费真实库数据并展示更新状态。

**Architecture:** 爬虫侧新增运行状态持久化（crawler_runs）并将 run 元数据写入 models/articles；Web 侧移除 mock repository 和 agent fallback，统一依赖 Supabase + Ark。前端读取 feed 时携带 crawl 状态并在失败时展示 warning，继续使用历史真实数据。

**Tech Stack:** Next.js 16, TypeScript, Supabase, Python crawler, Ark(OpenAI-compatible API), Vitest, GitHub Actions.

---

### Task 1: 数据库迁移（crawler_runs + run追踪字段）

**Files:**
- Create: `supabase/migrations/202602200002_crawler_runs.sql`

**Step 1: Write the failing test**
- 现有仓库无 schema migration 单测，改为“验证迁移 SQL 可执行语义完整”的最小检查：字段和约束完整。

**Step 2: Run test to verify it fails**
- 跳过（当前项目无 migration 测试框架），改为后续 `schema.spec.ts` 与运行时查询验证。

**Step 3: Write minimal implementation**
- 创建 `crawler_runs` 表。
- 为 `models` / `articles` 增加 `crawl_run_id` 与 `last_crawled_at`。

**Step 4: Run test to verify it passes**
- Run: `npm --prefix apps/web run test -- tests/unit/db/schema.spec.ts`

**Step 5: Commit**
- `git add supabase/migrations/202602200002_crawler_runs.sql`
- `git commit -m "feat: add crawler run tracking schema"`

### Task 2: Crawler 写入 run 状态并改为 6 小时调度

**Files:**
- Modify: `.github/workflows/daily-crawl.yml`
- Modify: `apps/crawler/main.py`
- Modify: `apps/crawler/db.py`
- Modify: `apps/crawler/pipelines/model_pipeline.py`
- Modify: `apps/crawler/pipelines/news_pipeline.py`
- Test: `apps/crawler/tests/test_pipelines.py`

**Step 1: Write the failing test**
- 增加 pipeline/main 对 run_id 透传和 stats 结构断言。

**Step 2: Run test to verify it fails**
- Run: `cd apps/crawler && PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest -q tests/test_pipelines.py`

**Step 3: Write minimal implementation**
- pipeline 支持接收 `run_id`，upsert 时带 `crawl_run_id`/`last_crawled_at`。
- `main.py` 记录 `crawler_runs`（success/partial/failed）。
- GitHub Actions cron 改为 `0 */6 * * *`。

**Step 4: Run test to verify it passes**
- Run: `cd apps/crawler && PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest -q tests/test_pipelines.py tests/test_ark_enrich.py`

**Step 5: Commit**
- `git add .github/workflows/daily-crawl.yml apps/crawler`
- `git commit -m "feat: track crawler runs and schedule every 6 hours"`

### Task 3: Web repository 去 mock + 引入 crawl warning

**Files:**
- Modify: `apps/web/lib/data/repository.ts`
- Modify: `apps/web/lib/dashboard.ts`
- Modify: `apps/web/components/dashboard/main-dashboard.tsx`
- Modify: `apps/web/components/dashboard/insights-dashboard.tsx`
- Modify: `apps/web/components/dashboard/advisor-workspace.tsx`
- Modify: `apps/web/components/dashboard/favorites-dashboard.tsx`
- Modify: `apps/web/components/layout/topbar.tsx`

**Step 1: Write the failing test**
- 新增 repository 单测：未配置 Supabase 时不返回 mock；feed 包含 crawl warning 字段。

**Step 2: Run test to verify it fails**
- Run: `npm --prefix apps/web run test -- tests/unit/env.spec.ts`

**Step 3: Write minimal implementation**
- 删除 `mock-data` 依赖与 `createMockRepository`。
- `getDataRepository` 缺配置直接抛错。
- `getFeed/getDashboardData` 返回 crawler run 状态字段。
- 页面展示 warning banner。

**Step 4: Run test to verify it passes**
- Run: `npm --prefix apps/web run test`

**Step 5: Commit**
- `git add apps/web/lib apps/web/components`
- `git commit -m "refactor: remove mock repository and expose crawler status"`

### Task 4: 顾问 Agent 强制 Ark，无本地兜底

**Files:**
- Modify: `apps/web/lib/agents/demand-agent.ts`
- Modify: `apps/web/lib/agents/solution-agent.ts`
- Modify: `apps/web/app/api/advisor/chat/route.ts`
- Modify: `apps/web/tests/unit/agents/demand-agent.spec.ts`
- Modify: `apps/web/tests/unit/agents/solution-agent.spec.ts`
- Modify: `apps/web/tests/unit/advisor/chat-route.spec.ts`

**Step 1: Write the failing test**
- 默认无 Ark 时应抛错（或 route 返回 error），不再返回本地规则/模板。

**Step 2: Run test to verify it fails**
- Run: `npm --prefix apps/web run test -- tests/unit/agents/demand-agent.spec.ts tests/unit/agents/solution-agent.spec.ts tests/unit/advisor/chat-route.spec.ts`

**Step 3: Write minimal implementation**
- 删除 fallback rule / fallback solution。
- Ark 配置缺失或解析失败时抛错。
- route 捕获并返回 JSON 错误。

**Step 4: Run test to verify it passes**
- Run: `npm --prefix apps/web run test`

**Step 5: Commit**
- `git add apps/web/lib/agents apps/web/app/api/advisor apps/web/tests/unit`
- `git commit -m "refactor: require ark for advisor flows"`

### Task 5: 清理 mock 文件与回归验证

**Files:**
- Delete: `apps/web/lib/mock-data.ts`（若无引用）
- Delete/Modify: `apps/web/tests/unit/favorites/mock-favorites.spec.ts`
- Modify: `apps/web/app/api/profile/route.ts`（移除 mock type import）

**Step 1: Write the failing test**
- 删除 mock 相关测试后，修复因类型引用导致的构建失败。

**Step 2: Run test to verify it fails**
- Run: `npm --prefix apps/web run build`

**Step 3: Write minimal implementation**
- 修复所有 mock-data 引用为真实类型定义。

**Step 4: Run test to verify it passes**
- Run: `npm --prefix apps/web run test`
- Run: `npm --prefix apps/web run build`
- Run: `~/.codex/skills/ai-advisor-crawler-replay/scripts/smoke.sh`

**Step 5: Commit**
- `git add apps/web docs/plans`
- `git commit -m "chore: finalize real-data-only mode"`
