/** Persistierter App-Zustand (zustand + AsyncStorage). Alle Datenzugriffe laufen über `api`. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Booking, MemberState, Notif, PushPrefs, RecapInput, StudioContent, SurveyAnswer } from '@/data/types';
import { dS, rel, TISO, uid } from '@/lib/format';
import { api, type ServerEvent, type SlotCount } from '@/services';
import type { ThemeMode } from '@/theme/tokens';

import { emptyPt, toast, useUi } from './ui';

interface AppState {
  hydrated: boolean;
  loggedIn: boolean;
  themeMode: ThemeMode;
  member: MemberState | null;
  content: StudioContent | null;
  /** Belegung je `${courseId}|${date}` */
  occupancy: Record<string, SlotCount>;

  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (m: ThemeMode) => void;
  /** Mitgliedsdaten ändern (immutabel) */
  patch: (fn: (m: MemberState) => Partial<MemberState>) => void;

  bookCourse: (courseId: string, date: string, persons: number, weeks: number) => Promise<number>;
  joinWaitlist: (courseId: string, date: string, position: number) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  cancelSeries: (id: string) => Promise<void>;
  acceptProposal: (id: string) => Promise<void>;
  declineProposal: (id: string) => Promise<Booking | undefined>;
  requestAppointment: (type: 'pt' | 'checkup') => Promise<void>;
  submitRecap: (r: RecapInput) => Promise<void>;
  submitSurvey: (a: SurveyAnswer) => Promise<void>;
  addToCart: (pid: string, v: string) => void;
  changeQty: (i: number, d: number) => void;
  sendShopRequest: () => Promise<void>;
  reorder: (pid: string) => void;
  readNotif: (id: string) => void;
  readAll: () => void;
  readByTarget: (go: string) => void;
  togglePush: (k: keyof PushPrefs) => void;
  toggleChallenge: () => void;
  handleServerEvent: (e: ServerEvent) => void;
  /** Push-Banner zeigen und als Benachrichtigung ablegen */
  notify: (title: string, text: string, target: string | undefined, k: Notif['k']) => void;
  resetDemo: () => void;
}

const haptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const m = () => get().member!;
      const patch: AppState['patch'] = (fn) => {
        const cur = get().member;
        if (cur) set({ member: { ...cur, ...fn(cur) } });
      };
      const setBookings = (fn: (b: Booking[]) => Booking[]) => patch((x) => ({ bookings: fn(x.bookings) }));

      return {
        hydrated: false,
        loggedIn: false,
        themeMode: 'dark',
        member: null,
        content: null,
        occupancy: {},

        async init() {
          const [content, counts] = await Promise.all([api.getContent(), api.getSlotCounts(TISO, 42)]);
          const occupancy: Record<string, SlotCount> = {};
          counts.forEach((c) => (occupancy[`${c.courseId}|${c.date}`] = c));
          set({ content, occupancy });
        },

        async login(email, password) {
          const member = await api.login(email, password);
          set({ member, loggedIn: true });
        },
        async logout() {
          await api.logout();
          useUi.setState({ sheet: null, gateResult: false });
          set({ loggedIn: false });
        },
        setTheme: (themeMode) => set({ themeMode }),
        patch,

        async bookCourse(courseId, date, persons, weeks) {
          const created = await api.bookCourse({ courseId, date, persons, weeks, existing: m().bookings });
          setBookings((b) => [...b, ...created]);
          haptic();
          return created.length;
        },
        async joinWaitlist(courseId, date, position) {
          const b = await api.joinWaitlist(courseId, date, position);
          setBookings((x) => [...x, b]);
        },
        async cancel(id) {
          await api.cancel(id);
          setBookings((x) => x.filter((b) => b.id !== id));
        },
        async cancelSeries(id) {
          const b = m().bookings.find((x) => x.id === id);
          if (!b?.sid) return;
          await api.cancelSeries(b.sid, b.date);
          setBookings((x) => x.filter((y) => !(y.sid === b.sid && y.date >= b.date)));
        },
        async acceptProposal(id) {
          const b = m().bookings.find((x) => x.id === id);
          if (!b) return;
          const next = await api.acceptProposal(b);
          setBookings((x) => x.map((y) => (y.id === id ? next : y)));
          get().readByTarget('proposal');
          haptic();
        },
        async declineProposal(id) {
          const b = m().bookings.find((x) => x.id === id);
          await api.declineProposal(id);
          setBookings((x) => x.filter((y) => y.id !== id));
          get().readByTarget('proposal');
          return b;
        },
        async requestAppointment(type) {
          const p = useUi.getState().pt;
          if (!p.date || !p.time) return;
          const b = await api.requestAppointment({ type, coach: p.coach, date: p.date, time: p.time, persons: p.persons, note: p.note });
          setBookings((x) => [...x, b]);
          useUi.setState({ pt: emptyPt() });
          toast(`Anfrage an ${p.coach} gesendet`);
        },
        async submitRecap(r) {
          const score = await api.submitRecap(r, m().user.weekDone);
          patch((x) => ({ scores: [...x.scores.filter((s) => s.kw !== score.kw), score], recapDone: true, points: x.points + 30 }));
        },
        async submitSurvey(a) {
          await api.submitSurvey('times2027', a);
          patch(() => ({ survey: a }));
        },
        addToCart(pid, v) {
          patch((x) => {
            const i = x.cart.findIndex((c) => c.pid === pid && c.v === v);
            if (i < 0) return { cart: [...x.cart, { pid, v, qty: 1 }] };
            return { cart: x.cart.map((c, k) => (k === i ? { ...c, qty: c.qty + 1 } : c)) };
          });
        },
        changeQty(i, d) {
          patch((x) => ({ cart: x.cart.map((c, k) => (k === i ? { ...c, qty: c.qty + d } : c)).filter((c) => c.qty > 0) }));
        },
        async sendShopRequest() {
          const req = await api.sendShopRequest(m().cart, get().content!);
          patch((x) => ({ requests: [req, ...x.requests], cart: [] }));
        },
        reorder(pid) {
          const p = get().content!.products.find((x) => x.id === pid);
          get().addToCart(pid, p?.variants?.[0] ?? '');
        },
        readNotif: (id) => patch((x) => ({ notifs: x.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        readAll: () => patch((x) => ({ notifs: x.notifs.map((n) => ({ ...n, read: true })) })),
        readByTarget: (go) => patch((x) => ({ notifs: x.notifs.map((n) => (n.go === go ? { ...n, read: true } : n)) })),
        togglePush: (k) => patch((x) => ({ push: { ...x.push, [k]: !x.push[k] } })),
        toggleChallenge() {
          patch((x) => ({ challengeJoin: !x.challengeJoin }));
          if (m().challengeJoin) toast('Du bist beim Ruderduell dabei');
        },

        notify(title, text, target, k) {
          useUi.setState({ push: { id: uid(), title, text, target } });
          patch((x) => ({
            notifs: [{ id: uid(), k, i: k === 'news' ? 'mega' : 'bell', t: title, x: text, at: 'gerade eben', go: target, read: false }, ...x.notifs],
          }));
        },

        handleServerEvent(e) {
          const b = get().member?.bookings.find((x) => x.id === e.bookingId);
          if (!b) return;
          if (e.type === 'waitlistPromoted' && b.status === 'waitlist') {
            setBookings((x) => x.map((y) => (y.id === b.id ? { ...y, status: 'confirmed', wait: undefined } : y)));
            haptic();
            get().notify(
              'Du bist nachgerückt!',
              `Jemand hat abgesagt: ${b.title} ${rel(b.date) === 'Heute' ? 'heute' : dS(b.date)} um ${b.time} ist jetzt für dich gebucht.`,
              'mybookings',
              'me',
            );
          }
          if (e.type === 'appointmentConfirmed' && b.status === 'requested') {
            setBookings((x) => x.map((y) => (y.id === b.id ? { ...y, status: 'confirmed' } : y)));
            haptic();
            get().notify(`${b.coach} hat bestätigt`, `${b.title} am ${dS(b.date)} um ${b.time} ist fix.`, 'mybookings', 'me');
          }
        },

        resetDemo() {
          useUi.setState({ sheet: null, gateResult: false });
          set({ loggedIn: false, member: null });
        },
      };
    },
    {
      name: 'mpt-app',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ loggedIn: s.loggedIn, themeMode: s.themeMode, member: s.member }),
      onRehydrateStorage: () => (state) => {
        useApp.setState({ hydrated: true, loggedIn: !!(state?.loggedIn && state.member) });
      },
    },
  ),
);

/** Mitgliedsdaten im eingeloggten Bereich (dort immer vorhanden). */
export const useMember = () => useApp((s) => s.member!);
export const useContent = () => useApp((s) => s.content!);
