import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/bookings/:id/attendance {value: "attended" | "noshow" | "open"} */
export async function POST(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const body = await readBody(request);
    return NextResponse.json({ attendance: await adminBackend.setAttendance(token, (await params).id, body.value) });
  });
}
