import { NextResponse } from "next/server";
import { handle } from "@/lib/route";
import { getSession } from "@/lib/session";

/** GET /api/member/session: leichte Sitzungsabfrage für Header/Shop. Gäste bekommen `{ session: null }` (kein 401-Rauschen). */
export async function GET() {
  return handle(async () => NextResponse.json({ session: await getSession() }, { headers: { "Cache-Control": "no-store" } }));
}
