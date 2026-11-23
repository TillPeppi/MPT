import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { setAdminCookie } from "@/lib/admin-session";
import { assertSameOrigin, clientIp, handle, readBody } from "@/lib/route";

/** POST /api/admin/login {username, pass}: setzt das Cookie mpt_admin. 5 Fehlversuche in 5 Minuten je IP. */
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readBody(request);
    const auth = await adminBackend.login(String(body.username ?? ""), String(body.pass ?? ""), clientIp(request));
    await setAdminCookie(auth);
    return NextResponse.json({ ok: true });
  });
}
