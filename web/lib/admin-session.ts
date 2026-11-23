import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminBackend } from "./api";
import type { AuthToken } from "./backend";
import type { AdminSession } from "@/types/admin";

/** Eigenes Cookie für den Admin: ein Kunden-Cookie (`mpt_member`) öffnet nie Admin-Seiten oder -Endpunkte. */
export const ADMIN_COOKIE = "mpt_admin";

export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
}

/** Aktuelle Admin-Sitzung oder null. Pro Request nur einmal geprüft. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = await getAdminToken();
  return token ? adminBackend.session(token) : null;
});

/**
 * Serverseitiger Schutz für JEDE Admin-Seite (zusätzlich zu proxy.ts). Layouts laufen bei Navigation nicht neu,
 * darum ruft jede Seite das selbst auf.
 */
export async function requireAdmin(): Promise<{ admin: AdminSession; token: string }> {
  const token = await getAdminToken();
  const admin = await getAdminSession();
  if (!token || !admin) redirect("/admin/login");
  return { admin, token };
}

export async function setAdminCookie(auth: AuthToken): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, auth.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: auth.maxAge,
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
