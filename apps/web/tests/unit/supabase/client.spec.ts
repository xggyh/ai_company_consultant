import { describe, expect, it } from "vitest";
import { getSupabaseClientConfig, isSupabaseConfigured } from "../../../lib/supabase/client";

describe("supabase client config", () => {
  it("sanitizes url and token whitespace", () => {
    const config = getSupabaseClientConfig({
      SUPABASE_URL: "  https://izltncuiuavpyxplynxe.supabase.co  ",
      SUPABASE_SERVICE_ROLE_KEY: "eyJ...abc \n def \n ghi",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " sb_publishable_123 \n 456 ",
    });

    expect(config.url).toBe("https://izltncuiuavpyxplynxe.supabase.co");
    expect(config.serviceRoleKey).toBe("eyJ...abcdefghi");
    expect(config.anonKey).toBe("sb_publishable_123456");
  });

  it("treats multiline service role key as configured after sanitization", () => {
    const configured = isSupabaseConfigured({
      SUPABASE_URL: "https://izltncuiuavpyxplynxe.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "eyJ...abc\n 123\n xyz",
    });

    expect(configured).toBe(true);
  });

  it("supports SUPABASE_ANON_KEY as server fallback", () => {
    const config = getSupabaseClientConfig({
      SUPABASE_URL: "https://izltncuiuavpyxplynxe.supabase.co",
      SUPABASE_ANON_KEY: "sb_publishable_xxx",
    });
    expect(config.anonKey).toBe("sb_publishable_xxx");
  });
});
