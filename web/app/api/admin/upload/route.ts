import { NextResponse } from "next/server";
import { adminBackend } from "@/lib/api";
import { withAdmin } from "@/lib/admin-route";
import { ApiError } from "@/lib/errors";

/** POST /api/admin/upload (multipart, Feld `file`): JPG/PNG/WebP bis 5 MB → { path: "/uploads/…" } */
export async function POST(request: Request) {
  return withAdmin(request, async (token) => {
    const len = Number(request.headers.get("content-length") ?? 0);
    if (len > 6 * 1024 * 1024) throw new ApiError("Die Datei ist zu groß (höchstens 5 MB).", 413);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError("Ungültige Anfrage.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("Bitte wähle eine Bilddatei.");
    const data = new Uint8Array(await file.arrayBuffer());
    return NextResponse.json(await adminBackend.uploadImage(token, { name: file.name, type: file.type, size: file.size, data }));
  });
}
