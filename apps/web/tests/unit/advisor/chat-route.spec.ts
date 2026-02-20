import { describe, expect, it } from "vitest";
import { handleAdvisorMessage } from "../../../app/api/advisor/chat/route";

describe("handleAdvisorMessage", () => {
  it("returns follow-up first when demand info is insufficient", async () => {
    const result = await handleAdvisorMessage({ message: "我们想用AI" });
    expect(result.type).toBe("follow_up");
  });
});
