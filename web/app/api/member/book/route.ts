import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { assertSameOrigin, readBody, withToken } from "@/lib/route";

/** POST /api/member/book {courseId, date, weeks}: Einzel- oder Serienbuchung, volle Termine → Warteliste */
export async function POST(request: Request) {
  return withToken(async (token) => {
    assertSameOrigin(request);
    return NextResponse.json(await backend.book(token, await readBody(request)));
  });
}
