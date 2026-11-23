import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

/** GET /api/admin/appointments: alle PT-/Check-up-Anfragen */
export async function GET(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json({ appointments: await adminBackend.appointments(token) }));
}

/** POST /api/admin/appointments {memberId, type, slot:{date,start}, note?}: Termin direkt für einen Kunden anlegen (bestätigt) */
export async function POST(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json({ appointment: await adminBackend.createAppointment(token, await readBody(request)) }, { status: 201 }));
}
