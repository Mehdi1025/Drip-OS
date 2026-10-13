import {
  computeConsumedQuantity,
  isEnvelopeInventoryItem,
} from "@/lib/inventory/consume";
import type { InventoryItem } from "@/lib/inventory/types";

const base: InventoryItem = {
  id: "1",
  item_name: "Vinyle A4",
  current_quantity: 100,
  unit: "feuilles",
  alert_threshold: 10,
  usage_per_sheet: 1,
  supplier_url: null,
};

const context = { sheetCount: 3, distinctOrderCount: 2 };

if (!isEnvelopeInventoryItem("Enveloppes C5")) throw new Error("envelope detect");
if (computeConsumedQuantity(base, context) !== 3) throw new Error("vinyle consume");

const envelope: InventoryItem = {
  ...base,
  item_name: "Enveloppes C5",
  usage_per_sheet: 0,
  unit: "unités",
};
if (computeConsumedQuantity(envelope, context) !== 2) throw new Error("envelope consume");

console.log("consume.test.ts OK");
