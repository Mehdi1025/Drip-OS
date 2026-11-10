import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type PlancheUploadCredentials = {
  path: string;
  token: string;
};

/** Envoie le PDF directement vers Supabase (contourne la limite Vercel ~4,5 Mo). */
export async function uploadPlanchePdfToStorage(
  file: File,
  creds: PlancheUploadCredentials
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from("planches")
    .uploadToSignedUrl(creds.path, creds.token, file, {
      upsert: true,
      contentType: file.type || "application/pdf",
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadPlanchePdfsForLot(
  lotId: string,
  files: File[]
): Promise<{ uploaded: number; rejected: string[] }> {
  const rejected: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    const base = file.name;
    try {
      const initRes = await fetch(
        `/api/lots/${encodeURIComponent(lotId)}/upload-direct`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: base }),
        }
      );
      const init = (await initRes.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        sheetCode?: string;
        path?: string;
        token?: string;
      } | null;

      if (!initRes.ok || !init?.ok || !init.path || !init.token) {
        rejected.push(
          `${base} : ${init?.error ?? `init HTTP ${initRes.status}`}`
        );
        continue;
      }

      await uploadPlanchePdfToStorage(file, {
        path: init.path,
        token: init.token,
      });

      const doneRes = await fetch(
        `/api/lots/${encodeURIComponent(lotId)}/upload-direct`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: base,
            path: init.path,
          }),
        }
      );
      const done = (await doneRes.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!doneRes.ok || !done?.ok) {
        rejected.push(
          `${base} : fichier stocké mais feuille non mise à jour (${done?.error ?? doneRes.status}).`
        );
        continue;
      }

      uploaded += 1;
    } catch (e) {
      rejected.push(
        `${base} : ${e instanceof Error ? e.message : "erreur upload"}`
      );
    }
  }

  return { uploaded, rejected };
}
