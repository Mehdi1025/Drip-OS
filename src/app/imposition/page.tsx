import { ImpositionDashboard } from "@/components/imposition/ImpositionDashboard";
import { fetchPendingSkins } from "@/app/imposition/actions";

export const dynamic = "force-dynamic";

export default async function ImpositionPage() {
  const pendingSkins = await fetchPendingSkins();

  return <ImpositionDashboard initialSkins={pendingSkins} />;
}
