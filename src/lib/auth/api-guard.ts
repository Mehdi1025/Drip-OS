import { NextResponse } from "next/server";

type GuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Protège les routes API lot (Bearer DRIP_ADMIN_SECRET).
 * Sans secret configuré : accès autorisé (app interne / dev).
 */
export function requireLotApiAccess(
  authorization: string | null
): GuardResult {
  const secret = process.env.DRIP_ADMIN_SECRET?.trim();
  if (!secret) {
    return { ok: true };
  }

  if (authorization === `Bearer ${secret}`) {
    return { ok: true };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    ),
  };
}
