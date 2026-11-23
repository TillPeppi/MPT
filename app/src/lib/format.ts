/** Datums- und Zahlenhilfen. Demo-Datum: Mittwoch, 25.11.2026. */
export const TODAY = new Date(2026, 10, 25);
export const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const p2 = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addD = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const TISO = iso(TODAY);
/** „Mi 25.11." */
export const dS = (s: string) => {
  const d = parse(s);
  return `${WD[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
};
export const diffD = (s: string) => Math.round((parse(s).getTime() - parse(TISO).getTime()) / 864e5);
/** Heute / Morgen / Gestern / „Mi 25.11." */
export const rel = (s: string) => {
  const k = diffD(s);
  return k === 0 ? 'Heute' : k === 1 ? 'Morgen' : k === -1 ? 'Gestern' : dS(s);
};
/** „Mittwoch, 25. November" */
export const longDate = (d: Date) => `${WDL[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`;

/** Deutsche Zahl, max. d Nachkommastellen. Hermes-sicher ohne Intl-Abhängigkeit. */
export const num = (v: number, d = 1) => {
  const f = Math.pow(10, d);
  const r = Math.round(v * f) / f;
  const neg = r < 0;
  const [int, dec] = Math.abs(r).toString().split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + grouped + (dec ? ',' + dec : '');
};
export const eur = (v: number) => {
  const [int, dec] = v.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`;
};
export const mmss = (s: number) => `${Math.floor(s / 60)}:${p2(s % 60)}`;
export const uid = () => 'x' + Math.random().toString(36).slice(2, 8);

/** ISO-Kalenderwoche */
export function kw(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 864e5 + 1) / 7);
}

export const plusHour = (t: string) => `${p2(+t.slice(0, 2) + 1)}${t.slice(2)}`;
