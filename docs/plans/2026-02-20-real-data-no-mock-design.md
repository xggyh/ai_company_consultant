# Real Data Only / No-Mock 方案设计（AI Enterprise Advisor）

## 背景与目标

当前系统仍包含 mock/fallback 路径（Web repository、顾问本地规则兜底）。本次目标是强制切换为“真实数据优先”架构：

- 模型与资讯仅来自真实爬虫源。
- 爬虫采集后由 Ark 做结构化总结与标签增强。
- Web 端彻底移除 mock 数据路径。
- 失败策略采用用户确认的 `B`：若本次更新失败，继续展示数据库中上次成功入库的真实历史数据，并给出状态提示。
- 调度策略采用用户确认的 `A每6小时`。

## 已确认约束

1. 失败策略：`B`（展示历史真实数据 + 更新失败提示）。
2. 调度策略：仅定时，每 6 小时触发一次。
3. 模型策略：`爬虫采集 + Ark总结`。
4. 资讯策略：真实站点采集 + Ark总结。

## 架构设计

### 1. 数据采集与增强

`apps/crawler` 执行链路：

- Source Crawl：OpenRouter / HuggingFace / LiteLLM + 指定中文资讯源。
- Transform：去重、字段标准化。
- Ark Enrich：生成模型描述/场景标签、资讯摘要/标签。
- Persist：写入 Supabase `models` / `articles`。

### 2. 运行状态记录

新增 `crawler_runs` 记录每次爬虫运行状态，用于前端展示“本次更新是否成功”：

- `success`: 模型和资讯都成功落库。
- `partial`: 仅部分成功。
- `failed`: 完全失败。

Web 读取策略：

- 推荐流仍读取 `models` / `articles` 当前数据（真实已入库）。
- 同时读取最新 run 状态，若非 success，返回 warning 提示前端。

### 3. Web 去 Mock

`apps/web/lib/data/repository.ts` 改为仅 Supabase repository：

- 删除 `createMockRepository` 与所有 catch fallback 到 mock 的逻辑。
- `getDataRepository()` 在缺少 Supabase 配置时直接抛错。
- `getFeed()` 只查询真实表，并带 run 状态信息。

### 4. 顾问后端强制 Ark

`analyzeDemand` / `buildSolution` 改为 Ark 强依赖：

- 无 Ark 配置：直接报错。
- Ark 返回非预期结构：直接报错。
- 不再使用本地规则/模板生成“伪结果”。

API 层将错误显式返回给前端（JSON），前端展示“服务暂不可用”。

## 数据模型变更

保留现有核心字段，并增加运行状态表：

- 新表：`crawler_runs`。
- 为模型和资讯补充追踪字段：
  - `crawl_run_id text`
  - `last_crawled_at timestamptz`

## 调度设计

GitHub Actions 由每日改为每 6 小时：

- cron：`0 */6 * * *`

## 测试与验收

1. 单元测试：
- repository 不再引用 mock。
- Ark agent 在无 Ark client 时抛错。
- crawler run 状态计算正确。

2. 集成验证：
- 运行 crawler 后 `models/articles` 数据可查询。
- `crawler_runs` 有最新 run 记录。
- 前端推荐流展示真实数据，且 run 失败时出现 warning。

3. 构建验证：
- `npm --prefix apps/web run test`
- `npm --prefix apps/web run build`
- crawler 测试与 smoke：`~/.codex/skills/ai-advisor-crawler-replay/scripts/smoke.sh`

## 非目标

- 本轮不做增量索引优化、复杂调度编排（如 Airflow）。
- 不做多租户隔离改造。
- 不引入额外缓存层。
