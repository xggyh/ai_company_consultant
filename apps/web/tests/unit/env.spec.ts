import { describe, expect, it } from "vitest";
import { getRequiredEnv } from "../../lib/env";

describe("getRequiredEnv", () => {
  it("throws when required env missing", () => {
    expect(() => getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")).toThrow(
      "Missing required env: NEXT_PUBLIC_SUPABASE_URL",
    );
  });
});
