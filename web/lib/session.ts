import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { backend } from "./api";
import type { AuthToken } from "./backend";
import type { Session } from "@/types/member";

export const MEMBER_COOKIE = "mpt_member";

/** Token des Sitzungs-Cookies (HttpOnly, daher nur serverseitig lesbar) */
export async function getToken(): Promise<string | null> {
  return (await cookies()).get(MEMBER_COOKIE)?.value ?? null;
}

/** Aktuelle Sitzung oder null (Gast). Pro Request nur einmal geprüft. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = await getToken();
  return token ? backend.session(token) : null;
});

/**
 * Serverseitiger Schutz für Seiten im Kundenbereich. Wichtig: jede geschützte Seite ruft das selbst auf,
 * Layouts werden bei der Navigation nicht neu gerendert (Next.js Authentication Guide).
 */
export async function requireSession(): Promise<{ session: Session; token: string }> {
  const token = await getToken();
  const session = await getSession();
  if (!token || !session) redirect("/mitglieder/login");
  return { session, token };
}

export async function setAuthCookie(auth: AuthToken): Promise<void> {
  (await cookies()).set(MEMBER_COOKIE, auth.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: auth.maxAge,
  });
}

export async function clearAuthCookie(): Promise<void> {
  (await cookies()).delete(MEMBER_COOKIE);
}
