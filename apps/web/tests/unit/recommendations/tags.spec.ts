import { describe, expect, it } from "vitest";
import { INDUSTRY_TAGS, SCALE_TAGS } from "../../../lib/tags";

describe("tag constants", () => {
  it("contains expected industry and scale tags", () => {
    expect(INDUSTRY_TAGS).toContain("企业服务（SaaS）");
    expect(SCALE_TAGS).toContain("大型（500-2000人）");
  });
});
