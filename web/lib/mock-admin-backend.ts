import "server-only";
import { UPLOAD_DIR, demoToken, demoTokenId } from "./data-paths";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AdminBackend, AuthToken } from "./backend";
import { BLOCK_FIELDS, COLLECTIONS, SECTIONS, getPath, sanitize, setPath } from "./admin-schema";
import { ApiError } from "./errors";
import { addDays, endOf, iso, mondayOf, toMin } from "./format";
import {
  assertNotLimited,
  bookingCfg,
  checkNewPassword,
  countBooked,
  fails,
  hashPassword,
  isClosed,
  parseDate,
  promote,
  registerFail,
  sessionDates,
  sha256,
  spotsOf,
  startOf,
  text,
  TIME_RE,
  uid,
  nowIso,
  verifyPassword,
} from "./mock-backend";
import { transaction, type Tx } from "./mock-db";
import type {
  AdminAccount,
  AdminMember,
  AdminMemberDetail,
  AdminMemberRow,
  AdminParticipant,
  AdminRecord,
  AdminSession,
  AdminSlot,
  AppointmentDecision,
  AttendanceValue,
  CheckUp,
  CollectionName,
  SettingsSection,
} from "@/types/admin";
import type { Appointment, Booking, Exercise, Measurement, MemberRecord, OrderStatus, Plan, PlanDay, SetValue, TimeSlot, TrainingLog } from "@/types/member";
import type { Block, Course, Hours, SiteData } from "@/types/site";

/*
 * Mock-Implementierung des Admin-Backends. Jede Methode prüft die Admin-Sitzung (requireAdmin) und validiert
 * die Eingaben serverseitig. Die Go-API übernimmt später dieselben Regeln.
 */

const ADMIN_TTL_S = 12 * 3600;
const MAX_UPLOAD = 5 * 1024 * 1024;

/* ---------- Sitzung ---------- */

function toAccount(a: AdminRecord): AdminAccount {
  return { id: a.id, username: a.username, name: a.name, active: a.active, createdAt: a.createdAt, mustChangePassword: a.mustChangePassword };
}

async function findAdmin(tx: Tx, token: string | null): Promise<AdminRecord | null> {
  if (!token) return null;
  const h = sha256(token);
  const { sessions } = await tx.get("adminSessions");
  const s = sessions.find((x) => x.hash === h && x.exp > Date.now());
  const adminId = s?.adminId ?? demoTokenId(token);
  if (!adminId) return null;
  const { admins } = await tx.get("admins");
  const a = admins.find((x) => x.id === adminId);
  return a && a.active ? a : null;
}

async function requireAdmin(tx: Tx, token: string | null): Promise<AdminRecord> {
  const a = await findAdmin(tx, token);
  if (!a) throw new ApiError("Bitte melde dich als Admin an.", 401);
  return a;
}

async function startAdminSession(tx: Tx, adminId: string): Promise<AuthToken> {
  const token = demoToken(adminId, randomBytes(32).toString("base64url"));
  const store = await tx.get("adminSessions");
  store.sessions = store.sessions.filter((s) => s.exp > Date.now());
  store.sessions.push({ hash: sha256(token), adminId, exp: Date.now() + ADMIN_TTL_S * 1000, createdAt: Date.now() });
  tx.save("adminSessions");
  return { token, maxAge: ADMIN_TTL_S };
}

async function dropAdminSessions(tx: Tx, adminId: string, keepHash?: string): Promise<void> {
  const store = await tx.get("adminSessions");
  store.sessions = store.sessions.filter((s) => s.adminId !== adminId || s.hash === keepHash);
  tx.save("adminSessions");
}

/* ---------- Validierungs-Helfer ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const reqText = (v: unknown, label: string, max: number): string => {
  const s = text(v, max + 1);
  if (!s) throw new ApiError(`${label} ist ein Pflichtfeld.`);
  if (s.length > max) throw new ApiError(`${label} ist zu lang.`);
  return s;
};

const optDate = (v: unknown, label: string): string | null => {
  if (v === undefined || v === null || v === "") return null;
  parseDate(v, label);
  return v as string;
};

function numOrNull(v: unknown, label: string, min: number, max: number): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new ApiError(`${label}: bitte einen Wert zwischen ${min} und ${max} angeben.`);
  return Math.round(v * 100) / 100;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

function checkEmails(list: string, label: string): void {
  if (!list.trim()) return;
  for (const e of list.split(",")) if (!EMAIL_RE.test(e.trim())) throw new ApiError(`${label}: „${e.trim()}“ ist keine gültige E-Mail-Adresse.`);
}

function slotOf(v: unknown, label: string): TimeSlot {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  parseDate(o.date, label);
  if (typeof o.start !== "string" || !TIME_RE.test(o.start)) throw new ApiError(`${label}: bitte eine gültige Uhrzeit angeben.`);
  return { date: o.date as string, start: o.start };
}

/* ---------- Kunden ---------- */

function toAdminMember(m: MemberRecord): AdminMember {
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
    notes: m.notes ?? "",
    birthday: m.birthday ?? null,
    goal: m.goal ?? "",
    trialStart: m.trialStart ?? null,
    trialEnd: m.trialEnd ?? null,
    hasPassword: !!m.pw,
    inviteOpen: !!m.invite && m.invite.exp > Date.now(),
  };
}

async function getMember(tx: Tx, id: string): Promise<MemberRecord> {
  const { members } = await tx.get("members");
  const m = members.find((x) => x.id === id);
  if (!m) throw new ApiError("Kunde nicht gefunden.", 404);
  return m;
}

function applyMemberInput(m: MemberRecord, input: Record<string, unknown>, others: MemberRecord[]): void {
  if ("name" in input) m.name = reqText(input.name, "Name", 120);
  if ("email" in input) {
    const email = reqText(input.email, "E-Mail", 200).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new ApiError("Bitte gib eine gültige E-Mail-Adresse an.");
    if (others.some((o) => o.id !== m.id && o.email.toLowerCase() === email)) throw new ApiError("Diese E-Mail-Adresse wird schon von einem anderen Kunden verwendet.", 409);
    m.email = email;
  }
  if ("phone" in input) {
    const phone = text(input.phone, 30);
    if (!/^[0-9+()/\-\s]*$/.test(phone)) throw new ApiError("Bitte gib eine gültige Telefonnummer an.");
    m.phone = phone;
  }
  if ("birthday" in input) m.birthday = optDate(input.birthday, "Geburtsdatum");
  if ("goal" in input) m.goal = text(input.goal, 300);
  if ("active" in input) {
    if (typeof input.active !== "boolean") throw new ApiError("Ungültiger Wert für „aktiv“.");
    m.active = input.active;
  }
  if ("tariff" in input) {
    const t = text(input.tariff, 40);
    if (!/^[\w-]+$/.test(t)) throw new ApiError("Bitte wähle einen Tarif.");
    m.tariff = t;
  }
  if ("groups" in input) {
    if (!Array.isArray(input.groups) || input.groups.length > 20) throw new ApiError("Ungültige Gruppen.");
    const groups = input.groups.map((g) => text(g, 40).toLowerCase()).filter(Boolean);
    if (!groups.every((g) => /^[\w-]+$/.test(g))) throw new ApiError("Gruppen dürfen nur Buchstaben, Ziffern und Bindestriche enthalten.");
    m.groups = [...new Set(groups)];
  }
  if ("trialStart" in input) m.trialStart = optDate(input.trialStart, "Beginn der Testphase");
  if ("trialEnd" in input) m.trialEnd = optDate(input.trialEnd, "Ende der Testphase");
  if (m.trialStart && m.trialEnd && m.trialEnd < m.trialStart) throw new ApiError("Das Ende der Testphase liegt vor dem Beginn.");
  if ("notes" in input) m.notes = typeof input.notes === "string" ? input.notes.slice(0, 10_000) : "";
  if ("nextMeasurementDue" in input) m.nextMeasurementDue = optDate(input.nextMeasurementDue, "Nächste Messung");
}

/* ---------- Pläne, Logs, Messungen, Check-ups ---------- */

const keepId = (v: unknown, prefix: string): string => (typeof v === "string" && ID_RE.test(v) ? v : uid(prefix));

function parsePlan(raw: Record<string, unknown>, existing: Plan | undefined): Plan {
  const days: PlanDay[] = [];
  const rawDays = Array.isArray(raw.days) ? raw.days : [];
  if (rawDays.length > 14) throw new ApiError("Ein Plan kann höchstens 14 Einheiten haben.");
  for (const d of rawDays as Record<string, unknown>[]) {
    const exercises: Exercise[] = [];
    const rawEx = Array.isArray(d?.exercises) ? d.exercises : [];
    if (rawEx.length > 40) throw new ApiError("Eine Einheit kann höchstens 40 Übungen haben.");
    for (const e of rawEx as Record<string, unknown>[]) {
      const sets = e?.sets;
      const rest = e?.rest;
      if (typeof sets !== "number" || !Number.isInteger(sets) || sets < 0 || sets > 20) throw new ApiError("Sätze: bitte eine ganze Zahl von 0 bis 20 angeben.");
      if (typeof rest !== "number" || !Number.isFinite(rest) || rest < 0 || rest > 900) throw new ApiError("Pause: bitte Sekunden von 0 bis 900 angeben.");
      exercises.push({
        id: keepId(e.id, "e"),
        group: text(e.group, 6),
        name: reqText(e.name, "Name der Übung", 120),
        sets,
        reps: text(e.reps, 20),
        tempo: text(e.tempo, 12),
        rest: Math.round(rest),
        note: text(e.note, 300),
      });
    }
    days.push({ id: keepId(d.id, "d"), name: reqText(d.name, "Name der Einheit", 80), exercises });
  }
  const status = raw.status === "done" ? "done" : "active";
  const start = optDate(raw.start, "Start");
  if (!start) throw new ApiError("Start ist ein Pflichtfeld.");
  const end = optDate(raw.end, "Ende");
  if (end && end < start) throw new ApiError("Das Ende liegt vor dem Start.");
  return {
    id: existing?.id ?? keepId(raw.id, "pl"),
    title: reqText(raw.title, "Titel", 120),
    status,
    start,
    end,
    goal: text(raw.goal, 300),
    note: text(raw.note, 1000),
    days,
    logs: existing?.logs ?? [], // Logs werden getrennt gepflegt
  };
}

function parseLog(plan: Plan, raw: Record<string, unknown>, existing: TrainingLog | undefined): TrainingLog {
  const day = plan.days.find((d) => d.id === raw.dayId);
  if (!day) throw new ApiError("Bitte wähle eine Einheit des Plans.");
  const date = optDate(raw.date, "Datum");
  if (!date) throw new ApiError("Datum ist ein Pflichtfeld.");
  const rawSets = (raw.sets && typeof raw.sets === "object" && !Array.isArray(raw.sets) ? raw.sets : {}) as Record<string, unknown>;
  const sets: Record<string, SetValue[]> = {};
  for (const ex of day.exercises) {
    const list = rawSets[ex.id];
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.length > 20) throw new ApiError("Ungültige Sätze.");
    const parsed: SetValue[] = list.map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const v: SetValue = {};
      for (const [k, max] of [["reps", 1000], ["kg", 1000], ["sec", 36_000], ["m", 100_000], ["kcal", 10_000]] as const) {
        const n = numOrNull(o[k], k === "kg" ? "Gewicht" : k === "reps" ? "Wiederholungen" : k === "sec" ? "Zeit" : k === "m" ? "Distanz" : "Kalorien", 0, max);
        if (n !== null) v[k] = n;
      }
      return v;
    });
    if (parsed.some((s) => Object.keys(s).length > 0)) sets[ex.id] = parsed;
  }
  return { id: existing?.id ?? keepId(raw.id, "lg"), dayId: day.id, date, note: text(raw.note, 500), sets };
}

function parseMeasurement(site: SiteData, raw: Record<string, unknown>, existing: Measurement | undefined): Measurement {
  const date = optDate(raw.date, "Datum");
  if (!date) throw new ApiError("Datum ist ein Pflichtfeld.");
  const pick = (v: unknown, keys: { key: string }[], label: string, max: number): Record<string, number> => {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const { key } of keys) {
      const n = numOrNull(o[key], label, 0, max);
      if (n !== null) out[key] = n;
    }
    return out;
  };
  const m: Measurement = { id: existing?.id ?? keepId(raw.id, "ms"), date };
  const weight = numOrNull(raw.weight, "Gewicht", 20, 400);
  const lean = numOrNull(raw.leanMass, "Magermasse", 10, 300);
  const fat = numOrNull(raw.bodyfat, "Körperfett", 1, 70);
  if (weight !== null) m.weight = weight;
  if (lean !== null) m.leanMass = lean;
  if (fat !== null) m.bodyfat = fat;
  const skin = pick(raw.skinfolds, site.settings.measure.skinfolds, "Hautfalte", 100);
  const girth = pick(raw.girths, site.settings.measure.girths, "Umfang", 300);
  if (Object.keys(skin).length) m.skinfolds = skin;
  if (Object.keys(girth).length) m.girths = girth;
  const note = text(raw.note, 500);
  if (note) m.note = note;
  return m;
}

function parseCheckup(site: SiteData, member: MemberRecord, raw: Record<string, unknown>, existing: CheckUp | undefined): CheckUp {
  const date = optDate(raw.date, "Datum");
  if (!date) throw new ApiError("Datum ist ein Pflichtfeld.");
  const measurementId = typeof raw.measurementId === "string" && raw.measurementId ? raw.measurementId : null;
  if (measurementId && !member.measurements.some((x) => x.id === measurementId)) throw new ApiError("Die verknüpfte Messung gibt es nicht.");
  const planId = typeof raw.planId === "string" && raw.planId ? raw.planId : null;
  if (planId && !member.plans.some((x) => x.id === planId)) throw new ApiError("Der verknüpfte Plan existiert nicht.");
  const rawScreen = (raw.screen && typeof raw.screen === "object" ? raw.screen : {}) as Record<string, unknown>;
  const screen: CheckUp["screen"] = {};
  for (const p of site.settings.checkup.points) {
    const f = (rawScreen[p.id] && typeof rawScreen[p.id] === "object" ? rawScreen[p.id] : {}) as Record<string, unknown>;
    const flag = f.flag === true;
    const note = text(f.note, 500);
    if (flag || note) screen[p.id] = { flag, note };
  }
  return {
    id: existing?.id ?? keepId(raw.id, "cu"),
    date,
    measurementId,
    planId,
    screen,
    note: typeof raw.note === "string" ? raw.note.trim().slice(0, 3000) : "",
    createdAt: existing?.createdAt ?? nowIso(),
  };
}

/* ---------- Einstellungen ---------- */

function sanitizeHours(v: unknown): Hours {
  const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const weekIn = (o.week && typeof o.week === "object" ? o.week : {}) as Record<string, unknown>;
  const week: Hours["week"] = {};
  for (let d = 0; d <= 6; d++) {
    const ranges = weekIn[String(d)];
    if (ranges !== undefined && !Array.isArray(ranges)) throw new ApiError("Ungültige Öffnungszeiten.");
    const list: [string, string][] = [];
    for (const r of (ranges ?? []) as unknown[]) {
      if (!Array.isArray(r) || typeof r[0] !== "string" || typeof r[1] !== "string" || !TIME_RE.test(r[0]) || !TIME_RE.test(r[1])) throw new ApiError("Öffnungszeiten: bitte gültige Uhrzeiten angeben.");
      if (toMin(r[0]) >= toMin(r[1])) throw new ApiError("Öffnungszeiten: „von“ muss vor „bis“ liegen.");
      list.push([r[0], r[1]]);
    }
    week[String(d)] = list.sort((a, b) => a[0].localeCompare(b[0]));
  }
  const exceptions: NonNullable<Hours["exceptions"]> = [];
  for (const e of (Array.isArray(o.exceptions) ? o.exceptions : []) as Record<string, unknown>[]) {
    const date = optDate(e?.date, "Datum der Ausnahme");
    if (!date) throw new ApiError("Ausnahme: bitte ein Datum angeben.");
    const closed = e.closed === true;
    const ex: NonNullable<Hours["exceptions"]>[number] = { date, closed };
    if (!closed) {
      if (typeof e.from !== "string" || typeof e.to !== "string" || !TIME_RE.test(e.from) || !TIME_RE.test(e.to) || toMin(e.from) >= toMin(e.to)) throw new ApiError("Ausnahme: bitte gültige Uhrzeiten angeben oder „geschlossen“ wählen.");
      ex.from = e.from;
      ex.to = e.to;
    }
    const note = text(e.note, 120);
    if (note) ex.note = note;
    exceptions.push(ex);
  }
  exceptions.sort((a, b) => a.date.localeCompare(b.date));
  return { week, note: text(o.note, 200), exceptions };
}

function validateSection(section: SettingsSection, site: SiteData, clean: Record<string, unknown>): void {
  if (section === "studio") {
    const email = String(getPath(clean, "settings.contact.email") ?? "");
    if (email) checkEmails(email, "E-Mail");
  }
  if (section === "forms") {
    checkEmails(String(getPath(clean, "settings.booking.recipients") ?? ""), "Empfänger Buchungen");
    checkEmails(String(getPath(clean, "settings.shop.recipients") ?? ""), "Empfänger Shop");
    const forms = (getPath(clean, "forms") as { id: string; recipients: string }[] | undefined) ?? [];
    const ids = new Set<string>();
    for (const f of forms) {
      if (!/^[a-z0-9-]+$/.test(f.id)) throw new ApiError(`Formular-ID „${f.id}“: nur Kleinbuchstaben, Ziffern und Bindestriche.`);
      if (ids.has(f.id)) throw new ApiError(`Die Formular-ID „${f.id}“ ist doppelt vergeben.`);
      ids.add(f.id);
      checkEmails(f.recipients, `Empfänger von „${f.id}“`);
    }
    for (const p of site.pages) {
      for (const b of p.blocks) {
        const fid = (b.props as { formId?: string }).formId;
        if (fid && !ids.has(fid)) throw new ApiError(`Das Formular „${fid}“ wird auf der Seite „${p.title}“ verwendet und kann nicht entfernt werden.`);
      }
    }
  }
  if (section === "recap") {
    const qs = (getPath(clean, "settings.recap.questions") as { id: string; score: string }[] | undefined) ?? [];
    const seen = new Set<string>();
    for (const q of qs) {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(q.id)) throw new ApiError(`Frage-ID „${q.id}“: nur Buchstaben und Ziffern, beginnend mit einem Buchstaben.`);
      if (seen.has(q.id)) throw new ApiError(`Die Frage-ID „${q.id}“ ist doppelt vergeben.`);
      seen.add(q.id);
    }
    const min = getPath(clean, "settings.recap.scale.min") as number;
    const max = getPath(clean, "settings.recap.scale.max") as number;
    if (min >= max) throw new ApiError("Skala: der kleinste Wert muss kleiner als der größte sein.");
    const skip = (getPath(clean, "settings.recap.scale.skip") as number[]) ?? [];
    if (skip.some((v) => !Number.isInteger(v) || v <= min || v >= max)) throw new ApiError("Skala: ausgelassene Werte müssen ganze Zahlen zwischen kleinstem und größtem Wert sein.");
    const w = ["training", "schlaf", "ernaehrung", "energie"].map((k) => getPath(clean, `settings.recap.weights.${k}`) as number);
    if (w.every((x) => x === 0)) throw new ApiError("Mindestens ein Score-Teil braucht ein Gewicht größer als 0.");
  }
  if (section === "checkup") {
    const pts = (getPath(clean, "settings.checkup.points") as { id: string }[] | undefined) ?? [];
    const seen = new Set<string>();
    for (const p of pts) {
      if (!/^[A-Za-z0-9]+$/.test(p.id)) throw new ApiError(`Punkt-ID „${p.id}“: nur Buchstaben und Ziffern.`);
      if (seen.has(p.id)) throw new ApiError(`Die Punkt-ID „${p.id}“ ist doppelt vergeben.`);
      seen.add(p.id);
    }
  }
}

/* ---------- Sammlungen ---------- */

const hasFutureBookings = (bks: Booking[], courseId: string): boolean => {
  const today = iso(new Date());
  return bks.some((b) => b.courseId === courseId && b.status !== "cancelled" && b.date >= today);
};

/* ---------- Upload ---------- */

const MAGIC: { ext: string; type: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", type: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "webp", type: "image/webp", test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

/* ---------- Mock-Admin-Backend ---------- */

export function createMockAdminBackend(): AdminBackend {
  /** Schreibt in data/site.json (serialisiert) */
  async function siteTx<T>(token: string, fn: (site: SiteData, tx: Tx) => Promise<T> | T): Promise<T> {
    return transaction(async (tx) => {
      await requireAdmin(tx, token);
      const site = await tx.get("site");
      const result = await fn(site, tx);
      tx.save("site");
      return result;
    });
  }

  const guard = <T>(token: string, fn: (tx: Tx, admin: AdminRecord) => Promise<T>): Promise<T> =>
    transaction(async (tx) => fn(tx, await requireAdmin(tx, token)));

  async function lastSessions(tx: Tx): Promise<Map<string, string>> {
    const { members } = await tx.get("members");
    const { bookings } = await tx.get("bookings");
    const now = new Date();
    const out = new Map<string, string>();
    for (const m of members) {
      const dates = [...sessionDates(m, bookings, "2000-01-01", iso(now), now)].sort();
      if (dates.length) out.set(m.id, dates[dates.length - 1]);
    }
    return out;
  }

  return {
    /* ----- Anmeldung ----- */
    async login(username, pass, ip) {
      const key = `admin-login:${ip}`;
      assertNotLimited(key);
      const name = text(username, 60).toLowerCase();
      return transaction(async (tx) => {
        const { admins } = await tx.get("admins");
        const a = admins.find((x) => x.username === name);
        const ok = await verifyPassword(String(pass ?? "").slice(0, 200), a?.pw);
        if (!a || !ok || !a.active) {
          registerFail(key);
          throw new ApiError("Benutzername oder Passwort stimmt nicht.", 401);
        }
        fails.delete(key);
        return startAdminSession(tx, a.id);
      });
    },

    async logout(token) {
      await transaction(async (tx) => {
        const store = await tx.get("adminSessions");
        const h = sha256(token);
        const before = store.sessions.length;
        store.sessions = store.sessions.filter((s) => s.hash !== h);
        if (store.sessions.length !== before) tx.save("adminSessions");
      });
    },

    async session(token) {
      const a = await transaction((tx) => findAdmin(tx, token));
      if (!a) return null;
      const s: AdminSession = { id: a.id, username: a.username, name: a.name, mustChangePassword: a.mustChangePassword };
      return s;
    },

    async changePassword(token, current, next) {
      const pw = checkNewPassword(next);
      const hash = await hashPassword(pw);
      await guard(token, async (tx, a) => {
        if (!(await verifyPassword(String(current ?? "").slice(0, 200), a.pw))) throw new ApiError("Das aktuelle Passwort ist falsch.");
        a.pw = hash;
        a.mustChangePassword = false;
        tx.save("admins");
        await dropAdminSessions(tx, a.id, sha256(token));
      });
    },

    async accounts(token) {
      return guard(token, async (tx) => (await tx.get("admins")).admins.map(toAccount).sort((a, z) => a.createdAt.localeCompare(z.createdAt)));
    },

    async createAccount(token, input) {
      const username = text(input.username, 30).toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new ApiError("Der Benutzername braucht 3 bis 30 Zeichen (Kleinbuchstaben, Ziffern, Punkt, Bindestrich).");
      const name = reqText(input.name, "Name", 80);
      const hash = await hashPassword(checkNewPassword(input.password));
      return guard(token, async (tx) => {
        const store = await tx.get("admins");
        if (store.admins.some((x) => x.username === username)) throw new ApiError("Diesen Benutzernamen gibt es schon.", 409);
        const rec: AdminRecord = { id: uid("adm"), username, name, active: true, createdAt: nowIso(), mustChangePassword: true, pw: hash };
        store.admins.push(rec);
        tx.save("admins");
        return toAccount(rec);
      });
    },

    async updateAccount(token, id, input) {
      const hash = input.password !== undefined && input.password !== "" ? await hashPassword(checkNewPassword(input.password)) : null;
      return guard(token, async (tx, me) => {
        const store = await tx.get("admins");
        const a = store.admins.find((x) => x.id === id);
        if (!a) throw new ApiError("Konto nicht gefunden.", 404);
        if (input.name !== undefined) a.name = reqText(input.name, "Name", 80);
        if (input.active !== undefined) {
          if (typeof input.active !== "boolean") throw new ApiError("Ungültiger Wert für „aktiv“.");
          if (!input.active) {
            if (a.id === me.id) throw new ApiError("Du kannst dein eigenes Konto nicht deaktivieren.");
            if (!store.admins.some((x) => x.id !== a.id && x.active)) throw new ApiError("Es muss mindestens ein aktives Admin-Konto bleiben.");
            await dropAdminSessions(tx, a.id);
          }
          a.active = input.active;
        }
        if (hash) {
          a.pw = hash;
          a.mustChangePassword = a.id !== me.id;
          if (a.id !== me.id) await dropAdminSessions(tx, a.id);
        }
        tx.save("admins");
        return toAccount(a);
      });
    },

    /* ----- Dashboard ----- */
    async dashboard(token) {
      return guard(token, async (tx) => {
        const site = await tx.get("site");
        const now = new Date();
        const today = iso(now);
        const { bookings, overrides } = await tx.get("bookings");
        const todayBookings = site.collections.courses
          .filter((c) => Number(c.day) === now.getDay())
          .sort((a, z) => toMin(a.start) - toMin(z.start))
          .map((c) => ({
            courseId: c.id,
            title: c.title,
            start: c.start,
            trainer: c.trainer,
            booked: countBooked(bookings, c.id, today),
            spots: spotsOf(overrides, c, today),
            waitlist: bookings.filter((b) => b.courseId === c.id && b.date === today && b.status === "waitlist").length,
            closed: isClosed(site, today),
          }));
        const { appointments } = await tx.get("appointments");
        const { orders } = await tx.get("orders");
        const { members } = await tx.get("members");
        const limit = iso(addDays(now, 7));
        return {
          today,
          todayBookings,
          openAppointments: appointments.filter((a) => a.status === "requested").sort((a, z) => a.createdAt.localeCompare(z.createdAt)),
          newOrders: orders.filter((o) => o.status === "neu").sort((a, z) => a.createdAt.localeCompare(z.createdAt)),
          measurementsDue: members
            .filter((m) => m.active && m.nextMeasurementDue && m.nextMeasurementDue <= limit)
            .map((m) => ({ memberId: m.id, name: m.name, due: m.nextMeasurementDue as string }))
            .sort((a, z) => a.due.localeCompare(z.due)),
        };
      });
    },

    /* ----- Inhalte ----- */
    async site(token) {
      return guard(token, (tx) => tx.get("site"));
    },

    async updatePageBlock(token, pageId, blockId, patch) {
      return siteTx(token, (site) => {
        const page = site.pages.find((p) => p.id === pageId);
        const block = page?.blocks.find((b) => b.id === blockId);
        if (!page || !block) throw new ApiError("Abschnitt nicht gefunden.", 404);
        if (patch.hidden !== undefined) {
          if (typeof patch.hidden !== "boolean") throw new ApiError("Ungültiger Wert für „ausblenden“.");
          block.hidden = patch.hidden;
        }
        if (patch.props !== undefined) {
          const clean = sanitize(BLOCK_FIELDS[block.type], patch.props);
          (block as unknown as { props: Record<string, unknown> }).props = { ...(block.props as Record<string, unknown>), ...clean };
        }
        return block as Block;
      });
    },

    async updatePageSeo(token, pageId, seo) {
      return siteTx(token, (site) => {
        const page = site.pages.find((p) => p.id === pageId);
        if (!page) throw new ApiError("Seite nicht gefunden.", 404);
        const title = text(seo.title, 70);
        const description = text(seo.description, 170);
        page.seo = { ...(title ? { title } : {}), ...(description ? { description } : {}) };
        return page;
      });
    },

    async saveCollectionItem(token, name: CollectionName, item) {
      const def = COLLECTIONS[name];
      if (!def) throw new ApiError("Unbekannte Sammlung.", 404);
      return siteTx(token, async (site, tx) => {
        const list = (site.collections[name] ??= []) as unknown as Record<string, unknown>[];
        const id = typeof item.id === "string" ? item.id : "";
        const existing = id ? list.find((x) => x.id === id) : undefined;
        if (id && !existing) throw new ApiError("Eintrag nicht gefunden.", 404);
        const clean = sanitize(def.fields, item, !existing);
        if (name === "courses") {
          const c = { ...existing, ...clean } as unknown as Course;
          if (!c.end) clean.end = endOf({ start: c.start });
          else if (toMin(c.end) <= toMin(c.start)) throw new ApiError("Das Ende muss nach dem Start liegen.");
        }
        if (name === "posts") {
          const base = { ...existing, ...clean } as Record<string, unknown>;
          let slug = slugify(String(base.slug || base.title || ""));
          if (!slug) throw new ApiError("Bitte gib einen Titel oder URL-Slug an.");
          const taken = new Set(list.filter((x) => x !== existing).map((x) => x.slug));
          const root = slug;
          for (let n = 2; taken.has(slug); n++) slug = `${root}-${n}`;
          clean.slug = slug;
        }
        if (name === "news") {
          const base = { ...existing, ...clean } as { audience: string; groups?: string[]; memberIds?: string[] };
          if (base.audience === "group" && !(base.groups ?? []).length) throw new ApiError("Bitte gib mindestens eine Gruppe als Zielgruppe an.");
          if (base.audience === "members") {
            if (!(base.memberIds ?? []).length) throw new ApiError("Bitte wähle mindestens ein Mitglied als Zielgruppe.");
            const { members } = await tx.get("members");
            if (!(base.memberIds ?? []).every((mid) => members.some((m) => m.id === mid))) throw new ApiError("Ein gewähltes Mitglied gibt es nicht (mehr).");
          }
        }
        if (name === "events") {
          const base = { ...existing, ...clean } as { spots: number; booked: number };
          if (base.booked > base.spots) throw new ApiError("Es können nicht mehr Personen angemeldet sein als Plätze vorhanden sind.");
        }
        if (name === "challenges") {
          const entries = (clean.entries ?? (existing as { entries?: unknown[] } | undefined)?.entries ?? []) as { value: number }[];
          if (entries.some((e) => e.value < 0)) throw new ApiError("Ergebnisse dürfen nicht negativ sein.");
        }
        if (existing) {
          Object.assign(existing, clean);
          return existing;
        }
        const created = { ...def.newItem(), ...clean, id: uid(def.idPrefix) };
        list.push(created);
        return created;
      });
    },

    async deleteCollectionItem(token, name, id) {
      if (!COLLECTIONS[name]) throw new ApiError("Unbekannte Sammlung.", 404);
      await transaction(async (tx) => {
        await requireAdmin(tx, token);
        const site = await tx.get("site");
        const list = (site.collections[name] ?? []) as unknown as { id: string }[];
        const idx = list.findIndex((x) => x.id === id);
        if (idx < 0) throw new ApiError("Eintrag nicht gefunden.", 404);
        if (name === "courses") {
          const { bookings } = await tx.get("bookings");
          if (hasFutureBookings(bookings, id)) throw new ApiError("Für diesen Kurs gibt es noch Buchungen. Bitte storniere sie zuerst im Bereich Kurse & Buchungen.", 409);
        }
        list.splice(idx, 1);
        tx.save("site");
      });
    },

    async saveSettings(token, section, value) {
      const def = SECTIONS[section];
      if (!def) throw new ApiError("Unbekannter Bereich.", 404);
      return siteTx(token, (site) => {
        if (section === "hours") {
          site.settings.hours = sanitizeHours(value);
          return site;
        }
        const clean = sanitize(def.fields, value);
        validateSection(section, site, clean);
        for (const f of def.fields) {
          if (f.t === "info" || !f.k) continue;
          const v = getPath(clean, f.k);
          if (v === undefined) continue;
          if (f.k === "settings.recap.questions") {
            setPath(site as unknown as Record<string, unknown>, f.k, (v as Record<string, unknown>[]).map((q) => ({ ...q, score: q.score || null, section: q.section || undefined })));
          } else setPath(site as unknown as Record<string, unknown>, f.k, v);
        }
        return site;
      });
    },

    async uploadImage(token, file) {
      await transaction((tx) => requireAdmin(tx, token));
      if (file.size > MAX_UPLOAD || file.data.byteLength > MAX_UPLOAD) throw new ApiError("Die Datei ist zu groß (höchstens 5 MB).", 413);
      if (file.data.byteLength < 12) throw new ApiError("Die Datei ist leer oder beschädigt.");
      const kind = MAGIC.find((m) => m.test(file.data));
      if (!kind || kind.type !== file.type) throw new ApiError("Erlaubt sind nur JPG-, PNG- und WebP-Bilder.", 415);
      const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${kind.ext}`;
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, name), file.data);
      return { path: `/uploads/${name}` };
    },

    /* ----- Kurse & Buchungen ----- */
    async bookingsWeek(token, from) {
      return guard(token, async (tx) => {
        const site = await tx.get("site");
        const { bookings, overrides } = await tx.get("bookings");
        const monday = mondayOf(from ? parseDate(from, "Woche") : new Date());
        const now = new Date();
        const slots: AdminSlot[] = [];
        const part = (b: Booking): AdminParticipant => ({ bookingId: b.id, memberId: b.memberId, name: b.name, email: b.email, by: b.by, attended: b.attended ?? null, createdAt: b.createdAt });
        for (let i = 0; i < 7; i++) {
          const d = addDays(monday, i);
          const date = iso(d);
          for (const c of site.collections.courses) {
            if (Number(c.day) !== d.getDay()) continue;
            const here = bookings.filter((b) => b.courseId === c.id && b.date === date);
            slots.push({
              courseId: c.id,
              title: c.title,
              date,
              start: c.start,
              end: c.end,
              trainer: c.trainer,
              category: c.category,
              spots: spotsOf(overrides, c, date),
              baseSpots: c.spots,
              overridden: !!overrides?.some((o) => o.courseId === c.id && o.date === date),
              past: startOf(date, c.start) <= now,
              closed: isClosed(site, date),
              restricted: !!c.allowed && (c.allowed.tariffs?.length ?? 0) + (c.allowed.groups?.length ?? 0) + (c.allowed.memberIds?.length ?? 0) > 0,
              participants: here.filter((b) => b.status === "booked").sort((a, z) => a.name.localeCompare(z.name, "de")).map(part),
              waitlist: here.filter((b) => b.status === "waitlist").sort((a, z) => a.createdAt.localeCompare(z.createdAt)).map(part),
            });
          }
        }
        slots.sort((a, z) => `${a.date} ${a.start}`.localeCompare(`${z.date} ${z.start}`));
        return { from: iso(monday), slots };
      });
    },

    async adminBook(token, req) {
      return guard(token, async (tx) => {
        const site = await tx.get("site");
        const course = site.collections.courses.find((c) => c.id === req.courseId);
        if (!course) throw new ApiError("Kurs unbekannt.", 404);
        const d = parseDate(req.date);
        if (d.getDay() !== Number(course.day)) throw new ApiError("Der Kurs findet an diesem Wochentag nicht statt.");
        const m = await getMember(tx, String(req.memberId ?? ""));
        if (!m.active) throw new ApiError("Dieser Kunde ist deaktiviert.");
        const store = await tx.get("bookings");
        const date = req.date as string;
        if (store.bookings.some((b) => b.memberId === m.id && b.courseId === course.id && b.date === date && b.status !== "cancelled")) throw new ApiError("Dieser Kunde ist für den Termin schon eingetragen.", 409);
        const full = countBooked(store.bookings, course.id, date) >= spotsOf(store.overrides, course, date);
        const status = full && req.force !== true ? "waitlist" : "booked"; // Admin darf die Platzzahl überschreiten
        const b: Booking = { id: uid("bk"), courseId: course.id, date, start: course.start, title: course.title, memberId: m.id, name: m.name, email: m.email, status, seriesId: null, createdAt: nowIso(), cancelledAt: null, by: "admin" };
        store.bookings.push(b);
        tx.save("bookings");
        return { id: b.id, status };
      });
    },

    async adminCancelBooking(token, id) {
      await guard(token, async (tx) => {
        const site = await tx.get("site");
        const store = await tx.get("bookings");
        const b = store.bookings.find((x) => x.id === id && x.status !== "cancelled");
        if (!b) throw new ApiError("Buchung nicht gefunden.", 404);
        const wasBooked = b.status === "booked";
        b.status = "cancelled"; // auch nach der Stornofrist
        b.cancelledAt = nowIso();
        const co = site.collections.courses.find((c) => c.id === b.courseId);
        if (wasBooked && co && bookingCfg(site).autoPromote) promote(store.bookings, spotsOf(store.overrides, co, b.date), b.courseId, b.date);
        tx.save("bookings");
      });
    },

    async setAttendance(token, id, value) {
      if (value !== "attended" && value !== "noshow" && value !== "open") throw new ApiError("Ungültiger Wert für die Anwesenheit.");
      return guard(token, async (tx) => {
        const store = await tx.get("bookings");
        const b = store.bookings.find((x) => x.id === id && x.status === "booked");
        if (!b) throw new ApiError("Buchung nicht gefunden.", 404);
        b.attended = value === "attended" ? true : value === "noshow" ? false : null;
        tx.save("bookings");
        return value as AttendanceValue;
      });
    },

    async setSlotSpots(token, courseId, date, spots) {
      parseDate(date);
      if (spots !== null && (typeof spots !== "number" || !Number.isInteger(spots) || spots < 0 || spots > 100)) throw new ApiError("Plätze: bitte eine ganze Zahl von 0 bis 100 angeben.");
      await guard(token, async (tx) => {
        const site = await tx.get("site");
        const course = site.collections.courses.find((c) => c.id === courseId);
        if (!course) throw new ApiError("Kurs unbekannt.", 404);
        if (new Date(`${date}T12:00:00`).getDay() !== Number(course.day)) throw new ApiError("Der Kurs findet an diesem Wochentag nicht statt.");
        const store = await tx.get("bookings");
        store.overrides = (store.overrides ?? []).filter((o) => !(o.courseId === courseId && o.date === date));
        if (spots !== null && spots !== course.spots) store.overrides.push({ courseId, date, spots });
        // Mehr Plätze → Warteliste rückt automatisch nach (wenn die Regel aktiv ist)
        if (bookingCfg(site).autoPromote) promote(store.bookings, spotsOf(store.overrides, course, date), courseId, date);
        tx.save("bookings");
      });
    },

    async promoteBooking(token, id) {
      await guard(token, async (tx) => {
        const store = await tx.get("bookings");
        const b = store.bookings.find((x) => x.id === id && x.status === "waitlist");
        if (!b) throw new ApiError("Eintrag auf der Warteliste nicht gefunden.", 404);
        b.status = "booked";
        tx.save("bookings");
      });
    },

    /* ----- Termine ----- */
    async appointments(token) {
      return guard(token, async (tx) => (await tx.get("appointments")).appointments.sort((a, z) => z.createdAt.localeCompare(a.createdAt)));
    },

    async createAppointment(token, req) {
      if (req.type !== "pt" && req.type !== "checkup") throw new ApiError("Bitte wähle eine Terminart.");
      const slot = slotOf(req.slot, "Termin");
      const note = text(req.note, 500);
      return guard(token, async (tx) => {
        const m = await getMember(tx, String(req.memberId ?? ""));
        const store = await tx.get("appointments");
        const a: Appointment = {
          id: uid("ap"),
          memberId: m.id,
          name: m.name,
          email: m.email,
          type: req.type as Appointment["type"],
          status: "confirmed",
          preferred: slot,
          alternative: null,
          note,
          proposal: null,
          confirmed: slot,
          declinedBy: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        store.appointments.push(a);
        tx.save("appointments");
        return a;
      });
    },

    async decideAppointment(token, id, raw) {
      const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const decision = d as unknown as AppointmentDecision;
      if (decision.action !== "confirm" && decision.action !== "decline" && decision.action !== "counter") throw new ApiError("Ungültige Aktion.");
      const adminNote = text(d.adminNote, 500);
      return guard(token, async (tx) => {
        const store = await tx.get("appointments");
        const a = store.appointments.find((x) => x.id === id);
        if (!a) throw new ApiError("Termin nicht gefunden.", 404);
        if (a.status !== "requested" && a.status !== "counter") throw new ApiError("Diese Anfrage ist schon beantwortet.", 409);
        if (decision.action === "confirm") {
          const slot = d.slot ? slotOf(d.slot, "Termin") : a.preferred;
          a.status = "confirmed";
          a.confirmed = slot;
          a.proposal = null;
        } else if (decision.action === "decline") {
          a.status = "declined";
          a.declinedBy = "admin";
          a.proposal = null;
        } else {
          const slot = slotOf(d.slot, "Gegenvorschlag");
          if (startOf(slot.date, slot.start).getTime() < Date.now()) throw new ApiError("Der Gegenvorschlag liegt in der Vergangenheit.");
          const note = text(d.note, 300);
          a.status = "counter";
          a.proposal = { ...slot, ...(note ? { note } : {}) };
        }
        a.adminNote = adminNote || a.adminNote;
        a.updatedAt = nowIso();
        tx.save("appointments");
        return a;
      });
    },

    /* ----- Kunden ----- */
    async members(token) {
      return guard(token, async (tx) => {
        const { members } = await tx.get("members");
        const last = await lastSessions(tx);
        const rows: AdminMemberRow[] = members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          active: m.active,
          tariff: m.tariff,
          groups: m.groups,
          nextMeasurementDue: m.nextMeasurementDue ?? null,
          hasPassword: !!m.pw,
          trialEnd: m.trialEnd ?? null,
          lastSession: last.get(m.id) ?? null,
        }));
        return rows.sort((a, z) => a.name.localeCompare(z.name, "de"));
      });
    },

    async member(token, id) {
      return guard(token, async (tx): Promise<AdminMemberDetail> => {
        const m = await getMember(tx, id);
        const { bookings } = await tx.get("bookings");
        const { appointments } = await tx.get("appointments");
        const { orders } = await tx.get("orders");
        const { recaps } = await tx.get("recaps");
        return {
          member: toAdminMember(m),
          plans: m.plans,
          measurements: [...m.measurements].sort((a, z) => z.date.localeCompare(a.date)),
          checkups: [...(m.checkups ?? [])].sort((a, z) => z.date.localeCompare(a.date)),
          bookings: bookings.filter((b) => b.memberId === m.id).sort((a, z) => `${z.date} ${z.start}`.localeCompare(`${a.date} ${a.start}`)),
          appointments: appointments.filter((a) => a.memberId === m.id).sort((a, z) => z.createdAt.localeCompare(a.createdAt)),
          orders: orders.filter((o) => o.memberId === m.id).sort((a, z) => z.createdAt.localeCompare(a.createdAt)),
          recaps: recaps.filter((r) => r.memberId === m.id).sort((a, z) => z.weekStart.localeCompare(a.weekStart)),
        };
      });
    },

    async createMember(token, input) {
      return guard(token, async (tx) => {
        const store = await tx.get("members");
        const m: MemberRecord = {
          id: uid("m"),
          role: "customer",
          name: "",
          email: "",
          phone: "",
          active: true,
          tariff: "kleingruppe",
          groups: [],
          createdAt: nowIso(),
          nextMeasurementDue: null,
          notes: "",
          birthday: null,
          goal: "",
          trialStart: null,
          trialEnd: null,
          pw: null,
          invite: null,
          plans: [],
          measurements: [],
          checkups: [],
        };
        const data = input as Record<string, unknown>;
        if (!("name" in data) || !("email" in data)) throw new ApiError("Name und E-Mail sind Pflichtfelder.");
        applyMemberInput(m, data, store.members);
        store.members.push(m);
        tx.save("members");
        return { id: m.id };
      });
    },

    async updateMember(token, id, input) {
      await guard(token, async (tx) => {
        const store = await tx.get("members");
        const m = store.members.find((x) => x.id === id);
        if (!m) throw new ApiError("Kunde nicht gefunden.", 404);
        applyMemberInput(m, input as Record<string, unknown>, store.members);
        tx.save("members");
        if (!m.active) {
          const sessions = await tx.get("sessions");
          sessions.sessions = sessions.sessions.filter((s) => s.memberId !== m.id);
          tx.save("sessions");
        }
      });
    },

    async deleteMember(token, id) {
      await guard(token, async (tx) => {
        const store = await tx.get("members");
        if (!store.members.some((x) => x.id === id)) throw new ApiError("Kunde nicht gefunden.", 404);
        store.members = store.members.filter((x) => x.id !== id);
        tx.save("members");
        // DSGVO: personenbezogene Daten entfernen; Shop-Anfragen bleiben anonymisiert (Buchhaltung)
        const bk = await tx.get("bookings");
        bk.bookings = bk.bookings.filter((b) => b.memberId !== id);
        tx.save("bookings");
        const ap = await tx.get("appointments");
        ap.appointments = ap.appointments.filter((a) => a.memberId !== id);
        tx.save("appointments");
        const rc = await tx.get("recaps");
        rc.recaps = rc.recaps.filter((r) => r.memberId !== id);
        tx.save("recaps");
        const se = await tx.get("sessions");
        se.sessions = se.sessions.filter((s) => s.memberId !== id);
        tx.save("sessions");
        const or = await tx.get("orders");
        for (const o of or.orders) {
          if (o.memberId === id) {
            o.memberId = null;
            o.customer = { name: "Gelöschter Kunde", email: "", phone: "", note: "" };
          }
        }
        tx.save("orders");
        const site = await tx.get("site");
        for (const n of site.collections.news ?? []) n.memberIds = (n.memberIds ?? []).filter((x) => x !== id);
        for (const c of site.collections.courses) if (c.allowed?.memberIds) c.allowed.memberIds = c.allowed.memberIds.filter((x) => x !== id);
        tx.save("site");
      });
    },

    async createInvite(token, id) {
      return guard(token, async (tx) => {
        const m = await getMember(tx, id);
        const raw = randomBytes(24).toString("base64url");
        const exp = Date.now() + 7 * 86_400_000;
        m.invite = { hash: sha256(raw), exp };
        tx.save("members");
        if (m.pw) {
          // Passwort-Reset: bestehende Sitzungen enden, bis ein neues Passwort gesetzt ist
          const sessions = await tx.get("sessions");
          sessions.sessions = sessions.sessions.filter((s) => s.memberId !== m.id);
          tx.save("sessions");
        }
        return { token: raw, expiresAt: exp };
      });
    },

    async exportMember(token, id) {
      return guard(token, async (tx) => {
        const m = await getMember(tx, id);
        const { bookings } = await tx.get("bookings");
        const { appointments } = await tx.get("appointments");
        const { orders } = await tx.get("orders");
        const { recaps } = await tx.get("recaps");
        const { pw, invite, ...rest } = m;
        void pw;
        void invite;
        return {
          exportedAt: nowIso(),
          hinweis: "Auskunft nach Art. 15 DSGVO: alle zu dieser Person gespeicherten Daten (ohne Passwort-Hash).",
          kunde: rest,
          buchungen: bookings.filter((b) => b.memberId === id),
          termine: appointments.filter((a) => a.memberId === id),
          shopAnfragen: orders.filter((o) => o.memberId === id),
          recaps: recaps.filter((r) => r.memberId === id),
        };
      });
    },

    async saveMemberItem(token, id, resource, item) {
      const raw = (item && typeof item === "object" && !Array.isArray(item) ? item : null) as Record<string, unknown> | null;
      if (!raw) throw new ApiError("Ungültige Anfrage.");
      return guard(token, async (tx) => {
        const m = await getMember(tx, id);
        const site = await tx.get("site");
        const itemId = typeof raw.id === "string" ? raw.id : "";
        let savedId = "";
        if (resource === "plans") {
          const existing = itemId ? m.plans.find((p) => p.id === itemId) : undefined;
          if (itemId && !existing) throw new ApiError("Plan nicht gefunden.", 404);
          const plan = parsePlan(raw, existing);
          if (existing) m.plans[m.plans.indexOf(existing)] = plan;
          else m.plans.push(plan);
          savedId = plan.id;
        } else if (resource === "logs") {
          const plan = m.plans.find((p) => p.id === raw.planId);
          if (!plan) throw new ApiError("Plan nicht gefunden.", 404);
          const existing = itemId ? plan.logs.find((l) => l.id === itemId) : undefined;
          if (itemId && !existing) throw new ApiError("Eintrag nicht gefunden.", 404);
          const log = parseLog(plan, raw, existing);
          if (existing) plan.logs[plan.logs.indexOf(existing)] = log;
          else plan.logs.push(log);
          plan.logs.sort((a, z) => a.date.localeCompare(z.date));
          savedId = log.id;
        } else if (resource === "measurements") {
          const existing = itemId ? m.measurements.find((x) => x.id === itemId) : undefined;
          if (itemId && !existing) throw new ApiError("Messung nicht gefunden.", 404);
          const ms = parseMeasurement(site, raw, existing);
          if (existing) m.measurements[m.measurements.indexOf(existing)] = ms;
          else m.measurements.push(ms);
          savedId = ms.id;
        } else if (resource === "checkups") {
          m.checkups ??= [];
          const existing = itemId ? m.checkups.find((x) => x.id === itemId) : undefined;
          if (itemId && !existing) throw new ApiError("Check-up nicht gefunden.", 404);
          const cu = parseCheckup(site, m, raw, existing);
          if (existing) m.checkups[m.checkups.indexOf(existing)] = cu;
          else m.checkups.push(cu);
          savedId = cu.id;
        } else throw new ApiError("Unbekannte Ressource.", 404);
        tx.save("members");
        return { id: savedId };
      });
    },

    async deleteMemberItem(token, id, resource, itemId, parentId) {
      await guard(token, async (tx) => {
        const m = await getMember(tx, id);
        let removed = false;
        if (resource === "plans") {
          const n = m.plans.length;
          m.plans = m.plans.filter((p) => p.id !== itemId);
          removed = m.plans.length !== n;
          for (const c of m.checkups ?? []) if (c.planId === itemId) c.planId = null;
        } else if (resource === "logs") {
          const plan = m.plans.find((p) => p.id === parentId);
          if (plan) {
            const n = plan.logs.length;
            plan.logs = plan.logs.filter((l) => l.id !== itemId);
            removed = plan.logs.length !== n;
          }
        } else if (resource === "measurements") {
          const n = m.measurements.length;
          m.measurements = m.measurements.filter((x) => x.id !== itemId);
          removed = m.measurements.length !== n;
          for (const c of m.checkups ?? []) if (c.measurementId === itemId) c.measurementId = null;
        } else if (resource === "checkups") {
          const n = (m.checkups ?? []).length;
          m.checkups = (m.checkups ?? []).filter((x) => x.id !== itemId);
          removed = m.checkups.length !== n;
        }
        if (!removed) throw new ApiError("Eintrag nicht gefunden.", 404);
        tx.save("members");
      });
    },

    /* ----- Shop-Anfragen ----- */
    async orders(token) {
      return guard(token, async (tx) => (await tx.get("orders")).orders.sort((a, z) => z.createdAt.localeCompare(a.createdAt)));
    },

    async updateOrder(token, id, patch) {
      const statuses: OrderStatus[] = ["neu", "bestaetigt", "bereit", "abgeholt", "abgelehnt"];
      if (patch.status !== undefined && !statuses.includes(patch.status as OrderStatus)) throw new ApiError("Ungültiger Status.");
      return guard(token, async (tx) => {
        const store = await tx.get("orders");
        const o = store.orders.find((x) => x.id === id);
        if (!o) throw new ApiError("Anfrage nicht gefunden.", 404);
        if (patch.status !== undefined) o.status = patch.status as OrderStatus;
        if (patch.internalNote !== undefined) o.internalNote = text(patch.internalNote, 1000);
        o.updatedAt = nowIso();
        tx.save("orders");
        return o;
      });
    },
  };
}
