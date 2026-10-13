import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";
import { fetchInventoryItems } from "@/app/inventory/actions";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await fetchInventoryItems();
  return <InventoryDashboard initialItems={items} />;
}
