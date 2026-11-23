import Link from "next/link";
import { AdminTitle, Card } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { COLLECTIONS, COLLECTION_NAMES } from "@/lib/admin-schema";

export const metadata = { title: "Sammlungen" };

export default async function CollectionsPage() {
  const { token } = await requireAdmin();
  const site = await adminBackend.site(token);
  return (
    <>
      <AdminTitle title="Sammlungen" text="Wiederkehrende Einträge, die auf mehreren Seiten erscheinen: Team, Bewertungen, Blog, Events, Shop-Produkte und mehr." />
      <div className="adm-grid">
        {COLLECTION_NAMES.map((n) => (
          <Card key={n} title={COLLECTIONS[n].label}>
            <p className="muted">{(site.collections[n] ?? []).length} Einträge</p>
            <Link className="btn btn-primary adm-b" href={`/admin/sammlungen/${n}`}>
              Öffnen
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
