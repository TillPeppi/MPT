import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** POST /api/member/password {current, new} */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    const body = await readBody(request);
    await backend.changePassword(token, body.current, body.new);
    return NextResponse.json({ ok: true });
  });
}
