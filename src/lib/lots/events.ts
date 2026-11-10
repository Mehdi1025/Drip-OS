import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type LotEventType = "export" | "upload" | "alert" | "reprint";

export async function insertLotEvent(
  lotId: string,
  type: LotEventType,
  payload: Record<string, unknown> = {},
  userId?: string | null
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("lot_events").insert({
    lot_id: lotId,
    type,
    payload,
    user_id: userId ?? null,
  });
  if (error) {
    console.error("[lot_events] insert", type, lotId, error);
  }
}
