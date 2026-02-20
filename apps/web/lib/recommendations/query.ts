import { scoreModel } from "./score";

export type FeedProfile = {
  company_industry: string;
  company_scale: string;
  preferred_scenarios?: string[];
};

export type CandidateModel = {
  id: string;
  provider: string;
  business_scenarios: string[];
};

export type CandidateArticle = {
  id: string;
  source: string;
  tags: string[];
};

const INDUSTRY_SCENARIO_HINTS: Record<string, string[]> = {
  "企业服务（SaaS）": ["决策辅助", "自动化工作流", "知识问答"],
  制造业: ["图像处理", "数据分析", "自动化工作流"],
  医疗健康: ["知识问答", "文档处理", "决策辅助"],
  教育培训: ["内容生成", "知识问答", "文档处理"],
};

const SCALE_SCENARIO_HINTS: Record<string, string[]> = {
  "初创（<20人）": ["自动化工作流", "内容生成"],
  "小型（20-100人）": ["自动化工作流", "客服对话"],
  "中型（100-500人）": ["决策辅助", "知识问答"],
  "大型（500-2000人）": ["客服对话", "数据分析"],
  "超大型（>2000人）": ["自动化工作流", "数据分析"],
};

function uniq(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (!value || seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

export function derivePreferredScenarios(profile: FeedProfile): string[] {
  const explicit = profile.preferred_scenarios ?? [];
  const industryHints = INDUSTRY_SCENARIO_HINTS[profile.company_industry] ?? [];
  const scaleHints = SCALE_SCENARIO_HINTS[profile.company_scale] ?? [];
  return uniq([...explicit, ...industryHints, ...scaleHints]);
}

export function buildFeedQuery(profile: FeedProfile) {
  return {
    industry: profile.company_industry,
    scale: profile.company_scale,
    limit: 20,
  };
}

export function rankModels<T extends CandidateModel>(candidates: T[], profile: FeedProfile) {
  const preferred = derivePreferredScenarios(profile);
  return [...candidates]
    .map((item) => ({
      ...item,
      score: scoreModel(item, {
        company_industry: profile.company_industry,
        preferred_scenarios: preferred,
      }),
    }))
    .sort((a, b) => b.score - a.score);
}

export function rankArticles<T extends CandidateArticle>(candidates: T[], profile: FeedProfile) {
  const preferred = new Set(derivePreferredScenarios(profile));
  return [...candidates]
    .map((item, index) => {
      const matched = item.tags.filter((tag) => preferred.has(tag)).length;
      const score = 20 + matched * 30 + (item.source.includes("InfoQ") ? 5 : 0);
      return { item, index, score };
    })
    .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score))
    .map((row) => row.item);
}
