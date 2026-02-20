import { describe, expect, it } from "vitest";
import { validateFavoritePayload } from "../../../app/api/favorites/route";

describe("validateFavoritePayload", () => {
  it("requires exactly one of model_id or article_id", () => {
    expect(() => validateFavoritePayload({})).toThrow("one target is required");
    expect(() => validateFavoritePayload({ model_id: "m1", article_id: "a1" })).toThrow(
      "only one target is allowed",
    );
  });
});
