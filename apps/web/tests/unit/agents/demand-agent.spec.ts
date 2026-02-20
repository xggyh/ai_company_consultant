import { describe, expect, it } from "vitest";
import { analyzeDemand } from "../../../lib/agents/demand-agent";

describe("analyzeDemand", () => {
  it("asks follow-up when key fields missing", async () => {
    const result = await analyzeDemand({ user_input: "我们想上AI" });
    expect(result.need_follow_up).toBe(true);
    expect(result.follow_up_question.length).toBeGreaterThan(0);
  });
});
