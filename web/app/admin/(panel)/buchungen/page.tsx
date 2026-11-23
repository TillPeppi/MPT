import Link from "next/link";
import { BookingsWeek } from "@/components/admin/bookings-week";
import { AdminTitle } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { addDays, iso } from "@/lib/format";

type Props = { searchParams: Promise<{ from?: string }> };

export const metadata = { title: "Kurse & Buchungen" };

export default async function BookingsPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const { token } = await requireAdmin();
  const safeFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null;
  const [week, members, site] = await Promise.all([adminBackend.bookingsWeek(token, safeFrom), adminBackend.members(token), adminBackend.site(token)]);
  const monday = new Date(`${week.from}T12:00:00`);
  return (
    <>
      <AdminTitle title="Kurse & Buchungen" text="Teilnehmer und Warteliste je Termin, Anwesenheit abhaken, Plätze freigeben und Kunden eintragen." />
      <div className="adm-actions" style={{ marginBottom: 18 }}>
        <Link className="btn btn-ghost adm-b" href="/admin/sammlungen/courses">
          Kurs-Slots bearbeiten (Zeiten, Trainer, Plätze, Beschränkung)
        </Link>
      </div>
      <BookingsWeek
        from={week.from}
        prev={iso(addDays(monday, -7))}
        next={iso(addDays(monday, 7))}
        slots={week.slots}
        members={members.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name }))}
        autoPromote={site.settings.booking.waitlistAutoPromote !== false}
      />
    </>
  );
}
