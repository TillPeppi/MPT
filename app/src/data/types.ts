/** Domänentypen der Kunden-App. Spiegeln die Demo-Daten aus designs/app-demo.html. */

export type BookingType = 'group' | 'pt' | 'checkup';
export type BookingStatus = 'confirmed' | 'waitlist' | 'requested' | 'proposed';

export interface Course {
  id: string;
  /** 0 = Sonntag … 6 = Samstag */
  day: number;
  start: string;
  end: string;
  title: string;
  coach: string;
  /** Grundbelegung (Demo) */
  base: number;
  /** Kurs nur für bestimmte Teilnehmer:innen */
  restricted?: string;
}

export interface Slot extends Course {
  date: string;
  /** belegte Plätze, max. 6 */
  n: number;
  full: boolean;
  /** Personen auf der Warteliste */
  wait: number;
  mine?: Booking;
}

export interface Booking {
  id: string;
  type: BookingType;
  date: string;
  time: string;
  end: string;
  title: string;
  coach: string;
  status: BookingStatus;
  persons: number;
  /** Serien-ID */
  sid?: string | null;
  /** Platz auf der Warteliste */
  wait?: number;
  /** Zeitvorschlag des Coaches */
  prop?: string;
  note?: string;
}

export interface HistoryEntry {
  date: string;
  time: string;
  title: string;
  coach: string;
  ok: boolean;
}

export interface WeekScore {
  kw: number;
  /** Gesamtscore 0–100 */
  s: number;
  t: number;
  sl: number;
  n: number;
  e: number;
}

export interface Product {
  id: string;
  name: string;
  cat: 'Protein' | 'Supplements' | 'Equipment';
  price: number;
  unit: string;
  variants?: string[];
  badge?: string;
}

export interface CartItem {
  pid: string;
  v: string;
  qty: number;
}

export interface ShopRequest {
  id: string;
  date: string;
  /** [Name, Menge, Einzelpreis] */
  items: [string, number, number][];
  status: 'Angefragt' | 'Abgeholt' | 'Bereit';
}

export interface Supplement {
  pid: string | null;
  name: string;
  when: string;
  days: number;
  of: number;
}

export type IconName =
  | 'home' | 'chart' | 'cal' | 'more' | 'bell' | 'flame' | 'plus' | 'minus' | 'check' | 'x'
  | 'chev' | 'back' | 'clock' | 'users' | 'repeat' | 'trophy' | 'bag' | 'leaf' | 'chat' | 'poll'
  | 'pulse' | 'user' | 'moon' | 'bolt' | 'play' | 'pill' | 'lock' | 'mega' | 'cart' | 'gear'
  | 'out' | 'phone' | 'alert' | 'info' | 'cam' | 'book' | 'star' | 'qr' | 'target' | 'sun';

export interface Notif {
  id: string;
  k: 'me' | 'news';
  i: IconName;
  t: string;
  x: string;
  at: string;
  /** Sprungziel (siehe lib/nav.ts) */
  go?: string;
  read: boolean;
}

export interface PushPrefs {
  training: boolean;
  streak: boolean;
  measure: boolean;
  news: boolean;
  supps: boolean;
  booking: boolean;
}

export interface SurveyAnswer {
  times: string[];
  neu: string;
  text: string;
}

export interface User {
  first: string;
  name: string;
  ini: string;
  mail: string;
  phone: string;
  birth: string;
  since: string;
  contract: string;
  coach: string;
  goal: string;
  units: number;
  monthUnits: number;
  streak: number;
  weekDone: number;
}

export interface Metric {
  l: string;
  u: string;
  v: number[];
  /** 1 = steigend ist gut, -1 = fallend ist gut */
  good: 1 | -1;
}

export type MetricKey = 'kfa' | 'weight' | 'lean' | 'skin';

export interface BodyData {
  dates: string[];
  metrics: Record<MetricKey, Metric>;
}

export interface Exercise {
  id: string;
  n: string;
  p: string;
  u: 'kg' | 'Wdh' | 'time' | 'kcal' | 'm';
  v: number[];
  lower?: boolean;
}

export interface Joint {
  n: string;
  items: [string, boolean][];
  note: string;
}

export interface CheckupData {
  date: string;
  prev: number;
  joints: Joint[];
}

export interface NewsItem {
  id: string;
  date: string;
  tag: string;
  t: string;
  img?: ImageKey;
  x: string;
}

export interface Article {
  id: string;
  tag: 'Wissen' | 'Tipps';
  min: number;
  t: string;
  img?: ImageKey;
  x: string[];
}

export interface Badge {
  n: string;
  i: IconName;
  got: boolean;
  d: string;
}

/** Eintrag der Bestenliste: Name, Wert (Sekunden, kg oder Wiederholungen), eigener Eintrag */
export type RankEntry = [name: string, value: number, me?: boolean];

/** Monatliche Leistungs-Challenge (z. B. Hyrox Sim), Werte trägt der Coach ein. */
export interface PerfChallenge {
  id: string;
  month: string;
  title: string;
  sub: string;
  daysLeft: number;
  ends: string;
  participants: number;
  metric: 'time' | 'kg' | 'reps';
  /** true = kleiner ist besser (Zeit) */
  lowerIsBetter: boolean;
  reward: string;
  /** sortiert, bester zuerst; nur ein Ausschnitt der Teilnehmenden */
  board: RankEntry[];
}

export type ImageKey =
  | 'studio-gym' | 'trainer-bench' | 'golf-simulator' | 'studio-bikes' | 'group' | 'coach-marc-luca' | 'giftcard';

/** Persistierter Kundenzustand (entspricht SEED() der Demo). */
export interface MemberState {
  user: User;
  points: number;
  bookings: Booking[];
  history: HistoryEntry[];
  scores: WeekScore[];
  recapDone: boolean;
  survey: SurveyAnswer | null;
  cart: CartItem[];
  requests: ShopRequest[];
  supps: Supplement[];
  notifs: Notif[];
  push: PushPrefs;
  challengeJoin: boolean;
  inactive: boolean;
}

/** Statische Studio-Inhalte. */
export interface StudioContent {
  courses: Course[];
  products: Product[];
  body: BodyData;
  exercises: Exercise[];
  checkup: CheckupData;
  news: NewsItem[];
  articles: Article[];
  badges: Badge[];
  challenge: PerfChallenge;
  coaches: string[];
}

export interface RecapInput {
  yn: boolean[];
  sq: number;
  en: number;
  fo: number;
  tr: number;
  note: string;
}
