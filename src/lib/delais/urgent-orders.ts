import { RISK_HOURS } from "@/lib/delais/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Commandes ouvertes en retard ou dans la fenêtre à risque. */
export async function fetchUrgentOrderIds(): Promise<Set<string>> {
  const supabase = createSupabaseAdmin();
  const now = Date.now();
  const riskUntil = new Date(now + RISK_HOURS * 3600_000).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data } = await supabase
    .from("orders")
    .select("id, promise_due_at")
    .is("cancelled_at", null)
    .is("shipped_at", null);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (!row.promise_due_at) continue;
    if (row.promise_due_at <= riskUntil) {
      ids.add(row.id);
    }
  }
  // Inclut aussi les commandes sans promise_due_at mais créées — skip
  void nowIso;
  return ids;
}
