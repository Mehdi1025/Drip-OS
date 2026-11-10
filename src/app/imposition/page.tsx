import { unstable_noStore as noStore } from "next/cache";
import { ImpositionDashboard } from "@/components/imposition/ImpositionDashboard";
import {
  fetchLotsAwaitingFiles,
  fetchPendingSkins,
} from "@/app/imposition/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ImpositionPage() {
  noStore();
  const [pendingSkins, awaitingFiles] = await Promise.all([
    fetchPendingSkins(),
    fetchLotsAwaitingFiles(),
  ]);

  return (
    <ImpositionDashboard
      initialSkins={pendingSkins}
      awaitingFiles={awaitingFiles}
    />
  );
}
