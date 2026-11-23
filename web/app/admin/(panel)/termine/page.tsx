import { AppointmentsAdmin } from "@/components/admin/appointments-admin";
import { AdminTitle } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Termine" };

export default async function AppointmentsPage() {
  const { token } = await requireAdmin();
  const [appointments, members, site] = await Promise.all([adminBackend.appointments(token), adminBackend.members(token), adminBackend.site(token)]);
  return (
    <>
      <AdminTitle title="Termine (PT & Check-up)" text="Anfragen bestätigen, ablehnen oder einen anderen Zeitpunkt vorschlagen. Der Kunde sieht den Status sofort im Kundenbereich." />
      <AppointmentsAdmin
        appointments={appointments}
        members={members.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name }))}
        types={Object.fromEntries(Object.entries(site.settings.appointments.types).map(([k, v]) => [k, v.label]))}
      />
    </>
  );
}
