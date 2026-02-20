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
});
