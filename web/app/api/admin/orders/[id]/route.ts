import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/orders/:id {status?, internalNote?}: neu → bestaetigt → bereit → abgeholt | abgelehnt */
export async function PATCH(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => NextResponse.json({ order: await adminBackend.updateOrder(token, (await params).id, await readBody(request)) }));
}
