import { describe, expect, it } from "vitest";
import { validateProfilePayload } from "../../../app/api/profile/route";

describe("validateProfilePayload", () => {
  it("rejects payload without company_industry", () => {
    expect(() =>
      validateProfilePayload({ company_name: "Acme", company_scale: "中型（100-500人）" }),
    ).toThrow("company_industry is required");
  });
});
