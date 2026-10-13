import {
  buildStockAlertMessage,
  planInventoryDeductions,
} from "@/lib/inventory/consume";
import { notifyDiscordStockAlerts } from "@/lib/inventory/discord-alert";
import type { InventoryItem, LotConsumptionContext } from "@/lib/inventory/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type DecrementInventoryResult =
  | { ok: true; alertsSent: number }
  | { ok: false; error: string };

export function countDistinctOrders(orderIds: string[]): number {
  return new Set(orderIds).size;
}

export async function decrementInventoryForLot(
  context: LotConsumptionContext
): Promise<DecrementInventoryResult> {
  if (context.sheetCount <= 0) {
    return { ok: true, alertsSent: 0 };
  }

  const supabase = createSupabaseAdmin();

  const { data: rows, error: fetchError } = await supabase
    .from("inventory")
    .select(
      "id, item_name, current_quantity, unit, alert_threshold, usage_per_sheet, supplier_url"
    );

  if (fetchError) {
    console.error("[inventory] fetch", fetchError);
    return { ok: false, error: "Impossible de lire l'inventaire." };
  }

  const items = (rows ?? []) as InventoryItem[];
  if (items.length === 0) {
    return { ok: true, alertsSent: 0 };
  }

  const plan = planInventoryDeductions(items, context);
  const alertMessages: string[] = [];

  for (const deduction of plan) {
    if (deduction.consumed <= 0) {
      continue;
    }

    if (deduction.newQuantity < 0) {
      return {
        ok: false,
        error: `Stock insuffisant pour « ${deduction.item.item_name} » (manque ${Math.abs(deduction.newQuantity).toFixed(2)} ${deduction.item.unit}).`,
      };
    }

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ current_quantity: deduction.newQuantity })
      .eq("id", deduction.item.id)
      .eq("current_quantity", deduction.previousQuantity);

    if (updateError) {
      console.error("[inventory] update", updateError, deduction.item.id);
      return {
        ok: false,
        error: `Échec mise à jour stock : ${deduction.item.item_name}.`,
      };
    }

    if (deduction.belowThreshold) {
      alertMessages.push(buildStockAlertMessage(deduction));
    }
  }

  await notifyDiscordStockAlerts(alertMessages);

  return { ok: true, alertsSent: alertMessages.length };
}
