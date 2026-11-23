/*
 * Datenmodell von Kundenbereich, Buchung, Terminen, Recap und Shop-Anfragen.
 * Spiegelt die Mock-Datendateien unter data/ (und später die Go-API). Der Admin (Etappe 3) pflegt dieselben Modelle.
 */

export type Role = "customer" | "admin";

/** Was der Client über die eigene Sitzung wissen darf (nie Hashes oder Tokens). */
export interface Session {
  memberId: string;
  name: string;
  firstName: string;
  email: string;
  role: Role;
}

import type { CheckUp, NewsItem } from "./admin";

/* ---------- Pläne & Training ---------- */

export interface Exercise {
  id: string;
  /** Einheit auf dem Papierbogen: A1/A2 = Supersatz */
  group: string;
  name: string;
  sets: number;
  /** Text: „6-8“, „30s“ */
  reps: string;
  tempo: string;
  /** Pause in Sekunden */
  rest: number;
  note?: string;
}

export interface PlanDay {
  id: string;
  name: string;
  exercises: Exercise[];
}

/** Ein Satz. Nur ausgefüllte Felder werden gespeichert/angezeigt. */
export interface SetValue {
  reps?: number | null;
  kg?: number | null;
  /** Zeit in Sekunden (z. B. Plank) */
  sec?: number | null;
  /** Distanz in Metern */
  m?: number | null;
  kcal?: number | null;
}

export interface TrainingLog {
  id: string;
  dayId: string;
  date: string;
  note?: string;
  /** Übungs-ID → Sätze */
  sets: Record<string, SetValue[]>;
}

export interface Plan {
  id: string;
  title: string;
  status: "active" | "done";
  start: string;
  end: string | null;
  goal?: string;
  note?: string;
  days: PlanDay[];
  logs: TrainingLog[];
}

export interface Measurement {
  id: string;
  date: string;
  /** kg */
  weight?: number | null;
  /** Magermasse in kg */
  leanMass?: number | null;
  /** Körperfett in % (trägt der Coach ein) */
  bodyfat?: number | null;
  /** mm */
  skinfolds?: Record<string, number>;
  /** cm */
  girths?: Record<string, number>;
  note?: string;
}

/* ---------- Kunde ---------- */

/** Kunde, wie er an den Client ausgeliefert wird (ohne Passwort-Hash/Einladungs-Token). */
export interface MemberProfile {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  /** Tarif für Buchungsbeschränkungen (B-7), z. B. „kleingruppe“, „pt“, „testphase“ */
  tariff: string;
  /** Gruppenzugehörigkeit für Buchungsbeschränkungen, z. B. „golf“ */
  groups: string[];
  createdAt: string;
  /** Fälligkeit der nächsten Messung (YYYY-MM-DD) */
  nextMeasurementDue?: string | null;
}

/** Datensatz in data/members.json (nur auf dem Server). */
export interface MemberRecord extends MemberProfile {
  /** Interner Notizblock des Admins: wird nie an Kunden-Endpunkte ausgeliefert */
  notes: string;
  birthday?: string | null;
  goal?: string;
  /** Testphase (nur Admin) */
  trialStart?: string | null;
  trialEnd?: string | null;
  /** Check-up-Ergebnisse: intern, für Kunden unsichtbar */
  checkups?: CheckUp[];
  pw: { algo: "scrypt"; salt: string; hash: string } | null;
  /** Einladung: SHA-256 des Tokens + Ablauf (ms) */
  invite: { hash: string; exp: number } | null;
  plans: Plan[];
  measurements: Measurement[];
}

/* ---------- Buchung ---------- */

export type BookingStatus = "booked" | "waitlist" | "cancelled";

export interface Participant {
  name: string;
  memberId?: string | null;
}

export interface Booking {
  id: string;
  courseId: string;
  date: string;
  start: string;
  title: string;
  memberId: string | null;
  name: string;
  email: string;
  status: BookingStatus;
  seriesId: string | null;
  createdAt: string;
  cancelledAt: string | null;
  by: "member" | "admin";
  /** Anwesenheit (Admin, Etappe 3): `null`/fehlt = nicht erfasst */
  attended?: boolean | null;
  /** B-4 (P2): weitere Personen der Buchung */
  participants?: Participant[];
}

/** Admin: Platzzahl für einen einzelnen Termin („Plätze freigeben“) */
export interface SlotOverride {
  courseId: string;
  date: string;
  spots: number;
}

export interface Allowed {
  tariffs?: string[];
  groups?: string[];
  memberIds?: string[];
}

export interface Slot {
  courseId: string;
  date: string;
  start: string;
  spots: number;
  booked: number;
  waitlist: number;
  past: boolean;
  closed: boolean;
  bookable: boolean;
  /** Kurs ist auf bestimmte Mitglieder beschränkt */
  restricted: boolean;
  /** Eingeloggter Kunde darf buchen (bei Gästen immer false, wenn `restricted`) */
  allowed: boolean;
  /** Eigene Buchung (nur mit Sitzung) */
  mine?: "booked" | "waitlist";
}

export interface BookRequest {
  courseId: string;
  date: string;
  weeks: number;
}

export interface BookResult {
  ok: true;
  created: { id: string; date: string; status: BookingStatus }[];
  skipped: { date: string; reason: string }[];
}

/* ---------- PT & Check-up ---------- */

export type AppointmentType = "pt" | "checkup";
export type AppointmentStatus = "requested" | "confirmed" | "declined" | "counter";

export interface TimeSlot {
  date: string;
  start: string;
}

export interface Appointment {
  id: string;
  memberId: string;
  name: string;
  email: string;
  type: AppointmentType;
  status: AppointmentStatus;
  /** Wunschtermin des Kunden */
  preferred: TimeSlot;
  alternative?: TimeSlot | null;
  note?: string;
  /** Gegenvorschlag des Admins (Status `counter`) */
  proposal?: (TimeSlot & { note?: string }) | null;
  /** Endgültiger Termin (Status `confirmed`) */
  confirmed?: TimeSlot | null;
  /** Wer hat abgelehnt? */
  declinedBy?: "admin" | "member" | null;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentRequest {
  type: AppointmentType;
  preferred: TimeSlot;
  alternative?: TimeSlot | null;
  note?: string;
}

export interface AppointmentRespond {
  id: string;
  action: "accept" | "decline";
}

/* ---------- Wochenrecap ---------- */

export type RecapScoreKey = "training" | "schlaf" | "ernaehrung" | "energie";

export interface RecapQuestion {
  id: string;
  type: "yesno" | "scale" | "text";
  label: string;
  required?: boolean;
  /** Zu welchem Score-Bestandteil die Frage zählt (null = nur Notiz) */
  score?: RecapScoreKey | null;
  /** Überschrift der Gruppe in der Maske (nur beim ersten Eintrag der Gruppe) */
  section?: string;
}

export interface RecapConfig {
  questions: RecapQuestion[];
  scale: { min: number; max: number; skip: number[] };
  /** Gewichte der Score-Bestandteile (gleich = alle 1) */
  weights: Record<RecapScoreKey, number>;
  /** Maximal gewertete Trainingseinheiten pro Woche */
  maxSessions: number;
}

export interface RecapEntry {
  id: string;
  memberId: string;
  /** ISO-Woche, z. B. „2026-W47“ */
  week: string;
  /** Montag der Woche (YYYY-MM-DD) */
  weekStart: string;
  answers: Record<string, number | boolean | string>;
  /** Trainingseinheiten der Woche zum Zeitpunkt des Absendens (max. maxSessions) */
  sessions: number;
  components: Record<RecapScoreKey, number>;
  /** MPT Performance Score 0–100 */
  score: number;
  createdAt: string;
}

export interface RecapState {
  config: RecapConfig;
  currentWeek: string;
  currentWeekStart: string;
  /** Eintrag der laufenden Woche, sonst null (= noch offen) */
  current: RecapEntry | null;
  /** Alle Einträge, neueste zuerst */
  entries: RecapEntry[];
}

/* ---------- Shop-Anfrage ---------- */

export type OrderStatus = "neu" | "bestaetigt" | "bereit" | "abgeholt" | "abgelehnt";

export interface OrderItem {
  productId: string;
  name: string;
  variant: string;
  qty: number;
  price: number;
  sum: number;
}

export interface Order {
  id: string;
  no: string;
  memberId: string | null;
  createdAt: string;
  status: OrderStatus;
  customer: { name: string; email: string; phone: string; note: string };
  items: OrderItem[];
  total: number;
  /** Interne Notiz des Admins: nie an Kunden ausgeliefert */
  internalNote?: string;
  updatedAt?: string;
}

export interface OrderRequest {
  items: { productId: string; variant?: string; qty: number }[];
  customer?: { name?: string; email?: string; phone?: string; note?: string };
  consent: boolean;
}

export interface OrderResult {
  ok: true;
  no: string;
  total: number;
}

/** Produkt mit Preis (nur eingeloggt: GET /api/member/shop) */
export interface ShopProduct {
  id: string;
  name: string;
  unit?: string;
  variants: string[];
  price: number;
  soldOut: boolean;
}

/* ---------- Gesamtantwort GET /api/member/me ---------- */

export interface MemberMe {
  member: MemberProfile;
  bookings: Booking[];
  appointments: Appointment[];
  orders: Order[];
  plans: Plan[];
  measurements: Measurement[];
  recap: RecapState;
  /** Trainingseinheiten der letzten Wochen (Datum → Quelle), abgeleitet aus Buchungen und Logs */
  attendedCount30d: number;
  /** Veröffentlichte News für diesen Kunden (Zielgruppe berücksichtigt), neueste zuerst */
  news: NewsItem[];
}
