import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!URL || !ANON) {
    throw new Error("Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!browserClient) browserClient = createClient(URL, ANON);
  return browserClient;
}

export function getServerClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !serviceKey) {
    throw new Error("Supabase server env vars missing.");
  }
  return createClient(URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
