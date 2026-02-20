import { describe, expect, it } from "vitest";
import { derivePreferredScenarios, rankArticles } from "../../../lib/recommendations/query";

describe("derivePreferredScenarios", () => {
  it("derives industry + scale preferred scenarios with stable order", () => {
    const scenarios = derivePreferredScenarios({
      company_industry: "企业服务（SaaS）",
      company_scale: "大型（500-2000人）",
    });

    expect(scenarios.slice(0, 3)).toEqual(["决策辅助", "自动化工作流", "知识问答"]);
    expect(scenarios).toContain("客服对话");
  });
});

describe("rankArticles", () => {
  it("ranks articles by profile-related tags", () => {
    const ranked = rankArticles(
      [
        { id: "a1", title: "多模态质检", summary: "", source: "机器之心", tags: ["图像处理"] },
        { id: "a2", title: "RAG 评测", summary: "", source: "InfoQ 中国", tags: ["知识问答"] },
        { id: "a3", title: "Agent ROI", summary: "", source: "量子位", tags: ["决策辅助", "自动化工作流"] },
      ],
      {
        company_industry: "企业服务（SaaS）",
        company_scale: "中型（100-500人）",
      },
    );

    expect(ranked[0].id).toBe("a3");
    expect(ranked[1].id).toBe("a2");
  });
});
