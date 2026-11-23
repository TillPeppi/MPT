import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** GET /api/member/recap: Fragen, aktuelle Woche, bisherige Einträge mit Score */
export async function GET() {
  return withToken(async (token) => NextResponse.json(await backend.recap(token), { headers: { "Cache-Control": "no-store" } }));
}

/** POST /api/member/recap {answers}: einmal je ISO-Woche (danach 409), Score wird serverseitig berechnet */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    const body = await readBody(request);
    return NextResponse.json(await backend.submitRecap(token, body.answers), { status: 201 });
  });
}
