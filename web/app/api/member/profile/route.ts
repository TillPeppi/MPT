import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** POST /api/member/profile {phone}: nur Felder, die Kunden selbst ändern dürfen */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    await backend.updateProfile(token, await readBody(request));
    return NextResponse.json({ ok: true });
  });
}
