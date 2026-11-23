import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** GET /api/member/appointments: eigene PT-/Check-up-Termine mit Status */
export async function GET() {
  return withToken(async (token) => NextResponse.json({ appointments: await backend.appointments(token) }, { headers: { "Cache-Control": "no-store" } }));
}

/** POST /api/member/appointments {type, preferred:{date,start}, alternative?, note?}: Terminanfrage (Status `requested`) */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    return NextResponse.json({ appointment: await backend.requestAppointment(token, await readBody(request)) }, { status: 201 });
  });
}
