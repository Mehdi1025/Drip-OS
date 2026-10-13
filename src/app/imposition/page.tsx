import { unstable_noStore as noStore } from "next/cache";
import { ImpositionDashboard } from "@/components/imposition/ImpositionDashboard";
import { fetchPendingSkins } from "@/app/imposition/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ImpositionPage() {
  noStore();
  const pendingSkins = await fetchPendingSkins();

  return <ImpositionDashboard initialSkins={pendingSkins} />;
}
