import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/bookings/:id/cancel: Buchung stornieren (auch nach der Stornofrist), Warteliste rückt ggf. nach */
export async function POST(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    await adminBackend.adminCancelBooking(token, (await params).id);
    return NextResponse.json({ ok: true });
  });
}
