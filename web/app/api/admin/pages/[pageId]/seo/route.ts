import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { revalidatePublic, withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ pageId: string }> };

/** PUT /api/admin/pages/:pageId/seo {title?, description?} */
export async function PUT(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { pageId } = await params;
    const page = await adminBackend.updatePageSeo(token, pageId, await readBody(request));
    revalidatePublic();
    return NextResponse.json({ page });
  });
}
