import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLotApiAccess } from "@/lib/auth/api-guard";
import { assertLotIdParam } from "@/lib/lots/sheet-code";
import {
  buildLotExportRows,
  lotExportFilename,
  lotExportToCsv,
  recordLotExport,
} from "@/lib/lots/export";

const querySchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
});

type RouteParams = { params: { lotId: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireLotApiAccess(request.headers.get("authorization"));
  if (!auth.ok) return auth.response;

  const lotId = assertLotIdParam(params.lotId);
  if (!lotId) {
    return NextResponse.json({ error: "Lot invalide." }, { status: 400 });
  }

  const parsed = querySchema.safeParse({
    format: request.nextUrl.searchParams.get("format") ?? "csv",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Format invalide." }, { status: 400 });
  }

  try {
    const { rows } = await buildLotExportRows(lotId);
    const version = await recordLotExport(lotId);

    const filename = lotExportFilename(lotId, version, parsed.data.format);

    if (parsed.data.format === "json") {
      return NextResponse.json(rows, {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = lotExportToCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur export.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
