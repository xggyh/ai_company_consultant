type Model = {
  business_scenarios: string[];
  provider: string;
  cost_input?: number;
  cost_output?: number;
};
type Profile = { company_industry: string; preferred_scenarios: string[] };

const INDUSTRY_SCENARIO_HINTS: Record<string, string[]> = {
  "企业服务（SaaS）": ["决策辅助", "自动化工作流", "知识问答"],
  制造业: ["图像处理", "自动化工作流", "数据分析"],
  医疗健康: ["知识问答", "决策辅助", "文档处理"],
  教育培训: ["内容生成", "知识问答", "文档处理"],
};

export function scoreModel(model: Model, profile: Profile): number {
  const normalizedModelScenarios = new Set(model.business_scenarios);
  const industryHints = INDUSTRY_SCENARIO_HINTS[profile.company_industry] ?? [];
  const inputCost = typeof model.cost_input === "number" ? model.cost_input : null;
  const outputCost = typeof model.cost_output === "number" ? model.cost_output : null;
  const preferredMatches = profile.preferred_scenarios.filter((scenario) =>
    normalizedModelScenarios.has(scenario),
  ).length;
  const hasIndustryMatch = industryHints.some((scenario) => normalizedModelScenarios.has(scenario));
  const knownCost =
    inputCost !== null && inputCost > 0 && outputCost !== null && outputCost > 0;
  let costBonus = 3;
  if (knownCost) {
    const total = inputCost + outputCost;
    costBonus = total <= 8 ? 10 : total <= 20 ? 6 : 3;
  }

  let score = 30;
  score += Math.min(40, preferredMatches * 20);
  score += hasIndustryMatch ? 25 : 0;
  score += model.provider ? 5 : 0;
  score += Math.min(10, normalizedModelScenarios.size * 8);
  score += costBonus;
  if (preferredMatches > 0 && hasIndustryMatch) score += 5;
  return Math.min(score, 100);
}
