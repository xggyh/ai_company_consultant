import { describe, expect, it } from "vitest";
import { buildSolution } from "../../../lib/agents/solution-agent";

describe("buildSolution", () => {
  it("returns 1-3 solutions with roi and cost fields", async () => {
    const result = await buildSolution({
      industry: "企业服务（SaaS）",
      pain_points: ["销售线索转化低"],
      goals: ["提升成交率"],
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0]).toHaveProperty("estimated_monthly_cost");
    expect(result[0]).toHaveProperty("roi_hypothesis");
  });
});
