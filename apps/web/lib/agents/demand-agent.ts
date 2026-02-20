import type { DemandAnalysis } from "./types";
import { createArkClient, requestArkJson, type ArkClientLike } from "../ark/client";

type AnalyzeDemandOptions = {
  arkClient?: ArkClientLike;
  model?: string;
};

function analyzeDemandByRules(input: { user_input: string }): DemandAnalysis {
  const text = input.user_input;
  const hasIndustry = /行业|电商|金融|制造|医疗|SaaS|企业服务/.test(input.user_input);
  const hasGoal = /提升|降低|增长|效率|成本|转化/.test(input.user_input);

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
      industry: inferIndustry(text),
      scale: inferScale(text),
      pain_points: [inferPainPoint(text)],
      goals: [inferGoal(text)],
    },
  };
}

function inferIndustry(text: string): string {
  if (/SaaS|企业服务/.test(text)) return "企业服务（SaaS）";
  if (/金融|Fintech/.test(text)) return "金融科技";
  if (/制造|工厂/.test(text)) return "制造业";
  if (/医疗|医院/.test(text)) return "医疗健康";
  if (/教育/.test(text)) return "教育培训";
  return "其他";
}

function inferScale(text: string): string {
  const match = text.match(/(\d{2,5})\s*人/);
  const count = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(count)) return "中型（100-500人）";
  if (count < 20) return "初创（<20人）";
  if (count < 100) return "小型（20-100人）";
  if (count < 500) return "中型（100-500人）";
  if (count < 2000) return "大型（500-2000人）";
  return "超大型（>2000人）";
}

function inferPainPoint(text: string): string {
  if (/转化率低|成交率低|线索/.test(text)) return "销售线索转化效率不足";
  if (/客服|工单/.test(text)) return "客服响应效率与一致性不足";
  if (/成本高|人力/.test(text)) return "人工成本偏高";
  return "业务流程自动化程度不足";
}

function inferGoal(text: string): string {
  if (/提升|增长|转化|成交/.test(text)) return "提升关键业务指标";
  if (/降低|降本/.test(text)) return "降低运营成本";
  if (/效率/.test(text)) return "提升团队效率";
  return "形成可量化的 AI 落地方案";
}

function normalizeDemandPayload(payload: unknown): DemandAnalysis | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const demand = record.demand as Record<string, unknown> | undefined;
  const followUp = record.need_follow_up === true;
  const followUpQuestion =
    typeof record.follow_up_question === "string" ? record.follow_up_question : "";

  if (followUp) {
    return {
      need_follow_up: true,
      follow_up_question: followUpQuestion || "请补充行业、团队规模、当前痛点和希望达成的目标。",
      demand: null,
    };
  }

  if (!demand || typeof demand !== "object") {
    return null;
  }

  const industry = typeof demand.industry === "string" ? demand.industry : "";
  const scale = typeof demand.scale === "string" ? demand.scale : "";
  const painPoints = Array.isArray(demand.pain_points)
    ? demand.pain_points.filter((item): item is string => typeof item === "string")
    : [];
  const goals = Array.isArray(demand.goals)
    ? demand.goals.filter((item): item is string => typeof item === "string")
    : [];

  if (!industry || !scale || painPoints.length === 0 || goals.length === 0) {
    return null;
  }

  return {
    need_follow_up: false,
    follow_up_question: "",
    demand: {
      industry,
      scale,
      pain_points: painPoints,
      goals,
    },
  };
}

export async function analyzeDemand(
  input: { user_input: string },
  options: AnalyzeDemandOptions = {},
): Promise<DemandAnalysis> {
  const fromEnv = process.env.NODE_ENV === "test" ? null : createArkClient();
  const arkClient = options.arkClient ?? fromEnv?.client;
  const model = options.model ?? fromEnv?.model;

  if (arkClient && model) {
    try {
      const payload = await requestArkJson({
        client: arkClient,
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "你是企业AI顾问的需求理解Agent。严格返回JSON对象，字段必须包含 need_follow_up, follow_up_question, demand(industry, scale, pain_points, goals)。不要返回额外说明。",
          },
          {
            role: "user",
            content: `用户输入：${input.user_input}`,
          },
        ],
      });
      const normalized = normalizeDemandPayload(payload);
      if (normalized) {
        return normalized;
      }
    } catch {
      // Fall back to deterministic rules when API fails or returns invalid JSON.
    }
  }

  return analyzeDemandByRules(input);
}
