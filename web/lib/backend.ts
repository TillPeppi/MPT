import type {
  AppointmentRequest,
  AppointmentRespond,
  Appointment,
  BookRequest,
  BookResult,
  MemberMe,
  Order,
  OrderRequest,
  OrderResult,
  RecapState,
  Session,
  ShopProduct,
  Slot,
} from "@/types/member";
import type {
  AdminAccount,
  AdminBookRequest,
  AdminMemberDetail,
  AdminMemberRow,
  AdminSession,
  AdminSlot,
  AppointmentCreate,
  AttendanceValue,
  CollectionName,
  DashboardData,
  MemberInput,
  MemberResource,
  SettingsSection,
} from "@/types/admin";
import type { Block, Page, SiteData } from "@/types/site";

/**
 * Vertrag zwischen Website und Backend für Kundenbereich, Buchung und Shop-Anfragen.
 * Implementierungen: lib/mock-backend.ts (JSON-Dateien) und lib/remote-backend.ts (Go-API, REST).
 * `token` ist der Wert des Cookies `mpt_member`. Fehler werden als ApiError geworfen.
 */
export interface AuthToken {
  token: string;
  /** Cookie-Laufzeit in Sekunden */
  maxAge: number;
}

export interface Backend {
  login(email: string, pass: string, ip: string): Promise<AuthToken>;
  logout(token: string): Promise<void>;
  session(token: string): Promise<Session | null>;
  invite(token: string, ip: string): Promise<{ name: string; email: string }>;
  activate(inviteToken: string, pass: string, ip: string): Promise<AuthToken>;
  me(token: string): Promise<MemberMe>;
  updateProfile(token: string, input: { phone?: unknown }): Promise<void>;
  changePassword(token: string, current: unknown, next: unknown): Promise<void>;

  slots(from: string | null, days: number | null, token: string | null): Promise<Slot[]>;
  book(token: string, req: Partial<Record<keyof BookRequest, unknown>>): Promise<BookResult>;
  cancel(token: string, req: { id?: unknown; series?: unknown }): Promise<{ ok: true; cancelled: number }>;

  appointments(token: string): Promise<Appointment[]>;
  requestAppointment(token: string, req: Partial<Record<keyof AppointmentRequest, unknown>>): Promise<Appointment>;
  respondAppointment(token: string, req: Partial<Record<keyof AppointmentRespond, unknown>>): Promise<Appointment>;

  recap(token: string): Promise<RecapState>;
  submitRecap(token: string, answers: unknown): Promise<RecapState>;

  shop(token: string): Promise<ShopProduct[]>;
  createOrder(token: string, req: Partial<Record<keyof OrderRequest, unknown>>): Promise<OrderResult>;
  orders(token: string): Promise<Order[]>;
}

/**
 * Admin-Backend (Etappe 3). `token` ist der Wert des Cookies `mpt_admin` (getrennt vom Kunden-Cookie `mpt_member`).
 * JEDE Methode prüft die Admin-Sitzung selbst (ApiError 401). Fehler: ApiError mit deutschem Text.
 * Mock: lib/mock-admin-backend.ts, Go-API: lib/remote-admin-backend.ts (Pfade `/admin/...`, siehe README).
 */
export interface AdminBackend {
  login(username: string, pass: string, ip: string): Promise<AuthToken>;
  logout(token: string): Promise<void>;
  session(token: string): Promise<AdminSession | null>;
  changePassword(token: string, current: unknown, next: unknown): Promise<void>;
  accounts(token: string): Promise<AdminAccount[]>;
  createAccount(token: string, input: { username?: unknown; name?: unknown; password?: unknown }): Promise<AdminAccount>;
  updateAccount(token: string, id: string, input: { name?: unknown; active?: unknown; password?: unknown }): Promise<AdminAccount>;
  dashboard(token: string): Promise<DashboardData>;

  /** Komplette Site-Daten inkl. Entwürfen, Preisen und News (nur Admin) */
  site(token: string): Promise<SiteData>;
  updatePageBlock(token: string, pageId: string, blockId: string, patch: { props?: unknown; hidden?: unknown }): Promise<Block>;
  updatePageSeo(token: string, pageId: string, seo: { title?: unknown; description?: unknown }): Promise<Page>;
  saveCollectionItem(token: string, name: CollectionName, item: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteCollectionItem(token: string, name: CollectionName, id: string): Promise<void>;
  saveSettings(token: string, section: SettingsSection, value: unknown): Promise<SiteData>;
  uploadImage(token: string, file: { name: string; type: string; size: number; data: Uint8Array }): Promise<{ path: string }>;

  bookingsWeek(token: string, from: string | null): Promise<{ from: string; slots: AdminSlot[] }>;
  adminBook(token: string, req: Partial<Record<keyof AdminBookRequest, unknown>>): Promise<{ id: string; status: "booked" | "waitlist" }>;
  adminCancelBooking(token: string, id: string): Promise<void>;
  setAttendance(token: string, id: string, value: unknown): Promise<AttendanceValue>;
  setSlotSpots(token: string, courseId: string, date: string, spots: unknown): Promise<void>;
  promoteBooking(token: string, id: string): Promise<void>;

  appointments(token: string): Promise<Appointment[]>;
  createAppointment(token: string, req: Partial<Record<keyof AppointmentCreate, unknown>>): Promise<Appointment>;
  decideAppointment(token: string, id: string, decision: unknown): Promise<Appointment>;

  members(token: string): Promise<AdminMemberRow[]>;
  member(token: string, id: string): Promise<AdminMemberDetail>;
  createMember(token: string, input: MemberInput): Promise<{ id: string }>;
  updateMember(token: string, id: string, input: MemberInput): Promise<void>;
  deleteMember(token: string, id: string): Promise<void>;
  /** Einladungslink erzeugen (auch Passwort-Reset). Der Klartext-Token wird nur hier einmal geliefert. */
  createInvite(token: string, id: string): Promise<{ token: string; expiresAt: number }>;
  exportMember(token: string, id: string): Promise<unknown>;
  saveMemberItem(token: string, id: string, resource: MemberResource, item: unknown): Promise<{ id: string }>;
  deleteMemberItem(token: string, id: string, resource: MemberResource, itemId: string, parentId?: string): Promise<void>;

  orders(token: string): Promise<Order[]>;
  updateOrder(token: string, id: string, patch: { status?: unknown; internalNote?: unknown }): Promise<Order>;
}
