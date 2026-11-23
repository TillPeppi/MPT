/* Datenmodell der öffentlichen Website. Spiegelt data/site.json (und später die Go-API). */

import type { Allowed, AppointmentType, RecapConfig } from "./member";
import type { CheckupPoint, LegalTexts, NewsItem } from "./admin";

export interface ContactInfo {
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
}

export type OpeningRange = [from: string, to: string];

export interface HoursException {
  date: string; // YYYY-MM-DD
  closed?: boolean;
  from?: string;
  to?: string;
  note?: string;
}

export interface Hours {
  /** Schlüssel 0 (Sonntag) bis 6 (Samstag) */
  week: Record<string, OpeningRange[]>;
  note?: string;
  exceptions?: HoursException[];
}

export interface SiteSettings {
  name: string;
  short: string;
  tagline: string;
  accent: string;
  demoNote?: string;
  contact: ContactInfo;
  social: { instagram?: string; facebook?: string; whatsapp?: string };
  header: { ctaLabel?: string; ctaHref?: string; memberLabel?: string };
  hours: Hours;
  seo: { title: string; description: string; image?: string };
  booking: {
    weeksAhead?: number;
    maxSeries?: number;
    cancelHours?: number;
    recipients?: string;
    /** Warteliste rückt automatisch nach (Standard: an) */
    waitlistAutoPromote?: boolean;
  };
  shop: { pickupNote?: string; currency?: string; recipients?: string };
  /** Messpunkte für Hautfalten (mm) und Umfänge (cm) */
  measure: { skinfolds: MeasurePoint[]; girths: MeasurePoint[] };
  /** PT- und Check-up-Termine (B-1/B-2) */
  appointments: {
    types: Record<AppointmentType, { label: string; minutes: number; text?: string }>;
    /** frühester Wunschtermin: Stunden ab jetzt */
    minLeadHours: number;
    /** Wunschtermine nur innerhalb dieser Tage */
    daysAhead: number;
  };
  /** Wochenrecap: Fragen, Skala, Score-Gewichte */
  recap: RecapConfig;
  /** Rechtstexte (Impressum, Datenschutz, AGB, Widerruf) */
  legal: LegalTexts;
  /** Check-up: Punkte des Überkopfkniebeuge-Screens (Bezeichnungen konfigurierbar) */
  checkup: { points: CheckupPoint[] };
}

export interface MeasurePoint {
  key: string;
  label: string;
}

export interface FormDef {
  id: string;
  name: string;
  subjects?: string[];
  fields: {
    phone?: boolean;
    company?: boolean;
    employees?: boolean;
    date?: boolean;
    message?: boolean;
  };
  submitLabel?: string;
  successText?: string;
  recipients?: string;
  autoReply?: string;
}

/* ---------- Collections ---------- */

export interface Course {
  id: string;
  day: number; // 0 = Sonntag … 6 = Samstag
  start: string;
  end?: string;
  title: string;
  trainer: string;
  category: string;
  spots: number;
  /** Nur noch Fallback ohne Server; die Belegung kommt aus /api/slots */
  booked: number;
  /** B-7: Buchung nur für passende Tarife/Gruppen/Mitglieder. Leer = offen für alle */
  allowed?: Allowed;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image?: string;
  tags?: string; // eine Zeile pro Tag
  hiring?: boolean;
  fit?: "cover" | "contain";
  focus?: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  source?: string;
}

export interface Story {
  id: string;
  name: string;
  goal: string;
  duration: string;
  quote: string;
  beforeImg?: string;
  afterImg?: string;
  stats?: string; // eine Zeile pro Kennzahl
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover?: string;
  date: string;
  tags?: string;
  readMin?: number;
  seoTitle?: string;
  seoDesc?: string;
  /** Entwurf wird nicht veröffentlicht (fehlt = veröffentlicht) */
  status?: "draft" | "published";
  body: string;
}

export interface GolfEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  time: string;
  desc: string;
  price: string;
  spots: number;
  booked: number;
  image?: string;
}

export interface ChallengeEntry {
  name: string;
  value: number;
}

export interface Challenge {
  id: string;
  month: string; // YYYY-MM
  title: string;
  icon?: string;
  category?: string;
  desc?: string;
  metric: string;
  format?: "number" | "time";
  unit?: string;
  sort?: "asc" | "desc";
  entries: ChallengeEntry[];
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  /** Preis wird Gästen nicht angezeigt (nur eingeloggte Mitglieder) */
  price: number;
  unit?: string;
  image?: string;
  desc?: string;
  variants?: string;
  badge?: string;
  active?: boolean;
  soldOut?: boolean;
}

/** Produkt, wie es an Gäste ausgeliefert wird: ohne Preis (Preise sehen nur eingeloggte Mitglieder) */
export type PublicProduct = Omit<Product, "price"> & { price?: number };

export interface Collections {
  courses: Course[];
  team: TeamMember[];
  reviews: Review[];
  stories: Story[];
  posts: Post[];
  events: GolfEvent[];
  challenges: Challenge[];
  products: Product[];
  news: NewsItem[];
}

/* ---------- Block-Props ---------- */

interface Head {
  eyebrow?: string;
  title?: string;
  text?: string;
}

export interface HeroProps extends Head {
  image?: string;
  cta1Label?: string;
  cta1Href?: string;
  cta2Label?: string;
  cta2Href?: string;
  showStatus?: boolean;
}
export interface MarqueeProps {
  items?: string[];
}
export interface UspProps extends Head {
  items?: { title: string; text: string }[];
}
export interface OffersProps extends Head {
  items?: { title: string; text: string; meta?: string; image?: string; tag?: string; href?: string }[];
  tags?: string[];
}
export interface ScheduleProps extends Head {
  days?: number[];
  category?: string;
  formId?: string;
}
export interface PricingItem {
  name: string;
  price: string;
  unit?: string;
  old?: string;
  /** Freitext vor dem Preis, z. B. „ab“ */
  pricePrefix?: string;
  badge?: string;
  features?: string; // eine Zeile pro Merkmal
  ctaLabel?: string;
  ctaHref?: string;
  highlight?: boolean;
}
export interface PricingProps extends Head {
  items?: PricingItem[];
  codes?: { code: string; text: string }[];
  note?: string;
  /** Überschrift über der Merkmalsliste in jeder Karte (z. B. „Was bekommst du?“) */
  featuresTitle?: string;
}
export interface TeamProps extends Head {
  limit?: number;
}
export interface ReviewsProps extends Head {
  link?: string;
}
export type HoursProps = Head;
export interface StoriesProps extends Head {
  limit?: number;
}
export interface InstagramProps extends Head {
  link?: string;
  items?: { image: string; caption?: string; type?: string; href?: string }[];
}
export interface BlogProps extends Head {
  limit?: number;
  tag?: string;
}
export interface TextMediaProps extends Head {
  image?: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
}
export interface StepsProps extends Head {
  items?: { title: string; text: string; meta?: string }[];
}
export interface EventsProps extends Head {
  type?: string;
  formId?: string;
}
export interface LeaderboardProps extends Head {
  challengeIds?: string[];
  challengeId?: string;
  topN?: number;
}
export interface GiftProps extends Head {
  image?: string;
  amounts?: string[];
  ctaLabel?: string;
}
export interface CtaProps extends Head {
  ctaLabel?: string;
  ctaHref?: string;
}
export interface ContactProps extends Head {
  formId?: string;
  showHours?: boolean;
  showInfo?: boolean;
}
export interface ShopProps extends Head {
  category?: string;
  limit?: number;
}
export interface GalleryProps extends Head {
  images?: string[];
}

interface BlockBase<T extends string, P> {
  id: string;
  type: T;
  variant: string;
  hidden?: boolean;
  props: P;
}

export type Block =
  | BlockBase<"hero", HeroProps>
  | BlockBase<"marquee", MarqueeProps>
  | BlockBase<"usp", UspProps>
  | BlockBase<"offers", OffersProps>
  | BlockBase<"schedule", ScheduleProps>
  | BlockBase<"pricing", PricingProps>
  | BlockBase<"team", TeamProps>
  | BlockBase<"reviews", ReviewsProps>
  | BlockBase<"hours", HoursProps>
  | BlockBase<"stories", StoriesProps>
  | BlockBase<"instagram", InstagramProps>
  | BlockBase<"blog", BlogProps>
  | BlockBase<"textmedia", TextMediaProps>
  | BlockBase<"steps", StepsProps>
  | BlockBase<"events", EventsProps>
  | BlockBase<"leaderboard", LeaderboardProps>
  | BlockBase<"gift", GiftProps>
  | BlockBase<"cta", CtaProps>
  | BlockBase<"contact", ContactProps>
  | BlockBase<"shop", ShopProps>
  | BlockBase<"gallery", GalleryProps>;

export interface Page {
  id: string;
  slug: string; // '' = Startseite
  title: string;
  nav?: boolean;
  seo?: { title?: string; description?: string };
  blocks: Block[];
}

export interface SiteData {
  version?: number;
  settings: SiteSettings;
  forms: FormDef[];
  pages: Page[];
  collections: Collections;
}

/** SiteData für Gäste (GET /api/site): Produkte ohne Preis */
export type PublicSiteData = Omit<SiteData, "collections"> & {
  collections: Omit<Collections, "products" | "news"> & { products: PublicProduct[] };
};

/* ---------- Kontaktformular (POST /api/contact) ---------- */

export interface ContactRequest {
  formId: string;
  fields: Record<string, string>;
  consent: boolean;
  /** Honeypot: muss leer bleiben */
  website?: string;
}

export interface InquiryRecord {
  id: string;
  createdAt: string;
  formId: string;
  fields: Record<string, string>;
}
