import type { InventoryItem } from "@/lib/inventory/types";

export type InventoryCategory =
  | "fabrication"
  | "decoupe"
  | "kit"
  | "expedition"
  | "autre";

export type InventorySection = {
  id: InventoryCategory;
  title: string;
  subtitle: string;
};

export const INVENTORY_SECTIONS: InventorySection[] = [
  {
    id: "fabrication",
    title: "Fabrication du skin",
    subtitle: "Vinyle, lamination, encres, film de transfert",
  },
  {
    id: "decoupe",
    title: "Découpe (Silhouette)",
    subtitle: "Usure lame et tapis — suivi manuel",
  },
  {
    id: "kit",
    title: "Kit client",
    subtitle: "Une unité par commande dans le lot",
  },
  {
    id: "expedition",
    title: "Expédition",
    subtitle: "Enveloppe, sticker, étiquette — par commande",
  },
];

const CATEGORY_KEYWORDS: { id: InventoryCategory; patterns: string[] }[] = [
  {
    id: "fabrication",
    patterns: ["vinyle", "lamination", "encre", "transfert"],
  },
  {
    id: "decoupe",
    patterns: ["cameo", "lame", "tapis", "silhouette"],
  },
  {
    id: "kit",
    patterns: ["carte de pose", "nfc", "puce", "merci", "lingette"],
  },
  {
    id: "expedition",
    patterns: ["enveloppe", "sticker", "ouvre-moi", "étiquette", "etiquette"],
  },
];

const SORT_HINTS: Record<InventoryCategory, string[]> = {
  fabrication: ["vinyle", "lamination", "encre", "transfert"],
  decoupe: ["lame", "tapis"],
  kit: ["carte de pose", "nfc", "puce", "merci", "lingette"],
  expedition: ["enveloppe", "sticker", "étiquette", "etiquette"],
  autre: [],
};

export function inventoryCategoryForItem(itemName: string): InventoryCategory {
  const lower = itemName.toLowerCase();
  for (const { id, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((p) => lower.includes(p))) {
      return id;
    }
  }
  return "autre";
}

function sortKeyForItem(itemName: string, category: InventoryCategory): number {
  const lower = itemName.toLowerCase();
  const hints = SORT_HINTS[category];
  const idx = hints.findIndex((h) => lower.includes(h));
  return idx === -1 ? 100 : idx;
}

export function groupInventoryByCategory(
  items: InventoryItem[]
): Map<InventoryCategory, InventoryItem[]> {
  const map = new Map<InventoryCategory, InventoryItem[]>();

  for (const item of items) {
    const cat = inventoryCategoryForItem(item.item_name);
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }

  for (const [cat, list] of Array.from(map.entries())) {
    list.sort((a: InventoryItem, b: InventoryItem) =>
      sortKeyForItem(a.item_name, cat) - sortKeyForItem(b.item_name, cat) ||
      a.item_name.localeCompare(b.item_name, "fr")
    );
  }

  return map;
}
