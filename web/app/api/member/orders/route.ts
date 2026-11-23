import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { withToken } from "@/lib/route";

/** GET /api/member/orders: eigene Shop-Anfragen */
export async function GET() {
  return withToken(async (token) => NextResponse.json({ orders: await backend.orders(token) }, { headers: { "Cache-Control": "no-store" } }));
}
