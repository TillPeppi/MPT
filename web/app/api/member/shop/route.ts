import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { withToken } from "@/lib/route";

/** GET /api/member/shop: Produkte mit Preisen (nur für angemeldete Kunden) */
export async function GET() {
  return withToken(async (token) => NextResponse.json({ products: await backend.shop(token) }, { headers: { "Cache-Control": "no-store" } }));
}
