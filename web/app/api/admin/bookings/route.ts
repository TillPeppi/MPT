import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

/** GET /api/admin/bookings?from=YYYY-MM-DD: Wochenansicht je Kurs-Termin mit Teilnehmern und Warteliste */
export async function GET(request: Request) {
  return withAdmin(request, async (token) => {
    const from = new URL(request.url).searchParams.get("from");
    return NextResponse.json(await adminBackend.bookingsWeek(token, from));
  });
}

/** POST /api/admin/bookings {courseId, date, memberId, force?}: Buchung im Namen eines Kunden (darf die Platzzahl überschreiten) */
export async function POST(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json(await adminBackend.adminBook(token, await readBody(request)), { status: 201 }));
}
