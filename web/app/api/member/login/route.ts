import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, clientIp, handle, readBody } from "@/lib/route";
import { setAuthCookie } from "@/lib/session";

/** POST /api/member/login {email, pass}: setzt das Cookie mpt_member. 5 Fehlversuche in 5 Minuten je IP. */
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readBody(request);
    const auth = await backend.login(String(body.email ?? ""), String(body.pass ?? ""), clientIp(request));
    await setAuthCookie(auth);
    return NextResponse.json({ ok: true });
  });
}
