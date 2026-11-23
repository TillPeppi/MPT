import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getSite } from "@/lib/api";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Datenschutzerklärung | MPT", alternates: { canonical: "/datenschutz" } };

export default async function Page() {
  const site = await getSite();
  return <LegalPage site={site} title="Datenschutzerklärung" text={site.settings.legal?.datenschutz ?? ""} />;
}
