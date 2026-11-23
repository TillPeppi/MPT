import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { clearAdminCookie, getAdminToken } from "@/lib/admin-session";
import { assertSameOrigin, handle } from "@/lib/route";

/** POST /api/admin/logout */
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const token = await getAdminToken();
    if (token) await adminBackend.logout(token);
    await clearAdminCookie();
    return NextResponse.json({ ok: true });
  });
}
