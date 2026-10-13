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
    global: {
      // Next.js 14 met en cache les GET Supabase par défaut → file d'attente figée.
      fetch: (url, options = {}) =>
        fetch(url, { ...options, cache: "no-store" }),
    },
  });
}
