# AI Enterprise Advisor MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 从现有产品设计文档落地一个可运行的 MVP，覆盖注册登录、个性化推荐、双 Agent 顾问对话、收藏/历史、PDF 导出、每日爬虫更新全链路。

**Architecture:** 采用单仓库实现：Next.js 15 负责 Web UI 与 API Routes，Supabase 负责 Auth + Postgres 持久化，LangGraph 编排 Demand/Solution 双 Agent，Python 爬虫通过 GitHub Actions 定时抓取并调用 Ark API 生成摘要与标签。实施按 TDD 小步推进，每个任务先写失败测试，再做最小实现，再验证通过并提交。

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase, LangGraph, ByteDance Ark API, Vitest, Playwright, Python 3.11, BeautifulSoup4, GitHub Actions

---

**Prerequisites:**
- Node.js 22+
- pnpm 9+
- Python 3.11+
- Supabase project + service role key
- Ark API key

**Execution Skills:** `@superpowers:test-driven-development` `@superpowers:systematic-debugging` `@superpowers:verification-before-completion`

### Task 1: 项目脚手架与测试基线

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/web/package.json`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/lib/env.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/tests/unit/env.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/env.spec.ts
import { describe, expect, it } from "vitest";
import { getRequiredEnv } from "../../lib/env";

describe("getRequiredEnv", () => {
  it("throws when required env missing", () => {
    expect(() => getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")).toThrow(
      "Missing required env: NEXT_PUBLIC_SUPABASE_URL",
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/env.spec.ts`
Expected: FAIL with `Cannot find module '../../lib/env'`

**Step 3: Write minimal implementation**

```ts
// apps/web/lib/env.ts
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/env.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml apps/web/package.json apps/web/lib/env.ts apps/web/tests/unit/env.spec.ts
git commit -m "chore: bootstrap web workspace and test baseline"
```

### Task 2: Supabase 基础数据模型与迁移

**Files:**
- Create: `supabase/migrations/202602200001_init.sql`
- Create: `apps/web/lib/db/types.ts`
- Create: `apps/web/tests/unit/db/schema.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/db/schema.spec.ts
import { describe, expect, it } from "vitest";
import { tables } from "../../../lib/db/types";

describe("db schema constants", () => {
  it("contains required core tables", () => {
    expect(tables).toEqual(
      expect.arrayContaining([
        "users",
        "models",
        "articles",
        "favorites",
        "conversations",
        "messages",
        "solutions",
      ]),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/db/schema.spec.ts`
Expected: FAIL with `Cannot find module '../../../lib/db/types'`

**Step 3: Write minimal implementation**

```ts
// apps/web/lib/db/types.ts
export const tables = [
  "users",
  "models",
  "articles",
  "favorites",
  "conversations",
  "messages",
  "solutions",
] as const;
```

```sql
-- supabase/migrations/202602200001_init.sql
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  company_name text,
  company_industry text,
  company_scale text,
  created_at timestamptz not null default now()
);

create table if not exists models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  description text,
  cost_input numeric,
  cost_output numeric,
  api_url text,
  docs_url text,
  business_scenarios text[] default '{}',
  release_date date,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content text,
  source text,
  url text unique,
  tags text[] default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  model_id uuid references models(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((model_id is not null) <> (article_id is not null))
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  agent_type text,
  created_at timestamptz not null default now()
);

create table if not exists solutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  title text not null,
  content jsonb not null,
  pdf_url text,
  created_at timestamptz not null default now()
);
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/db/schema.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/migrations/202602200001_init.sql apps/web/lib/db/types.ts apps/web/tests/unit/db/schema.spec.ts
git commit -m "feat: add initial supabase schema and db type constants"
```

### Task 3: 注册登录与企业信息初始化

**Files:**
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/api/profile/route.ts`
- Create: `apps/web/tests/unit/profile/route.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/profile/route.spec.ts
import { describe, expect, it } from "vitest";
import { validateProfilePayload } from "../../../app/api/profile/route";

describe("validateProfilePayload", () => {
  it("rejects payload without company_industry", () => {
    expect(() =>
      validateProfilePayload({ company_name: "Acme", company_scale: "中型（100-500人）" }),
    ).toThrow("company_industry is required");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/profile/route.spec.ts`
Expected: FAIL with `validateProfilePayload is not exported`

**Step 3: Write minimal implementation**

```ts
// apps/web/app/api/profile/route.ts
export function validateProfilePayload(payload: Record<string, string>) {
  if (!payload.company_industry) {
    throw new Error("company_industry is required");
  }
  if (!payload.company_scale) {
    throw new Error("company_scale is required");
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/profile/route.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/supabase/client.ts apps/web/app/(auth)/login/page.tsx apps/web/app/api/profile/route.ts apps/web/tests/unit/profile/route.spec.ts
git commit -m "feat: add auth entry and profile validation API"
```

### Task 4: Tag 常量与推荐候选查询

**Files:**
- Create: `apps/web/lib/tags.ts`
- Create: `apps/web/lib/recommendations/query.ts`
- Create: `apps/web/app/api/feed/route.ts`
- Test: `apps/web/tests/unit/recommendations/tags.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/recommendations/tags.spec.ts
import { describe, expect, it } from "vitest";
import { INDUSTRY_TAGS, SCALE_TAGS } from "../../../lib/tags";

describe("tag constants", () => {
  it("contains expected industry and scale tags", () => {
    expect(INDUSTRY_TAGS).toContain("企业服务（SaaS）");
    expect(SCALE_TAGS).toContain("大型（500-2000人）");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/recommendations/tags.spec.ts`
Expected: FAIL with `Cannot find module '../../../lib/tags'`

**Step 3: Write minimal implementation**

```ts
// apps/web/lib/tags.ts
export const INDUSTRY_TAGS = [
  "电商零售",
  "金融科技",
  "教育培训",
  "医疗健康",
  "制造业",
  "农业",
  "物流运输",
  "文化传媒",
  "企业服务（SaaS）",
  "游戏娱乐",
  "房地产",
  "能源环保",
  "政务公共",
  "餐饮旅游",
  "法律咨询",
  "人力资源",
  "广告营销",
  "智能硬件",
  "生物科技",
  "其他",
] as const;

export const SCALE_TAGS = [
  "初创（<20人）",
  "小型（20-100人）",
  "中型（100-500人）",
  "大型（500-2000人）",
  "超大型（>2000人）",
] as const;
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/recommendations/tags.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/tags.ts apps/web/lib/recommendations/query.ts apps/web/app/api/feed/route.ts apps/web/tests/unit/recommendations/tags.spec.ts
git commit -m "feat: add taxonomy constants and feed query skeleton"
```

### Task 5: 个性化推荐打分引擎

**Files:**
- Create: `apps/web/lib/recommendations/score.ts`
- Modify: `apps/web/lib/recommendations/query.ts`
- Test: `apps/web/tests/unit/recommendations/score.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/recommendations/score.spec.ts
import { describe, expect, it } from "vitest";
import { scoreModel } from "../../../lib/recommendations/score";

describe("scoreModel", () => {
  it("gives higher score when scenario and industry both match", () => {
    const score = scoreModel(
      { business_scenarios: ["决策辅助"], provider: "Ark" },
      { company_industry: "企业服务（SaaS）", preferred_scenarios: ["决策辅助"] },
    );
    expect(score).toBeGreaterThanOrEqual(80);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/recommendations/score.spec.ts`
Expected: FAIL with `Cannot find module '../../../lib/recommendations/score'`

**Step 3: Write minimal implementation**

```ts
// apps/web/lib/recommendations/score.ts
type Model = { business_scenarios: string[]; provider: string };
type Profile = { company_industry: string; preferred_scenarios: string[] };

export function scoreModel(model: Model, profile: Profile): number {
  let score = 40;
  if (profile.preferred_scenarios.some((s) => model.business_scenarios.includes(s))) {
    score += 40;
  }
  if (profile.company_industry === "企业服务（SaaS）") {
    score += 10;
  }
  if (model.provider) {
    score += 10;
  }
  return Math.min(score, 100);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/recommendations/score.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/recommendations/score.ts apps/web/lib/recommendations/query.ts apps/web/tests/unit/recommendations/score.spec.ts
git commit -m "feat: add recommendation scoring for personalized feed"
```

### Task 6: Demand Agent（需求理解 + 追问判断）

**Files:**
- Create: `apps/web/lib/agents/demand-agent.ts`
- Create: `apps/web/lib/agents/types.ts`
- Test: `apps/web/tests/unit/agents/demand-agent.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/agents/demand-agent.spec.ts
import { describe, expect, it } from "vitest";
import { analyzeDemand } from "../../../lib/agents/demand-agent";

describe("analyzeDemand", () => {
  it("asks follow-up when key fields missing", async () => {
    const result = await analyzeDemand({ user_input: "我们想上AI" });
    expect(result.need_follow_up).toBe(true);
    expect(result.follow_up_question.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/agents/demand-agent.spec.ts`
Expected: FAIL with `Cannot find module '../../../lib/agents/demand-agent'`

**Step 3: Write minimal implementation**

```ts
// apps/web/lib/agents/demand-agent.ts
export async function analyzeDemand(input: { user_input: string }) {
  const hasIndustry = /行业|电商|金融|制造|医疗/.test(input.user_input);
  const hasGoal = /提升|降低|增长|效率|成本/.test(input.user_input);

  if (!hasIndustry || !hasGoal) {
    return {
      need_follow_up: true,
      follow_up_question: "请补充行业、团队规模、当前痛点和希望达成的目标。",
      demand: null,
    };
  }

  return {
    need_follow_up: false,
    follow_up_question: "",
    demand: {
      industry: "待模型抽取",
      scale: "待模型抽取",
      pain_points: ["待模型抽取"],
      goals: ["待模型抽取"],
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/agents/demand-agent.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/agents/types.ts apps/web/lib/agents/demand-agent.ts apps/web/tests/unit/agents/demand-agent.spec.ts
git commit -m "feat: add demand agent with follow-up gating"
```

### Task 7: Solution Agent（方案生成 + 成本估算）

**Files:**
- Create: `apps/web/lib/agents/solution-agent.ts`
- Create: `apps/web/lib/cost/calculate.ts`
- Test: `apps/web/tests/unit/agents/solution-agent.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/agents/solution-agent.spec.ts
import { describe, expect, it } from "vitest";
import { buildSolution } from "../../../lib/agents/solution-agent";

describe("buildSolution", () => {
  it("returns 1-3 solutions with roi and cost fields", async () => {
    const result = await buildSolution({
      industry: "企业服务（SaaS）",
      pain_points: ["销售线索转化低"],
      goals: ["提升成交率"],
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0]).toHaveProperty("estimated_monthly_cost");
    expect(result[0]).toHaveProperty("roi_hypothesis");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/agents/solution-agent.spec.ts`
Expected: FAIL with `Cannot find module '../../../lib/agents/solution-agent'`

**Step 3: Write minimal implementation**

```ts
// apps/web/lib/agents/solution-agent.ts
import { estimateMonthlyCost } from "../cost/calculate";

export async function buildSolution(input: {
  industry: string;
  pain_points: string[];
  goals: string[];
}) {
  return [
    {
      title: `${input.industry} 智能顾问 + 线索评分`,
      architecture: "LLM API + CRM webhook + dashboard",
      estimated_monthly_cost: estimateMonthlyCost({ requests: 50000, avg_tokens: 1800 }),
      roi_hypothesis: "3个月内将销售线索转化率提升 10%-20%",
      risks: ["数据质量不足", "上线初期提示词不稳定"],
    },
  ];
}
```

```ts
// apps/web/lib/cost/calculate.ts
export function estimateMonthlyCost(input: { requests: number; avg_tokens: number }) {
  const millionTokens = (input.requests * input.avg_tokens) / 1_000_000;
  return Number((millionTokens * 12).toFixed(2));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/agents/solution-agent.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/agents/solution-agent.ts apps/web/lib/cost/calculate.ts apps/web/tests/unit/agents/solution-agent.spec.ts
git commit -m "feat: add solution agent and monthly cost estimator"
```

### Task 8: 顾问对话 API 与会话持久化

**Files:**
- Create: `apps/web/app/api/advisor/chat/route.ts`
- Modify: `apps/web/lib/agents/demand-agent.ts`
- Modify: `apps/web/lib/agents/solution-agent.ts`
- Create: `apps/web/tests/unit/advisor/chat-route.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/advisor/chat-route.spec.ts
import { describe, expect, it } from "vitest";
import { handleAdvisorMessage } from "../../../app/api/advisor/chat/route";

describe("handleAdvisorMessage", () => {
  it("returns follow-up first when demand info is insufficient", async () => {
    const result = await handleAdvisorMessage({ message: "我们想用AI" });
    expect(result.type).toBe("follow_up");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/advisor/chat-route.spec.ts`
Expected: FAIL with `Cannot find module '../../../app/api/advisor/chat/route'`

**Step 3: Write minimal implementation**

```ts
// apps/web/app/api/advisor/chat/route.ts
import { analyzeDemand } from "../../../../lib/agents/demand-agent";
import { buildSolution } from "../../../../lib/agents/solution-agent";

export async function handleAdvisorMessage(input: { message: string }) {
  const demand = await analyzeDemand({ user_input: input.message });
  if (demand.need_follow_up) {
    return { type: "follow_up", content: demand.follow_up_question };
  }

  const solutions = await buildSolution({
    industry: demand.demand?.industry ?? "其他",
    pain_points: demand.demand?.pain_points ?? [],
    goals: demand.demand?.goals ?? [],
  });

  return { type: "solution", content: solutions };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/advisor/chat-route.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app/api/advisor/chat/route.ts apps/web/lib/agents/demand-agent.ts apps/web/lib/agents/solution-agent.ts apps/web/tests/unit/advisor/chat-route.spec.ts
git commit -m "feat: add advisor chat orchestration route"
```

### Task 9: 对话 UI + 收藏 + 历史记录

**Files:**
- Create: `apps/web/app/(app)/advisor/page.tsx`
- Create: `apps/web/components/chat/advisor-chat.tsx`
- Create: `apps/web/app/api/favorites/route.ts`
- Create: `apps/web/app/api/conversations/route.ts`
- Test: `apps/web/tests/unit/favorites/route.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/favorites/route.spec.ts
import { describe, expect, it } from "vitest";
import { validateFavoritePayload } from "../../../app/api/favorites/route";

describe("validateFavoritePayload", () => {
  it("requires exactly one of model_id or article_id", () => {
    expect(() => validateFavoritePayload({})).toThrow("one target is required");
    expect(() => validateFavoritePayload({ model_id: "m1", article_id: "a1" })).toThrow(
      "only one target is allowed",
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/favorites/route.spec.ts`
Expected: FAIL with `Cannot find module '../../../app/api/favorites/route'`

**Step 3: Write minimal implementation**

```ts
// apps/web/app/api/favorites/route.ts
export function validateFavoritePayload(payload: { model_id?: string; article_id?: string }) {
  const hasModel = Boolean(payload.model_id);
  const hasArticle = Boolean(payload.article_id);

  if (!hasModel && !hasArticle) {
    throw new Error("one target is required");
  }
  if (hasModel && hasArticle) {
    throw new Error("only one target is allowed");
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/favorites/route.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app/(app)/advisor/page.tsx apps/web/components/chat/advisor-chat.tsx apps/web/app/api/favorites/route.ts apps/web/app/api/conversations/route.ts apps/web/tests/unit/favorites/route.spec.ts
git commit -m "feat: add advisor ui shell and favorites validation"
```

### Task 10: 方案导出 PDF

**Files:**
- Create: `apps/web/lib/pdf/render-solution.ts`
- Create: `apps/web/app/api/solutions/export/route.ts`
- Create: `apps/web/tests/unit/pdf/render-solution.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/tests/unit/pdf/render-solution.spec.ts
import { describe, expect, it } from "vitest";
import { renderSolutionMarkdown } from "../../../lib/pdf/render-solution";

describe("renderSolutionMarkdown", () => {
  it("includes title, cost and risk sections", () => {
    const doc = renderSolutionMarkdown({
      title: "客服自动化",
      estimated_monthly_cost: 1200,
      risks: ["误答风险"],
    });
    expect(doc).toContain("# 客服自动化");
    expect(doc).toContain("月度成本估算");
    expect(doc).toContain("风险提示");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- apps/web/tests/unit/pdf/render-solution.spec.ts`
Expected: FAIL with `Cannot find module '../../../lib/pdf/render-solution'`

**Step 3: Write minimal implementation**

```ts
// apps/web/lib/pdf/render-solution.ts
export function renderSolutionMarkdown(input: {
  title: string;
  estimated_monthly_cost: number;
  risks: string[];
}) {
  return [
    `# ${input.title}`,
    "",
    "## 月度成本估算",
    `${input.estimated_monthly_cost} CNY / 月`,
    "",
    "## 风险提示",
    ...input.risks.map((r) => `- ${r}`),
  ].join("\n");
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- apps/web/tests/unit/pdf/render-solution.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/lib/pdf/render-solution.ts apps/web/app/api/solutions/export/route.ts apps/web/tests/unit/pdf/render-solution.spec.ts
git commit -m "feat: add solution markdown renderer for pdf export"
```

### Task 11: Python 爬虫（抓取 + 摘要 + 去重入库）

**Files:**
- Create: `apps/crawler/requirements.txt`
- Create: `apps/crawler/main.py`
- Create: `apps/crawler/sources.py`
- Create: `apps/crawler/transform.py`
- Test: `apps/crawler/tests/test_transform.py`

**Step 1: Write the failing test**

```python
# apps/crawler/tests/test_transform.py
from transform import dedupe_by_url


def test_dedupe_by_url_removes_duplicates():
    items = [
        {"url": "https://a.com/1", "title": "A"},
        {"url": "https://a.com/1", "title": "A-dup"},
        {"url": "https://a.com/2", "title": "B"},
    ]
    result = dedupe_by_url(items)
    assert len(result) == 2
```

**Step 2: Run test to verify it fails**

Run: `cd apps/crawler && pytest tests/test_transform.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'transform'`

**Step 3: Write minimal implementation**

```python
# apps/crawler/transform.py
from typing import Dict, List


def dedupe_by_url(items: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = set()
    result = []
    for item in items:
        url = item.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        result.append(item)
    return result
```

**Step 4: Run test to verify it passes**

Run: `cd apps/crawler && pytest tests/test_transform.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/crawler/requirements.txt apps/crawler/main.py apps/crawler/sources.py apps/crawler/transform.py apps/crawler/tests/test_transform.py
git commit -m "feat: add crawler dedupe pipeline foundation"
```

### Task 12: GitHub Actions 定时任务与端到端验收

**Files:**
- Create: `.github/workflows/daily-crawl.yml`
- Create: `apps/web/tests/e2e/onboarding-and-advisor.spec.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

```ts
// apps/web/tests/e2e/onboarding-and-advisor.spec.ts
import { test, expect } from "@playwright/test";

test("new user can complete onboarding and get advisor response", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始咨询" }).click();
  await page.getByPlaceholder("请输入你的业务问题").fill("我们是SaaS公司，想提升销售转化");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("方案概述")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec playwright test apps/web/tests/e2e/onboarding-and-advisor.spec.ts`
Expected: FAIL with `button "开始咨询" not found`

**Step 3: Write minimal implementation**

```yaml
# .github/workflows/daily-crawl.yml
name: daily-crawl

on:
  schedule:
    - cron: "0 18 * * *"
  workflow_dispatch:

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r apps/crawler/requirements.txt
      - run: python apps/crawler/main.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ARK_API_KEY: ${{ secrets.ARK_API_KEY }}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec playwright test apps/web/tests/e2e/onboarding-and-advisor.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add .github/workflows/daily-crawl.yml apps/web/tests/e2e/onboarding-and-advisor.spec.ts README.md
git commit -m "chore: add daily crawler workflow and e2e acceptance"
```

### Task 13: 发布前验证清单

**Files:**
- Modify: `README.md`
- Create: `docs/runbooks/mvp-verification.md`

**Step 1: Write the failing test**

```md
- [ ] Missing runbook for: local setup, migrations, crawler trigger, advisor smoke test
```

**Step 2: Run test to verify it fails**

Run: `rg "local setup, migrations, crawler trigger, advisor smoke test" docs/runbooks/mvp-verification.md`
Expected: FAIL with `No such file or directory`

**Step 3: Write minimal implementation**

```md
# MVP Verification Runbook

## Local setup
- `pnpm install`
- `cd apps/crawler && pip install -r requirements.txt`

## Apply DB migrations
- `supabase db push`

## Trigger crawler manually
- `python apps/crawler/main.py`

## Advisor smoke test
- 注册新用户并填写企业信息
- 输入完整业务需求并确认返回 1-3 个方案
- 点击导出按钮验证 PDF 可下载
```

**Step 4: Run test to verify it passes**

Run: `rg "local setup, migrations, crawler trigger, advisor smoke test" docs/runbooks/mvp-verification.md`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md docs/runbooks/mvp-verification.md
git commit -m "docs: add mvp verification runbook"
```

## 交付验证命令（全部任务完成后）

```bash
pnpm --filter web test
pnpm --filter web exec playwright test
cd apps/crawler && pytest -v
pnpm --filter web lint
```

预期结果：全部 PASS。
