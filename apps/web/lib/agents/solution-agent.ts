import { estimateMonthlyCost } from "../cost/calculate";
import { createArkClient, requestArkJson, type ArkClientLike } from "../ark/client";

type BuildSolutionOptions = {
  arkClient?: ArkClientLike;
  model?: string;
};

type BuildInput = {
  industry: string;
  pain_points: string[];
  goals: string[];
};

type SolutionOutput = {
  title: string;
  architecture: string;
  estimated_monthly_cost: number;
  roi_hypothesis: string;
  risks: string[];
};

function fallbackSolution(input: BuildInput): SolutionOutput[] {
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

function normalizeSolutions(payload: unknown): SolutionOutput[] | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const list = record.solutions;
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const normalized = list
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title : "";
      const architecture = typeof row.architecture === "string" ? row.architecture : "";
      const cost =
        typeof row.estimated_monthly_cost === "number" ? row.estimated_monthly_cost : NaN;
      const roi = typeof row.roi_hypothesis === "string" ? row.roi_hypothesis : "";
      const risks = Array.isArray(row.risks)
        ? row.risks.filter((risk): risk is string => typeof risk === "string")
        : [];

      if (!title || !architecture || !Number.isFinite(cost) || !roi) {
        return null;
      }

      return {
        title,
        architecture,
        estimated_monthly_cost: cost,
        roi_hypothesis: roi,
        risks,
      };
    })
    .filter((item): item is SolutionOutput => item !== null);

  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, 3);
}

export async function buildSolution(
  input: BuildInput,
  options: BuildSolutionOptions = {},
): Promise<SolutionOutput[]> {
  const fromEnv = process.env.NODE_ENV === "test" ? null : createArkClient();
  const arkClient = options.arkClient ?? fromEnv?.client;
  const model = options.model ?? fromEnv?.model;

  if (arkClient && model) {
    try {
      const payload = await requestArkJson({
        client: arkClient,
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "你是企业AI顾问的方案设计Agent。严格返回JSON对象，字段必须为 solutions 数组，每项包含 title, architecture, estimated_monthly_cost, roi_hypothesis, risks。不要输出额外文本。",
          },
          {
            role: "user",
            content: `行业：${input.industry}\n痛点：${input.pain_points.join("、")}\n目标：${input.goals.join("、")}`,
          },
        ],
      });
      const solutions = normalizeSolutions(payload);
      if (solutions) {
        return solutions;
      }
    } catch {
      // Fall back when network/API/schema parsing fails.
    }
  }

  return fallbackSolution(input);
}
