import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/appointments/:id {action: "confirm" | "decline" | "counter", slot?, note?, adminNote?} */
export async function POST(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => NextResponse.json({ appointment: await adminBackend.decideAppointment(token, (await params).id, await readBody(request)) }));
}
