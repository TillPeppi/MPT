import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

/** POST /api/admin/slots/spots {courseId, date, spots | null}: Plätze für einen Termin ändern („Plätze freigeben“); null = Kursstandard */
export async function POST(request: Request) {
  return withAdmin(request, async (token) => {
    const body = await readBody(request);
    await adminBackend.setSlotSpots(token, String(body.courseId ?? ""), String(body.date ?? ""), body.spots ?? null);
    return NextResponse.json({ ok: true });
  });
}
