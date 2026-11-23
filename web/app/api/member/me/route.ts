import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { withToken } from "@/lib/route";

/** GET /api/member/me: Profil, Buchungen, Termine, Anfragen, Pläne, Messungen, Recap (ohne Passwort-Hash/Einladungs-Token) */
export async function GET() {
  return withToken(async (token) => NextResponse.json(await backend.me(token), { headers: { "Cache-Control": "no-store" } }));
}
