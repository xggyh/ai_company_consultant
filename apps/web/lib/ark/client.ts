import OpenAI from "openai";

export const DEFAULT_ARK_BASE_URL = "https://ark-ap-southeast.byteintl.net/api/v3";
export const DEFAULT_ARK_MODEL = "ep-20250831170629-d8d45";

type EnvSource = Record<string, string | undefined>;

export type ArkConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
};

export type ArkMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ArkClientLike = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: ArkMessage[];
        temperature?: number;
        response_format?: { type: "json_object" };
      }) => Promise<{
        choices: Array<{
          message: {
            content: string | null;
          };
        }>;
      }>;
    };
  };
};

type RequestArkJsonParams = {
  client: ArkClientLike;
  model: string;
  messages: ArkMessage[];
  temperature?: number;
};

export function getArkConfig(env: EnvSource = process.env): ArkConfig | null {
  const apiKey = env.ARK_API_KEY;
  if (!apiKey) {
    return null;
  }
  return {
    apiKey,
    baseURL: env.ARK_BASE_URL ?? DEFAULT_ARK_BASE_URL,
    model: env.ARK_MODEL ?? DEFAULT_ARK_MODEL,
  };
}

export function createArkClient(
  env: EnvSource = process.env,
): { client: ArkClientLike; model: string } | null {
  const config = getArkConfig(env);
  if (!config) {
    return null;
  }

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  return {
    client: client as unknown as ArkClientLike,
    model: config.model,
  };
}

export function parseArkJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const noFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = noFence.indexOf("{");
  const end = noFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Ark response does not contain a JSON object");
  }

  return JSON.parse(noFence.slice(start, end + 1));
}

export async function requestArkJson(params: RequestArkJsonParams): Promise<unknown> {
  const baseRequest = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
  };

  try {
    const structured = await params.client.chat.completions.create({
      ...baseRequest,
      response_format: { type: "json_object" },
    });
    const content = structured.choices[0]?.message?.content ?? "";
    return parseArkJsonContent(content);
  } catch (error) {
    const fallback = await params.client.chat.completions.create(baseRequest);
    const content = fallback.choices[0]?.message?.content ?? "";
    return parseArkJsonContent(content);
  }
}
