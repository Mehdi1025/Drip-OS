import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { fetchDelaisDashboard } from "@/app/delais/actions";
import { DelaisDashboard } from "@/components/delais/DelaisDashboard";

export const metadata: Metadata = {
  title: "Délais & service client · Drip OS",
  description:
    "Promesse 48 h, commandes en retard, transporteurs et réclamations SAV",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DelaisPage() {
  noStore();
  const data = await fetchDelaisDashboard(30);
  return <DelaisDashboard initial={data} />;
}
