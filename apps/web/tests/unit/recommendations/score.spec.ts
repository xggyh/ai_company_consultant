import { describe, expect, it } from "vitest";
import { scoreModel } from "../../../lib/recommendations/score";

describe("scoreModel", () => {
  it("gives higher score when scenario and industry both match", () => {
    const score = scoreModel(
      { business_scenarios: ["决策辅助"], provider: "Ark" },
      { company_industry: "企业服务（SaaS）", preferred_scenarios: ["决策辅助"] },
    );
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("boosts industry-implied scenario match", () => {
    const score = scoreModel(
      { business_scenarios: ["图像处理"], provider: "OpenRouter" },
      { company_industry: "制造业", preferred_scenarios: [] },
    );
    expect(score).toBeGreaterThanOrEqual(70);
  });
});
