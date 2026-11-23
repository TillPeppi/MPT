import "server-only";
import { NextResponse } from "next/server";
import { ApiError } from "./errors";
import { getToken } from "./session";

/** Einheitliche Fehlerantwort: `{ error: "deutscher Text" }` mit passendem Status */
export const fail = (message: string, status = 400): NextResponse => NextResponse.json({ error: message }, { status });

/** Führt einen Handler aus und macht aus ApiError/Fehlern JSON-Antworten. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return fail(err.message, err.status);
    console.error("API-Fehler", err);
    return fail("Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.", 500);
  }
}

/** JSON-Body als Objekt; alles andere ist ein 400er */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("Ungültige Anfrage.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("Ungültige Anfrage.");
  return body as Record<string, unknown>;
}

/** Client-IP für das Rate-Limit (hinter einem Proxy aus X-Forwarded-For) */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || request.headers.get("x-real-ip") || "local";
}

/** Gleicher-Origin-Schutz für schreibende Anfragen (zusätzlich zu SameSite=Lax) */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) throw new ApiError("Anfrage von fremder Herkunft abgelehnt.", 403);
}

/** Handler für angemeldete Kunden: liest das Cookie, sonst 401 */
export async function withToken(fn: (token: string) => Promise<Response>): Promise<Response> {
  return handle(async () => {
    const token = await getToken();
    if (!token) throw new ApiError("Bitte melde dich an.", 401);
    return fn(token);
  });
}
