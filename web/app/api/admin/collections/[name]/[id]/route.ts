import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { revalidatePublic, withAdmin } from "@/lib/admin-route";
import { isCollectionName } from "@/lib/admin-schema";
import { ApiError } from "@/lib/errors";

type Ctx = { params: Promise<{ name: string; id: string }> };

/** DELETE /api/admin/collections/:name/:id */
export async function DELETE(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { name, id } = await params;
    if (!isCollectionName(name)) throw new ApiError("Unbekannte Sammlung.", 404);
    await adminBackend.deleteCollectionItem(token, name, id);
    revalidatePublic();
    return NextResponse.json({ ok: true });
  });
}
