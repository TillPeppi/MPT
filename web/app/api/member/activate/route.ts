import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, clientIp, handle, readBody } from "@/lib/route";
import { setAuthCookie } from "@/lib/session";

/** POST /api/member/activate {token, pass}: Passwort setzen (mind. 8 Zeichen), Einladung verbrauchen, einloggen. */
export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readBody(request);
    const auth = await backend.activate(String(body.token ?? ""), body.pass as string, clientIp(request));
    await setAuthCookie(auth);
    return NextResponse.json({ ok: true });
  });
}
