"use server";

import { revalidatePath } from "next/cache";
import type { InventoryItem } from "@/lib/inventory/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (e) {
    console.error("[inventory] Supabase config", e);
    return [];
  }

  const { data, error } = await supabase
    .from("inventory")
    .select(
      "id, item_name, current_quantity, unit, alert_threshold, usage_per_sheet, supplier_url"
    )
    .order("item_name", { ascending: true });

  if (error) {
    console.error("[inventory] fetchInventoryItems", error);
    return [];
  }

  return (data ?? []) as InventoryItem[];
}

export type RefillResult =
  | { ok: true; newQuantity: number }
  | { ok: false; error: string };

export async function refillInventoryItem(
  itemId: string,
  addAmount: number
): Promise<RefillResult> {
  if (!itemId?.trim()) {
    return { ok: false, error: "Article invalide." };
  }

  if (!Number.isFinite(addAmount) || addAmount <= 0) {
    return { ok: false, error: "Quantité à ajouter invalide ( > 0 )." };
  }

  const supabase = createSupabaseAdmin();

  const { data: row, error: readError } = await supabase
    .from("inventory")
    .select("id, current_quantity")
    .eq("id", itemId)
    .maybeSingle();

  if (readError || !row) {
    return { ok: false, error: "Article introuvable." };
  }

  const newQuantity = Number(row.current_quantity) + addAmount;

  const { error: updateError } = await supabase
    .from("inventory")
    .update({ current_quantity: newQuantity })
    .eq("id", itemId)
    .eq("current_quantity", row.current_quantity);

  if (updateError) {
    console.error("[inventory] refill", updateError);
    return { ok: false, error: "Échec de la mise à jour du stock." };
  }

  revalidatePath("/inventory");
  return { ok: true, newQuantity };
}
