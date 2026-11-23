/** Abgeleitete Werte (entspricht dem Block „Abgeleitete Werte" der Demo). */
import type { Booking, Exercise, IconName, MemberState, Slot, StudioContent } from '@/data/types';
import type { SlotCount } from '@/services';

import { addD, diffD, dS, iso, kw, mmss, num, parse, TISO, TODAY } from './format';

export const upcoming = (m: MemberState) =>
  m.bookings.filter((b) => diffD(b.date) >= 0).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
export const nextConfirmed = (m: MemberState) => upcoming(m).find((b) => b.status === 'confirmed');
export const unread = (m: MemberState) => m.notifs.filter((n) => !n.read).length;
export const cartCount = (m: MemberState) => m.cart.reduce((a, c) => a + c.qty, 0);
export const lastScore = (m: MemberState) => m.scores[m.scores.length - 1];
export const prevScore = (m: MemberState) => m.scores[m.scores.length - 2];
export const scoreDelta = (m: MemberState) => {
  const d = lastScore(m).s - prevScore(m).s;
  return (d >= 0 ? '+' : '') + d;
};
export const fmtPoints = (p: number) => p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const LEVELS: [number, string][] = [[0, 'Starter'], [250, 'Rookie'], [600, 'Aktiv'], [1000, 'Athlet'], [2000, 'Performer'], [3500, 'Legende']];
export function level(points: number) {
  let i = 0;
  LEVELS.forEach((l, k) => {
    if (points >= l[0]) i = k;
  });
  const nx = LEVELS[i + 1];
  return { n: i + 1, name: LEVELS[i][1], from: LEVELS[i][0], to: nx ? nx[0] : LEVELS[i][0] + 1, next: nx ? nx[1] : '' };
}
export const levelProgress = (points: number) => {
  const L = level(points);
  return (points - L.from) / (L.to - L.from);
};

/** Kurse eines Tages mit Belegung und eigener Buchung. */
export function slotsFor(ds: string, m: MemberState, content: StudioContent, occ: Record<string, SlotCount>): Slot[] {
  const d = parse(ds);
  return content.courses
    .filter((c) => c.day === d.getDay())
    .map((c) => {
      const o = occ[`${c.id}|${ds}`];
      let n = o?.booked ?? c.base;
      const mine = m.bookings.find((b) => b.type === 'group' && b.date === ds && b.time === c.start);
      if (mine && mine.status === 'confirmed') n = Math.min(6, n + mine.persons);
      const full = n >= 6;
      return { ...c, date: ds, n, full, wait: full ? (o?.waiting ?? 1) : 0, mine };
    });
}
export const dayHasMine = (m: MemberState, ds: string) => m.bookings.some((b) => b.date === ds);

export const typeName = { group: 'Kleingruppe', pt: 'Personal Training', checkup: 'Checkup' } as const;
export const statusText = (b: Booking) =>
  b.status === 'confirmed' ? 'Bestätigt' : b.status === 'waitlist' ? `Warteliste · ${b.wait}` : b.status === 'requested' ? 'Angefragt' : 'Neuer Vorschlag';

export interface OpenUnit {
  i: IconName;
  n: number;
  t: string;
  s: string;
  /** Sprungziel oder Aktion */
  kind: 'bookDay' | 'go' | 'booking';
  v: string;
  cta: string;
}

/** „Noch offen" auf Home (openUnits() der Demo). */
export function openUnits(m: MemberState): OpenUnit[] {
  const mon = addD(TODAY, -((TODAY.getDay() + 6) % 7));
  const rng = (o: number): [string, string] => [iso(addD(mon, o * 7)), iso(addD(mon, o * 7 + 6))];
  const inW = (x: Booking, [a, b]: [string, string]) => x.date >= a && x.date <= b;
  const grp = (x: Booking) => x.type === 'group' && x.status === 'confirmed';
  const open0 = Math.max(0, 3 - m.user.weekDone - m.bookings.filter((x) => grp(x) && inW(x, rng(0)) && diffD(x.date) >= 0).length);
  const open1 = Math.max(0, 3 - m.bookings.filter((x) => grp(x) && inW(x, rng(1))).length);
  const t: OpenUnit[] = [];
  if (open0) t.push({ i: 'users', n: open0, t: open0 === 1 ? 'Einheit offen' : 'Einheiten offen', s: 'diese Woche', kind: 'bookDay', v: TISO, cta: 'Buchen' });
  if (open1)
    t.push({ i: 'users', n: open1, t: open1 === 1 ? 'Einheit offen' : 'Einheiten offen', s: `nächste Woche · KW ${kw(addD(mon, 7))}`, kind: 'bookDay', v: iso(addD(mon, 7)), cta: 'Buchen' });
  if (!m.bookings.some((x) => x.type === 'checkup' && diffD(x.date) >= 0))
    t.push({ i: 'pulse', n: 1, t: 'Checkup offen', s: 'letzter am 26.10.', kind: 'go', v: 'book-checkup', cta: 'Anfragen' });
  const pr = m.bookings.find((x) => x.status === 'proposed');
  if (pr) t.push({ i: 'user', n: 1, t: 'PT-Termin offen', s: `Vorschlag ${dS(pr.date)}, ${pr.prop}`, kind: 'booking', v: pr.id, cta: 'Bestätigen' });
  return t;
}

/** Pflicht-Wochenrecap noch offen? (gateNeeded() der Demo) */
export const gateNeeded = (m: MemberState | null) => !!m && !m.recapDone;

export const fmtEx = (e: Exercise, v: number) => (e.u === 'time' ? mmss(v) + ' min' : num(v) + ' ' + e.u);
