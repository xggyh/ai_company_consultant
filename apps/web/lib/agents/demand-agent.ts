import type { DemandAnalysis } from "./types";
import { createArkClient, requestArkJson, type ArkClientLike } from "../ark/client";

type AnalyzeDemandOptions = {
  arkClient?: ArkClientLike;
  model?: string;
};

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function readBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return null;
}

function readStringList(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const list = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      if (list.length > 0) {
        return list.map((item) => item.trim());
      }
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[，,、；;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeDemandPayload(payload: unknown): DemandAnalysis | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const demandCandidate =
    typeof record.demand === "object" && record.demand ? (record.demand as Record<string, unknown>) : record;
  const followUp = readBoolean(record, ["need_follow_up", "needFollowUp"]) === true;
  const followUpQuestion = readString(record, ["follow_up_question", "followUpQuestion", "question"]);

  if (followUp) {
    return {
      need_follow_up: true,
      follow_up_question: followUpQuestion || "请补充行业、团队规模、当前痛点和希望达成的目标。",
      demand: null,
    };
  }

  const industry = readString(demandCandidate, ["industry", "company_industry", "industry_name"]);
  const scale = readString(demandCandidate, ["scale", "company_scale", "team_size"]);
  const painPoints = readStringList(demandCandidate, [
    "pain_points",
    "painPoints",
    "pain",
    "challenges",
  ]);
  const goals = readStringList(demandCandidate, ["goals", "goal", "targets", "kpi"]);

  return {
    need_follow_up: false,
    follow_up_question: "",
    demand: {
      industry: industry || "未明确",
      scale: scale || "未明确",
      pain_points: painPoints,
      goals,
    },
  };
}

function resolveArk(options: AnalyzeDemandOptions): { client: ArkClientLike; model: string } {
  if (options.arkClient && options.model) {
    return { client: options.arkClient, model: options.model };
  }

  const fromEnv = createArkClient();
  if (!fromEnv) {
    throw new Error("ARK is not configured for demand analysis");
  }

  return { client: options.arkClient ?? fromEnv.client, model: options.model ?? fromEnv.model };
}

export async function analyzeDemand(
  input: { user_input: string },
  options: AnalyzeDemandOptions = {},
): Promise<DemandAnalysis> {
  const { client, model } = resolveArk(options);

  const payload = await requestArkJson({
    client,
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "你是企业AI顾问的需求理解Agent。优先先产出可执行初版，不要过度追问。仅在关键条件完全缺失且无法给出初版时，need_follow_up 才为 true。严格返回JSON对象，字段必须包含 need_follow_up, follow_up_question, demand(industry, scale, pain_points, goals)。不要返回额外说明。",
      },
      {
        role: "user",
        content: `用户输入：${input.user_input}`,
      },
    ],
  });

  const normalized = normalizeDemandPayload(payload);
  if (!normalized) {
    throw new Error("Invalid Ark demand payload");
  }

  return normalized;
}
