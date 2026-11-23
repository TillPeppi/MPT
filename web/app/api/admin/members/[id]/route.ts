import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/members/:id: Stammdaten, Pläne, Messungen, Check-ups, Buchungen, Recaps, Anfragen */
export async function GET(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => NextResponse.json(await adminBackend.member(token, (await params).id)));
}

/** PUT /api/admin/members/:id: Stammdaten ändern (inkl. internem Notizblock) */
export async function PUT(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    await adminBackend.updateMember(token, (await params).id, await readBody(request));
    return NextResponse.json({ ok: true });
  });
}

/** DELETE /api/admin/members/:id: Kunde und personenbezogene Daten löschen */
export async function DELETE(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    await adminBackend.deleteMember(token, (await params).id);
    return NextResponse.json({ ok: true });
  });
}
