import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog-article";
import { getPost, getPosts, getSite } from "@/lib/api";
import { postMetadata } from "@/lib/seo";

export const revalidate = 3600;
// Neue Beiträge aus dem Admin sind sofort erreichbar (kein 404 für Slugs, die beim Build noch fehlten)
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, post] = await Promise.all([getSite(), getPost(slug)]);
  return post ? postMetadata(site, post) : {};
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [site, post] = await Promise.all([getSite(), getPost(slug)]);
  if (!post) notFound();
  return <BlogArticle site={site} post={post} />;
}
