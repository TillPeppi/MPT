import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** POST /api/order: Shop-Anfrage (nur angemeldet). Preise berechnet der Server aus den Produktdaten, nie der Client. */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    const result = await backend.createOrder(token, await readBody(request));
    return NextResponse.json(result);
  });
}
