import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/page-view";
import { getPage, getSite } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";

// Datumsabhängige Inhalte (Events, Challenges) werden stündlich neu erzeugt
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getPage("")]);
  return page ? pageMetadata(site, page) : {};
}

export default async function HomePage() {
  const [site, page] = await Promise.all([getSite(), getPage("")]);
  if (!page) notFound();
  return <PageView site={site} page={page} />;
}
