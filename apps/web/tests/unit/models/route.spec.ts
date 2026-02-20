import { describe, expect, it } from "vitest";
import { validateModelId } from "../../../app/api/models/[id]/route";

describe("validateModelId", () => {
  it("rejects empty id", () => {
    expect(() => validateModelId(" ")).toThrow("model id is required");
  });
});
