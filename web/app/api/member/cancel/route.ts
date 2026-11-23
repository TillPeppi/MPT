import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** POST /api/member/cancel {id, series}: bis `cancelHours` vor Beginn; die Warteliste rückt automatisch nach */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    return NextResponse.json(await backend.cancel(token, await readBody(request)));
  });
}
