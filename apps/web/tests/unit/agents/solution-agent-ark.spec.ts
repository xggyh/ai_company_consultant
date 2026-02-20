import { describe, expect, it, vi } from "vitest";
import { buildSolution } from "../../../lib/agents/solution-agent";

describe("buildSolution with ark", () => {
  it("uses ark response when valid", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              solutions: [
                {
                  title: "智能销售顾问",
                  architecture: "LLM + CRM",
                  estimated_monthly_cost: 1800,
                  roi_hypothesis: "转化率提升10%",
                  risks: ["数据质量"],
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await buildSolution(
      {
        raw_user_input: "我们是SaaS公司，目标提升销售转化",
        industry: "企业服务（SaaS）",
        pain_points: ["线索转化低"],
        goals: ["提升成交率"],
      },
      {
        arkClient: {
          chat: { completions: { create } },
        },
        model: "demo-model",
      },
    );

    expect(create).toHaveBeenCalledOnce();
    expect(result[0]?.title).toBe("智能销售顾问");
    expect(result[0]?.estimated_monthly_cost).toBe(1800);
  });
});
