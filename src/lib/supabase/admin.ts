import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Client service role — bypass RLS. Serveur uniquement (webhooks, cron).
 */
export function createSupabaseAdmin() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
