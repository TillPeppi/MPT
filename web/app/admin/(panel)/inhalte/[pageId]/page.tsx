import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSeoForm } from "@/components/admin/page-seo-form";
import { ToggleBlockButton } from "@/components/admin/toggle-block-button";
import { AdminTitle, Card } from "@/components/admin/ui";
import { Pill } from "@/components/member/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { BLOCK_LABELS } from "@/lib/admin-schema";

type Props = { params: Promise<{ pageId: string }> };

export const metadata = { title: "Inhalte" };

const snippet = (props: object): string => {
  const p = props as { title?: string; eyebrow?: string; items?: unknown[]; name?: string };
  const t = (p.title || p.eyebrow || "").replace(/\*/g, "").replace(/&shy;/g, "").replace(/\n/g, " ").trim();
  return t.slice(0, 80);
};

export default async function PageSectionsPage({ params }: Props) {
  const { pageId } = await params;
  const { token } = await requireAdmin();
  const site = await adminBackend.site(token);
  const page = site.pages.find((p) => p.id === pageId);
  if (!page) notFound();
  return (
    <>
      <AdminTitle title={page.title} text="Die Abschnitte stehen in der Reihenfolge der Seite. Reihenfolge und Layout sind fest." crumbs={[{ href: "/admin/inhalte", label: "Inhalte" }, { label: page.title }]} />
      <div className="adm-grid" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <Card title="Abschnitte">
          <ul className="adm-list">
            {page.blocks.map((b, i) => (
              <li key={b.id}>
                <Link className="t" href={`/admin/inhalte/${page.id}/${b.id}`}>
                  <b>
                    {i + 1}. {BLOCK_LABELS[b.type]}
                  </b>
                  <small>{snippet(b.props) || "Keine Überschrift"}</small>
                </Link>
                <div className="adm-actions">
                  {b.hidden && <Pill tone="warn">Ausgeblendet</Pill>}
                  <ToggleBlockButton pageId={page.id} blockId={b.id} hidden={!!b.hidden} />
                  <Link className="btn btn-ghost adm-b sm" href={`/admin/inhalte/${page.id}/${b.id}`}>
                    Bearbeiten
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Seiten-SEO">
          <PageSeoForm pageId={page.id} title={page.seo?.title ?? ""} description={page.seo?.description ?? ""} />
        </Card>
      </div>
    </>
  );
}
