"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Lock,
  Printer,
  ScanLine,
  Upload,
} from "lucide-react";
import {
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
import type { LotDetailData, LotDetailSheet } from "@/lib/lots/types";
import { ScrapModal } from "@/components/workshop/ScrapModal";
import type { ScrapReasonValue } from "@/lib/workshop/scrap-reasons";
import { uploadPlanchePdfsForLot } from "@/lib/lots/upload-client";
import { FILE_STATUS, lotProgressSummary, SKIN_STATUS } from "./lot-ui";

type Props = {
  initial: LotDetailData;
};

const STEPS = [
  { n: 1, title: "Exporter", short: "CSV pour fabriquer les planches" },
  { n: 2, title: "Déposer PDF", short: "Un fichier par feuille (F1, F2…)" },
  { n: 3, title: "Imprimer", short: "Physique + « J'ai imprimé »" },
  { n: 4, title: "Découper", short: "Contrôle OK sur chaque skin" },
  { n: 5, title: "Expédier", short: "Scanner → Marquer expédié" },
] as const;

export function LotDetailDashboard({ initial }: Props) {
  const router = useRouter();
  const [lot, setLot] = useState(initial);
  const [flash, setFlash] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [scrapTarget, setScrapTarget] = useState<{
    id: string;
    name: string;
    track: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  const summary = lotProgressSummary(lot);
  const missingFiles = lot.sheets.length - summary.withPdf;

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await fetchLotDetail(lot.lotId);
      if (res.ok) setLot(res.data);
      router.refresh();
    });
  }, [lot.lotId, router]);

  function notify(type: "ok" | "err", text: string) {
    setFlash({ type, text });
  }

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
        notify("err", res.error);
        return;
      }
      downloadBlob(res.content, res.filename, res.mime);
      refresh();
      notify(
        "ok",
        `Étape 1 OK — export ${format.toUpperCase()} (v${lot.exportVersion + 1}). Fabrique les planches puis dépose les PDF.`
      );
    });
  }

  function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (!list.length) {
      notify("err", "Aucun PDF sélectionné.");
      return;
    }
    startTransition(async () => {
      try {
        const { uploaded, rejected } = await uploadPlanchePdfsForLot(
          lot.lotId,
          list
        );

        if (uploaded === 0) {
          notify("err", rejected.join(" · ") || "Aucun fichier déposé.");
          return;
        }

        notify(
          "ok",
          `Étape 2 — ${uploaded} PDF déposé(s) (upload direct Storage). Imprime puis passe à « J'ai imprimé ».` +
            (rejected.length ? ` Refus : ${rejected.join(" · ")}` : "")
        );
        refresh();
      } catch {
        notify("err", "Erreur réseau lors du dépôt.");
      }
    });
  }

  function handleMarkPrinted(sheetId: string, code: string) {
    startTransition(async () => {
      const res = await markSheetPrintedAction(lot.lotId, sheetId);
      if (!res?.ok) {
        notify("err", res?.error ?? "Échec.");
        return;
      }
      notify("ok", `${code} marquée imprimée — contrôle découpe ci-dessous.`);
      refresh();
    });
  }

  function handleMarkAllPrinted() {
    startTransition(async () => {
      const res = await markAllSheetsPrintedAction(lot.lotId);
      notify(
        res.ok ? "ok" : "err",
        res.ok ? "Toutes les planches prêtes sont marquées imprimées." : res.error
      );
      refresh();
    });
  }

  function handleOpenFile(sheetCode: string) {
    startTransition(async () => {
      const res = await getSignedFileUrl(lot.lotId, sheetCode, "pdf");
      if (!res.ok) {
        notify("err", res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleCut(skinId: string, track: string) {
    startTransition(async () => {
      const res = await markSkinCut(skinId);
      notify(
        res.ok ? "ok" : "err",
        res.ok
          ? `${track} découpé — va dans Emballage / Scanner.`
          : res.error
      );
      refresh();
    });
  }

  function handleScrap(reason: ScrapReasonValue) {
    if (!scrapTarget) return;
    startTransition(async () => {
      const res = await markSkinScrap(scrapTarget.id, reason);
      setScrapTarget(null);
      if (!res.ok) {
        notify("err", res.error);
        return;
      }
      notify(
        "ok",
        res.reprintCreated
          ? "Rebut enregistré — réimpression dans la file Imposition."
          : "Rebut enregistré."
      );
      refresh();
    });
  }

  function handleRemoveCancelled(skinId: string) {
    startTransition(async () => {
      const res = await removeCancelledSkinFromSheet(lot.lotId, skinId);
      notify(
        res.ok ? "ok" : "err",
        res.ok
          ? "Emplacement libéré — réexporte le lot et redépose le PDF."
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
      kicker="Parcours lot"
      title={lot.lotId}
      stats={
        <>
          <StatBadge
            label="Étape"
            value={summary.currentStep}
            variant="volt"
          />
          <StatBadge label="PDF déposés" value={summary.withPdf} />
          <StatBadge
            label="À expédier"
            value={summary.skinsReadyScan}
            variant={summary.skinsReadyScan > 0 ? "success" : "default"}
          />
        </>
      }
    >
      <WorkflowStrip current={summary.currentStep} />

      {flash && (
        <p
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            flash.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900"
              : "border-red-500/35 bg-red-500/10 text-red-900"
          }`}
        >
          {flash.text}
        </p>
      )}

      {summary.skinsReadyScan > 0 && (
        <Link
          href="/scanner"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-4 transition hover:border-emerald-500/50"
        >
          <span className="flex items-center gap-3 text-sm font-medium">
            <ScanLine className="h-6 w-6 text-emerald-700" />
            {summary.skinsReadyScan} skin(s) prêt(s) — ouvre le Scanner
          </span>
          <ChevronRight className="h-5 w-5 text-emerald-700" />
        </Link>
      )}

      {hasCancelBanner && (
        <div className="mb-6 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-900">
          Commande annulée sur un emplacement : retire le skin, réexporte le lot,
          redépose le PDF.
        </div>
      )}

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <section className="drip-card p-5">
          <StepHeader n={1} title="Exporter le lot" active={summary.needsExport} />
          <p className="mt-2 text-sm text-drip-muted">
            Télécharge le CSV pour créer les planches hors Drip OS. Le lot se{" "}
            <strong className="text-drip-ink">fige</strong> au premier export.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lot.locked && (
              <span className="flex items-center gap-1 rounded-full border border-drip-volt/30 bg-drip-volt/10 px-2.5 py-1 text-[11px] font-medium">
                <Lock className="h-3 w-3" /> Figé · v{lot.exportVersion}
              </span>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleExport("csv")}
              className="drip-btn-volt flex min-h-[44px] flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm sm:flex-none"
            >
              <Download className="h-4 w-4" />
              Télécharger CSV
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleExport("json")}
              className="min-h-[44px] rounded-xl border border-drip-border px-4 py-2.5 text-sm font-medium"
            >
              JSON
            </button>
          </div>
        </section>

        <section
          className={`drip-card border-2 p-5 transition ${
            summary.needsUpload
              ? "border-drip-volt/40 shadow-[0_0_0_1px_rgba(91,46,255,0.12)]"
              : "border-transparent"
          }`}
        >
          <StepHeader n={2} title="Déposer les PDF" active={summary.needsUpload} />
          <p className="mt-2 text-sm text-drip-muted">
            Upload direct (pas de limite Vercel). Nomme chaque fichier :{" "}
            <span className="font-mono text-drip-ink">F1.pdf</span>,{" "}
            <span className="font-mono text-drip-ink">
              {lot.lotId}_F1.pdf
            </span>
            , etc. Plusieurs fichiers en une fois.
          </p>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              uploadFiles(e.dataTransfer.files);
            }}
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 transition ${
              dragOver
                ? "border-drip-volt bg-drip-volt/10"
                : "border-drip-border bg-drip-paper hover:border-drip-volt/40"
            }`}
          >
            <Upload className="h-10 w-10 text-drip-volt" />
            <span className="mt-3 text-center text-sm font-medium">
              Glisser-déposer ou appuyer pour choisir
            </span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </label>
        </section>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">Feuilles du lot</h2>
          <p className="text-sm text-drip-muted">
            Étapes 3 et 4 — par feuille puis par skin (S1–S4).
          </p>
        </div>
        {summary.needsPrintMark && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleMarkAllPrinted}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-drip-border px-4 text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            Tout marquer imprimé
          </button>
        )}
      </div>

      <div className="space-y-5">
        {lot.sheets.map((sheet) => (
          <SheetCard
            key={sheet.id}
            sheet={sheet}
            isPending={isPending}
            onOpen={() => handleOpenFile(sheet.sheetCode)}
            onMarkPrinted={() => handleMarkPrinted(sheet.id, sheet.sheetCode)}
            onCut={handleCut}
            onScrap={(skin) =>
              setScrapTarget({
                id: skin.id,
                name: skin.design_name,
                track: skin.track_code,
              })
            }
            onRemoveCancelled={handleRemoveCancelled}
          />
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

function WorkflowStrip({ current }: { current: number }) {
  return (
    <nav
      className="mb-8 overflow-x-auto pb-1"
      aria-label="Parcours de production du lot"
    >
      <ol className="flex min-w-[520px] gap-1 sm:min-w-0 sm:gap-2">
        {STEPS.map((step) => {
          const done = step.n < current;
          const active = step.n === current;
          return (
            <li
              key={step.n}
              className={`flex flex-1 flex-col rounded-xl border px-2 py-2.5 sm:px-3 ${
                active
                  ? "border-drip-volt/40 bg-drip-volt/10"
                  : done
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-drip-border bg-drip-surface/50"
              }`}
            >
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-drip-muted">
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      active
                        ? "bg-drip-volt text-white"
                        : "bg-drip-border text-drip-muted"
                    }`}
                  >
                    {step.n}
                  </span>
                )}
                {step.title}
              </span>
              <span className="mt-0.5 hidden text-[10px] leading-snug text-drip-muted sm:block">
                {step.short}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepHeader({
  n,
  title,
  active,
}: {
  n: number;
  title: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
          active ? "bg-drip-volt text-white" : "bg-drip-border text-drip-muted"
        }`}
      >
        {n}
      </span>
      <h3 className="font-display text-base font-medium">{title}</h3>
    </div>
  );
}

function SheetCard({
  sheet,
  isPending,
  onOpen,
  onMarkPrinted,
  onCut,
  onScrap,
  onRemoveCancelled,
}: {
  sheet: LotDetailSheet;
  isPending: boolean;
  onOpen: () => void;
  onMarkPrinted: () => void;
  onCut: (skinId: string, track: string) => void;
  onScrap: (skin: NonNullable<LotDetailSheet["slots"][0]>) => void;
  onRemoveCancelled: (skinId: string) => void;
}) {
  const meta = FILE_STATUS[sheet.fileStatus];
  const filled = sheet.slots.filter(Boolean).length;

  return (
    <article className="drip-card overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-drip-border bg-drip-lilac/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
            Feuille
          </p>
          <p className="font-mono text-2xl font-semibold">{sheet.sheetCode}</p>
          <p className="text-xs text-drip-muted">
            {filled} skin(s) · {meta.hint}
          </p>
        </div>
        <span
          className={`self-start rounded-full px-3 py-1.5 text-xs font-medium ${meta.tone}`}
        >
          {meta.label}
        </span>
      </header>

      <div className="flex flex-col gap-2 border-b border-drip-border p-4 sm:flex-row">
        <button
          type="button"
          disabled={!sheet.filePath || isPending}
          onClick={onOpen}
          className="drip-touch min-h-[48px] flex-1 rounded-xl border border-drip-border bg-drip-elevated px-4 py-3 text-sm font-medium disabled:opacity-40"
        >
          Ouvrir le PDF
        </button>
        <button
          type="button"
          disabled={sheet.fileStatus !== "planche_prete" || isPending}
          onClick={onMarkPrinted}
          className="drip-btn-volt drip-touch min-h-[48px] flex-1 px-4 py-3 text-sm disabled:opacity-40"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" />
            J&apos;ai imprimé cette feuille
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 lg:grid-cols-4">
        {sheet.slots.map((skin, idx) =>
          skin ? (
            <div
              key={skin.id}
              className={`flex min-h-[140px] flex-col rounded-xl border p-3 ${
                skin.alert === "commande_annulee"
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-drip-border bg-drip-paper"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="drip-chip py-0.5 font-mono text-[10px]">
                  S{idx + 1}
                </span>
                {skin.reprint_of && (
                  <span className="rounded bg-drip-peach/30 px-1 text-[9px] font-bold">
                    Réimp.
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">
                {skin.design_name}
              </p>
              <p className="mt-1 font-mono text-[10px] text-drip-muted">
                {skin.track_code}
              </p>
              <SkinStatusPill status={skin.status} />
              <div className="mt-auto flex flex-col gap-2 pt-3">
                {skin.status === "printed" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onCut(skin.id, skin.track_code)}
                    className="drip-btn-volt w-full py-2.5 text-xs font-medium"
                  >
                    Contrôle OK
                  </button>
                )}
                {skin.status === "cut" && (
                  <Link
                    href="/scanner"
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-800"
                  >
                    <ScanLine className="h-3.5 w-3.5" />
                    Expédier
                  </Link>
                )}
                {["printed", "planche_prete", "imposed"].includes(
                  skin.status
                ) && (
                  <button
                    type="button"
                    onClick={() => onScrap(skin)}
                    className="text-center text-[11px] text-red-600 underline"
                  >
                    Signaler un rebut
                  </button>
                )}
                {skin.alert === "commande_annulee" && (
                  <button
                    type="button"
                    onClick={() => onRemoveCancelled(skin.id)}
                    className="w-full rounded-lg border border-red-500/40 py-2 text-[11px] font-medium text-red-800"
                  >
                    Retirer (annulation)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              key={`e-${idx}`}
              className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-drip-border bg-drip-surface/50 text-xs text-drip-muted"
            >
              S{idx + 1} · vide
            </div>
          )
        )}
      </div>
    </article>
  );
}

function SkinStatusPill({ status }: { status: string }) {
  const meta = SKIN_STATUS[status] ?? {
    label: status,
    tone: "bg-drip-border text-drip-muted",
  };
  return (
    <span
      className={`mt-2 inline-block w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}
