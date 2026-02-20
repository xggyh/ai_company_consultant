import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  const env = {};
  if (!existsSync(filePath)) return env;
  const lines = readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

const envFile = resolve(process.cwd(), ".env.local");
const env = { ...loadEnv(envFile), ...process.env };
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
  throw new Error(
    "Missing SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  );
}

const client = createClient(supabaseUrl, key, { auth: { persistSession: false } });

const models = [
  {
    name: "Ark Enterprise Chat",
    provider: "ByteDance Ark",
    description: "面向企业问答、分析与流程自动化的通用模型。",
    cost_input: 3.2,
    cost_output: 9.8,
    business_scenarios: ["决策辅助", "知识问答", "自动化工作流"],
    source_url: "https://ark-ap-southeast.byteintl.net",
  },
  {
    name: "Vision Analyst",
    provider: "OpenRouter",
    description: "图文多模态识别与报表摘要。",
    cost_input: 4.8,
    cost_output: 12.4,
    business_scenarios: ["数据分析", "多模态"],
    source_url: "https://openrouter.ai/models",
  },
  {
    name: "Code Copilot Pro",
    provider: "LiteLLM",
    description: "代码生成、审查与异常定位。",
    cost_input: 2.9,
    cost_output: 8.3,
    business_scenarios: ["代码辅助", "自动化工作流"],
    source_url: "https://litellm.ai",
  },
];

const articles = [
  {
    title: "AI Agent 在企业运营中的 ROI 实战",
    summary: "围绕销售、客服、运营三个场景给出落地指标与成本模型。",
    content: "MVP seed article",
    source: "InfoQ 中国",
    url: "https://www.infoq.cn/article/ai-agent-roi-seed",
    tags: ["决策辅助", "自动化工作流"],
  },
  {
    title: "多模态模型如何优化质检效率",
    summary: "制造与零售行业使用图像+文本模型的质量控制案例。",
    content: "MVP seed article",
    source: "机器之心",
    url: "https://www.jiqizhixin.com/articles/multimodal-seed",
    tags: ["图像处理", "数据分析"],
  },
  {
    title: "企业私有知识库问答的架构清单",
    summary: "从数据清洗到检索增强的完整实施路径。",
    content: "MVP seed article",
    source: "量子位",
    url: "https://www.qbitai.com/articles/rag-seed",
    tags: ["知识问答", "文档处理"],
  },
];

for (const model of models) {
  const { data: existing, error: queryError } = await client
    .from("models")
    .select("id")
    .eq("source_url", model.source_url)
    .limit(1);
  if (queryError) throw queryError;
  if (!existing || existing.length === 0) {
    const { error: insertError } = await client.from("models").insert(model);
    if (insertError) throw insertError;
  }
}

for (const article of articles) {
  const { data: existing, error: queryError } = await client
    .from("articles")
    .select("id")
    .eq("url", article.url)
    .limit(1);
  if (queryError) throw queryError;
  if (!existing || existing.length === 0) {
    const { error: insertError } = await client.from("articles").insert(article);
    if (insertError) throw insertError;
  }
}

console.log("Supabase seed complete: models=3, articles=3");
