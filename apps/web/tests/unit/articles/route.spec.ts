import { describe, expect, it } from "vitest";
import { validateArticleId } from "../../../app/api/articles/[id]/route";

describe("validateArticleId", () => {
  it("rejects empty id", () => {
    expect(() => validateArticleId(" ")).toThrow("article id is required");
  });
});
