import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { revalidatePublic, withAdmin } from "@/lib/admin-route";
import { isCollectionName } from "@/lib/admin-schema";
import { ApiError } from "@/lib/errors";
import { readBody } from "@/lib/route";

type Ctx = { params: Promise<{ name: string }> };

/** POST /api/admin/collections/:name: Eintrag anlegen (ohne `id`) oder ändern (mit `id`) */
export async function POST(request: Request, { params }: Ctx) {
  return withAdmin(request, async (token) => {
    const { name } = await params;
    if (!isCollectionName(name)) throw new ApiError("Unbekannte Sammlung.", 404);
    const item = await adminBackend.saveCollectionItem(token, name, await readBody(request));
    revalidatePublic();
    return NextResponse.json({ item });
  });
}
