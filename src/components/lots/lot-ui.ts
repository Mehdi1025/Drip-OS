import type { LotDetailData } from "@/lib/lots/types";

export const FILE_STATUS: Record<
  LotDetailData["sheets"][0]["fileStatus"],
  { label: string; hint: string; tone: string }
> = {
  attente_fichier: {
    label: "① PDF manquant",
    hint: "Dépose le fichier puis imprime",
    tone: "bg-drip-border text-drip-muted",
  },
  planche_prete: {
    label: "② Planche prête",
    hint: "Imprime puis clique « J'ai imprimé »",
    tone: "bg-drip-volt/20 text-drip-ink",
  },
  imprimee: {
    label: "③ Imprimée",
    hint: "Découpe — Contrôle OK par skin",
    tone: "bg-emerald-500/20 text-emerald-800",
  },
};

export const SKIN_STATUS: Record<string, { label: string; tone: string }> = {
  imposed: { label: "Imposé", tone: "bg-drip-border text-drip-muted" },
  planche_prete: {
    label: "Planche prête",
    tone: "bg-drip-volt/15 text-drip-ink",
  },
  printed: { label: "Imprimé", tone: "bg-amber-500/15 text-amber-900" },
  cut: { label: "Prêt à expédier", tone: "bg-emerald-500/20 text-emerald-800" },
  shipped: { label: "Expédié", tone: "bg-drip-ink/10 text-drip-ink" },
  scrap: { label: "Rebut", tone: "bg-red-500/15 text-red-800" },
};

export function lotProgressSummary(lot: LotDetailData) {
  const totalSheets = lot.sheets.length;
  const withPdf = lot.sheets.filter(
    (s) => s.fileStatus !== "attente_fichier"
  ).length;
  const printedSheets = lot.sheets.filter(
    (s) => s.fileStatus === "imprimee"
  ).length;

  let skinsTotal = 0;
  let skinsCut = 0;
  let skinsReadyScan = 0;
  for (const sheet of lot.sheets) {
    for (const sk of sheet.slots) {
      if (!sk) continue;
      skinsTotal += 1;
      if (sk.status === "cut") skinsReadyScan += 1;
      if (sk.status === "cut" || sk.status === "shipped") skinsCut += 1;
    }
  }

  const needsExport = !lot.locked;
  const needsUpload = withPdf < totalSheets;
  const needsPrintMark = lot.sheets.some(
    (s) => s.fileStatus === "planche_prete"
  );
  const needsCut = lot.sheets.some((s) =>
    s.slots.some((sk) => sk?.status === "printed")
  );

  let currentStep = 5;
  if (needsExport) currentStep = 1;
  else if (needsUpload) currentStep = 2;
  else if (needsPrintMark) currentStep = 3;
  else if (needsCut) currentStep = 4;

  return {
    totalSheets,
    withPdf,
    printedSheets,
    skinsTotal,
    skinsReadyScan,
    currentStep,
    needsExport,
    needsUpload,
    needsPrintMark,
    needsCut,
  };
}
