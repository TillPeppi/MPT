/*
 * Datenmodell des Admin-Bereichs (Etappe 3). Spiegelt die Mock-Dateien unter data/ und später die Go-API.
 * Zwei Rollen: Admin und Kunde. Der Admin-Zugang ist getrennt vom Kundenzugang (eigenes Cookie `mpt_admin`).
 */

import type {
  Appointment,
  Booking,
  Measurement,
  MemberProfile,
  Order,
  Plan,
  RecapEntry,
  SlotOverride,
  TimeSlot,
} from "./member";

/* ---------- Admin-Konten ---------- */

/** Admin-Konto, wie es der Admin-Oberfläche geliefert wird (nie Hash). */
export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  active: boolean;
  createdAt: string;
  /** Initialpasswort noch nicht geändert → Warnhinweis im Admin */
  mustChangePassword: boolean;
}

/** Datensatz in data/admins.json (nur Server) */
export interface AdminRecord extends AdminAccount {
  pw: { algo: "scrypt"; salt: string; hash: string } | null;
}

export interface AdminSession {
  id: string;
  username: string;
  name: string;
  mustChangePassword: boolean;
}

/* ---------- Inhalte ---------- */

export interface LegalTexts {
  impressum: string;
  datenschutz: string;
  agb: string;
  widerruf: string;
}

export type LegalKey = keyof LegalTexts;

export type NewsAudience = "all" | "group" | "members";

export interface NewsItem {
  id: string;
  title: string;
  text: string;
  image?: string;
  link?: string;
  /** Veröffentlichung ab (lokale Zeit, `YYYY-MM-DDTHH:mm`); in der Vergangenheit = sofort sichtbar */
  publishAt: string;
  audience: NewsAudience;
  groups?: string[];
  memberIds?: string[];
}

/* ---------- Check-up ---------- */

export interface CheckupPoint {
  id: string;
  label: string;
  /** Gruppe für die Anzeige, z. B. „Fußgelenk“ */
  group: string;
}

export interface CheckupFinding {
  /** auffällig */
  flag: boolean;
  note: string;
}

export interface CheckUp {
  id: string;
  date: string;
  /** Verknüpfte Messung (Messungen-Tab) */
  measurementId?: string | null;
  /** Plan zum Zeitpunkt des Check-ups (für die Planübersicht) */
  planId?: string | null;
  /** Punkt-ID → Befund (Überkopfkniebeuge) */
  screen: Record<string, CheckupFinding>;
  note: string;
  createdAt: string;
}

/* ---------- Kunden (Admin-Sicht) ---------- */

/** Kunde mit Admin-Feldern. `notes` ist der interne Notizblock. */
export interface AdminMember extends MemberProfile {
  notes: string;
  birthday: string | null;
  goal: string;
  trialStart: string | null;
  trialEnd: string | null;
  /** Hat ein Passwort gesetzt */
  hasPassword: boolean;
  /** Offene Einladung (Link wurde erzeugt und ist gültig) */
  inviteOpen: boolean;
}

export interface AdminMemberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  tariff: string;
  groups: string[];
  nextMeasurementDue: string | null;
  hasPassword: boolean;
  trialEnd: string | null;
  /** Letzte Einheit (Buchung oder Log) */
  lastSession: string | null;
}

export interface AdminMemberDetail {
  member: AdminMember;
  plans: Plan[];
  measurements: Measurement[];
  checkups: CheckUp[];
  bookings: Booking[];
  appointments: Appointment[];
  orders: Order[];
  recaps: RecapEntry[];
}

export interface MemberInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  birthday?: unknown;
  goal?: unknown;
  active?: unknown;
  tariff?: unknown;
  groups?: unknown;
  trialStart?: unknown;
  trialEnd?: unknown;
  notes?: unknown;
  nextMeasurementDue?: unknown;
}

/** Unterressourcen eines Kunden, die der Admin pflegt */
export type MemberResource = "plans" | "measurements" | "checkups" | "logs";

/* ---------- Buchungen & Termine ---------- */

export interface AdminSlot {
  courseId: string;
  title: string;
  date: string;
  start: string;
  end?: string;
  trainer: string;
  category: string;
  /** Plätze für diesen Tag (Kursstandard oder Überschreibung) */
  spots: number;
  baseSpots: number;
  overridden: boolean;
  past: boolean;
  closed: boolean;
  restricted: boolean;
  participants: AdminParticipant[];
  waitlist: AdminParticipant[];
}

export interface AdminParticipant {
  bookingId: string;
  memberId: string | null;
  name: string;
  email: string;
  by: "member" | "admin";
  attended: boolean | null;
  createdAt: string;
}

export interface AdminBookRequest {
  courseId: string;
  date: string;
  memberId: string;
  /** Darf die Platzzahl überschreiten (Standard: false → Warteliste) */
  force?: boolean;
}

export type AttendanceValue = "attended" | "noshow" | "open";

export interface AppointmentCreate {
  memberId: string;
  type: "pt" | "checkup";
  slot: TimeSlot;
  note?: string;
}

export type AppointmentDecision =
  | { action: "confirm"; slot?: TimeSlot; adminNote?: string }
  | { action: "decline"; adminNote?: string }
  | { action: "counter"; slot: TimeSlot; note?: string; adminNote?: string };

/* ---------- Dashboard ---------- */

export interface DashboardData {
  today: string;
  todayBookings: { courseId: string; title: string; start: string; trainer: string; booked: number; spots: number; waitlist: number; closed: boolean }[];
  openAppointments: Appointment[];
  newOrders: Order[];
  measurementsDue: { memberId: string; name: string; due: string }[];
}

/* ---------- Einstellungen (Abschnitte, jeweils komplett gespeichert) ---------- */

export type SettingsSection =
  | "studio"
  | "hours"
  | "seo"
  | "forms"
  | "legal"
  | "booking"
  | "appointments"
  | "recap"
  | "checkup";

export type CollectionName =
  | "courses"
  | "team"
  | "reviews"
  | "stories"
  | "posts"
  | "events"
  | "challenges"
  | "products"
  | "news";

export type { SlotOverride };
