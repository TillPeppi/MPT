import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { handle } from "@/lib/route";
import { getToken } from "@/lib/session";

/** GET /api/slots?from=YYYY-MM-DD&days=14: Belegung je Kurstermin (nur Zähler, keine Namen). Mit Sitzung zusätzlich `mine`. */
export async function GET(request: Request) {
  return handle(async () => {
    const q = new URL(request.url).searchParams;
    const days = q.get("days");
    const slots = await backend.slots(q.get("from"), days ? Number(days) : null, await getToken());
    return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  });
}
