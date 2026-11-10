import { notFound } from "next/navigation";
import { LotDetailDashboard } from "@/components/lots/LotDetailDashboard";
import { fetchLotDetail } from "@/app/lots/actions";

type Props = { params: { lotId: string } };

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: Props) {
  const result = await fetchLotDetail(params.lotId);
  if (!result.ok) notFound();
  return <LotDetailDashboard initial={result.data} />;
}
