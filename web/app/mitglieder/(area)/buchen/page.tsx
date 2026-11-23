import Link from "next/link";
import { AppointmentsPanel } from "@/components/member/appointments-panel";
import { MyBookings } from "@/components/member/my-bookings";
import { PageTitle } from "@/components/member/ui";
import { ScheduleView } from "@/components/client/schedule-view";
import { backend, getSite } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Buchen | MPT" };

const TABS = [
  { id: "kleingruppe", label: "Kleingruppe" },
  { id: "termine", label: "PT & Check-up" },
  { id: "meine", label: "Meine Buchungen" },
] as const;

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function BookPage({ searchParams }: Props) {
  const { token } = await requireSession();
  const { tab: raw } = await searchParams;
  const tab = TABS.find((t) => t.id === raw)?.id ?? "kleingruppe";
  const [site, me] = await Promise.all([getSite(), backend.me(token)]);
  const b = site.settings.booking;
  const waiting = me.appointments.filter((a) => a.status === "counter").length;

  return (
    <>
      <PageTitle title="Buchen" text="Kleingruppe, Personal Training und Check-up." />
      <nav className="subtabs" aria-label="Buchungsart">
        {TABS.map((t) => (
          <Link key={t.id} href={`/mitglieder/buchen?tab=${t.id}`} className={tab === t.id ? "on" : ""} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
            {t.id === "termine" && waiting > 0 && <span className="dot-badge" aria-label={`${waiting} Antwort offen`}>{waiting}</span>}
          </Link>
        ))}
      </nav>

      {tab === "kleingruppe" && (
        <section aria-label="Kleingruppe">
          <p className="note flush">
            Wähle einen Termin: einmalig oder jede Woche. Ist ein Kurs voll, kommst du automatisch auf die Warteliste. Stornieren geht bis {b.cancelHours ?? 12} Stunden vorher.
          </p>
          <ScheduleView
            courses={site.collections.courses}
            variant="agenda"
            days={[1, 2, 3, 4, 5, 6, 0]}
            weeksAhead={b.weeksAhead ?? 8}
            maxSeries={b.maxSeries ?? 12}
            cancelHours={b.cancelHours ?? 12}
          />
        </section>
      )}
      {tab === "termine" && <AppointmentsPanel appointments={me.appointments} config={site.settings.appointments} />}
      {tab === "meine" && <MyBookings bookings={me.bookings} cancelHours={b.cancelHours ?? 12} />}
    </>
  );
}
