"use client";

import { useMemo, useState } from "react";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";
import type { InventoryItem } from "@/lib/inventory/types";
import { isStockOk } from "@/lib/inventory/stock-visual";

type Props = {
  initialItems: InventoryItem[];
};

export function InventoryDashboard({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);

  const stats = useMemo(() => {
    const alerts = items.filter(
      (i) => !isStockOk(i.current_quantity, i.alert_threshold)
    ).length;
    return { total: items.length, alerts };
  }, [items]);

  function handleQuantityChange(id: string, newQuantity: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, current_quantity: newQuantity } : item
      )
    );
  }

  return (
    <DashboardShell
      kicker="Smart Restock · ERP"
      title="Inventaire"
      stats={
        <>
          <StatBadge label="Articles" value={stats.total} variant="volt" />
          <StatBadge
            label="Alertes actives"
            value={stats.alerts}
            variant={stats.alerts > 0 ? "danger" : "default"}
          />
        </>
      }
    >
      {items.length === 0 ? (
        <div className="drip-empty">
          <p className="text-lg font-black uppercase">Inventaire vide</p>
          <p className="mt-2 text-sm font-medium text-drip-ink/55">
            Exécute la migration 004 et les INSERT de test Supabase.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onQuantityChange={handleQuantityChange}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
