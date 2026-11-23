/**
 * Service-Schnittstelle der Kunden-App.
 *
 * Die App spricht ausschließlich über dieses Interface mit „dem Studio“.
 * Heute steckt dahinter die Mock-Implementierung (services/mock.ts) mit den
 * Demo-Daten. Ein echtes Backend (server.py: /api/member/*, /api/slots,
 * /api/order) implementiert dasselbe Interface, z. B. in services/http.ts.
 */
import type {
  Booking,
  BookingType,
  CartItem,
  MemberState,
  RecapInput,
  ShopRequest,
  StudioContent,
  SurveyAnswer,
  WeekScore,
} from '@/data/types';

/** Belegung eines Kurstermins (entspricht GET /api/slots). */
export interface SlotCount {
  courseId: string;
  date: string;
  /** belegte Plätze ohne eigene Buchung */
  booked: number;
  /** Personen auf der Warteliste */
  waiting: number;
}

/** Ereignisse, die das Studio von sich aus schickt (später: Push / WebSocket). */
export type ServerEvent =
  | { type: 'waitlistPromoted'; bookingId: string }
  | { type: 'appointmentConfirmed'; bookingId: string };

export interface BookCourseInput {
  courseId: string;
  date: string;
  persons: number;
  /** 1 = Einzeltermin, 4/8/12 = Serie */
  weeks: number;
  /** bereits gebuchte Termine (werden bei Serien übersprungen) */
  existing: Booking[];
}

export interface AppointmentInput {
  type: Exclude<BookingType, 'group'>;
  coach: string;
  date: string;
  time: string;
  persons: number;
  note: string;
}

export interface MptApi {
  login(email: string, password: string): Promise<MemberState>;
  logout(): Promise<void>;
  getContent(): Promise<StudioContent>;
  getSlotCounts(from: string, days: number): Promise<SlotCount[]>;

  bookCourse(input: BookCourseInput): Promise<Booking[]>;
  joinWaitlist(courseId: string, date: string, position: number): Promise<Booking>;
  cancel(bookingId: string): Promise<void>;
  cancelSeries(seriesId: string, fromDate: string): Promise<void>;

  requestAppointment(input: AppointmentInput): Promise<Booking>;
  acceptProposal(booking: Booking): Promise<Booking>;
  declineProposal(bookingId: string): Promise<void>;

  submitRecap(input: RecapInput, weekDone: number): Promise<WeekScore>;
  submitSurvey(surveyId: string, answer: SurveyAnswer): Promise<void>;
  sendShopRequest(cart: CartItem[], content: StudioContent): Promise<ShopRequest>;

  /** Server-Ereignisse abonnieren; gibt die Abmeldefunktion zurück. */
  subscribe(listener: (e: ServerEvent) => void): () => void;
}
