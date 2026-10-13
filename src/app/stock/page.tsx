import { redirect } from "next/navigation";

/** Alias URL — la sidebar affiche « Stock ». */
export default function StockAliasPage() {
  redirect("/inventory");
}
