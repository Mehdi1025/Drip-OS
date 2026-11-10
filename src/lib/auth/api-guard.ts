import { NextResponse } from "next/server";

type GuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Routes lot : Bearer DRIP_ADMIN_SECRET pour scripts externes.
 * Sans en-tête Authorization (UI navigateur) → autorisé si l’app est déjà protégée.
 */
export function requireLotApiAccess(
  authorization: string | null
): GuardResult {
  const secret = process.env.DRIP_ADMIN_SECRET?.trim();
  if (!secret) {
    return { ok: true };
  }

  if (!authorization?.trim()) {
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
