import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** POST /api/member/appointments/respond {id, action: "accept"|"decline"}: Antwort auf den Gegenvorschlag des Admins */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    return NextResponse.json({ appointment: await backend.respondAppointment(token, await readBody(request)) });
  });
}
