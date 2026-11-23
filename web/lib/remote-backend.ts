import "server-only";
import type { AuthToken, Backend } from "./backend";
import { ApiError } from "./errors";
import type { Appointment, MemberMe, Order, OrderResult, RecapState, Session, ShopProduct, Slot } from "@/types/member";

/*
 * Backend-Implementierung gegen die Go-API (API_URL). Spiegelt die Mock-Routen unter app/api/.
 * Noch nicht gegen ein echtes Backend getestet: Das Go-Backend entsteht erst nach Etappe 3.
 */
export function createRemoteBackend(apiUrl: string): Backend {
  async function call<T>(method: "GET" | "POST", path: string, opts: { token?: string | null; body?: unknown; ip?: string } = {}): Promise<{ data: T; res: Response }> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.token) headers.Cookie = `mpt_member=${opts.token}`;
    if (opts.ip) headers["X-Forwarded-For"] = opts.ip;
    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new ApiError(data.error || "Die Anfrage ist fehlgeschlagen.", res.status);
    return { data, res };
  }

  const authFrom = (res: Response): AuthToken => {
    const cookie = res.headers.get("set-cookie") ?? "";
    const token = /mpt_member=([^;]+)/.exec(cookie)?.[1];
    if (!token) throw new ApiError("Anmeldung nicht möglich.", 502);
    return { token, maxAge: Number(/Max-Age=(\d+)/i.exec(cookie)?.[1] ?? 14 * 24 * 3600) };
  };
  const post = <T>(path: string, token: string | null, body: unknown) => call<T>("POST", path, { token, body }).then((r) => r.data);
  const get = <T>(path: string, token: string | null) => call<T>("GET", path, { token }).then((r) => r.data);

  return {
    login: async (email, pass, ip) => authFrom((await call("POST", "/member/login", { body: { email, pass }, ip })).res),
    logout: async (token) => void (await post("/member/logout", token, {})),
    session: async (token) => (await get<{ session: Session | null }>("/member/session", token)).session,
    invite: (token, ip) => call<{ name: string; email: string }>("GET", `/member/invite?token=${encodeURIComponent(token)}`, { ip }).then((r) => r.data),
    activate: async (token, pass, ip) => authFrom((await call("POST", "/member/activate", { body: { token, pass }, ip })).res),
    me: (token) => get<MemberMe>("/member/me", token),
    updateProfile: async (token, input) => void (await post("/member/profile", token, input)),
    changePassword: async (token, current, next) => void (await post("/member/password", token, { current, new: next })),
    slots: async (from, days, token) => {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (days) q.set("days", String(days));
      return (await get<{ slots: Slot[] }>(`/slots?${q}`, token)).slots;
    },
    book: (token, req) => post("/member/book", token, req),
    cancel: (token, req) => post("/member/cancel", token, req),
    appointments: async (token) => (await get<{ appointments: Appointment[] }>("/member/appointments", token)).appointments,
    requestAppointment: async (token, req) => (await post<{ appointment: Appointment }>("/member/appointments", token, req)).appointment,
    respondAppointment: async (token, req) => (await post<{ appointment: Appointment }>("/member/appointments/respond", token, req)).appointment,
    recap: (token) => get<RecapState>("/member/recap", token),
    submitRecap: (token, answers) => post<RecapState>("/member/recap", token, { answers }),
    shop: async (token) => (await get<{ products: ShopProduct[] }>("/member/shop", token)).products,
    createOrder: (token, req) => post<OrderResult>("/order", token, req),
    orders: async (token) => (await get<{ orders: Order[] }>("/member/orders", token)).orders,
  };
}
