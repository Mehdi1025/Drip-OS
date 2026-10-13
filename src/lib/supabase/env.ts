function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getSupabaseUrl(): string {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  if (!url) {
    throw new Error(
      "Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)"
    );
  }
  return url;
}

/** Clé publique (navigateur + Server Components en lecture). */
export function getSupabasePublishableKey(): string {
  const key = readEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  if (!key) {
    throw new Error(
      "Missing Supabase publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
  }
  return key;
}

/** Clé secrète — serveur uniquement (webhooks, jobs, bypass RLS). */
export function getSupabaseSecretKey(): string {
  const key = readEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY"
  );
  if (!key) {
    throw new Error(
      "Missing Supabase secret key (SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  return key;
}
