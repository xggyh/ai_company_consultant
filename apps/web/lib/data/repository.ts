import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addFavorite as addMockFavorite,
  appendConversation as appendMockConversation,
  getArticles,
  getConversations,
  getFavorites,
  getModels,
  getProfile,
  upsertProfile,
  type UserProfile,
} from "../mock-data";
import { derivePreferredScenarios, rankArticles, rankModels } from "../recommendations/query";
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

export type Conversation = {
  id: string;
  title: string;
  updated_at: string;
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
  }>;
  articles: Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    tags: string[];
  }>;
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
};

export type DataRepository = {
  getProfile: () => Promise<UserProfile>;
  upsertProfile: (profile: UserProfile) => Promise<UserProfile>;
  getFeed: (profile: UserProfile) => Promise<FeedData>;
  getModelById: (id: string) => Promise<ModelDetail | null>;
  getArticleById: (id: string) => Promise<ArticleDetail | null>;
  getFavorites: () => Promise<{ model_ids: string[]; article_ids: string[] }>;
  addFavorite: (payload: FavoritePayload) => Promise<{ model_ids: string[]; article_ids: string[] }>;
  getConversations: () => Promise<Conversation[]>;
  appendConversation: (title: string) => Promise<Conversation>;
  persistMessage: (input: PersistMessageInput) => Promise<void>;
  persistSolution: (input: PersistSolutionInput) => Promise<void>;
  getDashboardData: () => Promise<DashboardData>;
};

function toFeedFromMock(profile: UserProfile): FeedData {
  const models = rankModels(getModels(), {
    company_industry: profile.company_industry,
    company_scale: profile.company_scale,
    preferred_scenarios: ["决策辅助", "自动化工作流", "知识问答"],
  });

  return {
    query: {
      industry: profile.company_industry,
      scale: profile.company_scale,
      limit: 20,
    },
    models: models.slice(0, 8),
    articles: getArticles().slice(0, 8),
  };
}

function createMockRepository(): DataRepository {
  return {
    async getProfile() {
      return getProfile();
    },
    async upsertProfile(profile: UserProfile) {
      return upsertProfile(profile);
    },
    async getFeed(profile: UserProfile) {
      return toFeedFromMock(profile);
    },
    async getModelById(id: string) {
      const row = getModels().find((model) => model.id === id);
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        provider: row.provider,
        description: row.description,
        business_scenarios: row.business_scenarios,
        cost_input: row.cost_input,
        cost_output: row.cost_output,
        api_url: "",
        docs_url: "",
        source_url: "",
        release_date: "",
      };
    },
    async getArticleById(id: string) {
      const row = getArticles().find((article) => article.id === id);
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        content: "",
        source: row.source,
        url: "",
        tags: row.tags,
        published_at: "",
      };
    },
    async getFavorites() {
      return getFavorites();
    },
    async addFavorite(payload: FavoritePayload) {
      return addMockFavorite(payload);
    },
    async getConversations() {
      return getConversations();
    },
    async appendConversation(title: string) {
      return appendMockConversation(title);
    },
    async persistMessage() {
      return;
    },
    async persistSolution() {
      return;
    },
    async getDashboardData() {
      const profile = getProfile();
      const feed = toFeedFromMock(profile);
      return {
        profile,
        models: feed.models,
        articles: feed.articles,
        conversations: getConversations(),
        favorites: getFavorites(),
      };
    },
  };
}

async function ensureUser(client: SupabaseClient, profile: UserProfile) {
  const { data: existing } = await client
    .from("users")
    .select("id,email,company_name,company_industry,company_scale")
    .eq("email", profile.email)
    .maybeSingle();

  if (existing?.id) {
    return existing;
  }

  const { data: inserted, error } = await client
    .from("users")
    .insert(profile)
    .select("id,email,company_name,company_industry,company_scale")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Failed to create user");
  }

  return inserted;
}

function toProfile(data: Record<string, unknown>): UserProfile {
  return {
    email: String(data.email || DEMO_EMAIL),
    company_name: String(data.company_name || "Demo Corp"),
    company_industry: String(data.company_industry || "企业服务（SaaS）"),
    company_scale: String(data.company_scale || "中型（100-500人）"),
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

function createSupabaseRepository(client: SupabaseClient): DataRepository {
  const mock = createMockRepository();

  return {
    async getProfile() {
      try {
        const defaultProfile: UserProfile = {
          email: DEMO_EMAIL,
          company_name: "Demo Corp",
          company_industry: "企业服务（SaaS）",
          company_scale: "中型（100-500人）",
        };

        const user = await ensureUser(client, defaultProfile);
        return toProfile(user as Record<string, unknown>);
      } catch {
        return mock.getProfile();
      }
    },

    async upsertProfile(profile: UserProfile) {
      try {
        const { data, error } = await client
          .from("users")
          .upsert(profile, { onConflict: "email" })
          .select("email,company_name,company_industry,company_scale")
          .single();

        if (error || !data) {
          throw new Error(error?.message || "Failed to upsert profile");
        }

        return toProfile(data as Record<string, unknown>);
      } catch {
        return mock.upsertProfile(profile);
      }
    },

    async getFeed(profile: UserProfile) {
      try {
        const [{ data: models }, { data: articles }] = await Promise.all([
          client
            .from("models")
            .select("id,name,provider,description,business_scenarios,cost_input,cost_output")
            .order("updated_at", { ascending: false })
            .limit(20),
          client
            .from("articles")
            .select("id,title,summary,source,tags")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

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
        const ranked = rankModels(modelRows, {
          company_industry: profile.company_industry,
          company_scale: profile.company_scale,
          preferred_scenarios: preferred,
        });

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
            limit: 20,
          },
          models: ranked.slice(0, 8),
          articles: rankedArticles.slice(0, 8),
        };
      } catch {
        return {
          query: {
            industry: profile.company_industry,
            scale: profile.company_scale,
            limit: 20,
          },
          models: [],
          articles: [],
        };
      }
    },

    async getModelById(id: string) {
      try {
        const { data, error } = await client
          .from("models")
          .select(
            "id,name,provider,description,business_scenarios,cost_input,cost_output,api_url,docs_url,source_url,release_date",
          )
          .eq("id", id)
          .maybeSingle();
        if (error || !data) {
          return null;
        }
        return toModelDetail(data as Record<string, unknown>);
      } catch {
        return null;
      }
    },

    async getArticleById(id: string) {
      try {
        const { data, error } = await client
          .from("articles")
          .select("id,title,summary,content,source,url,tags,published_at")
          .eq("id", id)
          .maybeSingle();
        if (error || !data) {
          return null;
        }
        return toArticleDetail(data as Record<string, unknown>);
      } catch {
        return null;
      }
    },

    async getFavorites() {
      try {
        const profile = await this.getProfile();
        const user = await ensureUser(client, profile);

        const { data } = await client
          .from("favorites")
          .select("model_id,article_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const model_ids = (data || [])
          .map((row) => row.model_id)
          .filter((value): value is string => typeof value === "string");
        const article_ids = (data || [])
          .map((row) => row.article_id)
          .filter((value): value is string => typeof value === "string");

        return { model_ids, article_ids };
      } catch {
        return mock.getFavorites();
      }
    },

    async addFavorite(payload: FavoritePayload) {
      try {
        const profile = await this.getProfile();
        const user = await ensureUser(client, profile);

        await client.from("favorites").insert({
          user_id: user.id,
          model_id: payload.model_id ?? null,
          article_id: payload.article_id ?? null,
        });

        return this.getFavorites();
      } catch {
        return mock.addFavorite(payload);
      }
    },

    async getConversations() {
      try {
        const profile = await this.getProfile();
        const user = await ensureUser(client, profile);

        const { data } = await client
          .from("conversations")
          .select("id,title,updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(30);

        if (!data || data.length === 0) {
          return mock.getConversations();
        }

        return (data as Array<Record<string, unknown>>).map(toConversation);
      } catch {
        return mock.getConversations();
      }
    },

    async appendConversation(title: string) {
      try {
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
      } catch {
        return mock.appendConversation(title);
      }
    },

    async persistMessage(input: PersistMessageInput) {
      try {
        await client.from("messages").insert({
          conversation_id: input.conversation_id,
          role: input.role,
          content: input.content,
          agent_type: input.agent_type ?? null,
        });
      } catch {
        return;
      }
    },

    async persistSolution(input: PersistSolutionInput) {
      try {
        const profile = await this.getProfile();
        const user = await ensureUser(client, profile);

        await client.from("solutions").insert({
          user_id: user.id,
          conversation_id: input.conversation_id,
          title: input.title,
          content: input.content,
          pdf_url: null,
        });
      } catch {
        return;
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
      };
    },
  };
}

export function getDataRepository(): DataRepository {
  const client = createSupabaseAdminClient();
  if (!client) {
    return createMockRepository();
  }
  return createSupabaseRepository(client);
}
