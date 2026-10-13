import { fetchRecentWorkshopLots } from "@/app/workshop/actions";
import { WorkshopDashboard } from "@/components/workshop/WorkshopDashboard";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function WorkshopPage() {
  noStore();
  const recentLots = await fetchRecentWorkshopLots();
  return <WorkshopDashboard initialRecentLots={recentLots} />;
}
