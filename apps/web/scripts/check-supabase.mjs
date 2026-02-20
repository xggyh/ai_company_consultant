import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  const env = {};
  if (!existsSync(filePath)) return env;
  const lines = readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

const envFile = resolve(process.cwd(), ".env.local");
const env = { ...loadEnv(envFile), ...process.env };
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
  console.log(
    "Supabase not configured: missing SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  );
  process.exit(0);
}

const client = createClient(supabaseUrl, key, { auth: { persistSession: false } });

const { data, error } = await client.from("users").select("id").limit(1);
if (error) {
  console.error("Supabase check failed:", error.message);
  process.exit(1);
}

console.log("Supabase connected: users query ok, rows:", data?.length ?? 0);
