import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, handle } from "@/lib/route";
import { clearAuthCookie, getToken } from "@/lib/session";

/** POST /api/member/logout */
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const token = await getToken();
    if (token) await backend.logout(token);
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  });
}
