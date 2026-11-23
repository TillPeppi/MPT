import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { ApiError } from "@/lib/errors";
import { readBody } from "@/lib/route";
import type { MemberResource } from "@/types/admin";

type Ctx = { params: Promise<{ id: string; resource: string }> };

const RESOURCES: MemberResource[] = ["plans", "measurements", "checkups", "logs"];

/** POST /api/admin/members/:id/(plans|measurements|checkups|logs): anlegen (ohne `id`) oder ändern (mit `id`). Logs brauchen `planId`. */
export async function POST(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { id, resource } = await params;
    if (!RESOURCES.includes(resource as MemberResource)) throw new ApiError("Unbekannte Ressource.", 404);
    return NextResponse.json(await adminBackend.saveMemberItem(token, id, resource as MemberResource, await readBody(request)), { status: 201 });
  });
}
