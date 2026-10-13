import { buildScanDisplayLabel } from "@/lib/scanner/display-label";
import type { ScannedSkinPayload } from "@/lib/scanner/types";

const sample: ScannedSkinPayload = {
  skinId: "uuid",
  trackCode: "1042-F1-S1",
  designName: "Skin Radar + Accessoires",
  status: "cut",
  orderShopifyId: 5829101,
  customerName: "Jean Dupont",
  shippingMethod: "Colissimo",
};

if (buildScanDisplayLabel(sample) !== "Commande #5829101 - 1x Skin Radar + Accessoires") {
  throw new Error("buildScanDisplayLabel failed");
}

console.log("display-label.test.ts OK");
