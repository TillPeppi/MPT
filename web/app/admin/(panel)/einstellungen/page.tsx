import { AccountsPanel } from "@/components/admin/accounts-panel";
import { HoursEditor } from "@/components/admin/hours-editor";
import { PasswordPanel } from "@/components/admin/password-panel";
import { SectionForm } from "@/components/admin/section-form";
import { AdminTabs, AdminTitle } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { SECTIONS, SECTION_KEYS, getPath, isSection, setPath } from "@/lib/admin-schema";

type Props = { searchParams: Promise<{ tab?: string }> };

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage({ searchParams }: Props) {
  const { tab = "studio" } = await searchParams;
  const { admin, token } = await requireAdmin();
  const site = await adminBackend.site(token);
  const key = isSection(tab) ? tab : tab === "konten" || tab === "passwort" ? tab : "studio";

  const tabs = [
    ...SECTION_KEYS.map((k) => ({ key: k, href: `/admin/einstellungen?tab=${k}`, label: SECTIONS[k].label })),
    { key: "konten", href: "/admin/einstellungen?tab=konten", label: "Admin-Konten" },
    { key: "passwort", href: "/admin/einstellungen?tab=passwort", label: "Mein Passwort" },
  ];

  let body: React.ReactNode;
  if (key === "hours") body = <HoursEditor hours={site.settings.hours} />;
  else if (key === "konten") body = <AccountsPanel accounts={await adminBackend.accounts(token)} meId={admin.id} />;
  else if (key === "passwort") body = <PasswordPanel />;
  else {
    const def = SECTIONS[key];
    const initial: Record<string, unknown> = {};
    for (const f of def.fields) if (f.t !== "info" && f.k) setPath(initial, f.k, getPath(site, f.k));
    if (key === "recap") {
      const qs = (getPath(initial, "settings.recap.questions") as Record<string, unknown>[]).map((q) => ({ ...q, score: q.score ?? "", section: q.section ?? "" }));
      setPath(initial, "settings.recap.questions", qs);
    }
    body = <SectionForm key={key} section={key} fields={def.fields} initial={initial} />;
  }

  return (
    <>
      <AdminTitle title="Einstellungen" />
      <AdminTabs tabs={tabs} current={key} />
      {body}
    </>
  );
}
