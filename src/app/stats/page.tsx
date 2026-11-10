import type { Metadata } from "next";
import { fetchDelaisKpiSnapshot } from "@/app/delais/actions";
import { fetchAdvancedStats } from "@/app/stats/actions";
import { StatsDashboard } from "@/components/stats/StatsDashboard";
import { unstable_noStore as noStore } from "next/cache";

export const metadata: Metadata = {
  title: "Statistiques · Drip OS",
  description:
    "Pilotage production : KPIs 7/30 jours, pipeline, commandes, stock et rebuts",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StatsPage() {
  noStore();
  const [stats, delais] = await Promise.all([
    fetchAdvancedStats(),
    fetchDelaisKpiSnapshot(),
  ]);
  return <StatsDashboard stats={stats} delais={delais} />;
}
