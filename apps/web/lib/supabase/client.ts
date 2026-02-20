import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function sanitizeUrl(value: string | undefined) {
  return (value || "").trim();
}

function sanitizeToken(value: string | undefined) {
  return (value || "").replace(/\s+/g, "");
}

export function getSupabaseClientConfig(env: Record<string, string | undefined> = process.env) {
  return {
    url: sanitizeUrl(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ""),
    anonKey: sanitizeToken(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""),
    serviceRoleKey: sanitizeToken(env.SUPABASE_SERVICE_ROLE_KEY || ""),
  };
}

export function isSupabaseConfigured(env: Record<string, string | undefined> = process.env) {
  const config = getSupabaseClientConfig(env);
  return Boolean(config.url && (config.serviceRoleKey || config.anonKey));
}

export function createSupabaseAdminClient(
  env: Record<string, string | undefined> = process.env,
): SupabaseClient | null {
  const config = getSupabaseClientConfig(env);
  const key = config.serviceRoleKey || config.anonKey;
  if (!config.url || !key) {
    return null;
  }

  return createClient(config.url, key, {
    auth: { persistSession: false },
  });
}
