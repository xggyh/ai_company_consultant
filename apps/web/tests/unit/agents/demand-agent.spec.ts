import { describe, expect, it } from "vitest";
import { analyzeDemand } from "../../../lib/agents/demand-agent";

describe("analyzeDemand", () => {
  it("throws when ark is not configured", async () => {
    const previous = process.env.ARK_API_KEY;
    delete process.env.ARK_API_KEY;

    await expect(analyzeDemand({ user_input: "我们想上AI" })).rejects.toThrow(
      "ARK is not configured",
    );

    if (previous) {
      process.env.ARK_API_KEY = previous;
    }
  });
});
