import { createArkClient, requestArkJson, type ArkClientLike } from "../ark/client";

type BuildSolutionOptions = {
  arkClient?: ArkClientLike;
  model?: string;
};

type BuildInput = {
  raw_user_input: string;
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

function toCostNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const matched = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (matched) {
      const num = Number(matched[0]);
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }
  return Number.NaN;
}

function normalizeSolutions(payload: unknown): SolutionOutput[] | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const list = record.solutions ?? record.solution ?? record.plans;
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const normalized = list
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const title =
        typeof row.title === "string"
          ? row.title
          : typeof row.name === "string"
            ? row.name
            : typeof row.plan_name === "string"
              ? row.plan_name
              : "";
      const architecture =
        typeof row.architecture === "string"
          ? row.architecture
          : typeof row.plan === "string"
            ? row.plan
            : typeof row.solution === "string"
              ? row.solution
              : "";
      const cost = toCostNumber(row.estimated_monthly_cost ?? row.monthly_cost ?? row.estimated_cost);
      const roi =
        typeof row.roi_hypothesis === "string"
          ? row.roi_hypothesis
          : typeof row.roi === "string"
            ? row.roi
            : typeof row.roi_assumption === "string"
              ? row.roi_assumption
              : "";
      const risks = Array.isArray(row.risks)
        ? row.risks.filter((risk): risk is string => typeof risk === "string")
        : typeof row.risks === "string"
          ? row.risks
              .split(/[，,、；;\n]/)
              .map((item) => item.trim())
              .filter(Boolean)
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

function resolveArk(options: BuildSolutionOptions): { client: ArkClientLike; model: string } {
  if (options.arkClient && options.model) {
    return { client: options.arkClient, model: options.model };
  }

  const fromEnv = createArkClient();
  if (!fromEnv) {
    throw new Error("ARK is not configured for solution generation");
  }

  return { client: options.arkClient ?? fromEnv.client, model: options.model ?? fromEnv.model };
}

export async function buildSolution(
  input: BuildInput,
  options: BuildSolutionOptions = {},
): Promise<SolutionOutput[]> {
  const { client, model } = resolveArk(options);

  const payload = await requestArkJson({
    client,
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
        content:
          `用户原始需求：${input.raw_user_input}\n` +
          `结构化信息：行业=${input.industry}；痛点=${input.pain_points.join("、")}；目标=${input.goals.join("、")}`,
      },
    ],
  });

  let solutions = normalizeSolutions(payload);
  if (!solutions) {
    const repairedPayload = await requestArkJson({
      client,
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是JSON修复助手。只输出JSON对象，字段必须为 solutions 数组，每项必须包含 title, architecture, estimated_monthly_cost, roi_hypothesis, risks。",
        },
        {
          role: "user",
          content:
            `请把下列对象修正为指定结构，不要解释：${JSON.stringify(payload)}\n` +
            `补充上下文：${input.raw_user_input}`,
        },
      ],
    });
    solutions = normalizeSolutions(repairedPayload);
  }

  if (!solutions) {
    throw new Error("Invalid Ark solution payload");
  }

  return solutions;
}
