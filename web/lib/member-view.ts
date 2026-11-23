import type { Booking, Measurement, MemberMe, Plan } from "@/types/member";

/* Reine Ableitungen für die Anzeige im Kundenbereich (Server- und Client-Komponenten). */

export const bookingStart = (b: Pick<Booking, "date" | "start">): Date => new Date(`${b.date}T${b.start || "00:00"}:00`);

export function upcomingBookings(bookings: Booking[], now: Date): Booking[] {
  return bookings
    .filter((b) => b.status !== "cancelled" && bookingStart(b) > now)
    .sort((a, z) => bookingStart(a).getTime() - bookingStart(z).getTime());
}

export interface PastSession {
  key: string;
  date: string;
  title: string;
  detail: string;
  source: "booking" | "log";
}

/** Letzte Einheiten: vergangene gebuchte Kurse und eingetragene Trainings (je Tag und Titel einmal) */
export function recentSessions(me: Pick<MemberMe, "bookings" | "plans">, now: Date, limit = 5): PastSession[] {
  const out: PastSession[] = [];
  for (const b of me.bookings) {
    if (b.status !== "booked" || b.attended === false || bookingStart(b) > now) continue;
    out.push({ key: b.id, date: b.date, title: b.title, detail: `${b.start} Uhr · Kurs`, source: "booking" });
  }
  for (const p of me.plans) {
    for (const l of p.logs) {
      const day = p.days.find((d) => d.id === l.dayId);
      out.push({ key: l.id, date: l.date, title: p.title, detail: `${day?.name ?? "Training"} · Plan`, source: "log" });
    }
  }
  return out.sort((a, z) => z.date.localeCompare(a.date)).slice(0, limit);
}

export const skinSum = (m: Measurement): number | null => {
  const v = Object.values(m.skinfolds ?? {});
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) * 10) / 10 : null;
};

export const activePlans = (plans: Plan[]): Plan[] => plans.filter((p) => p.status === "active");
export const donePlans = (plans: Plan[]): Plan[] => plans.filter((p) => p.status === "done");

export const APPOINTMENT_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "off" | "info" }> = {
  requested: { label: "Angefragt", tone: "info" },
  counter: { label: "Gegenvorschlag", tone: "warn" },
  confirmed: { label: "Bestätigt", tone: "ok" },
  declined: { label: "Abgelehnt", tone: "off" },
};

export const ORDER_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "off" | "info" }> = {
  neu: { label: "Neu", tone: "info" },
  bestaetigt: { label: "Bestätigt", tone: "info" },
  bereit: { label: "Liegt zur Abholung bereit", tone: "ok" },
  abgeholt: { label: "Abgeholt", tone: "off" },
  abgelehnt: { label: "Abgelehnt", tone: "off" },
};
