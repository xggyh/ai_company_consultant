import { describe, expect, it } from "vitest";
import { renderSolutionMarkdown } from "../../../lib/pdf/render-solution";

describe("renderSolutionMarkdown", () => {
  it("includes title, cost and risk sections", () => {
    const doc = renderSolutionMarkdown({
      title: "客服自动化",
      estimated_monthly_cost: 1200,
      risks: ["误答风险"],
    });
    expect(doc).toContain("# 客服自动化");
    expect(doc).toContain("月度成本估算");
    expect(doc).toContain("风险提示");
  });
});
