import { NextResponse } from "next/server";
import { backend } from "@/lib/api";
import { clientIp, handle } from "@/lib/route";

/** GET /api/member/invite?token=: Name und E-Mail zur Einladung, sonst 400 „Einladung ungültig oder abgelaufen.“ */
export async function GET(request: Request) {
  return handle(async () => {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    return NextResponse.json(await backend.invite(token, clientIp(request)));
  });
}
