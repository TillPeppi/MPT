import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getSite } from "@/lib/api";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Widerrufsbelehrung | MPT", alternates: { canonical: "/widerruf" } };

export default async function Page() {
  const site = await getSite();
  return <LegalPage site={site} title="Widerrufsbelehrung" text={site.settings.legal?.widerruf ?? ""} />;
}
