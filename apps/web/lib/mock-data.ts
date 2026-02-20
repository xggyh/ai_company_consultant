export type UserProfile = {
  email: string;
  company_name: string;
  company_industry: string;
  company_scale: string;
};

export type ModelCard = {
  id: string;
  name: string;
  provider: string;
  description: string;
  business_scenarios: string[];
  cost_input: number;
  cost_output: number;
};

export type ArticleCard = {
  id: string;
  title: string;
  summary: string;
  source: string;
  tags: string[];
};

export type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

const sampleModels: ModelCard[] = [
  {
    id: "m-ark-1",
    name: "Ark Enterprise Chat",
    provider: "ByteDance Ark",
    description: "面向企业问答、分析与流程自动化的通用模型。",
    business_scenarios: ["决策辅助", "知识问答", "自动化工作流"],
    cost_input: 3.2,
    cost_output: 9.8,
  },
  {
    id: "m-vision-1",
    name: "Vision Analyst",
    provider: "OpenRouter",
    description: "图文多模态识别与报表摘要。",
    business_scenarios: ["数据分析", "多模态"],
    cost_input: 4.8,
    cost_output: 12.4,
  },
  {
    id: "m-code-1",
    name: "Code Copilot Pro",
    provider: "LiteLLM",
    description: "代码生成、审查与异常定位。",
    business_scenarios: ["代码辅助", "自动化工作流"],
    cost_input: 2.9,
    cost_output: 8.3,
  },
];

const sampleArticles: ArticleCard[] = [
  {
    id: "a-1",
    title: "AI Agent 在企业运营中的 ROI 实战",
    summary: "围绕销售、客服、运营三个场景给出落地指标与成本模型。",
    source: "InfoQ 中国",
    tags: ["决策辅助", "自动化工作流"],
  },
  {
    id: "a-2",
    title: "多模态模型如何优化质检效率",
    summary: "制造与零售行业使用图像+文本模型的质量控制案例。",
    source: "机器之心",
    tags: ["图像处理", "数据分析"],
  },
  {
    id: "a-3",
    title: "企业私有知识库问答的架构清单",
    summary: "从数据清洗到检索增强的完整实施路径。",
    source: "量子位",
    tags: ["知识问答", "文档处理"],
  },
];

const sampleConversations: Conversation[] = [
  {
    id: "c-1",
    title: "销售转化提升方案",
    updated_at: "今天 11:30",
  },
  {
    id: "c-2",
    title: "客服自动化降本",
    updated_at: "昨天 18:12",
  },
];

const state = {
  profile: {
    email: "demo@company.com",
    company_name: "Demo Corp",
    company_industry: "企业服务（SaaS）",
    company_scale: "中型（100-500人）",
  } as UserProfile,
  models: sampleModels,
  articles: sampleArticles,
  favorites: {
    model_ids: ["m-ark-1"],
    article_ids: ["a-1"],
  },
  conversations: sampleConversations,
};

export function getProfile() {
  return state.profile;
}

export function upsertProfile(profile: UserProfile) {
  state.profile = profile;
  return state.profile;
}

export function getModels() {
  return state.models;
}

export function getArticles() {
  return state.articles;
}

export function getFavorites() {
  return state.favorites;
}

export function addFavorite(payload: { model_id?: string; article_id?: string }) {
  if (payload.model_id && !state.favorites.model_ids.includes(payload.model_id)) {
    state.favorites.model_ids.push(payload.model_id);
  }
  if (payload.article_id && !state.favorites.article_ids.includes(payload.article_id)) {
    state.favorites.article_ids.push(payload.article_id);
  }
  return getFavorites();
}

export function getConversations() {
  return state.conversations;
}

export function appendConversation(title: string) {
  const next = {
    id: `c-${state.conversations.length + 1}`,
    title,
    updated_at: "刚刚",
  };
  state.conversations.unshift(next);
  return next;
}
