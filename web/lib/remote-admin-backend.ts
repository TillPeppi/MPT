import "server-only";
import type { AdminBackend, AuthToken } from "./backend";
import { ApiError } from "./errors";
import type { AdminAccount, AdminMemberDetail, AdminMemberRow, AdminSession, AdminSlot, DashboardData } from "@/types/admin";
import type { Appointment, Order } from "@/types/member";
import type { Block, Page, SiteData } from "@/types/site";

/*
 * Admin-Backend gegen die Go-API (API_URL), Pfade unter `/admin/...` (spiegeln app/api/admin/*, siehe README).
 * Das Cookie `mpt_admin` wird durchgereicht. Noch nicht gegen ein echtes Backend getestet.
 */
export function createRemoteAdminBackend(apiUrl: string): AdminBackend {
  type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  async function call<T>(method: Method, path: string, opts: { token?: string | null; body?: unknown; ip?: string; raw?: BodyInit; contentType?: string } = {}): Promise<{ data: T; res: Response }> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.contentType) headers["Content-Type"] = opts.contentType;
    if (opts.token) headers.Cookie = `mpt_admin=${opts.token}`;
    if (opts.ip) headers["X-Forwarded-For"] = opts.ip;
    const res = await fetch(`${apiUrl}${path}`, { method, headers, body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)), cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new ApiError(data.error || "Die Anfrage ist fehlgeschlagen.", res.status);
    return { data, res };
  }
  const r = <T>(method: Method, path: string, token: string, body?: unknown) => call<T>(method, path, { token, body }).then((x) => x.data);
  const q = encodeURIComponent;

  const authFrom = (res: Response): AuthToken => {
    const cookie = res.headers.get("set-cookie") ?? "";
    const token = /mpt_admin=([^;]+)/.exec(cookie)?.[1];
    if (!token) throw new ApiError("Anmeldung nicht möglich.", 502);
    return { token, maxAge: Number(/Max-Age=(\d+)/i.exec(cookie)?.[1] ?? 12 * 3600) };
  };

  return {
    login: async (username, pass, ip) => authFrom((await call("POST", "/admin/login", { body: { username, pass }, ip })).res),
    logout: async (token) => void (await r("POST", "/admin/logout", token, {})),
    session: async (token) => (await r<{ session: AdminSession | null }>("GET", "/admin/session", token)).session,
    changePassword: async (token, current, next) => void (await r("POST", "/admin/password", token, { current, new: next })),
    accounts: async (token) => (await r<{ accounts: AdminAccount[] }>("GET", "/admin/accounts", token)).accounts,
    createAccount: async (token, input) => (await r<{ account: AdminAccount }>("POST", "/admin/accounts", token, input)).account,
    updateAccount: async (token, id, input) => (await r<{ account: AdminAccount }>("PATCH", `/admin/accounts/${q(id)}`, token, input)).account,
    dashboard: (token) => r<DashboardData>("GET", "/admin/dashboard", token),

    site: (token) => r<SiteData>("GET", "/admin/site", token),
    updatePageBlock: async (token, pageId, blockId, patch) => (await r<{ block: Block }>("PUT", `/admin/pages/${q(pageId)}/blocks/${q(blockId)}`, token, patch)).block,
    updatePageSeo: async (token, pageId, seo) => (await r<{ page: Page }>("PUT", `/admin/pages/${q(pageId)}/seo`, token, seo)).page,
    saveCollectionItem: async (token, name, item) => (await r<{ item: Record<string, unknown> }>("POST", `/admin/collections/${q(name)}`, token, item)).item,
    deleteCollectionItem: async (token, name, id) => void (await r("DELETE", `/admin/collections/${q(name)}/${q(id)}`, token)),
    saveSettings: (token, section, value) => r<SiteData>("PUT", `/admin/settings/${q(section)}`, token, value),
    uploadImage: async (token, file) => {
      const form = new FormData();
      form.set("file", new Blob([file.data as BlobPart], { type: file.type }), file.name);
      return (await call<{ path: string }>("POST", "/admin/upload", { token, raw: form })).data;
    },

    bookingsWeek: (token, from) => r("GET", `/admin/bookings${from ? `?from=${q(from)}` : ""}`, token) as Promise<{ from: string; slots: AdminSlot[] }>,
    adminBook: (token, req) => r("POST", "/admin/bookings", token, req),
    adminCancelBooking: async (token, id) => void (await r("POST", `/admin/bookings/${q(id)}/cancel`, token, {})),
    setAttendance: async (token, id, value) => (await r<{ attendance: "attended" | "noshow" | "open" }>("POST", `/admin/bookings/${q(id)}/attendance`, token, { value })).attendance,
    setSlotSpots: async (token, courseId, date, spots) => void (await r("POST", "/admin/slots/spots", token, { courseId, date, spots })),
    promoteBooking: async (token, id) => void (await r("POST", `/admin/bookings/${q(id)}/promote`, token, {})),

    appointments: async (token) => (await r<{ appointments: Appointment[] }>("GET", "/admin/appointments", token)).appointments,
    createAppointment: async (token, req) => (await r<{ appointment: Appointment }>("POST", "/admin/appointments", token, req)).appointment,
    decideAppointment: async (token, id, decision) => (await r<{ appointment: Appointment }>("POST", `/admin/appointments/${q(id)}`, token, decision)).appointment,

    members: async (token) => (await r<{ members: AdminMemberRow[] }>("GET", "/admin/members", token)).members,
    member: (token, id) => r<AdminMemberDetail>("GET", `/admin/members/${q(id)}`, token),
    createMember: (token, input) => r("POST", "/admin/members", token, input),
    updateMember: async (token, id, input) => void (await r("PUT", `/admin/members/${q(id)}`, token, input)),
    deleteMember: async (token, id) => void (await r("DELETE", `/admin/members/${q(id)}`, token)),
    createInvite: (token, id) => r("POST", `/admin/members/${q(id)}/invite`, token, {}),
    exportMember: (token, id) => r("GET", `/admin/members/${q(id)}/export`, token),
    saveMemberItem: (token, id, resource, item) => r("POST", `/admin/members/${q(id)}/${q(resource)}`, token, item),
    deleteMemberItem: async (token, id, resource, itemId, parentId) => void (await r("DELETE", `/admin/members/${q(id)}/${q(resource)}/${q(itemId)}${parentId ? `?plan=${q(parentId)}` : ""}`, token)),

    orders: async (token) => (await r<{ orders: Order[] }>("GET", "/admin/orders", token)).orders,
    updateOrder: async (token, id, patch) => (await r<{ order: Order }>("PATCH", `/admin/orders/${q(id)}`, token, patch)).order,
  };
}
