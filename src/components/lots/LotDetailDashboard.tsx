"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Download, Lock, Upload } from "lucide-react";
import {
  bulkUploadPlanches,
  exportLotFromUi,
  fetchLotDetail,
  getSignedFileUrl,
  markAllSheetsPrintedAction,
  markSheetPrintedAction,
  removeCancelledSkinFromSheet,
} from "@/app/lots/actions";
import { markSkinCut, markSkinScrap } from "@/app/workshop/actions";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";
import type { LotDetailData } from "@/lib/lots/types";
import { ScrapModal } from "@/components/workshop/ScrapModal";
import type { ScrapReasonValue } from "@/lib/workshop/scrap-reasons";

type Props = {
  initial: LotDetailData;
};

const FILE_STATUS_LABEL: Record<string, string> = {
  attente_fichier: "Attente fichier",
  planche_prete: "Planche prête",
  imprimee: "Imprimée",
};

export function LotDetailDashboard({ initial }: Props) {
  const router = useRouter();
  const [lot, setLot] = useState(initial);
  const [flash, setFlash] = useState<string | null>(null);
  const [scrapTarget, setScrapTarget] = useState<{
    id: string;
    name: string;
    track: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const missingFiles = lot.sheets.filter(
    (s) => s.fileStatus === "attente_fichier"
  ).length;

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await fetchLotDetail(lot.lotId);
      if (res.ok) setLot(res.data);
      router.refresh();
    });
  }, [lot.lotId, router]);

  function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport(format: "csv" | "json") {
    startTransition(async () => {
      const res = await exportLotFromUi(lot.lotId, format);
      if (!res.ok) {
        setFlash(res.error);
        return;
      }
      downloadBlob(res.content, res.filename, res.mime);
      refresh();
      setFlash(`Export ${format.toUpperCase()} v${lot.exportVersion + 1} téléchargé.`);
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const payload: { name: string; data: Uint8Array }[] = [];
    for (const file of Array.from(files)) {
      payload.push({
        name: file.name,
        data: new Uint8Array(await file.arrayBuffer()),
      });
    }
    startTransition(async () => {
      const res = await bulkUploadPlanches(lot.lotId, payload);
      if (!res.ok) {
        setFlash(res.error);
        return;
      }
      setFlash(
        `${res.uploaded} planche(s) déposée(s).` +
          (res.rejected.length ? ` Refus : ${res.rejected.join(" · ")}` : "")
      );
      refresh();
    });
  }

  function handleMarkPrinted(sheetId: string) {
    startTransition(async () => {
      const res = await markSheetPrintedAction(lot.lotId, sheetId);
      setFlash(res.ok ? "Feuille marquée imprimée." : res.error);
      refresh();
    });
  }

  function handleMarkAllPrinted() {
    startTransition(async () => {
      const res = await markAllSheetsPrintedAction(lot.lotId);
      setFlash(res.ok ? "Feuilles marquées imprimées." : res.error);
      refresh();
    });
  }

  function handleOpenFile(sheetCode: string) {
    startTransition(async () => {
      const res = await getSignedFileUrl(lot.lotId, sheetCode, "pdf");
      if (!res.ok) {
        setFlash(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleCut(skinId: string) {
    startTransition(async () => {
      const res = await markSkinCut(skinId);
      setFlash(res.ok ? "Découpe validée." : res.error);
      refresh();
    });
  }

  function handleScrap(reason: ScrapReasonValue) {
    if (!scrapTarget) return;
    startTransition(async () => {
      const res = await markSkinScrap(scrapTarget.id, reason);
      setScrapTarget(null);
      if (!res.ok) {
        setFlash(res.error);
        return;
      }
      setFlash(
        res.reprintCreated
          ? "Rebut enregistré · réimpression ajoutée à la file."
          : "Rebut enregistré."
      );
      refresh();
    });
  }

  function handleRemoveCancelled(skinId: string) {
    startTransition(async () => {
      const res = await removeCancelledSkinFromSheet(lot.lotId, skinId);
      setFlash(
        res.ok
          ? "Emplacement libéré — réexporte le lot et redépose la feuille."
          : res.error
      );
      refresh();
    });
  }

  const hasCancelBanner = lot.sheets.some((s) =>
    s.slots.some((sk) => sk?.alert === "commande_annulee")
  );

  return (
    <DashboardShell
      kicker="Lot · Planches"
      title={lot.lotId}
      stats={
        <>
          <StatBadge label="Feuilles" value={lot.sheets.length} variant="volt" />
          <StatBadge
            label="Sans fichier"
            value={missingFiles}
            variant={missingFiles > 0 ? "danger" : "default"}
          />
          <StatBadge label="Export v" value={lot.exportVersion} />
        </>
      }
    >
      {flash && (
        <p className="mb-4 rounded-xl border border-drip-border bg-drip-elevated px-4 py-3 text-sm">
          {flash}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {lot.locked && (
          <span className="flex items-center gap-1 rounded-full border border-drip-volt/30 bg-drip-volt/15 px-3 py-1 text-xs font-medium">
            <Lock className="h-3.5 w-3.5" /> Figé
          </span>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleExport("csv")}
          className="drip-btn-volt flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Download className="h-4 w-4" />
          Exporter le lot (CSV)
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleExport("json")}
          className="rounded-xl border border-drip-border px-4 py-2 text-sm font-medium"
        >
          Export JSON
        </button>
        <Link href="/workshop" className="text-sm text-drip-volt">
          Atelier →
        </Link>
      </div>

      {hasCancelBanner && (
        <div className="mb-6 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Commande annulée sur un ou plusieurs emplacements. Retire le skin puis
          réexporte le lot et redépose la feuille concernée.
        </div>
      )}

      <div className="drip-card mb-8 border-dashed border-drip-volt/35 p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-drip-muted">
          Déposer les planches
        </p>
        <p className="mt-1 text-sm text-drip-muted">
          PDF nommés F1.pdf, L-{lot.lotId.slice(2)}_F1.pdf, etc.
        </p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-drip-border bg-drip-paper px-4 py-8">
          <Upload className="h-8 w-8 text-drip-volt" />
          <span className="mt-2 text-sm font-medium">Glisser-déposer ou cliquer</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <h2 className="text-sm font-medium text-drip-muted">Feuilles du lot</h2>
        <button
          type="button"
          disabled={isPending}
          onClick={handleMarkAllPrinted}
          className="text-xs font-medium text-drip-volt"
        >
          Tout marquer imprimé
        </button>
      </div>

      <div className="space-y-4">
        {lot.sheets.map((sheet) => (
          <article key={sheet.id} className="drip-card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-drip-border px-4 py-3">
              <span className="font-mono text-lg font-semibold">
                {sheet.sheetCode}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  sheet.fileStatus === "planche_prete"
                    ? "bg-drip-volt/20 text-drip-ink"
                    : sheet.fileStatus === "imprimee"
                      ? "bg-emerald-500/20 text-emerald-700"
                      : "bg-drip-border text-drip-muted"
                }`}
              >
                {FILE_STATUS_LABEL[sheet.fileStatus] ?? sheet.fileStatus}
              </span>
            </header>
            <div className="flex flex-wrap gap-2 border-b border-drip-border px-4 py-2">
              <button
                type="button"
                disabled={!sheet.filePath || isPending}
                onClick={() => handleOpenFile(sheet.sheetCode)}
                className="text-xs font-medium text-drip-volt disabled:opacity-40"
              >
                Voir / Télécharger
              </button>
              <button
                type="button"
                disabled={
                  sheet.fileStatus !== "planche_prete" || isPending
                }
                onClick={() => handleMarkPrinted(sheet.id)}
                className="text-xs font-medium disabled:opacity-40"
              >
                Marquer imprimée
              </button>
              {sheet.fileUploadedAt && (
                <span className="text-[10px] text-drip-muted">
                  Déposé le{" "}
                  {new Date(sheet.fileUploadedAt).toLocaleString("fr-FR")}
                </span>
              )}
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {sheet.slots.map((skin, idx) =>
                skin ? (
                  <div
                    key={skin.id}
                    className={`rounded-xl border p-3 ${
                      skin.alert === "commande_annulee"
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-drip-border bg-drip-surface"
                    }`}
                  >
                    <p className="text-[10px] font-medium text-drip-muted">
                      S{idx + 1} · {skin.track_code}
                    </p>
                    <p className="mt-1 font-medium">{skin.design_name}</p>
                    <p className="text-xs text-drip-muted">{skin.status}</p>
                    {skin.reprint_of && (
                      <span className="mt-1 inline-block rounded bg-drip-peach/25 px-1.5 text-[10px]">
                        Réimp.
                      </span>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skin.status === "printed" && (
                        <button
                          type="button"
                          className="drip-btn-volt px-3 py-1.5 text-xs"
                          onClick={() => handleCut(skin.id)}
                        >
                          Contrôle OK
                        </button>
                      )}
                      {["printed", "planche_prete", "imposed"].includes(
                        skin.status
                      ) && (
                        <button
                          type="button"
                          className="text-xs text-red-300"
                          onClick={() =>
                            setScrapTarget({
                              id: skin.id,
                              name: skin.design_name,
                              track: skin.track_code,
                            })
                          }
                        >
                          Rebut
                        </button>
                      )}
                      {skin.alert === "commande_annulee" && (
                        <button
                          type="button"
                          className="text-xs font-medium text-red-200"
                          onClick={() => handleRemoveCancelled(skin.id)}
                        >
                          Retirer de la feuille
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={`empty-${idx}`}
                    className="rounded-xl border border-dashed border-drip-border p-3 text-xs text-drip-muted"
                  >
                    S{idx + 1} · vide
                  </div>
                )
              )}
            </div>
          </article>
        ))}
      </div>

      {scrapTarget && (
        <ScrapModal
          open
          designName={scrapTarget.name}
          trackCode={scrapTarget.track}
          loading={isPending}
          onClose={() => setScrapTarget(null)}
          onConfirm={handleScrap}
        />
      )}
    </DashboardShell>
  );
}
