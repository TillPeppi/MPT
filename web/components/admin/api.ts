/** Aufruf der Admin-API aus dem Browser. Fehler werden als `Error` mit deutschem Text geworfen. */
export async function adminApi<T = Record<string, unknown>>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Keine Verbindung zum Server.");
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    // Harte Navigation ist gewollt: abgelaufene Sitzung, Zustand verwerfen
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (res.status === 401 && !path.endsWith("/login")) window.location.assign(`${window.location.origin}/admin/login`);
    throw new Error(json.error || "Das hat nicht geklappt.");
  }
  return json;
}

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : "Das hat nicht geklappt.");
