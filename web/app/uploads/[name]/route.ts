import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/data-paths";

type Ctx = { params: Promise<{ name: string }> };

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * GET /uploads/:name liefert hochgeladene Bilder aus public/uploads.
 * Notwendig, weil `next start` Dateien, die erst nach dem Start in public/ landen, nicht ausliefert (und auf Vercel unter /tmp liegen).
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { name } = await params;
  const m = /^[\w-]+\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Nicht gefunden", { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": TYPES[m[1]], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Nicht gefunden", { status: 404 });
  }
}
