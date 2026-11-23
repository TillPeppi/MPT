import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockEditor } from "@/components/admin/block-editor";
import { AdminTitle } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { BLOCK_COLLECTION, BLOCK_LABELS, COLLECTIONS } from "@/lib/admin-schema";

type Props = { params: Promise<{ pageId: string; blockId: string }> };

export const metadata = { title: "Abschnitt bearbeiten" };

export default async function BlockPage({ params }: Props) {
  const { pageId, blockId } = await params;
  const { token } = await requireAdmin();
  const site = await adminBackend.site(token);
  const page = site.pages.find((p) => p.id === pageId);
  const block = page?.blocks.find((b) => b.id === blockId);
  if (!page || !block) notFound();
  const col = BLOCK_COLLECTION[block.type];
  return (
    <>
      <AdminTitle
        title={BLOCK_LABELS[block.type]}
        crumbs={[{ href: "/admin/inhalte", label: "Inhalte" }, { href: `/admin/inhalte/${page.id}`, label: page.title }, { label: BLOCK_LABELS[block.type] }]}
      />
      {(col || block.type === "hours" || block.type === "contact") && (
        <p className="adm-lead">
          {col && (
            <>
              Die Einträge dieses Abschnitts pflegst du unter <Link className="linkbtn" href={`/admin/sammlungen/${col}`}>Sammlungen: {COLLECTIONS[col].label}</Link>.{" "}
            </>
          )}
          {block.type === "hours" && (
            <>
              Die Zeiten selbst stehen unter <Link className="linkbtn" href="/admin/einstellungen?tab=hours">Einstellungen: Öffnungszeiten</Link>.
            </>
          )}
          {block.type === "contact" && (
            <>
              Felder und Empfänger stehen unter <Link className="linkbtn" href="/admin/einstellungen?tab=forms">Einstellungen: Formulare</Link>.
            </>
          )}
        </p>
      )}
      <BlockEditor pageId={page.id} blockId={block.id} type={block.type} props={block.props as object} hidden={!!block.hidden} />
    </>
  );
}
