import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getSite } from "@/lib/api";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Impressum | MPT", alternates: { canonical: "/impressum" } };

export default async function Page() {
  const site = await getSite();
  return <LegalPage site={site} title="Impressum" text={site.settings.legal?.impressum ?? ""} />;
}
