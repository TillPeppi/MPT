/** Mock-Implementierung des Studio-Backends mit den Demo-Daten aus der Klickdemo. */
import { CONTENT, SEED } from '@/data/demo';
import type { Booking, ShopRequest } from '@/data/types';
import { addD, iso, p2, parse, plusHour, TODAY, uid } from '@/lib/format';

import type { MptApi, ServerEvent, SlotCount } from './api';

const listeners = new Set<(e: ServerEvent) => void>();
const emit = (e: ServerEvent) => listeners.forEach((l) => l(e));
const wait = <T,>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));

/** Wie lange der Mock braucht, bis jemand absagt bzw. der Coach bestätigt (Demo). */
export const MOCK_DELAYS = { promote: 7000, confirm: 6000 };

/** Belegung wie slotsFor() in der Demo: deterministisch aus Datum und Startzeit. */
function countFor(courseId: string, date: string): SlotCount {
  const c = CONTENT.courses.find((x) => x.id === courseId)!;
  const d = parse(date);
  const wk = Math.floor((d.getTime() - new Date(2026, 10, 23).getTime()) / (7 * 864e5));
  let n = c.base + (wk <= 0 ? 0 : ((d.getDate() + parseInt(c.start, 10)) % 3) - 1);
  n = Math.max(0, Math.min(6, n));
  return { courseId, date, booked: n, waiting: n >= 6 ? 1 + (d.getDate() % 3) : 0 };
}

export const mockApi: MptApi = {
  login: async () => wait(SEED(), 350),
  logout: async () => wait(undefined),
  getContent: async () => CONTENT,

  async getSlotCounts(from, days) {
    const out: SlotCount[] = [];
    for (let i = 0; i < days; i++) {
      const d = addD(parse(from), i);
      const ds = iso(d);
      CONTENT.courses.filter((c) => c.day === d.getDay()).forEach((c) => out.push(countFor(c.id, ds)));
    }
    return out;
  },

  async bookCourse({ courseId, date, persons, weeks, existing }) {
    const co = CONTENT.courses.find((c) => c.id === courseId)!;
    const sid = weeks > 1 ? uid() : null;
    const out: Booking[] = [];
    for (let i = 0; i < weeks; i++) {
      const ds = iso(addD(parse(date), 7 * i));
      if (existing.some((b) => b.date === ds && b.time === co.start)) continue;
      out.push({ id: uid(), type: 'group', date: ds, time: co.start, end: co.end, title: co.title, coach: co.coach, status: 'confirmed', sid, persons });
    }
    return wait(out);
  },

  async joinWaitlist(courseId, date, position) {
    const co = CONTENT.courses.find((c) => c.id === courseId)!;
    const b: Booking = { id: uid(), type: 'group', date, time: co.start, end: co.end, title: co.title, coach: co.coach, status: 'waitlist', wait: position, persons: 1 };
    // Demo: nach ein paar Sekunden sagt jemand ab und du rückst automatisch nach.
    setTimeout(() => emit({ type: 'waitlistPromoted', bookingId: b.id }), MOCK_DELAYS.promote);
    return wait(b);
  },

  cancel: async () => wait(undefined),
  cancelSeries: async () => wait(undefined),

  async requestAppointment(input) {
    const b: Booking = {
      id: uid(),
      type: input.type,
      date: input.date,
      time: input.time,
      end: input.type === 'pt' ? `${p2(+input.time.slice(0, 2) + 1)}:00` : `${input.time.slice(0, 2)}:45`,
      title: input.type === 'pt' ? 'Personal Training' : 'Checkup',
      coach: input.coach,
      status: 'requested',
      persons: input.type === 'pt' ? input.persons : 1,
      note: input.note,
    };
    // Demo: der Coach bestätigt nach ein paar Sekunden.
    setTimeout(() => emit({ type: 'appointmentConfirmed', bookingId: b.id }), MOCK_DELAYS.confirm);
    return wait(b);
  },

  async acceptProposal(b) {
    const time = b.prop ?? b.time;
    const next: Booking = { ...b, time, end: plusHour(time), status: 'confirmed' };
    delete next.prop;
    return wait(next);
  },
  declineProposal: async () => wait(undefined),

  async submitRecap(r, weekDone) {
    const yes = r.yn.filter(Boolean).length;
    const sl = Math.round(r.sq * 0.7 + (yes / 3) * 10 * 0.3);
    const tr = Math.round(r.tr * 0.6 + (Math.min(3, weekDone) / 3) * 10 * 0.4);
    const s = Math.round(((sl + r.en + r.fo + tr) / 4) * 10);
    return wait({ kw: 48, s, t: tr, sl, n: r.fo, e: r.en }, 250);
  },

  submitSurvey: async () => wait(undefined, 250),

  async sendShopRequest(cart, content) {
    const P = (id: string) => content.products.find((p) => p.id === id)!;
    const req: ShopRequest = {
      id: uid(),
      date: `${p2(TODAY.getDate())}.${p2(TODAY.getMonth() + 1)}.`,
      items: cart.map((c) => [P(c.pid).name + (c.v ? ' · ' + c.v : ''), c.qty, P(c.pid).price]),
      status: 'Angefragt',
    };
    return wait(req, 250);
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
