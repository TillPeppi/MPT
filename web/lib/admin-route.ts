import "server-only";
import { revalidatePath } from "next/cache";
import { ApiError } from "./errors";
import { getAdminToken } from "./admin-session";
import { assertSameOrigin, handle } from "./route";

/**
 * Handler für /api/admin/*: liest das Admin-Cookie (sonst 401), prüft bei schreibenden Anfragen die Herkunft.
 * Die eigentliche Rechtepruefung (Sitzung gültig, Konto aktiv) macht das Backend in JEDER Methode.
 */
export async function withAdmin(request: Request, fn: (token: string) => Promise<Response>): Promise<Response> {
  return handle(async () => {
    if (request.method !== "GET") assertSameOrigin(request);
    const token = await getAdminToken();
    if (!token) throw new ApiError("Bitte melde dich als Admin an.", 401);
    return fn(token);
  });
}

/** Statisch erzeugte öffentliche Seiten neu erzeugen lassen (nach Änderungen an Inhalten, Sammlungen, Einstellungen) */
export function revalidatePublic(): void {
  revalidatePath("/", "layout");
}
