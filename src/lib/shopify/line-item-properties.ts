import type { ShopifyLineItem } from "@/lib/shopify/types";

type PropEntry = { name?: string; value?: string | number | null };

function normalizePropName(name: string): string {
  return name.trim().toLowerCase();
}

function propsMapFromLineItem(
  item: ShopifyLineItem
): Map<string, string> {
  const map = new Map<string, string>();

  const raw = item.properties as unknown;
  if (Array.isArray(raw)) {
    for (const entry of raw as PropEntry[]) {
      const name = entry?.name;
      if (!name || typeof name !== "string") continue;
      const value = entry.value;
      if (value === null || value === undefined) continue;
      map.set(normalizePropName(name), String(value).trim());
    }
  } else if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      map.set(normalizePropName(key), String(value).trim());
    }
  }

  return map;
}

export type SkinLineItemMetadata = {
  visual_url: string | null;
  framing: string | null;
  orientation: "paysage" | "portrait" | null;
  product_handle: string | null;
};

export function resolveSkinLineItemMetadata(
  item: ShopifyLineItem
): SkinLineItemMetadata {
  const props = propsMapFromLineItem(item);

  const visual =
    props.get("visuel à imprimer") ??
    props.get("visuel a imprimer") ??
    null;

  const framing = props.get("cadrage") ?? null;

  const formatRaw =
    props.get("_format") ?? props.get("format") ?? props.get("_format ") ?? "";
  let orientation: "paysage" | "portrait" | null = null;
  if (formatRaw) {
    const lower = formatRaw.toLowerCase();
    if (lower.includes("portrait") || lower.includes("vertical")) {
      orientation = "portrait";
    } else {
      orientation = "paysage";
    }
  }

  const product_handle =
    typeof item.product_handle === "string" && item.product_handle.trim()
      ? item.product_handle.trim()
      : typeof item.handle === "string" && item.handle.trim()
        ? item.handle.trim()
        : null;

  return {
    visual_url: visual,
    framing,
    orientation,
    product_handle,
  };
}
