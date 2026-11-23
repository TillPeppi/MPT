import Link from "next/link";
import { AdminTitle, Card } from "@/components/admin/ui";
import { Pill } from "@/components/member/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";

export const metadata = { title: "Inhalte" };

export default async function ContentPage() {
  const { token } = await requireAdmin();
  const site = await adminBackend.site(token);
  return (
    <>
      <AdminTitle
        title="Inhalte (Website)"
        text="Wähle eine Seite. Das Layout ist fest vorgegeben: Du pflegst Texte, Bilder, Buttons, Preise und Listen und kannst einzelne Abschnitte ausblenden. Änderungen sind sofort auf der Website sichtbar."
      />
      <div className="adm-grid">
        {site.pages.map((p) => {
          const hidden = p.blocks.filter((b) => b.hidden).length;
          return (
            <Card key={p.id} title={p.title} action={<Link className="linkbtn" href={p.slug ? `/${p.slug}` : "/"} target="_blank" rel="noopener">Ansehen</Link>}>
              <p className="muted">
                {p.blocks.length} Abschnitte{hidden ? `, davon ${hidden} ausgeblendet` : ""} · /{p.slug}
              </p>
              <div className="adm-actions">
                <Link className="btn btn-primary adm-b" href={`/admin/inhalte/${p.id}`}>
                  Bearbeiten
                </Link>
                {hidden > 0 && <Pill tone="warn">{hidden} ausgeblendet</Pill>}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
