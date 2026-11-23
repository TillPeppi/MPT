import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/accounts/:id {name?, active?, password?}: ändern, deaktivieren, Passwort zurücksetzen */
export async function PATCH(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { id } = await params;
    return NextResponse.json({ account: await adminBackend.updateAccount(token, id, await readBody(request)) });
  });
}
