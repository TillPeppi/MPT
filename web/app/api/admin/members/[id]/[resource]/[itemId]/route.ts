import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { ApiError } from "@/lib/errors";
import type { MemberResource } from "@/types/admin";

type Ctx = { params: Promise<{ id: string; resource: string; itemId: string }> };

const RESOURCES: MemberResource[] = ["plans", "measurements", "checkups", "logs"];

/** DELETE /api/admin/members/:id/:resource/:itemId (Logs: ?plan=<planId>) */
export async function DELETE(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { id, resource, itemId } = await params;
    if (!RESOURCES.includes(resource as MemberResource)) throw new ApiError("Unbekannte Ressource.", 404);
    await adminBackend.deleteMemberItem(token, id, resource as MemberResource, itemId, new URL(request.url).searchParams.get("plan") ?? undefined);
    return NextResponse.json({ ok: true });
  });
}
