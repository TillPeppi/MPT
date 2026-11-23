import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";

/** GET /api/admin/site: komplette Site-Daten inkl. Entwürfen, Preisen, News */
export async function GET(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json(await adminBackend.site(token)));
}
