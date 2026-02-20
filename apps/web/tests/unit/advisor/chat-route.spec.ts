import { beforeEach, describe, expect, it, vi } from "vitest";

const appendConversation = vi.fn();
const persistMessage = vi.fn();
const persistSolution = vi.fn();

vi.mock("../../../lib/data/repository", () => ({
  getDataRepository: () => ({
    appendConversation,
    persistMessage,
    persistSolution,
  }),
}));

vi.mock("../../../lib/agents/demand-agent", () => ({
  analyzeDemand: vi.fn(),
}));

vi.mock("../../../lib/agents/solution-agent", () => ({
  buildSolution: vi.fn(),
}));

describe("handleAdvisorMessage", () => {
  beforeEach(() => {
    appendConversation.mockReset();
    appendConversation.mockResolvedValue({ id: "c1" });
    persistMessage.mockReset();
    persistMessage.mockResolvedValue(undefined);
    persistSolution.mockReset();
    persistSolution.mockResolvedValue(undefined);
  });

  it("returns follow-up first when demand info is insufficient", async () => {
    const { analyzeDemand } = await import("../../../lib/agents/demand-agent");
    const { handleAdvisorMessage } = await import("../../../app/api/advisor/chat/route");
    vi.mocked(analyzeDemand).mockResolvedValueOnce({
      need_follow_up: true,
      follow_up_question: "请补充行业信息",
      demand: null,
    });

    const result = await handleAdvisorMessage({ message: "我们想用AI" });

    expect(result.type).toBe("follow_up");
    expect(result.content).toContain("请补充");
  });
});
