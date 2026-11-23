import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";

/** GET /api/admin/orders: alle Shop-Anfragen */
export async function GET(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json({ orders: await adminBackend.orders(token) }));
}
