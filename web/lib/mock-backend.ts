import "server-only";
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AuthToken, Backend } from "./backend";
import { ApiError } from "./errors";
import { addDays, iso, toMin } from "./format";
import { readCollection, transaction, type Tx } from "./mock-db";
import { computeScore, isoWeekOf, scaleValues } from "./recap";
import type { NewsItem } from "@/types/admin";
import type { Allowed, Appointment, AppointmentType, Booking, MemberProfile, MemberRecord, Order, OrderItem, RecapEntry, Session as PublicSession, Slot, SlotOverride, TimeSlot } from "@/types/member";
import type { Course, SiteData } from "@/types/site";

/*
 * Mock-Implementierung des Backends (Regeln wie server.py und docs/spec-kunden-shop-buchung.md).
 * Die Go-API übernimmt später exakt diese Regeln; hier steht, was sie können muss.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;

const SESSION_TTL_S = 14 * 24 * 3600;
const LOGIN_MAX_FAILS = 5;
const LOGIN_WINDOW_MS = 5 * 60_000;
const INVITE_WINDOW_MS = LOGIN_WINDOW_MS;

export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");
export const uid = (p: string): string => `${p}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
export const nowIso = (): string => new Date().toISOString();

/* ---------- Passwörter ---------- */

export async function hashPassword(pw: string): Promise<NonNullable<MemberRecord["pw"]>> {
  const salt = randomBytes(16).toString("hex");
  return { algo: "scrypt", salt, hash: (await scrypt(pw, salt, 64)).toString("hex") };
}

const DUMMY_SALT = "00".repeat(16);

export async function verifyPassword(pw: string, stored: MemberRecord["pw"] | undefined): Promise<boolean> {
  // Auch bei unbekannter E-Mail rechnen: gleiche Laufzeit, kein Hinweis, ob es die Adresse gibt
  const salt = stored?.salt ?? DUMMY_SALT;
  const calc = await scrypt(pw, salt, 64);
  if (!stored) return false;
  const expected = Buffer.from(stored.hash, "hex");
  return expected.length === calc.length && timingSafeEqual(expected, calc);
}

export function checkNewPassword(v: unknown): string {
  const pw = typeof v === "string" ? v : "";
  if (pw.length < 8) throw new ApiError("Das Passwort braucht mindestens 8 Zeichen.");
  if (pw.length > 200) throw new ApiError("Das Passwort ist zu lang.");
  return pw;
}

/* ---------- Rate-Limit (je IP, im Speicher) ---------- */

const gl = globalThis as unknown as { __mptFails?: Map<string, number[]> };
export const fails: Map<string, number[]> = (gl.__mptFails ??= new Map<string, number[]>());

export function assertNotLimited(key: string, windowMs = LOGIN_WINDOW_MS): void {
  const recent = (fails.get(key) ?? []).filter((t) => t > Date.now() - windowMs);
  fails.set(key, recent);
  if (recent.length >= LOGIN_MAX_FAILS) throw new ApiError("Zu viele Fehlversuche. Bitte warte ein paar Minuten und versuche es dann erneut.", 429);
}
export const registerFail = (key: string): void => void fails.set(key, [...(fails.get(key) ?? []), Date.now()]);

/* ---------- Validierung ---------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseDate(v: unknown, label = "Datum"): Date {
  if (typeof v !== "string" || !DATE_RE.test(v)) throw new ApiError(`${label}: bitte ein gültiges Datum angeben.`);
  const d = new Date(`${v}T12:00:00`);
  if (Number.isNaN(d.getTime()) || iso(d) !== v) throw new ApiError(`${label}: bitte ein gültiges Datum angeben.`);
  return d;
}

export const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const startOf = (date: string, time: string): Date => new Date(`${date}T${time || "00:00"}:00`);
const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export function isClosed(site: SiteData, date: string): boolean {
  return (site.settings.hours.exceptions ?? []).some((e) => e.date === date && e.closed);
}

export function bookingCfg(site: SiteData) {
  const b = site.settings.booking;
  return { weeksAhead: b.weeksAhead ?? 8, maxSeries: b.maxSeries ?? 12, cancelHours: b.cancelHours ?? 12, autoPromote: b.waitlistAutoPromote !== false };
}

/** B-7: Darf dieser Kunde den Kurs buchen? Ohne `allowed` (oder leer) ist er offen für alle. */
export function isAllowed(allowed: Allowed | undefined, member: Pick<MemberProfile, "id" | "tariff" | "groups"> | null): boolean {
  const t = allowed?.tariffs ?? [];
  const g = allowed?.groups ?? [];
  const m = allowed?.memberIds ?? [];
  if (!t.length && !g.length && !m.length) return true;
  if (!member) return false;
  return t.includes(member.tariff) || g.some((x) => member.groups.includes(x)) || m.includes(member.id);
}

export function toProfile(m: MemberRecord): MemberProfile {
  return {
    id: m.id,
    role: m.role,
    name: m.name,
    email: m.email,
    phone: m.phone,
    active: m.active,
    tariff: m.tariff,
    groups: m.groups,
    createdAt: m.createdAt,
    nextMeasurementDue: m.nextMeasurementDue ?? null,
  };
}

/* ---------- Sitzungen ---------- */

async function findMemberBySession(tx: Tx, token: string | null): Promise<MemberRecord | null> {
  if (!token) return null;
  const h = sha256(token);
  const { sessions } = await tx.get("sessions");
  const s = sessions.find((x) => x.hash === h && x.exp > Date.now());
  if (!s) return null;
  const { members } = await tx.get("members");
  const m = members.find((x) => x.id === s.memberId);
  return m && m.active ? m : null;
}

async function requireMember(tx: Tx, token: string | null): Promise<MemberRecord> {
  const m = await findMemberBySession(tx, token);
  if (!m) throw new ApiError("Bitte melde dich an.", 401);
  return m;
}

async function startSession(tx: Tx, memberId: string): Promise<AuthToken> {
  const token = randomBytes(32).toString("base64url");
  const store = await tx.get("sessions");
  store.sessions = store.sessions.filter((s) => s.exp > Date.now());
  store.sessions.push({ hash: sha256(token), memberId, exp: Date.now() + SESSION_TTL_S * 1000, createdAt: Date.now() });
  tx.save("sessions");
  return { token, maxAge: SESSION_TTL_S };
}

/* ---------- Buchungs-Hilfen ---------- */

export const countBooked = (bks: Booking[], courseId: string, date: string): number =>
  bks.filter((b) => b.courseId === courseId && b.date === date && b.status === "booked").length;

/** Rückt die ältesten Wartelisten-Einträge nach, solange Plätze frei sind. */
export function promote(bks: Booking[], spots: number, courseId: string, date: string): void {
  while (countBooked(bks, courseId, date) < spots) {
    const next = bks
      .filter((b) => b.courseId === courseId && b.date === date && b.status === "waitlist")
      .sort((a, z) => a.createdAt.localeCompare(z.createdAt))[0];
    if (!next) return;
    next.status = "booked"; // Mail an die nachgerückte Person folgt mit dem Go-Backend
  }
}

/** Plätze eines Termins: Überschreibung durch den Admin („Plätze freigeben“) oder Kursstandard */
export const spotsOf = (overrides: SlotOverride[] | undefined, course: Pick<Course, "id" | "spots">, date: string): number =>
  overrides?.find((o) => o.courseId === course.id && o.date === date)?.spots ?? course.spots;

/** Ohne Admin-Hinweise (adminNote ist intern) */
export const publicAppointment = (a: Appointment): Appointment => {
  const { adminNote, ...rest } = a;
  void adminNote;
  return rest;
};
const publicOrder = (o: Order): Order => {
  const { internalNote, ...rest } = o;
  void internalNote;
  return rest;
};

/** News für einen Kunden: veröffentlicht (publishAt erreicht) und Zielgruppe passt */
export function newsFor(site: SiteData, m: Pick<MemberProfile, "id" | "groups">, now: Date): NewsItem[] {
  const stamp = `${iso(now)}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (site.collections.news ?? [])
    .filter((n) => n.publishAt <= stamp)
    .filter((n) => n.audience === "all" || (n.audience === "group" && (n.groups ?? []).some((g) => m.groups.includes(g))) || (n.audience === "members" && (n.memberIds ?? []).includes(m.id)))
    .sort((a, z) => z.publishAt.localeCompare(a.publishAt));
}

/** Trainingseinheiten (Buchung oder Log) in einem Zeitraum, je Tag einmal gezählt.
 *  Anwesenheit vom Admin: `attended === true` zählt immer, `false` (nicht erschienen) nie;
 *  ohne Eintrag (`null`) zählt die vergangene Buchung als Fallback. */
export function sessionDates(m: MemberRecord, bks: Booking[], from: string, to: string, now: Date): Set<string> {
  const dates = new Set<string>();
  for (const b of bks) {
    if (b.memberId !== m.id || b.status !== "booked" || b.attended === false) continue;
    if (b.date >= from && b.date <= to && startOf(b.date, b.start) <= now) dates.add(b.date);
  }
  for (const p of m.plans) for (const l of p.logs) if (l.date >= from && l.date <= to) dates.add(l.date);
  return dates;
}

/* ---------- Mock-Backend ---------- */

export function createMockBackend(getSite: () => Promise<SiteData>): Backend {
  async function buildRecapState(tx: Tx, m: MemberRecord, site: SiteData) {
    const { recaps } = await tx.get("recaps");
    const entries = recaps.filter((r) => r.memberId === m.id).sort((a, z) => z.weekStart.localeCompare(a.weekStart));
    const { week, weekStart } = isoWeekOf(new Date());
    return {
      config: site.settings.recap,
      currentWeek: week,
      currentWeekStart: weekStart,
      current: entries.find((e) => e.week === week) ?? null,
      entries,
    };
  }

  return {
    async login(email, pass, ip) {
      const key = `login:${ip}`;
      assertNotLimited(key);
      const mail = text(email, 200).toLowerCase();
      const { members } = await readCollection("members");
      const m = members.find((x) => x.email.toLowerCase() === mail);
      const ok = await verifyPassword(String(pass ?? "").slice(0, 200), m?.pw);
      if (!m || !ok || !m.active) {
        registerFail(key);
        throw new ApiError("E-Mail oder Passwort stimmt nicht.", 401);
      }
      fails.delete(key);
      return transaction((tx) => startSession(tx, m.id));
    },

    async logout(token) {
      await transaction(async (tx) => {
        const store = await tx.get("sessions");
        const h = sha256(token);
        const before = store.sessions.length;
        store.sessions = store.sessions.filter((s) => s.hash !== h);
        if (store.sessions.length !== before) tx.save("sessions");
      });
    },

    async session(token) {
      const m = await transaction((tx) => findMemberBySession(tx, token));
      if (!m) return null;
      const s: PublicSession = { memberId: m.id, name: m.name, firstName: firstName(m.name), email: m.email, role: m.role };
      return s;
    },

    async invite(token, ip) {
      const key = `invite:${ip}`;
      assertNotLimited(key, INVITE_WINDOW_MS);
      const h = sha256(String(token ?? ""));
      const { members } = await readCollection("members");
      const m = members.find((x) => x.invite?.hash === h && x.invite.exp > Date.now());
      if (!m) {
        registerFail(key);
        throw new ApiError("Einladung ungültig oder abgelaufen.");
      }
      return { name: m.name, email: m.email };
    },

    async activate(inviteToken, pass, ip) {
      const key = `invite:${ip}`;
      assertNotLimited(key, INVITE_WINDOW_MS);
      const pw = checkNewPassword(pass);
      const h = sha256(String(inviteToken ?? ""));
      const pwHash = await hashPassword(pw);
      return transaction(async (tx) => {
        const { members } = await tx.get("members");
        const m = members.find((x) => x.invite?.hash === h && x.invite.exp > Date.now());
        if (!m) {
          registerFail(key);
          throw new ApiError("Einladung ungültig oder abgelaufen.");
        }
        m.pw = pwHash;
        m.invite = null;
        tx.save("members");
        return startSession(tx, m.id);
      });
    },

    async me(token) {
      const site = await getSite();
      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        const { bookings } = await tx.get("bookings");
        const { appointments } = await tx.get("appointments");
        const { orders } = await tx.get("orders");
        const now = new Date();
        const from = iso(addDays(now, -60));
        const mine = bookings
          .filter((b) => b.memberId === m.id && b.date >= from)
          .sort((a, z) => `${a.date} ${a.start}`.localeCompare(`${z.date} ${z.start}`));
        const dates = sessionDates(m, bookings, iso(addDays(now, -30)), iso(now), now);
        return {
          member: toProfile(m),
          bookings: mine,
          appointments: appointments.filter((a) => a.memberId === m.id).sort((a, z) => z.createdAt.localeCompare(a.createdAt)).map(publicAppointment),
          orders: orders.filter((o) => o.memberId === m.id).sort((a, z) => z.createdAt.localeCompare(a.createdAt)).map(publicOrder),
          plans: m.plans,
          measurements: [...m.measurements].sort((a, z) => a.date.localeCompare(z.date)),
          recap: await buildRecapState(tx, m, site),
          attendedCount30d: dates.size,
          news: newsFor(site, m, now),
        };
      });
    },

    async updateProfile(token, input) {
      const phone = text(input.phone, 30);
      if (!/^[0-9+()/\-\s]*$/.test(phone)) throw new ApiError("Bitte gib eine gültige Telefonnummer an.");
      await transaction(async (tx) => {
        const m = await requireMember(tx, token);
        m.phone = phone;
        tx.save("members");
      });
    },

    async changePassword(token, current, next) {
      const pw = checkNewPassword(next);
      const newHash = await hashPassword(pw);
      await transaction(async (tx) => {
        const m = await requireMember(tx, token);
        if (!(await verifyPassword(String(current ?? "").slice(0, 200), m.pw))) throw new ApiError("Das aktuelle Passwort ist falsch.");
        m.pw = newHash;
        tx.save("members");
        // andere Geräte abmelden, dieses behalten
        const keep = sha256(token);
        const store = await tx.get("sessions");
        store.sessions = store.sessions.filter((s) => s.memberId !== m.id || s.hash === keep);
        tx.save("sessions");
      });
    },

    async slots(from, days, token) {
      const site = await getSite();
      const cfg = bookingCfg(site);
      const now = new Date();
      const today = new Date(now);
      today.setHours(12, 0, 0, 0);
      const d0 = parseDate(from ?? iso(now), "Startdatum");
      const n = Math.max(1, Math.min(Number.isFinite(days) && days ? Math.floor(days as number) : 14, 70));
      const limit = addDays(today, cfg.weeksAhead * 7);
      const { member, bookings, overrides } = await transaction(async (tx) => {
        const store = await tx.get("bookings");
        return { member: await findMemberBySession(tx, token), bookings: store.bookings, overrides: store.overrides };
      });
      const counts = new Map<string, { booked: number; waitlist: number }>();
      for (const b of bookings) {
        if (b.status === "cancelled") continue;
        const k = `${b.courseId}|${b.date}`;
        const c = counts.get(k) ?? { booked: 0, waitlist: 0 };
        c[b.status] += 1;
        counts.set(k, c);
      }
      const courses = [...site.collections.courses].sort((a, z) => toMin(a.start) - toMin(z.start));
      const out: Slot[] = [];
      for (let i = 0; i < n; i++) {
        const d = addDays(d0, i);
        const date = iso(d);
        for (const co of courses) {
          if (Number(co.day) !== d.getDay()) continue;
          const c = counts.get(`${co.id}|${date}`) ?? { booked: 0, waitlist: 0 };
          const past = startOf(date, co.start) <= now;
          const closed = isClosed(site, date);
          const restricted = !!(co.allowed && ((co.allowed.tariffs?.length ?? 0) + (co.allowed.groups?.length ?? 0) + (co.allowed.memberIds?.length ?? 0)) > 0);
          const allowed = isAllowed(co.allowed, member);
          const mineBk = member ? bookings.find((b) => b.memberId === member.id && b.courseId === co.id && b.date === date && b.status !== "cancelled") : undefined;
          out.push({
            courseId: co.id,
            date,
            start: co.start,
            spots: spotsOf(overrides, co, date),
            booked: c.booked,
            waitlist: c.waitlist,
            past,
            closed,
            bookable: !past && !closed && d <= limit && allowed,
            restricted,
            allowed,
            ...(mineBk && (mineBk.status === "booked" || mineBk.status === "waitlist") ? { mine: mineBk.status } : {}),
          });
        }
      }
      return out;
    },

    async book(token, req) {
      const site = await getSite();
      const cfg = bookingCfg(site);
      const course = site.collections.courses.find((c) => c.id === req.courseId);
      if (!course) throw new ApiError("Kurs unbekannt.", 404);
      const d0 = parseDate(req.date);
      const weeks = Number(req.weeks ?? 1);
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > cfg.maxSeries) throw new ApiError(`Die Serie darf 1 bis ${cfg.maxSeries} Wochen umfassen.`);
      if (d0.getDay() !== Number(course.day)) throw new ApiError("Der Kurs findet an diesem Wochentag nicht statt.");
      const now = new Date();
      if (startOf(req.date as string, course.start) <= now) throw new ApiError("Dieser Termin liegt in der Vergangenheit.");
      const limit = addDays(now, cfg.weeksAhead * 7);
      if (d0 > limit) throw new ApiError(`Buchungen sind höchstens ${cfg.weeksAhead} Wochen im Voraus möglich.`);

      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        if (!isAllowed(course.allowed, m)) throw new ApiError("Dieser Kurs ist nur für ausgewählte Mitglieder buchbar.", 403);
        const { bookings, overrides } = await tx.get("bookings");
        const seriesId = weeks > 1 ? uid("s") : null;
        const created: { id: string; date: string; status: Booking["status"] }[] = [];
        const skipped: { date: string; reason: string }[] = [];
        for (let i = 0; i < weeks; i++) {
          const date = iso(addDays(d0, 7 * i));
          if (isClosed(site, date)) {
            skipped.push({ date, reason: "Studio geschlossen" });
            continue;
          }
          if (bookings.some((b) => b.memberId === m.id && b.courseId === course.id && b.date === date && b.status !== "cancelled")) {
            skipped.push({ date, reason: "bereits gebucht" });
            continue;
          }
          const full = countBooked(bookings, course.id, date) >= spotsOf(overrides, course, date);
          const b: Booking = {
            id: uid("bk"),
            courseId: course.id,
            date,
            start: course.start,
            title: course.title,
            memberId: m.id,
            name: m.name,
            email: m.email,
            status: full ? "waitlist" : "booked",
            seriesId,
            createdAt: nowIso(),
            cancelledAt: null,
            by: "member",
          };
          bookings.push(b);
          created.push({ id: b.id, date, status: b.status });
        }
        if (created.length) tx.save("bookings");
        return { ok: true as const, created, skipped };
      });
    },

    async cancel(token, req) {
      const site = await getSite();
      const cfg = bookingCfg(site);
      if (typeof req.id !== "string") throw new ApiError("Buchung nicht gefunden.", 404);
      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        const { bookings, overrides } = await tx.get("bookings");
        const b = bookings.find((x) => x.id === req.id && x.memberId === m.id);
        if (!b || b.status === "cancelled") throw new ApiError("Buchung nicht gefunden.", 404);
        const now = new Date();
        const cancellable = (x: Booking) => x.status !== "cancelled" && startOf(x.date, x.start).getTime() - now.getTime() >= cfg.cancelHours * 3_600_000;
        const targets =
          req.series === true && b.seriesId
            ? bookings.filter((x) => x.seriesId === b.seriesId && x.memberId === m.id && startOf(x.date, x.start) > now && cancellable(x))
            : cancellable(b)
              ? [b]
              : [];
        if (!targets.length) {
          throw new ApiError(`Stornieren ist nur bis ${cfg.cancelHours} Stunden vor Kursbeginn möglich. Bitte melde dich direkt beim Studio.`);
        }
        for (const t of targets) {
          t.status = "cancelled";
          t.cancelledAt = nowIso();
        }
        if (cfg.autoPromote) {
          for (const t of targets) {
            const co = site.collections.courses.find((c) => c.id === t.courseId);
            if (co) promote(bookings, spotsOf(overrides, co, t.date), t.courseId, t.date);
          }
        }
        tx.save("bookings");
        return { ok: true as const, cancelled: targets.length };
      });
    },

    async appointments(token) {
      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        return (await tx.get("appointments")).appointments.filter((a) => a.memberId === m.id).sort((a, z) => z.createdAt.localeCompare(a.createdAt)).map(publicAppointment);
      });
    },

    async requestAppointment(token, req) {
      const site = await getSite();
      const cfg = site.settings.appointments;
      const type = req.type as AppointmentType;
      if (!cfg.types[type]) throw new ApiError("Bitte wähle eine Terminart.");

      const slotOf = (v: unknown, label: string): TimeSlot => {
        const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
        parseDate(o.date, label);
        if (typeof o.start !== "string" || !TIME_RE.test(o.start)) throw new ApiError(`${label}: bitte eine gültige Uhrzeit angeben.`);
        const date = o.date as string;
        const when = startOf(date, o.start);
        if (when.getTime() < Date.now() + cfg.minLeadHours * 3_600_000) throw new ApiError(`${label}: bitte mindestens ${cfg.minLeadHours} Stunden im Voraus anfragen.`);
        if (when.getTime() > Date.now() + cfg.daysAhead * 86_400_000) throw new ApiError(`${label}: Termine sind höchstens ${cfg.daysAhead} Tage im Voraus möglich.`);
        if (isClosed(site, date)) throw new ApiError(`${label}: Das Studio ist an diesem Tag geschlossen.`);
        const min = toMin(o.start);
        if (min < 6 * 60 || min > 21 * 60) throw new ApiError(`${label}: bitte eine Uhrzeit zwischen 06:00 und 21:00 Uhr wählen.`);
        return { date, start: o.start };
      };

      const preferred = slotOf(req.preferred, "Wunschtermin");
      const alternative = req.alternative ? slotOf(req.alternative, "Alternativtermin") : null;
      const note = text(req.note, 500);

      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        const store = await tx.get("appointments");
        const open = store.appointments.filter((a) => a.memberId === m.id && (a.status === "requested" || a.status === "counter"));
        if (open.length >= 5) throw new ApiError("Du hast bereits mehrere offene Terminanfragen. Bitte warte auf eine Antwort.", 429);
        const a: Appointment = {
          id: uid("ap"),
          memberId: m.id,
          name: m.name,
          email: m.email,
          type,
          status: "requested",
          preferred,
          alternative,
          note,
          proposal: null,
          confirmed: null,
          declinedBy: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        store.appointments.push(a);
        tx.save("appointments");
        return publicAppointment(a);
      });
    },

    async respondAppointment(token, req) {
      if (typeof req.id !== "string") throw new ApiError("Termin nicht gefunden.", 404);
      if (req.action !== "accept" && req.action !== "decline") throw new ApiError("Ungültige Antwort.");
      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        const store = await tx.get("appointments");
        const a = store.appointments.find((x) => x.id === req.id && x.memberId === m.id);
        if (!a) throw new ApiError("Termin nicht gefunden.", 404);
        if (a.status !== "counter" || !a.proposal) throw new ApiError("Auf diesen Termin kannst du nicht mehr antworten.", 409);
        if (req.action === "accept") {
          a.status = "confirmed";
          a.confirmed = { date: a.proposal.date, start: a.proposal.start };
        } else {
          a.status = "declined";
          a.declinedBy = "member";
        }
        a.updatedAt = nowIso();
        tx.save("appointments");
        return publicAppointment(a);
      });
    },

    async recap(token) {
      const site = await getSite();
      return transaction(async (tx) => buildRecapState(tx, await requireMember(tx, token), site));
    },

    async submitRecap(token, raw) {
      const site = await getSite();
      const cfg = site.settings.recap;
      const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const allowedScale = scaleValues(cfg.scale);
      const answers: RecapEntry["answers"] = {};
      for (const q of cfg.questions) {
        const v = input[q.id];
        const empty = v === undefined || v === null || v === "";
        if (empty) {
          if (q.required) throw new ApiError("Bitte beantworte alle Pflichtfragen.");
          continue;
        }
        if (q.type === "yesno") {
          if (typeof v !== "boolean") throw new ApiError("Ungültige Antwort bei einer Ja/Nein-Frage.");
          answers[q.id] = v;
        } else if (q.type === "scale") {
          if (typeof v !== "number" || !allowedScale.includes(v)) throw new ApiError(`Bitte wähle einen Wert von ${cfg.scale.min} bis ${cfg.scale.max} (ohne ${cfg.scale.skip.join(", ")}).`);
          answers[q.id] = v;
        } else {
          if (typeof v !== "string") throw new ApiError("Ungültige Antwort.");
          answers[q.id] = v.trim().slice(0, 1000);
        }
      }
      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        const store = await tx.get("recaps");
        const now = new Date();
        const { week, weekStart } = isoWeekOf(now);
        if (store.recaps.some((r) => r.memberId === m.id && r.week === week)) throw new ApiError("Du hast den Recap für diese Woche schon abgeschickt.", 409);
        const { bookings } = await tx.get("bookings");
        const weekEnd = iso(addDays(new Date(`${weekStart}T12:00:00`), 6));
        const sessions = Math.min(sessionDates(m, bookings, weekStart, weekEnd, now).size, cfg.maxSessions);
        const { components, score } = computeScore(cfg, answers, sessions);
        store.recaps.push({ id: uid("rc"), memberId: m.id, week, weekStart, answers, sessions, components, score, createdAt: nowIso() });
        tx.save("recaps");
        return buildRecapState(tx, m, site);
      });
    },

    async shop(token) {
      const site = await getSite();
      await transaction((tx) => requireMember(tx, token));
      return site.collections.products
        .filter((p) => p.active !== false)
        .map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          variants: (p.variants ?? "").split("\n").map((v) => v.trim()).filter(Boolean),
          price: p.price,
          soldOut: !!p.soldOut,
        }));
    },

    async createOrder(token, req) {
      const site = await getSite();
      if (req.consent !== true) throw new ApiError("Bitte stimme der Datenschutzerklärung zu.");
      const raw = req.items;
      if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) throw new ApiError("Deine Anfrage ist leer.");
      const prods = new Map(site.collections.products.map((p) => [p.id, p]));
      const merged = new Map<string, { productId: string; variant: string; qty: number }>();
      for (const it of raw as unknown[]) {
        const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
        const p = typeof o.productId === "string" ? prods.get(o.productId) : undefined;
        if (!p || p.active === false) throw new ApiError("Ein Produkt ist nicht (mehr) verfügbar.");
        if (p.soldOut) throw new ApiError(`„${p.name}“ ist leider ausverkauft.`);
        const variants = (p.variants ?? "").split("\n").map((v) => v.trim()).filter(Boolean);
        const variant = typeof o.variant === "string" ? o.variant.trim() : "";
        if (variants.length && !variants.includes(variant)) throw new ApiError(`Bitte wähle eine gültige Variante für „${p.name}“.`);
        const qty = o.qty;
        if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) throw new ApiError("Ungültige Menge.");
        const key = `${p.id}|${variants.length ? variant : ""}`;
        const prev = merged.get(key);
        merged.set(key, { productId: p.id, variant: variants.length ? variant : "", qty: (prev?.qty ?? 0) + qty });
      }
      const items: OrderItem[] = [];
      for (const it of merged.values()) {
        if (it.qty > 20) throw new ApiError("Pro Produkt sind maximal 20 Stück je Anfrage möglich.");
        const p = prods.get(it.productId)!;
        const price = Math.round(p.price * 100) / 100;
        items.push({ productId: p.id, name: p.name, variant: it.variant, qty: it.qty, price, sum: Math.round(price * it.qty * 100) / 100 });
      }
      const total = Math.round(items.reduce((s, i) => s + i.sum, 0) * 100) / 100;
      const cust = (req.customer && typeof req.customer === "object" ? req.customer : {}) as Record<string, unknown>;
      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        const store = await tx.get("orders");
        const used = store.orders.map((o) => Number(/^MPT-(\d+)$/.exec(o.no)?.[1] ?? 0));
        const seq = Math.max(store.seq, ...used) + 1;
        store.seq = seq;
        const order: Order = {
          id: uid("o"),
          no: `MPT-${seq}`,
          memberId: m.id,
          createdAt: nowIso(),
          status: "neu",
          customer: { name: m.name, email: m.email, phone: text(cust.phone, 60) || m.phone, note: text(cust.note, 1000) },
          items,
          total,
        };
        store.orders.push(order);
        tx.save("orders");
        return { ok: true as const, no: order.no, total };
      });
    },

    async orders(token) {
      return transaction(async (tx) => {
        const m = await requireMember(tx, token);
        return (await tx.get("orders")).orders.filter((o) => o.memberId === m.id).sort((a, z) => z.createdAt.localeCompare(a.createdAt)).map(publicOrder);
      });
    },
  };
}

