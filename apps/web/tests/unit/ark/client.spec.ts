import { describe, expect, it } from "vitest";
import { getArkConfig } from "../../../lib/ark/client";

describe("getArkConfig", () => {
  it("returns null when api key missing", () => {
    expect(getArkConfig({})).toBeNull();
  });

  it("uses default base url and model when not provided", () => {
    const config = getArkConfig({ ARK_API_KEY: "k" });
    expect(config).toEqual({
      apiKey: "k",
      baseURL: "https://ark-ap-southeast.byteintl.net/api/v3",
      model: "ep-20250831170629-d8d45",
    });
  });

  it("sanitizes multiline key and trims url/model", () => {
    const config = getArkConfig({
      ARK_API_KEY: "  abc \n 123 \n xyz  ",
      ARK_BASE_URL: "  https://ark-ap-southeast.byteintl.net/api/v3  ",
      ARK_MODEL: "  ep-20250831170629-d8d45  ",
    });
    expect(config).toEqual({
      apiKey: "abc123xyz",
      baseURL: "https://ark-ap-southeast.byteintl.net/api/v3",
      model: "ep-20250831170629-d8d45",
    });
  });
});
