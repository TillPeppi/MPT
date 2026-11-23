/* Reine Format-Helfer (laufen auf Server und Client). */

export const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;
export const DAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
export const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"] as const;
export const MONTHS_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember",
] as const;

export const pad = (n: number): string => String(n).padStart(2, "0");

export const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const toMin = (t: string): number => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Zeilenweise Listen (Features, Tags, Stats) → Array ohne Leerzeilen */
export const lines = (s: string | undefined | null): string[] =>
  String(s ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

export function fmtDate(s: string): string {
  const d = new Date(`${s}T12:00`);
  return Number.isNaN(d.getTime()) ? s : `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const shortDate = (d: Date): string => `${d.getDate()}. ${MONTHS[d.getMonth()]}`;

export function monthLabel(m: string): string {
  const [y, mo] = String(m).split("-").map(Number);
  return mo ? `${MONTHS_LONG[mo - 1]} ${y}` : "";
}

export const mondayOf = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const endOf = (c: { start: string; end?: string }): string =>
  c.end || `${pad((Math.floor(toMin(c.start) / 60) + 1) % 24)}:${pad(toMin(c.start) % 60)}`;

export function formatValue(c: { format?: string; unit?: string }, v: number): string {
  if (c.format === "time") {
    const t = Math.round(Number(v) || 0);
    const h = Math.floor(t / 3600);
    const m = Math.floor(t / 60) % 60;
    const s = t % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  return `${Number(v).toLocaleString("de-DE")}${c.unit ? ` ${c.unit}` : ""}`;
}

export const eur = (n: number, currency = "EUR"): string =>
  Number(n || 0).toLocaleString("de-DE", { style: "currency", currency });

/** „Di, 24. Nov“ */
export function weekdayDate(s: string): string {
  const d = new Date(`${s}T12:00`);
  return Number.isNaN(d.getTime()) ? s : `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** Zahl mit deutschem Komma, z. B. 82,4 */
export const num = (n: number, digits = 1): string => n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: digits });
