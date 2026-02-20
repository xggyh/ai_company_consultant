import type { SupabaseClient } from "@supabase/supabase-js";
import { createArkClient, requestArkJson } from "../ark/client";
import { derivePreferredScenarios, rankArticles } from "../recommendations/query";
import { createSupabaseAdminClient } from "../supabase/client";

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || "demo@company.com";

type FavoritePayload = { model_id?: string; article_id?: string };

type PersistMessageInput = {
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  agent_type?: "demand" | "solution";
};

type PersistSolutionInput = {
  conversation_id: string;
  title: string;
  content: unknown;
};

export type UserProfile = {
  email: string;
  company_name: string;
  company_industry: string;
  company_scale: string;
};

export type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

export type CrawlStatus = "success" | "partial" | "failed" | "unknown";

export type CrawlState = {
  latest_status: CrawlStatus;
  latest_started_at: string;
  latest_finished_at: string;
  last_success_at: string;
  warning: string | null;
  error_message: string;
};

export type FeedData = {
  query: {
    industry: string;
    scale: string;
    limit: number;
  };
  models: Array<{
    id: string;
    name: string;
    provider: string;
    description: string;
    business_scenarios: string[];
    cost_input: number;
    cost_output: number;
    score: number;
    group: "featured" | "practical";
    capability_score: number;
    delivery_score: number;
    composite_score: number;
    best_for: string;
    fit_team: string;
    budget_tier: string;
    rollout_difficulty: string;
    avoid_when: string;
  }>;
  articles: Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    tags: string[];
  }>;
  crawl: CrawlState;
};

type FeedModelBase = {
  id: string;
  name: string;
  provider: string;
  description: string;
  business_scenarios: string[];
  cost_input: number;
  cost_output: number;
};

export type ModelDetail = {
  id: string;
  name: string;
  provider: string;
  description: string;
  business_scenarios: string[];
  cost_input: number;
  cost_output: number;
  api_url: string;
  docs_url: string;
  source_url: string;
  release_date: string;
};

export type ArticleDetail = {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  url: string;
  tags: string[];
  published_at: string;
};

export type DashboardData = {
  profile: UserProfile;
  models: FeedData["models"];
  articles: FeedData["articles"];
  conversations: Conversation[];
  favorites: {
    model_ids: string[];
    article_ids: string[];
  };
  crawl: CrawlState;
};

export type DataRepository = {
  getProfile: () => Promise<UserProfile>;
  upsertProfile: (profile: UserProfile) => Promise<UserProfile>;
  getFeed: (profile: UserProfile) => Promise<FeedData>;
  getModelById: (id: string) => Promise<ModelDetail | null>;
  getArticleById: (id: string) => Promise<ArticleDetail | null>;
  getFavorites: () => Promise<{ model_ids: string[]; article_ids: string[] }>;
  addFavorite: (payload: FavoritePayload) => Promise<{ model_ids: string[]; article_ids: string[] }>;
  removeFavorite: (payload: FavoritePayload) => Promise<{ model_ids: string[]; article_ids: string[] }>;
  getConversations: () => Promise<Conversation[]>;
  appendConversation: (title: string) => Promise<Conversation>;
  persistMessage: (input: PersistMessageInput) => Promise<void>;
  persistSolution: (input: PersistSolutionInput) => Promise<void>;
  getDashboardData: () => Promise<DashboardData>;
};

function defaultProfile(): UserProfile {
  return {
    email: DEMO_EMAIL,
    company_name: "Demo Corp",
    company_industry: "企业服务（SaaS）",
    company_scale: "中型（100-500人）",
  };
}

async function ensureUser(client: SupabaseClient, profile: UserProfile) {
  const { data: existing, error: selectError } = await client
    .from("users")
    .select("id,email,company_name,company_industry,company_scale")
    .eq("email", profile.email)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing?.id) {
    return existing;
  }

  const { data: inserted, error: insertError } = await client
    .from("users")
    .insert(profile)
    .select("id,email,company_name,company_industry,company_scale")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Failed to create user");
  }

  return inserted;
}

function toProfile(data: Record<string, unknown>): UserProfile {
  const fallback = defaultProfile();
  return {
    email: String(data.email || fallback.email),
    company_name: String(data.company_name || fallback.company_name),
    company_industry: String(data.company_industry || fallback.company_industry),
    company_scale: String(data.company_scale || fallback.company_scale),
  };
}

function toConversation(item: Record<string, unknown>): Conversation {
  return {
    id: String(item.id),
    title: String(item.title || "未命名对话"),
    updated_at: new Date(String(item.updated_at || Date.now())).toLocaleString("zh-CN"),
  };
}

function toModelDetail(item: Record<string, unknown>): ModelDetail {
  return {
    id: String(item.id),
    name: String(item.name || "Unknown Model"),
    provider: String(item.provider || "Unknown"),
    description: String(item.description || ""),
    business_scenarios: Array.isArray(item.business_scenarios)
      ? item.business_scenarios.filter((value): value is string => typeof value === "string")
      : [],
    cost_input: Number(item.cost_input || 0),
    cost_output: Number(item.cost_output || 0),
    api_url: String(item.api_url || ""),
    docs_url: String(item.docs_url || ""),
    source_url: String(item.source_url || ""),
    release_date: String(item.release_date || ""),
  };
}

function toArticleDetail(item: Record<string, unknown>): ArticleDetail {
  return {
    id: String(item.id),
    title: String(item.title || ""),
    summary: String(item.summary || ""),
    content: String(item.content || ""),
    source: String(item.source || ""),
    url: String(item.url || ""),
    tags: Array.isArray(item.tags)
      ? item.tags.filter((value): value is string => typeof value === "string")
      : [],
    published_at: String(item.published_at || ""),
  };
}

async function getCrawlerState(client: SupabaseClient): Promise<CrawlState> {
  const latestQuery = client
    .from("crawler_runs")
    .select("status,started_at,finished_at,error_message")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const successQuery = client
    .from("crawler_runs")
    .select("finished_at")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: latest, error: latestError }, { data: latestSuccess, error: successError }] =
    await Promise.all([latestQuery, successQuery]);

  if (latestError || successError) {
    return {
      latest_status: "unknown",
      latest_started_at: "",
      latest_finished_at: "",
      last_success_at: "",
      warning: "crawler_runs 尚未初始化，当前仅展示历史已入库数据。",
      error_message: latestError?.message || successError?.message || "",
    };
  }

  if (!latest) {
    return {
      latest_status: "unknown",
      latest_started_at: "",
      latest_finished_at: "",
      last_success_at: "",
      warning: "暂无爬虫运行记录，当前仅展示历史已入库数据。",
      error_message: "",
    };
  }

  const status = String(latest.status || "unknown") as CrawlStatus;
  const latestStartedAt = String(latest.started_at || "");
  const latestFinishedAt = String(latest.finished_at || "");
  const lastSuccessAt = String(latestSuccess?.finished_at || "");
  const errorMessage = String(latest.error_message || "");

  if (status === "success") {
    return {
      latest_status: status,
      latest_started_at: latestStartedAt,
      latest_finished_at: latestFinishedAt,
      last_success_at: lastSuccessAt,
      warning: null,
      error_message: "",
    };
  }

  const lastSuccessText = lastSuccessAt
    ? `最近一次成功时间：${new Date(lastSuccessAt).toLocaleString("zh-CN")}`
    : "尚无成功运行记录";

  return {
    latest_status: status,
    latest_started_at: latestStartedAt,
    latest_finished_at: latestFinishedAt,
    last_success_at: lastSuccessAt,
    warning: `本次数据更新${status === "failed" ? "失败" : "部分失败"}，当前展示历史已入库数据。${lastSuccessText}`,
    error_message: errorMessage,
  };
}

function toScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === "string") {
    const matched = value.match(/-?\d+(\.\d+)?/);
    if (matched) {
      const num = Number(matched[0]);
      if (Number.isFinite(num)) {
        return Math.max(0, Math.min(100, Math.round(num)));
      }
    }
  }
  return Number.NaN;
}

function toRequiredText(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid Ark model field: ${field}`);
  }
  return value.trim();
}

function normalizeArkModelViews(
  payload: unknown,
  modelMap: Map<string, FeedModelBase>,
): FeedData["models"] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid Ark model ranking payload");
  }
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.models)) {
    throw new Error("Ark model ranking missing models array");
  }

  const result: FeedData["models"] = [];
  const used = new Set<string>();

  for (const item of record.models) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as Record<string, unknown>;
    const id = toRequiredText(row.id, "id");
    if (used.has(id)) {
      continue;
    }
    const base = modelMap.get(id);
    if (!base) {
      continue;
    }

    const group = row.group === "featured" ? "featured" : row.group === "practical" ? "practical" : null;
    if (!group) {
      throw new Error(`Invalid Ark model group for ${id}`);
    }

    const capability = toScore(row.capability_score);
    const delivery = toScore(row.delivery_score);
    const composite = toScore(row.composite_score);
    if (!Number.isFinite(capability) || !Number.isFinite(delivery) || !Number.isFinite(composite)) {
      throw new Error(`Invalid Ark model score for ${id}`);
    }

    result.push({
      ...base,
      score: composite,
      group,
      capability_score: capability,
      delivery_score: delivery,
      composite_score: composite,
      best_for: toRequiredText(row.best_for, "best_for"),
      fit_team: toRequiredText(row.fit_team, "fit_team"),
      budget_tier: toRequiredText(row.budget_tier, "budget_tier"),
      rollout_difficulty: toRequiredText(row.rollout_difficulty, "rollout_difficulty"),
      avoid_when: toRequiredText(row.avoid_when, "avoid_when"),
    });

    used.add(id);
  }

  if (result.length === 0) {
    throw new Error("Ark returned empty model ranking");
  }
  if (result.length !== modelMap.size) {
    throw new Error("Ark model ranking is incomplete");
  }

  return result;
}

async function buildModelViewsWithArk(
  models: FeedModelBase[],
  profile: UserProfile,
): Promise<FeedData["models"]> {
  if (models.length === 0) {
    return [];
  }

  const ark = createArkClient();
  if (!ark) {
    throw new Error("ARK is not configured for model ranking");
  }

  const modelMap = new Map(models.map((model) => [model.id, model]));
  const payload = await requestArkJson({
    client: ark.client,
    model: ark.model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "你是企业AI模型评估助手。必须返回JSON对象，包含 models 数组。每项必须包含 id, group(featured|practical), capability_score(0-100), delivery_score(0-100), composite_score(0-100), best_for, fit_team, budget_tier, rollout_difficulty, avoid_when。不得输出任何额外文本。",
      },
      {
        role: "user",
        content:
          `企业画像：行业=${profile.company_industry}，规模=${profile.company_scale}。\n` +
          "请对候选模型分组和排序：\n" +
          "1) featured 表示旗舰与能力上限高模型，practical 表示普适落地模型；\n" +
          "2) 若候选里存在 Google/OpenAI/Anthropic/Qwen/Doubao/ChatGLM 系列，请优先将其旗舰型号纳入 featured；\n" +
          "3) 只允许返回候选里的 id，不得虚构新 id；\n" +
          "4) 必须覆盖全部候选 id，每个 id 只能出现一次。\n" +
          `候选模型JSON：${JSON.stringify(models)}`,
      },
    ],
  });

  const normalized = normalizeArkModelViews(payload, modelMap);
  const featured = normalized
    .filter((model) => model.group === "featured")
    .sort((a, b) => b.composite_score - a.composite_score);
  const practical = normalized
    .filter((model) => model.group === "practical")
    .sort((a, b) => b.composite_score - a.composite_score);
  return [...featured, ...practical];
}

function createSupabaseRepository(client: SupabaseClient): DataRepository {
  return {
    async getProfile() {
      const user = await ensureUser(client, defaultProfile());
      return toProfile(user as Record<string, unknown>);
    },

    async upsertProfile(profile: UserProfile) {
      const { data, error } = await client
        .from("users")
        .upsert(profile, { onConflict: "email" })
        .select("email,company_name,company_industry,company_scale")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to upsert profile");
      }

      return toProfile(data as Record<string, unknown>);
    },

    async getFeed(profile: UserProfile) {
      const [{ data: models, error: modelError }, { data: articles, error: articleError }, crawl] =
        await Promise.all([
          client
            .from("models")
            .select("id,name,provider,description,business_scenarios,cost_input,cost_output")
            .order("updated_at", { ascending: false })
            .limit(60),
          client
            .from("articles")
            .select("id,title,summary,source,tags")
            .order("created_at", { ascending: false })
            .limit(20),
          getCrawlerState(client),
        ]);

      if (modelError) {
        throw new Error(modelError.message);
      }
      if (articleError) {
        throw new Error(articleError.message);
      }

      const modelRows = (models || []).map((row) => ({
        id: String(row.id),
        name: String(row.name || "Unknown Model"),
        provider: String(row.provider || "Unknown"),
        description: String(row.description || ""),
        business_scenarios: Array.isArray(row.business_scenarios)
          ? row.business_scenarios.filter((item): item is string => typeof item === "string")
          : [],
        cost_input: Number(row.cost_input || 0),
        cost_output: Number(row.cost_output || 0),
      }));

      const preferred = derivePreferredScenarios({
        company_industry: profile.company_industry,
        company_scale: profile.company_scale,
        preferred_scenarios: ["决策辅助", "自动化工作流", "知识问答"],
      });
      let ranked: FeedData["models"] = [];
      let modelRankingError = "";
      try {
        ranked = await buildModelViewsWithArk(modelRows, profile);
      } catch (error) {
        modelRankingError = error instanceof Error ? error.message : "Ark model ranking failed";
      }

      const articleRows = ((articles || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        title: String(row.title || ""),
        summary: String(row.summary || ""),
        source: String(row.source || ""),
        tags: Array.isArray(row.tags)
          ? row.tags.filter((item): item is string => typeof item === "string")
          : [],
      }));
      const rankedArticles = rankArticles(articleRows, {
        company_industry: profile.company_industry,
        company_scale: profile.company_scale,
        preferred_scenarios: preferred,
      });

      return {
        query: {
          industry: profile.company_industry,
          scale: profile.company_scale,
          limit: 60,
        },
        models: ranked.slice(0, 24),
        articles: rankedArticles.slice(0, 8),
        crawl: modelRankingError
          ? {
              ...crawl,
              warning: [crawl.warning, `模型评估服务暂不可用：${modelRankingError}`]
                .filter((item): item is string => Boolean(item && item.trim()))
                .join("；"),
              error_message: [crawl.error_message, modelRankingError]
                .filter((item): item is string => Boolean(item && item.trim()))
                .join(" | "),
            }
          : crawl,
      };
    },

    async getModelById(id: string) {
      const { data, error } = await client
        .from("models")
        .select(
          "id,name,provider,description,business_scenarios,cost_input,cost_output,api_url,docs_url,source_url,release_date",
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        return null;
      }
      return toModelDetail(data as Record<string, unknown>);
    },

    async getArticleById(id: string) {
      const { data, error } = await client
        .from("articles")
        .select("id,title,summary,content,source,url,tags,published_at")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        return null;
      }
      return toArticleDetail(data as Record<string, unknown>);
    },

    async getFavorites() {
      const profile = await this.getProfile();
      const user = await ensureUser(client, profile);

      const { data, error } = await client
        .from("favorites")
        .select("model_id,article_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const model_ids = (data || [])
        .map((row) => row.model_id)
        .filter((value): value is string => typeof value === "string");
      const article_ids = (data || [])
        .map((row) => row.article_id)
        .filter((value): value is string => typeof value === "string");

      return { model_ids, article_ids };
    },

    async addFavorite(payload: FavoritePayload) {
      const profile = await this.getProfile();
      const user = await ensureUser(client, profile);

      const { error } = await client.from("favorites").insert({
        user_id: user.id,
        model_id: payload.model_id ?? null,
        article_id: payload.article_id ?? null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return this.getFavorites();
    },

    async removeFavorite(payload: FavoritePayload) {
      const profile = await this.getProfile();
      const user = await ensureUser(client, profile);

      if (payload.model_id) {
        const { error } = await client
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("model_id", payload.model_id);
        if (error) {
          throw new Error(error.message);
        }
      }

      if (payload.article_id) {
        const { error } = await client
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("article_id", payload.article_id);
        if (error) {
          throw new Error(error.message);
        }
      }

      return this.getFavorites();
    },

    async getConversations() {
      const profile = await this.getProfile();
      const user = await ensureUser(client, profile);

      const { data, error } = await client
        .from("conversations")
        .select("id,title,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30);

      if (error) {
        throw new Error(error.message);
      }

      return ((data || []) as Array<Record<string, unknown>>).map(toConversation);
    },

    async appendConversation(title: string) {
      const profile = await this.getProfile();
      const user = await ensureUser(client, profile);

      const { data, error } = await client
        .from("conversations")
        .insert({ user_id: user.id, title })
        .select("id,title,updated_at")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to append conversation");
      }

      return toConversation(data as Record<string, unknown>);
    },

    async persistMessage(input: PersistMessageInput) {
      const { error } = await client.from("messages").insert({
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content,
        agent_type: input.agent_type ?? null,
      });
      if (error) {
        throw new Error(error.message);
      }
    },

    async persistSolution(input: PersistSolutionInput) {
      const profile = await this.getProfile();
      const user = await ensureUser(client, profile);

      const { error } = await client.from("solutions").insert({
        user_id: user.id,
        conversation_id: input.conversation_id,
        title: input.title,
        content: input.content,
        pdf_url: null,
      });
      if (error) {
        throw new Error(error.message);
      }
    },

    async getDashboardData() {
      const profile = await this.getProfile();
      const [feed, conversations, favorites] = await Promise.all([
        this.getFeed(profile),
        this.getConversations(),
        this.getFavorites(),
      ]);

      return {
        profile,
        models: feed.models,
        articles: feed.articles,
        conversations,
        favorites,
        crawl: feed.crawl,
      };
    },
  };
}

export function getDataRepository(): DataRepository {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase is not configured. Real-data mode requires SUPABASE_URL and service/anon key.");
  }
  return createSupabaseRepository(client);
}
