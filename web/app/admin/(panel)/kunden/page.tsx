import { MembersList } from "@/components/admin/members-list";
import { AdminTitle } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Kunden" };

export default async function MembersPage() {
  const { token } = await requireAdmin();
  const members = await adminBackend.members(token);
  return (
    <>
      <AdminTitle title="Kunden" text="Stammdaten, Pläne, Messungen und Check-ups. Gesundheitsdaten sehen nur Admins und der jeweilige Kunde." />
      <MembersList members={members} />
    </>
  );
}
