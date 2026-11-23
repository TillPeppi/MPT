import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/page-view";
import { getPage, getPageSlugs, getSite } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPageSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, page] = await Promise.all([getSite(), getPage(slug)]);
  return page ? pageMetadata(site, page) : {};
}

export default async function SubPage({ params }: Props) {
  const { slug } = await params;
  const [site, page] = await Promise.all([getSite(), getPage(slug)]);
  if (!page) notFound();
  return <PageView site={site} page={page} />;
}
