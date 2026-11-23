import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/members/:id/invite: Einladungslink (7 Tage), auch als Passwort-Reset. Liefert { token, expiresAt }. */
export async function POST(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => NextResponse.json(await adminBackend.createInvite(token, (await params).id)));
}
