import { LogoutButton, PasswordForm, PhoneForm } from "@/components/member/profile-forms";
import { MCard, PageTitle } from "@/components/member/ui";
import { backend } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Profil | MPT" };

const TARIFF: Record<string, string> = { kleingruppe: "Kleingruppe", pt: "Personal Training", testphase: "Testphase" };

export default async function ProfilePage() {
  const { token } = await requireSession();
  const { member } = await backend.me(token);
  return (
    <>
      <PageTitle title="Profil" />
      <div className="mgrid two">
        <MCard title="Deine Daten">
          <dl className="answers">
            <div>
              <dt>Name</dt>
              <dd>{member.name}</dd>
            </div>
            <div>
              <dt>E-Mail</dt>
              <dd>{member.email}</dd>
            </div>
            <div>
              <dt>Tarif</dt>
              <dd>{TARIFF[member.tariff] ?? (member.tariff || "–")}</dd>
            </div>
            <div>
              <dt>Mitglied seit</dt>
              <dd>{fmtDate(member.createdAt.slice(0, 10))}</dd>
            </div>
          </dl>
          <p className="note">Name und E-Mail ändert das Studio für dich. Schreib uns einfach kurz.</p>
          <PhoneForm phone={member.phone} />
        </MCard>
        <MCard title="Passwort ändern">
          <PasswordForm />
        </MCard>
      </div>
      <p>
        <LogoutButton />
      </p>
    </>
  );
}
