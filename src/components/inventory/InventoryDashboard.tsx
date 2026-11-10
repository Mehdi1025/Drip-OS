"use client";

import { useMemo, useState } from "react";
import { PackageOpen } from "lucide-react";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";
import type { InventoryItem } from "@/lib/inventory/types";
import {
  groupInventoryByCategory,
  INVENTORY_SECTIONS,
} from "@/lib/inventory/categories";
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

  const grouped = useMemo(() => groupInventoryByCategory(items), [items]);

  function handleQuantityChange(id: string, newQuantity: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, current_quantity: newQuantity } : item
      )
    );
  }

  return (
    <DashboardShell
      kicker="Nomenclature atelier"
      title="Stock"
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
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-drip-ink/70">
        Le stock se décrémente automatiquement à chaque{" "}
        <span className="font-medium text-drip-ink">Générer un lot</span>{" "}
        (Imposition) : consommation par feuille A4 et par commande du lot.
        Encres, lame et tapis restent en suivi manuel.
      </p>

      {items.length === 0 ? (
        <div className="drip-empty">
          <PackageOpen className="mx-auto h-10 w-10 text-drip-muted" strokeWidth={1.5} />
          <p className="mt-4 text-lg font-display font-medium">Inventaire vide</p>
          <p className="mt-2 text-sm font-medium text-drip-ink/55">
            Exécute les migrations Supabase{" "}
            <span className="font-mono text-drip-ink/80">004</span> puis{" "}
            <span className="font-mono text-drip-ink/80">006</span>{" "}
            (<code className="text-xs">006_inventory_dripmycard_bom.sql</code>
            ), puis rafraîchis cette page.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {INVENTORY_SECTIONS.map((section) => {
            const sectionItems = grouped.get(section.id) ?? [];
            if (sectionItems.length === 0) return null;

            const sectionAlerts = sectionItems.filter(
              (i) => !isStockOk(i.current_quantity, i.alert_threshold)
            ).length;

            return (
              <section key={section.id} aria-labelledby={`inv-${section.id}`}>
                <header className="mb-4 border-b border-drip-border pb-3">
                  <h2
                    id={`inv-${section.id}`}
                    className="font-display text-xl font-medium text-drip-ink"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-1 text-sm text-drip-muted">{section.subtitle}</p>
                  {sectionAlerts > 0 && (
                    <p className="mt-2 text-xs font-medium text-red-300">
                      {sectionAlerts} alerte
                      {sectionAlerts > 1 ? "s" : ""} dans cette section
                    </p>
                  )}
                </header>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {sectionItems.map((item) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      onQuantityChange={handleQuantityChange}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {(grouped.get("autre")?.length ?? 0) > 0 && (
            <section aria-labelledby="inv-autre">
              <header className="mb-4 border-b border-drip-border pb-3">
                <h2
                  id="inv-autre"
                  className="font-display text-xl font-medium text-drip-ink"
                >
                  Autres
                </h2>
                <p className="mt-1 text-sm text-drip-muted">
                  Lignes hors nomenclature standard (anciennes données)
                </p>
              </header>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {grouped.get("autre")!.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
