import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

/** POST /api/admin/password {current, new}: eigenes Passwort ändern */
export async function POST(request: Request) {
  return withAdmin(request, async (token) => {
    const body = await readBody(request);
    await adminBackend.changePassword(token, body.current, body.new);
    return NextResponse.json({ ok: true });
  });
}
