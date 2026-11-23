import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { revalidatePublic, withAdmin } from "@/lib/admin-route";
import { isSection } from "@/lib/admin-schema";
import { ApiError } from "@/lib/errors";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ section: string }> };

/** PUT /api/admin/settings/:section: studio | hours | seo | forms | legal | booking | appointments | recap | checkup */
export async function PUT(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { section } = await params;
    if (!isSection(section)) throw new ApiError("Unbekannter Bereich.", 404);
    await adminBackend.saveSettings(token, section, await readBody(request));
    revalidatePublic();
    return NextResponse.json({ ok: true });
  });
}
