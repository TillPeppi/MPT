import { NextResponse } from "next/server";
import { getPublicSite } from "@/lib/api";

/** GET /api/site: spiegelt den künftigen Go-Endpunkt (Site-Konfiguration inkl. Seiten & Sammlungen). */
export async function GET() {
  return NextResponse.json(await getPublicSite());
}
