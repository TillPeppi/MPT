import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { revalidatePublic, withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ pageId: string; blockId: string }> };

/** PUT /api/admin/pages/:pageId/blocks/:blockId {props?, hidden?}: Texte/Bilder/Links/Listen eines Abschnitts, ein-/ausblenden */
export async function PUT(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { pageId, blockId } = await params;
    const block = await adminBackend.updatePageBlock(token, pageId, blockId, await readBody(request));
    revalidatePublic();
    return NextResponse.json({ block });
  });
}
