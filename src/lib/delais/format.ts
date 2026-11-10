import { DISPLAY_TIMEZONE } from "@/lib/delais/config";

const frNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${frNumber.format(value)} h`;
}

export function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${frNumber.format(value)} j`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${frNumber.format(value)} %`;
}

export function formatEur(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${frNumber.format(value)} €`;
}

export function formatParisDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function customerShortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  const first = parts[0];
  const initial = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() : "";
  return initial ? `${first} ${initial}.` : first;
}

export function shopifyAdminOrderUrl(idShopify: number): string | null {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!domain) return null;
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${clean}/admin/orders/${idShopify}`;
}
