import { notFound } from "next/navigation";
import { CollectionManager } from "@/components/admin/collection-manager";
import { AdminTitle } from "@/components/admin/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { COLLECTIONS, isCollectionName } from "@/lib/admin-schema";

type Props = { params: Promise<{ name: string }>; searchParams: Promise<{ id?: string }> };

export const metadata = { title: "Sammlung" };

export default async function CollectionPage({ params, searchParams }: Props) {
  const { name } = await params;
  const { id } = await searchParams;
  if (!isCollectionName(name)) notFound();
  const { token } = await requireAdmin();
  const [site, members] = await Promise.all([adminBackend.site(token), name === "news" || name === "courses" ? adminBackend.members(token) : Promise.resolve([])]);
  const def = COLLECTIONS[name];
  const items = (site.collections[name] ?? []) as unknown as Record<string, unknown>[];
  return (
    <>
      <AdminTitle title={def.label} text={def.note} crumbs={[{ href: "/admin/sammlungen", label: "Sammlungen" }, { label: def.label }]} />
      <CollectionManager name={name} items={items} members={members.map((m) => ({ id: m.id, name: m.name }))} initialId={id} />
    </>
  );
}
