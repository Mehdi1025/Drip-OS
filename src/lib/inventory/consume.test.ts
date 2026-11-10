import {
  computeConsumedQuantity,
  isPerOrderInventoryItem,
} from "@/lib/inventory/consume";
import type { InventoryItem } from "@/lib/inventory/types";

const base: InventoryItem = {
  id: "1",
  item_name: "Vinyle adhésif imprimable A4",
  current_quantity: 100,
  unit: "feuilles",
  alert_threshold: 10,
  usage_per_sheet: 1,
  supplier_url: null,
};

const context = { sheetCount: 3, distinctOrderCount: 2 };

if (!isPerOrderInventoryItem("Enveloppe DL")) throw new Error("per-order detect");
if (computeConsumedQuantity(base, context) !== 3) throw new Error("vinyle consume");

const envelope: InventoryItem = {
  ...base,
  item_name: "Enveloppe DL 220×110",
  usage_per_sheet: 1,
  unit: "unités",
};
if (computeConsumedQuantity(envelope, context) !== 2) throw new Error("envelope consume");

const lame: InventoryItem = {
  ...base,
  item_name: "Lame AutoBlade Cameo 4",
  usage_per_sheet: 0,
  unit: "unités",
};
if (computeConsumedQuantity(lame, context) !== 0) throw new Error("manual item");

const film: InventoryItem = {
  ...base,
  item_name: "Film transfert (rouleau 30 cm)",
  usage_per_sheet: 30,
  unit: "cm",
};
if (computeConsumedQuantity(film, context) !== 90) throw new Error("film cm");

console.log("consume.test.ts OK");
