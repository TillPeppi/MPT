import { ApiError } from "./errors";
import type { Block } from "@/types/site";
import type { CollectionName, SettingsSection } from "@/types/admin";

/*
 * Feld-Schema des Admins. Eine Quelle für Formular (Client) und Validierung (Server):
 * Der Admin bearbeitet nur DATEN (Texte, Bilder, Links, Preise, Listen). Das Layout der Seiten ist im Code fest.
 * Portiert aus dem Prototyp (admin/schema.js), ohne Seitenbaukasten.
 */

export type TextType = "text" | "textarea" | "link" | "image" | "date" | "time" | "month" | "datetime";

interface Base {
  k: string;
  l: string;
  /** Hilfetext unter dem Feld */
  h?: string;
}
export type FieldDef =
  | (Base & { t: TextType; max?: number; req?: boolean; rows?: number; list?: string[] })
  | (Base & { t: "number"; min?: number; max?: number; int?: boolean; step?: number })
  | (Base & { t: "toggle" })
  | (Base & { t: "select"; o: Record<string, string>; num?: boolean })
  | (Base & { t: "strings" | "images" | "days" | "numbers" | "memberIds" })
  | (Base & { t: "list"; item: Record<string, unknown>; fields: FieldDef[]; max?: number; titleKey?: string })
  | (Omit<Base, "k"> & { t: "info"; k?: string })
  | (Base & { t: "allowed" });

/* ---------- Pfade (z. B. `contact.street`) ---------- */

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur = obj;
  for (const part of parts.slice(0, -1)) {
    const next = cur[part];
    if (next === null || typeof next !== "object" || Array.isArray(next)) cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

/* ---------- Validierung ---------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
const LINK_RE = /^(#[\w\-/]*|\/[^\s]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+)$/i;
const IMAGE_RE = /^(\/(assets|uploads)\/[\w\-./]+|https?:\/\/[^\s]+)$/i;

const DEFAULT_MAX: Record<TextType, number> = { text: 200, textarea: 20_000, link: 500, image: 500, date: 10, time: 5, month: 7, datetime: 16 };

/** Unsichtbare Steuerzeichen raus, Zeilenumbrüche vereinheitlichen */
const clean = (s: string): string => s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function checkText(f: Extract<FieldDef, { t: TextType }>, v: unknown): string {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new ApiError(`„${f.l}“: bitte einen Text angeben.`);
  const s = f.t === "textarea" ? clean(v).trim() : clean(v).replace(/\n/g, " ").trim();
  if (f.req && !s) throw new ApiError(`„${f.l}“ ist ein Pflichtfeld.`);
  if (s.length > (f.max ?? DEFAULT_MAX[f.t])) throw new ApiError(`„${f.l}“ ist zu lang (höchstens ${f.max ?? DEFAULT_MAX[f.t]} Zeichen).`);
  if (!s) return "";
  if (f.t === "date" && !(DATE_RE.test(s) && !Number.isNaN(new Date(`${s}T12:00:00`).getTime()))) throw new ApiError(`„${f.l}“: bitte ein gültiges Datum angeben.`);
  if (f.t === "time" && !TIME_RE.test(s)) throw new ApiError(`„${f.l}“: bitte eine gültige Uhrzeit angeben.`);
  if (f.t === "month" && !MONTH_RE.test(s)) throw new ApiError(`„${f.l}“: bitte einen gültigen Monat angeben.`);
  if (f.t === "datetime" && !DATETIME_RE.test(s)) throw new ApiError(`„${f.l}“: bitte Datum und Uhrzeit angeben.`);
  if (f.t === "link" && !LINK_RE.test(s)) throw new ApiError(`„${f.l}“: bitte einen gültigen Link angeben (z. B. #/kurse, /shop oder https://…).`);
  if (f.t === "image" && !IMAGE_RE.test(s)) throw new ApiError(`„${f.l}“: bitte ein Bild aus der Auswahl oder hochgeladene Datei verwenden.`);
  return s;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function checkStringArray(f: FieldDef & { l: string }, v: unknown, itemRe?: RegExp): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 100) throw new ApiError(`„${f.l}“: ungültige Liste.`);
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") throw new ApiError(`„${f.l}“: ungültiger Eintrag.`);
    const s = clean(x).replace(/\n/g, " ").trim();
    if (!s) continue;
    if (s.length > 500) throw new ApiError(`„${f.l}“: ein Eintrag ist zu lang.`);
    if (itemRe && !itemRe.test(s)) throw new ApiError(`„${f.l}“: ungültiger Eintrag „${s}“.`);
    out.push(s);
  }
  return out;
}

/**
 * Prüft Eingaben gegen die Felddefinition und liefert nur bekannte Schlüssel zurück.
 * `strict`: auch fehlende Pflichtfelder bemängeln (Neuanlage). Sonst werden nur vorhandene Schlüssel geprüft.
 */
export function sanitize(fields: FieldDef[], input: unknown, strict = false): Record<string, unknown> {
  if (!isObj(input)) throw new ApiError("Ungültige Anfrage.");
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.t === "info" || !f.k) continue;
    const raw = getPath(input, f.k);
    if (raw === undefined && !strict) continue;
    let v: unknown;
    switch (f.t) {
      case "toggle":
        if (raw !== undefined && typeof raw !== "boolean") throw new ApiError(`„${f.l}“: ungültiger Wert.`);
        v = raw === true;
        break;
      case "number": {
        if (raw === null || raw === "" || raw === undefined) {
          v = f.min ?? 0;
          break;
        }
        if (typeof raw !== "number" || !Number.isFinite(raw)) throw new ApiError(`„${f.l}“: bitte eine Zahl angeben.`);
        if (f.int && !Number.isInteger(raw)) throw new ApiError(`„${f.l}“: bitte eine ganze Zahl angeben.`);
        if (f.min !== undefined && raw < f.min) throw new ApiError(`„${f.l}“: mindestens ${f.min}.`);
        if (f.max !== undefined && raw > f.max) throw new ApiError(`„${f.l}“: höchstens ${f.max}.`);
        v = raw;
        break;
      }
      case "select": {
        const key = String(raw ?? "");
        if (!(key in f.o)) throw new ApiError(`„${f.l}“: bitte eine Auswahl treffen.`);
        v = f.num ? Number(key) : key;
        break;
      }
      case "strings":
        v = checkStringArray(f, raw);
        break;
      case "images":
        v = checkStringArray(f, raw, IMAGE_RE);
        break;
      case "memberIds":
        v = checkStringArray(f, raw, /^[\w-]+$/);
        break;
      case "days": {
        if (raw === undefined || raw === null) {
          v = [];
          break;
        }
        if (!Array.isArray(raw) || !raw.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) throw new ApiError(`„${f.l}“: ungültige Tage.`);
        v = [...new Set(raw as number[])].sort();
        break;
      }
      case "numbers": {
        if (raw === undefined || raw === null) {
          v = [];
          break;
        }
        if (!Array.isArray(raw) || raw.length > 30 || !raw.every((d) => typeof d === "number" && Number.isFinite(d))) throw new ApiError(`„${f.l}“: ungültige Zahlen.`);
        v = raw;
        break;
      }
      case "allowed": {
        const o = isObj(raw) ? raw : {};
        v = {
          tariffs: checkStringArray(f, o.tariffs, /^[\w-]+$/),
          groups: checkStringArray(f, o.groups, /^[\w-]+$/),
          memberIds: checkStringArray(f, o.memberIds, /^[\w-]+$/),
        };
        break;
      }
      case "list": {
        if (raw === undefined || raw === null) {
          v = [];
          break;
        }
        if (!Array.isArray(raw) || raw.length > (f.max ?? 100)) throw new ApiError(`„${f.l}“: ungültige Liste.`);
        v = raw.map((entry) => sanitize(f.fields, entry, true));
        break;
      }
      default:
        v = checkText(f, raw);
    }
    setPath(out, f.k, v);
  }
  return out;
}

/** Standardwerte aus den Felddefinitionen (für „Neu anlegen“) */
export function defaults(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.t === "info" || !f.k) continue;
    const v = f.t === "toggle" ? false : f.t === "number" ? (f.min ?? 0) : f.t === "select" ? (f.num ? Number(Object.keys(f.o)[0]) : Object.keys(f.o)[0]) : f.t === "list" || f.t === "strings" || f.t === "images" || f.t === "days" || f.t === "numbers" || f.t === "memberIds" ? [] : f.t === "allowed" ? { tariffs: [], groups: [], memberIds: [] } : "";
    setPath(out, f.k, v);
  }
  return out;
}

/* ---------- Block-Felder ---------- */

const head: FieldDef[] = [
  { k: "eyebrow", t: "text", l: "Überzeile" },
  { k: "title", t: "textarea", l: "Titel", h: "*Wort* = orange, Zeilenumbruch = neue Zeile", max: 300 },
  { k: "text", t: "textarea", l: "Text", max: 2000 },
];
const cta = (n: number): FieldDef[] => [
  { k: `cta${n}Label`, t: "text", l: `Button ${n}: Text` },
  { k: `cta${n}Href`, t: "link", l: `Button ${n}: Link` },
];
const eyebrowTitle: FieldDef[] = [head[0], head[1]];

export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  marquee: "Laufband",
  usp: "Vorteile",
  offers: "Angebote",
  schedule: "Kurskalender",
  pricing: "Preisplan",
  team: "Team",
  reviews: "Bewertungen",
  hours: "Öffnungszeiten",
  stories: "Erfolgsgeschichten",
  instagram: "Instagram",
  blog: "Blog",
  textmedia: "Text + Bild",
  steps: "Ablauf",
  events: "Events",
  leaderboard: "Challenges",
  gift: "Gutschein",
  cta: "Call-to-Action",
  contact: "Kontaktformular",
  shop: "Shop",
  gallery: "Galerie",
};

/** Hinweis je Block, wo verknüpfte Daten gepflegt werden (Sammlungen) */
export const BLOCK_COLLECTION: Partial<Record<BlockType, CollectionName>> = {
  team: "team",
  reviews: "reviews",
  stories: "stories",
  blog: "posts",
  events: "events",
  leaderboard: "challenges",
  shop: "products",
  schedule: "courses",
};

export const BLOCK_FIELDS: Record<BlockType, FieldDef[]> = {
  hero: [...head, { k: "image", t: "image", l: "Bild" }, ...cta(1), ...cta(2), { k: "showStatus", t: "toggle", l: "Live-Öffnungsstatus anzeigen" }],
  marquee: [{ k: "items", t: "strings", l: "Begriffe" }],
  usp: [
    ...head,
    { k: "items", t: "list", l: "Punkte", item: { title: "Neuer Punkt", text: "" }, fields: [{ k: "title", t: "text", l: "Titel" }, { k: "text", t: "textarea", l: "Text" }] },
  ],
  offers: [
    ...head,
    {
      k: "items",
      t: "list",
      l: "Kacheln",
      item: { title: "Neue Leistung", text: "", meta: "", image: "", tag: "", href: "#kontakt" },
      fields: [
        { k: "title", t: "text", l: "Titel" },
        { k: "text", t: "textarea", l: "Text" },
        { k: "meta", t: "text", l: "Preis / Info" },
        { k: "tag", t: "text", l: "Badge" },
        { k: "image", t: "image", l: "Bild" },
        { k: "href", t: "link", l: "Link" },
      ],
    },
    { k: "tags", t: "strings", l: "Filter-Begriffe" },
  ],
  schedule: [
    ...head,
    { k: "days", t: "days", l: "Angezeigte Tage" },
    { k: "category", t: "text", l: "Nur Kategorie (optional)" },
    { k: "formId", t: "text", l: "Buchungs-Formular (ID)", h: "Die Kurse selbst pflegst du unter Kurse & Buchungen." },
  ],
  pricing: [
    ...head,
    { k: "featuresTitle", t: "text", l: "Überschrift der Merkmalsliste", h: "z. B. „Was bekommst du?“" },
    {
      k: "items",
      t: "list",
      l: "Angebote",
      titleKey: "name",
      item: { name: "Neues Angebot", pricePrefix: "", price: "0 €", unit: "", old: "", badge: "", features: "", ctaLabel: "Anfragen", ctaHref: "#kontakt", highlight: false },
      fields: [
        { k: "name", t: "text", l: "Name" },
        { k: "pricePrefix", t: "text", l: "Zusatz vor dem Preis", h: "Freitext, z. B. „ab“" },
        { k: "price", t: "text", l: "Preis", h: "z. B. 125 € oder Auf Anfrage" },
        { k: "unit", t: "text", l: "Einheit / Laufzeit", h: "z. B. / Monat, 3 Monate" },
        { k: "old", t: "text", l: "Alter Preis (durchgestrichen)" },
        { k: "badge", t: "text", l: "Badge" },
        { k: "highlight", t: "toggle", l: "Hervorheben" },
        { k: "features", t: "textarea", l: "Was bekommst du?", h: "Ein Punkt pro Zeile" },
        { k: "ctaLabel", t: "text", l: "Button: Text" },
        { k: "ctaHref", t: "link", l: "Button: Ziel" },
      ],
    },
    { k: "codes", t: "list", l: "Rabattcodes", titleKey: "code", item: { code: "", text: "" }, fields: [{ k: "code", t: "text", l: "Code" }, { k: "text", t: "text", l: "Beschreibung" }] },
    { k: "note", t: "textarea", l: "Hinweis", max: 1000 },
  ],
  team: [...head, { k: "limit", t: "number", l: "Höchstanzahl", min: 1, max: 50, int: true }],
  reviews: [...eyebrowTitle, { k: "link", t: "link", l: "Link zum Google-Profil" }],
  hours: eyebrowTitle,
  stories: [...head, { k: "limit", t: "number", l: "Höchstanzahl", min: 1, max: 50, int: true }],
  instagram: [
    ...eyebrowTitle,
    { k: "link", t: "link", l: "Profil-Link" },
    {
      k: "items",
      t: "list",
      l: "Beiträge",
      titleKey: "caption",
      item: { image: "", caption: "Neuer Beitrag", type: "post", href: "" },
      fields: [
        { k: "image", t: "image", l: "Bild", req: true },
        { k: "caption", t: "text", l: "Titel" },
        { k: "type", t: "select", l: "Typ", o: { post: "Beitrag", reel: "Reel" } },
        { k: "href", t: "link", l: "Link zum Beitrag (leer = Profil)" },
      ],
    },
  ],
  blog: [...eyebrowTitle, { k: "limit", t: "number", l: "Anzahl Beiträge", min: 1, max: 50, int: true }, { k: "tag", t: "text", l: "Nur Tag (optional)" }],
  textmedia: [...head, { k: "image", t: "image", l: "Bild" }, { k: "bullets", t: "strings", l: "Stichpunkte" }, { k: "ctaLabel", t: "text", l: "Button: Text" }, { k: "ctaHref", t: "link", l: "Button: Link" }],
  steps: [
    ...head,
    {
      k: "items",
      t: "list",
      l: "Schritte",
      item: { title: "Neuer Schritt", text: "", meta: "" },
      fields: [{ k: "title", t: "text", l: "Titel" }, { k: "text", t: "textarea", l: "Text" }, { k: "meta", t: "text", l: "Label" }],
    },
  ],
  events: [...head, { k: "type", t: "select", l: "Nur Typ", o: { "": "Alle", Liga: "Liga", Turnier: "Turnier", Event: "Event" } }, { k: "formId", t: "text", l: "Anmelde-Formular (ID)" }],
  leaderboard: [
    ...eyebrowTitle,
    { k: "topN", t: "number", l: "Kacheln: Plätze pro Kachel", min: 1, max: 20, int: true },
    { k: "challengeId", t: "text", l: "Podium / Tabelle: Challenge-ID", h: "„current“ = Challenge des aktuellen Monats" },
  ],
  gift: [{ k: "title", t: "textarea", l: "Titel" }, { k: "text", t: "textarea", l: "Text" }, { k: "image", t: "image", l: "Bild" }, { k: "amounts", t: "strings", l: "Beträge" }, { k: "ctaLabel", t: "text", l: "Button" }],
  cta: [{ k: "title", t: "textarea", l: "Titel" }, { k: "text", t: "textarea", l: "Text" }, { k: "ctaLabel", t: "text", l: "Button: Text" }, { k: "ctaHref", t: "link", l: "Button: Link" }],
  contact: [...head, { k: "formId", t: "text", l: "Formular (ID)" }, { k: "showHours", t: "toggle", l: "Öffnungszeiten zeigen" }, { k: "showInfo", t: "toggle", l: "Adresse & Kontakt zeigen" }],
  shop: [...head, { k: "category", t: "text", l: "Nur Kategorie (optional)" }, { k: "limit", t: "number", l: "Höchstanzahl", min: 1, max: 100, int: true }],
  gallery: [...head, { k: "images", t: "images", l: "Bilder (3)" }],
};

/* ---------- Sammlungen ---------- */

export interface CollectionDef {
  label: string;
  singular: string;
  /** Hinweis über der Liste */
  note?: string;
  idPrefix: string;
  fields: FieldDef[];
  title: (item: Record<string, unknown>) => string;
  subtitle?: (item: Record<string, unknown>) => string;
  sort: (a: Record<string, unknown>, b: Record<string, unknown>) => number;
  newItem: () => Record<string, unknown>;
}

const s = (v: unknown): string => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));
const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const DAY_ORDER = (d: unknown): number => (Number(d) + 6) % 7;
const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const isRestricted = (a: unknown): boolean => {
  const o = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
  return ["tariffs", "groups", "memberIds"].some((k) => Array.isArray(o[k]) && (o[k] as unknown[]).length > 0);
};

const byStr = (key: string, desc = false) => (a: Record<string, unknown>, b: Record<string, unknown>): number => (desc ? s(b[key]).localeCompare(s(a[key])) : s(a[key]).localeCompare(s(b[key])));

export const COLLECTIONS: Record<CollectionName, CollectionDef> = {
  courses: {
    label: "Kursplan",
    singular: "Kurs",
    idPrefix: "co",
    note: "Zeiten und Plätze der Kleingruppen-Kurse. Die Belegung kommt live aus den Buchungen. „Ende“ wird automatisch auf Start + 1 Stunde gesetzt, wenn du es leer lässt.",
    title: (c) => `${WEEKDAYS[Number(c.day)] ?? "?"} ${s(c.start)} · ${s(c.title)}`,
    subtitle: (c) => `${s(c.trainer)} · ${s(c.spots)} Plätze${isRestricted(c.allowed) ? " · beschränkt" : ""}`,
    sort: (a, b) => DAY_ORDER(a.day) - DAY_ORDER(b.day) || s(a.start).localeCompare(s(b.start)),
    newItem: () => ({ day: 1, start: "16:00", end: "17:00", title: "Neuer Kurs", trainer: "", category: "Kraft", spots: 6, booked: 0, allowed: { tariffs: [], groups: [], memberIds: [] } }),
    fields: [
      { k: "title", t: "text", l: "Kursname", req: true },
      { k: "day", t: "select", l: "Tag", num: true, o: { 1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag", 5: "Freitag", 6: "Samstag", 0: "Sonntag" } },
      { k: "start", t: "time", l: "Start", req: true },
      { k: "end", t: "time", l: "Ende" },
      { k: "trainer", t: "text", l: "Trainer*in" },
      { k: "category", t: "text", l: "Kategorie", list: ["Kraft", "Athletik", "Reha", "Golf"] },
      { k: "spots", t: "number", l: "Plätze", min: 0, max: 100, int: true },
      { k: "allowed", t: "allowed", l: "Wer darf buchen?", h: "Alles leer = offen für alle Kunden." },
    ],
  },
  team: {
    label: "Team",
    singular: "Teammitglied",
    idPrefix: "tm",
    title: (c) => s(c.name),
    subtitle: (c) => s(c.role),
    sort: () => 0,
    newItem: () => ({ name: "Neues Mitglied", role: "Trainer*in", bio: "", image: "", fit: "contain", focus: "20%", tags: "", hiring: false }),
    fields: [
      { k: "name", t: "text", l: "Name", req: true },
      { k: "role", t: "text", l: "Rolle" },
      { k: "image", t: "image", l: "Foto" },
      { k: "fit", t: "select", l: "Bildausschnitt", o: { contain: "Ganzes Bild zeigen", cover: "Kachel füllen (wird zugeschnitten)" } },
      { k: "focus", t: "select", l: "Fokus beim Füllen", o: { "0%": "Oben", "20%": "Oberes Drittel", "50%": "Mitte", "100%": "Unten" } },
      { k: "bio", t: "textarea", l: "Bio" },
      { k: "tags", t: "textarea", l: "Schwerpunkte", h: "Eine pro Zeile" },
      { k: "hiring", t: "toggle", l: "Als offene Stelle anzeigen" },
    ],
  },
  reviews: {
    label: "Bewertungen",
    singular: "Bewertung",
    idPrefix: "r",
    title: (c) => `${"★".repeat(Number(c.rating) || 0)} ${s(c.name)}`,
    subtitle: (c) => s(c.text).slice(0, 80),
    sort: byStr("date", true),
    newItem: () => ({ name: "", rating: 5, text: "", date: today(), source: "Google" }),
    fields: [
      { k: "name", t: "text", l: "Name", req: true },
      { k: "rating", t: "select", l: "Sterne", num: true, o: { 5: "5 Sterne", 4: "4 Sterne", 3: "3 Sterne", 2: "2 Sterne", 1: "1 Stern" } },
      { k: "text", t: "textarea", l: "Text", req: true },
      { k: "date", t: "date", l: "Datum" },
      { k: "source", t: "select", l: "Quelle", o: { Google: "Google", Website: "Website", Instagram: "Instagram" } },
    ],
  },
  stories: {
    label: "Erfolgsgeschichten",
    singular: "Erfolgsgeschichte",
    idPrefix: "s",
    title: (c) => s(c.name),
    subtitle: (c) => `${s(c.goal)} · ${s(c.duration)}`,
    sort: () => 0,
    newItem: () => ({ name: "", goal: "", duration: "12 Wochen", quote: "", beforeImg: "", afterImg: "", stats: "" }),
    fields: [
      { k: "name", t: "text", l: "Name, Alter", req: true },
      { k: "goal", t: "text", l: "Ziel" },
      { k: "duration", t: "text", l: "Dauer" },
      { k: "beforeImg", t: "image", l: "Vorher-Foto" },
      { k: "afterImg", t: "image", l: "Nachher-Foto" },
      { k: "quote", t: "textarea", l: "Zitat" },
      { k: "stats", t: "textarea", l: "Ergebnisse", h: "Eine pro Zeile. Nur mit schriftlicher Einwilligung der Person veröffentlichen." },
    ],
  },
  posts: {
    label: "Blog & Ernährung",
    singular: "Beitrag",
    idPrefix: "p",
    note: "Tag „Ernährung“ setzen, damit ein Beitrag als Ernährungsthema erscheint. Entwürfe und Beiträge mit Datum in der Zukunft sind öffentlich nicht sichtbar.",
    title: (c) => `${c.status === "draft" ? "[Entwurf] " : ""}${s(c.title)}`,
    subtitle: (c) => `${s(c.date)} · ${s(c.tags).replace(/\n/g, ", ")}`,
    sort: byStr("date", true),
    newItem: () => ({ slug: "", title: "Neuer Beitrag", excerpt: "", cover: "", date: today(), tags: "", readMin: 3, seoTitle: "", seoDesc: "", body: "", status: "draft" }),
    fields: [
      { k: "title", t: "text", l: "Titel", req: true },
      { k: "slug", t: "text", l: "URL-Slug", h: "Wird zu /blog/slug. Leer lassen = aus dem Titel erzeugen." },
      { k: "status", t: "select", l: "Status", o: { draft: "Entwurf", published: "Veröffentlicht" } },
      { k: "date", t: "date", l: "Veröffentlichungsdatum", req: true },
      { k: "cover", t: "image", l: "Titelbild" },
      { k: "excerpt", t: "textarea", l: "Kurzbeschreibung", max: 400 },
      { k: "body", t: "textarea", l: "Inhalt", h: "## Zwischenüberschrift · **fett** · Leerzeile = neuer Absatz", rows: 12, max: 60_000 },
      { k: "tags", t: "textarea", l: "Tags", h: "Eine pro Zeile, z. B. Ernährung" },
      { k: "readMin", t: "number", l: "Lesezeit (Min.)", min: 1, max: 120, int: true },
      { k: "seoTitle", t: "text", l: "SEO-Titel", max: 70 },
      { k: "seoDesc", t: "textarea", l: "SEO-Beschreibung", max: 170 },
    ],
  },
  events: {
    label: "Golf-Events",
    singular: "Event",
    idPrefix: "e",
    title: (c) => `${s(c.date)} · ${s(c.title)}`,
    subtitle: (c) => `${s(c.type)} · ${s(c.booked)}/${s(c.spots)} angemeldet`,
    sort: byStr("date"),
    newItem: () => ({ type: "Event", title: "Neues Event", date: today(), time: "18:00", desc: "", price: "", spots: 12, booked: 0, image: "" }),
    fields: [
      { k: "title", t: "text", l: "Titel", req: true },
      { k: "type", t: "select", l: "Typ", o: { Liga: "Liga", Turnier: "Turnier", Event: "Event" } },
      { k: "date", t: "date", l: "Datum", req: true },
      { k: "time", t: "time", l: "Uhrzeit" },
      { k: "desc", t: "textarea", l: "Beschreibung" },
      { k: "price", t: "text", l: "Preis" },
      { k: "spots", t: "number", l: "Plätze", min: 0, max: 1000, int: true },
      { k: "booked", t: "number", l: "Angemeldet", min: 0, max: 1000, int: true },
      { k: "image", t: "image", l: "Bild" },
    ],
  },
  challenges: {
    label: "Challenges",
    singular: "Challenge",
    idPrefix: "c",
    title: (c) => `${s(c.icon)} ${s(c.month)} · ${s(c.title)}`,
    subtitle: (c) => `${Array.isArray(c.entries) ? c.entries.length : 0} Ergebnisse`,
    sort: byStr("month", true),
    newItem: () => ({ month: today().slice(0, 7), title: "Neue Challenge", icon: "🏆", category: "", desc: "", metric: "Wert", format: "number", unit: "", sort: "desc", entries: [] }),
    fields: [
      { k: "title", t: "text", l: "Titel", req: true },
      { k: "icon", t: "text", l: "Icon (Emoji)", max: 8 },
      { k: "category", t: "text", l: "Kategorie", list: ["Kraft", "Ausdauer", "Fitness", "Golf", "HYROX"] },
      { k: "month", t: "month", l: "Monat", req: true },
      { k: "desc", t: "textarea", l: "Beschreibung / Regeln" },
      { k: "metric", t: "text", l: "Messgröße", h: "z. B. Gewicht, Zeit, Wdh." },
      { k: "format", t: "select", l: "Wert-Format", o: { number: "Zahl", time: "Zeit (Wert in Sekunden → mm:ss)" } },
      { k: "unit", t: "text", l: "Einheit (bei Zahl, z. B. kg)" },
      { k: "sort", t: "select", l: "Sortierung", o: { desc: "Höher ist besser", asc: "Niedriger ist besser (z. B. Zeit)" } },
      {
        k: "entries",
        t: "list",
        l: "Ergebnisse",
        max: 200,
        titleKey: "name",
        item: { name: "", value: 0 },
        fields: [
          { k: "name", t: "text", l: "Name", req: true },
          { k: "value", t: "number", l: "Wert", h: "Bei Zeit: Sekunden, z. B. 5400 = 1:30:00" },
        ],
      },
    ],
  },
  products: {
    label: "Shop-Produkte",
    singular: "Produkt",
    idPrefix: "p",
    title: (c) => `${s(c.name)}${c.active === false ? " (inaktiv)" : ""}${c.soldOut ? " · ausverkauft" : ""}`,
    subtitle: (c) => `${s(c.category)} · ${Number(c.price ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`,
    sort: byStr("name"),
    newItem: () => ({ name: "Neues Produkt", category: "Protein", price: 0, unit: "", image: "", desc: "", variants: "", badge: "", active: true, soldOut: false }),
    fields: [
      { k: "name", t: "text", l: "Name", req: true },
      { k: "category", t: "text", l: "Kategorie", list: ["Protein", "Supplements", "Equipment"] },
      { k: "price", t: "number", l: "Preis (€)", min: 0, max: 10_000, step: 0.01, h: "Brutto, z. B. 34.9. Preise sehen nur eingeloggte Kunden." },
      { k: "unit", t: "text", l: "Einheit", h: "z. B. 1 kg" },
      { k: "image", t: "image", l: "Bild" },
      { k: "desc", t: "textarea", l: "Beschreibung" },
      { k: "variants", t: "textarea", l: "Varianten", h: "Eine pro Zeile, z. B. Schoko. Leer = keine Auswahl." },
      { k: "badge", t: "text", l: "Badge", h: "z. B. Bestseller" },
      { k: "active", t: "toggle", l: "Im Shop sichtbar" },
      { k: "soldOut", t: "toggle", l: "Ausverkauft" },
    ],
  },
  news: {
    label: "News",
    singular: "News",
    idPrefix: "n",
    note: "Erscheint im Kundenbereich auf der Übersicht, sobald der Veröffentlichungszeitpunkt erreicht ist. Push-Benachrichtigungen folgen mit der App.",
    title: (c) => s(c.title),
    subtitle: (c) => `${s(c.publishAt).replace("T", " ")} · ${c.audience === "group" ? "Gruppe" : c.audience === "members" ? "Einzelne Mitglieder" : "alle"}`,
    sort: byStr("publishAt", true),
    newItem: () => ({ title: "", text: "", image: "", link: "", publishAt: `${today()}T08:00`, audience: "all", groups: [], memberIds: [] }),
    fields: [
      { k: "title", t: "text", l: "Titel", req: true },
      { k: "text", t: "textarea", l: "Text", req: true, max: 2000 },
      { k: "image", t: "image", l: "Bild" },
      { k: "link", t: "link", l: "Link" },
      { k: "publishAt", t: "datetime", l: "Veröffentlichen ab", req: true, h: "Zeitpunkt in der Vergangenheit = sofort sichtbar" },
      { k: "audience", t: "select", l: "Zielgruppe", o: { all: "Alle Kunden", group: "Gruppe(n)", members: "Einzelne Mitglieder" } },
      { k: "groups", t: "strings", l: "Gruppen", h: "Nur bei Zielgruppe „Gruppe“, z. B. golf" },
      { k: "memberIds", t: "memberIds", l: "Mitglieder", h: "Nur bei Zielgruppe „Einzelne Mitglieder“" },
    ],
  },
};

export const COLLECTION_NAMES = Object.keys(COLLECTIONS) as CollectionName[];

export const isCollectionName = (v: string): v is CollectionName => v in COLLECTIONS;

/* ---------- Einstellungen ---------- */

export interface SectionDef {
  label: string;
  /** Pfade relativ zum SiteData-Objekt, z. B. `settings.contact.street` */
  fields: FieldDef[];
}

const recapQuestionFields: FieldDef[] = [
  { k: "id", t: "text", l: "ID (Kennung)", req: true, max: 40, h: "Nur Buchstaben und Ziffern; nicht ändern, wenn schon Antworten existieren" },
  { k: "label", t: "text", l: "Frage", req: true, max: 300 },
  { k: "type", t: "select", l: "Antwortart", o: { yesno: "Ja / Nein", scale: "Skala", text: "Freitext" } },
  { k: "required", t: "toggle", l: "Pflichtfrage" },
  { k: "score", t: "select", l: "Zählt zu Score-Teil", o: { "": "Nur Notiz (zählt nicht)", training: "Training", schlaf: "Schlaf", ernaehrung: "Ernährung", energie: "Energie" } },
  { k: "section", t: "text", l: "Überschrift der Gruppe", h: "Nur beim ersten Eintrag einer Gruppe ausfüllen" },
];

export const SECTIONS: Record<SettingsSection, SectionDef> = {
  studio: {
    label: "Studio",
    fields: [
      { k: "settings.name", t: "text", l: "Name des Studios", req: true },
      { k: "settings.short", t: "text", l: "Kurzname", req: true, max: 12 },
      { k: "settings.tagline", t: "text", l: "Slogan" },
      { k: "settings.contact.street", t: "text", l: "Straße und Hausnummer" },
      { k: "settings.contact.zip", t: "text", l: "PLZ", max: 10 },
      { k: "settings.contact.city", t: "text", l: "Ort" },
      { k: "settings.contact.phone", t: "text", l: "Telefon", max: 30 },
      { k: "settings.contact.email", t: "text", l: "E-Mail" },
      { k: "settings.social.instagram", t: "link", l: "Instagram-Link" },
      { k: "settings.social.facebook", t: "link", l: "Facebook-Link" },
      { k: "settings.social.whatsapp", t: "link", l: "WhatsApp-Kanal-Link" },
      { k: "settings.header.ctaLabel", t: "text", l: "Header-Button: Text" },
      { k: "settings.header.ctaHref", t: "link", l: "Header-Button: Link" },
      { k: "settings.demoNote", t: "text", l: "Demo-Hinweis (Footer)", h: "Leer = kein Hinweis" },
    ],
  },
  hours: { label: "Öffnungszeiten", fields: [{ k: "settings.hours", t: "info", l: "Öffnungszeiten werden im eigenen Editor bearbeitet." }] },
  seo: {
    label: "SEO",
    fields: [
      { k: "settings.seo.title", t: "text", l: "Standard-Titel", max: 70, req: true },
      { k: "settings.seo.description", t: "textarea", l: "Standard-Beschreibung", max: 170 },
      { k: "settings.seo.image", t: "image", l: "Vorschaubild (Social Media)" },
    ],
  },
  forms: {
    label: "Formulare & Empfänger",
    fields: [
      { k: "settings.booking.recipients", t: "text", l: "Empfänger: Buchungs- und Terminanfragen", h: "Mehrere E-Mail-Adressen mit Komma trennen" },
      { k: "settings.shop.recipients", t: "text", l: "Empfänger: Shop-Anfragen" },
      { k: "settings.shop.pickupNote", t: "textarea", l: "Hinweis zur Abholung im Shop", max: 500 },
      {
        k: "forms",
        t: "list",
        l: "Formulare",
        max: 20,
        titleKey: "name",
        item: { id: "", name: "Neues Formular", recipients: "", subjects: [], fields: { phone: true, company: false, employees: false, date: false, message: true }, submitLabel: "Absenden", successText: "Danke! Wir melden uns schnellstmöglich bei dir.", autoReply: "" },
        fields: [
          { k: "id", t: "text", l: "ID", req: true, max: 40, h: "Kennung, auf die Seitenabschnitte verweisen. Bestehende nicht ändern." },
          { k: "name", t: "text", l: "Name (intern)", req: true },
          { k: "recipients", t: "text", l: "E-Mail-Empfänger", h: "Mehrere mit Komma trennen" },
          { k: "subjects", t: "strings", l: "Betreff-Auswahl" },
          { k: "fields.phone", t: "toggle", l: "Feld: Telefon" },
          { k: "fields.company", t: "toggle", l: "Feld: Unternehmen" },
          { k: "fields.employees", t: "toggle", l: "Feld: Mitarbeitende" },
          { k: "fields.date", t: "toggle", l: "Feld: Wunschtermin" },
          { k: "fields.message", t: "toggle", l: "Feld: Nachricht" },
          { k: "submitLabel", t: "text", l: "Button-Text" },
          { k: "successText", t: "textarea", l: "Text nach dem Absenden" },
          { k: "autoReply", t: "textarea", l: "Automatische Antwort (Mail)" },
        ],
      },
    ],
  },
  legal: {
    label: "Rechtstexte",
    fields: [
      { k: "settings.legal.impressum", t: "textarea", l: "Impressum", rows: 14, max: 60_000, h: "## Überschrift · **fett** · Leerzeile = neuer Absatz" },
      { k: "settings.legal.datenschutz", t: "textarea", l: "Datenschutzerklärung", rows: 14, max: 60_000 },
      { k: "settings.legal.agb", t: "textarea", l: "AGB", rows: 14, max: 60_000 },
      { k: "settings.legal.widerruf", t: "textarea", l: "Widerruf", rows: 10, max: 60_000 },
    ],
  },
  booking: {
    label: "Buchungsregeln",
    fields: [
      { k: "settings.booking.cancelHours", t: "number", l: "Stornofrist (Stunden vor Kursbeginn)", min: 0, max: 168, int: true },
      { k: "settings.booking.weeksAhead", t: "number", l: "Buchungsfenster (Wochen im Voraus)", min: 1, max: 52, int: true },
      { k: "settings.booking.maxSeries", t: "number", l: "Maximale Serienlänge (Wochen)", min: 1, max: 52, int: true },
      { k: "settings.booking.waitlistAutoPromote", t: "toggle", l: "Warteliste rückt automatisch nach", h: "Aus: Du schiebst Personen im Wochenplan per Knopf nach." },
    ],
  },
  appointments: {
    label: "Termine (PT & Check-up)",
    fields: [
      { k: "settings.appointments.types.pt.label", t: "text", l: "Bezeichnung Personal Training", req: true },
      { k: "settings.appointments.types.pt.minutes", t: "number", l: "Dauer Personal Training (Minuten)", min: 10, max: 240, int: true },
      { k: "settings.appointments.types.pt.text", t: "text", l: "Beschreibung Personal Training" },
      { k: "settings.appointments.types.checkup.label", t: "text", l: "Bezeichnung Check-up", req: true },
      { k: "settings.appointments.types.checkup.minutes", t: "number", l: "Dauer Check-up (Minuten)", min: 10, max: 240, int: true },
      { k: "settings.appointments.types.checkup.text", t: "text", l: "Beschreibung Check-up" },
      { k: "settings.appointments.minLeadHours", t: "number", l: "Frühester Wunschtermin (Stunden ab jetzt)", min: 0, max: 336, int: true },
      { k: "settings.appointments.daysAhead", t: "number", l: "Wunschtermine höchstens (Tage im Voraus)", min: 1, max: 365, int: true },
    ],
  },
  recap: {
    label: "Wochenrecap",
    fields: [
      { k: "settings.recap.maxSessions", t: "number", l: "Gewertete Einheiten pro Woche (höchstens)", min: 1, max: 14, int: true },
      { k: "settings.recap.scale.min", t: "number", l: "Skala: kleinster Wert", min: 0, max: 5, int: true },
      { k: "settings.recap.scale.max", t: "number", l: "Skala: größter Wert", min: 2, max: 20, int: true },
      { k: "settings.recap.scale.skip", t: "numbers", l: "Skala: ausgelassene Werte", h: "z. B. 7 (Skala 1–10 ohne 7)" },
      { k: "settings.recap.weights.training", t: "number", l: "Gewicht Training", min: 0, max: 10, step: 0.5 },
      { k: "settings.recap.weights.schlaf", t: "number", l: "Gewicht Schlaf", min: 0, max: 10, step: 0.5 },
      { k: "settings.recap.weights.ernaehrung", t: "number", l: "Gewicht Ernährung", min: 0, max: 10, step: 0.5 },
      { k: "settings.recap.weights.energie", t: "number", l: "Gewicht Energie", min: 0, max: 10, step: 0.5 },
      { k: "settings.recap.questions", t: "list", l: "Fragen (Reihenfolge = Reihenfolge in der Liste)", max: 40, titleKey: "label", item: { id: "", type: "yesno", label: "", required: false, score: "", section: "" }, fields: recapQuestionFields },
    ],
  },
  checkup: {
    label: "Check-up",
    fields: [
      {
        k: "settings.checkup.points",
        t: "list",
        l: "Punkte der Überkopfkniebeuge",
        max: 30,
        titleKey: "label",
        item: { id: "", label: "Neuer Punkt", group: "" },
        fields: [
          { k: "id", t: "text", l: "ID", req: true, max: 30, h: "Nicht ändern, wenn schon Befunde existieren" },
          { k: "label", t: "text", l: "Bezeichnung", req: true },
          { k: "group", t: "text", l: "Gruppe", h: "z. B. Fußgelenk" },
        ],
      },
    ],
  },
};

export const SECTION_KEYS = Object.keys(SECTIONS) as SettingsSection[];
export const isSection = (v: string): v is SettingsSection => v in SECTIONS;

/* ---------- Anzeigehilfen für Seiten im Admin ---------- */

export const PAGE_TITLES: Record<string, string> = {};

/** Kunden: Tarife (für Buchungsbeschränkungen) */
export const TARIFFS: Record<string, string> = {
  kleingruppe: "Kleingruppe",
  pt: "Personal Training",
  testphase: "Testphase",
};
