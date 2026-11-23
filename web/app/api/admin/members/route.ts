import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

/** GET /api/admin/members: Kundenliste */
export async function GET(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json({ members: await adminBackend.members(token) }));
}

/** POST /api/admin/members: Kunde anlegen → { id } */
export async function POST(request: Request) {
  return withAdmin(request, async (token) => NextResponse.json(await adminBackend.createMember(token, await readBody(request)), { status: 201 }));
}
