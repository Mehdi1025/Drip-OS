import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Met à jour orders.shipped_at quand tous les skins non rebut sont expédiés. */
export async function refreshOrderShippedAt(orderId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: skins, error } = await supabase
    .from("skins")
    .select("status")
    .eq("order_id", orderId);

  if (error || !skins?.length) return;

  const active = skins.filter((s) => s.status !== "scrap");
  if (active.length === 0) return;
  if (!active.every((s) => s.status === "shipped")) return;

  const now = new Date().toISOString();
  await supabase
    .from("orders")
    .update({ shipped_at: now })
    .eq("id", orderId)
    .is("shipped_at", null);

  // Si re-expédition partielle déjà marquée, on ne recule pas shipped_at.
}
