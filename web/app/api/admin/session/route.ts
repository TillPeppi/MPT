import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-session";
import { handle } from "@/lib/route";

/** GET /api/admin/session: {session: AdminSession | null} */
export async function GET() {
  return handle(async () => {
    const token = await getAdminToken();
    return NextResponse.json({ session: token ? await adminBackend.session(token) : null });
  });
}
