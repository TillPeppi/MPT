import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR, SEED_DIR, ensureDataDir } from "./data-paths";
import { isoWeekOf } from "./recap";
import type { AdminRecord } from "@/types/admin";
import type { Appointment, Booking, MemberRecord, Order, RecapEntry, SlotOverride } from "@/types/member";
import type { SiteData } from "@/types/site";

/*
 * Mock-Datenbank: JSON-Dateien unter data/. Die EINZIGE Stelle mit Datei-I/O für Kundendaten.
 * Mit der Go-API (API_URL) wird dieses Modul nicht mehr benutzt, es entfällt dann samt data/seed/.
 *
 *  - Laufzeitdateien (data/<name>.json) sind in .gitignore. Fehlt eine, wird sie beim ersten Zugriff aus
 *    data/seed/<name>.json kopiert; Datumsangaben des Seeds werden dabei um ganze Wochen auf „heute“ verschoben.
 *  - Schreibzugriffe laufen über transaction(): ein prozessweiter Mutex serialisiert Lesen-Ändern-Schreiben,
 *    damit der letzte Platz nicht doppelt vergeben wird.
 */


export interface Session {
  /** SHA-256 des Cookie-Tokens */
  hash: string;
  memberId: string;
  exp: number;
  createdAt: number;
}

export interface Collections {
  members: { members: MemberRecord[] };
  bookings: { bookings: Booking[]; overrides?: SlotOverride[] };
  orders: { orders: Order[]; seq: number };
  appointments: { appointments: Appointment[] };
  recaps: { recaps: RecapEntry[] };
  sessions: { sessions: Session[] };
  /** Admin-Konten (Etappe 3) */
  admins: { admins: AdminRecord[] };
  /** Admin-Sitzungen: eigene Datei, getrennt von den Kunden-Sitzungen */
  adminSessions: { sessions: AdminSessionRecord[] };
  /** Inhalte der Website (data/site.json, kein Seed: die Datei ist versioniert) */
  site: SiteData;
}
export interface AdminSessionRecord {
  hash: string;
  adminId: string;
  exp: number;
  createdAt: number;
}
export type CollectionName = keyof Collections;

const DAY = 86_400_000;

const isoDay = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDay = (s: string): Date => new Date(`${s}T12:00:00`);

/** Ganze Wochen zwischen dem Basisdatum des Seeds und heute (Wochentage bleiben erhalten). */
function weekShiftDays(base: string): number {
  const diff = (parseDay(isoDay(new Date())).getTime() - parseDay(base).getTime()) / DAY;
  return Math.floor(diff / 7) * 7;
}

function shiftDate(s: string, days: number): string {
  const d = parseDay(s);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

/** Datumsfelder des Seeds verschieben (Buchungen, Termine, Recaps). */
function rebase(name: CollectionName, data: unknown, base: string): unknown {
  const n = weekShiftDays(base);
  if (n === 0) return data;
  const copy = JSON.parse(JSON.stringify(data)) as Record<string, unknown[]>;
  const slot = (t: { date: string } | null | undefined) => {
    if (t) t.date = shiftDate(t.date, n);
  };
  if (name === "members") {
    for (const m of copy.members as MemberRecord[]) if (m.nextMeasurementDue) m.nextMeasurementDue = shiftDate(m.nextMeasurementDue, n);
  }
  if (name === "bookings") for (const b of copy.bookings as Booking[]) b.date = shiftDate(b.date, n);
  if (name === "appointments") {
    for (const a of copy.appointments as Appointment[]) {
      slot(a.preferred);
      slot(a.alternative);
      slot(a.proposal);
      slot(a.confirmed);
    }
  }
  if (name === "recaps") {
    for (const r of copy.recaps as RecapEntry[]) {
      r.weekStart = shiftDate(r.weekStart, n);
      r.week = isoWeekOf(parseDay(r.weekStart)).week;
    }
  }
  return copy;
}

const EMPTY: Record<CollectionName, unknown> = {
  members: { members: [] },
  bookings: { bookings: [] },
  orders: { orders: [], seq: 1000 },
  appointments: { appointments: [] },
  recaps: { recaps: [] },
  sessions: { sessions: [] },
  admins: { admins: [] },
  adminSessions: { sessions: [] },
  site: {},
};

async function readFileJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as unknown;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function atomicWrite(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

async function load<N extends CollectionName>(name: N): Promise<Collections[N]> {
  await ensureDataDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  const existing = await readFileJson(file);
  if (existing) return existing as Collections[N];
  if (name === "site") throw new Error("data/site.json fehlt.");
  // Erster Zugriff: Seed kopieren (mit Datumsverschiebung)
  const seed = (await readFileJson(path.join(SEED_DIR, `${name}.json`))) as (Record<string, unknown> & { base?: string }) | null;
  let data: unknown = EMPTY[name];
  if (seed) {
    const { base, ...rest } = seed;
    data = base ? rebase(name, rest, base) : rest;
  }
  await atomicWrite(file, data);
  return data as Collections[N];
}

/* ---------- Mutex ---------- */

const g = globalThis as unknown as { __mptDbQueue?: Promise<unknown> };

/**
 * Serialisierte Transaktion: `fn` bekommt Lese-/Schreibzugriff und läuft garantiert allein.
 * Geschrieben wird nur, was über `tx.save(name)` markiert wurde (nach erfolgreichem `fn`).
 */
export interface Tx {
  get<N extends CollectionName>(name: N): Promise<Collections[N]>;
  save(name: CollectionName): void;
}

export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const run = (g.__mptDbQueue ?? Promise.resolve()).then(async () => {
    const cache = new Map<CollectionName, unknown>();
    const dirty = new Set<CollectionName>();
    const tx: Tx = {
      async get(name) {
        if (!cache.has(name)) cache.set(name, await load(name));
        return cache.get(name) as never;
      },
      save: (name) => void dirty.add(name),
    };
    const result = await fn(tx);
    for (const name of dirty) await atomicWrite(path.join(DATA_DIR, `${name}.json`), cache.get(name));
    return result;
  });
  g.__mptDbQueue = run.catch(() => undefined);
  return run;
}

/** Nur lesen. Läuft ebenfalls durch die Warteschlange, damit das erste Anlegen aus dem Seed nie mit einem Schreibvorgang kollidiert. */
export async function readCollection<N extends CollectionName>(name: N): Promise<Collections[N]> {
  return transaction((tx) => tx.get(name));
}
