import { describe, expect, it } from "vitest";
import { buildSolution } from "../../../lib/agents/solution-agent";

describe("buildSolution", () => {
  it("throws when ark is not configured", async () => {
    const previous = process.env.ARK_API_KEY;
    delete process.env.ARK_API_KEY;

    await expect(
      buildSolution({
        raw_user_input: "我们是SaaS公司，想提升销售转化",
        industry: "企业服务（SaaS）",
        pain_points: ["销售线索转化低"],
        goals: ["提升成交率"],
      }),
    ).rejects.toThrow("ARK is not configured");

    if (previous) {
      process.env.ARK_API_KEY = previous;
    }
  });
});
