import { describe, expect, it, vi } from "vitest";
import { analyzeDemand } from "../../../lib/agents/demand-agent";

describe("analyzeDemand with ark", () => {
  it("parses structured demand from ark response", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              need_follow_up: false,
              follow_up_question: "",
              demand: {
                industry: "企业服务（SaaS）",
                scale: "中型（100-500人）",
                pain_points: ["线索分配慢"],
                goals: ["提升转化"],
              },
            }),
          },
        },
      ],
    });

    const result = await analyzeDemand(
      { user_input: "我们是SaaS公司，想提升销售转化" },
      {
        arkClient: {
          chat: { completions: { create } },
        },
        model: "demo-model",
      },
    );

    expect(create).toHaveBeenCalledOnce();
    expect(result.need_follow_up).toBe(false);
    expect(result.demand?.industry).toBe("企业服务（SaaS）");
  });

  it("normalizes non-standard ark payload keys", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              need_follow_up: false,
              industry: "企业服务（SaaS）",
              company_scale: "中型（100-500人）",
              pain: "线索转化慢,销售跟进断层",
              goal: "提升转化率",
            }),
          },
        },
      ],
    });

    const result = await analyzeDemand(
      { user_input: "我们是SaaS公司，200人，想提升销售转化" },
      {
        arkClient: {
          chat: { completions: { create } },
        },
        model: "demo-model",
      },
    );

    expect(result.need_follow_up).toBe(false);
    expect(result.demand?.industry).toBe("企业服务（SaaS）");
    expect(result.demand?.pain_points.length).toBeGreaterThan(0);
    expect(result.demand?.goals.length).toBeGreaterThan(0);
  });
});
