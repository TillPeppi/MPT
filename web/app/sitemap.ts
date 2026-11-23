import type { MetadataRoute } from "next";
import { getPosts, getSite } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, posts] = await Promise.all([getSite(), getPosts()]);
  const pages = site.pages.map((p) => ({ url: `${SITE_URL}/${p.slug}`.replace(/\/$/, "") || SITE_URL, changeFrequency: "weekly" as const }));
  const articles = posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.date }));
  const legal = ["impressum", "datenschutz", "agb", "widerruf"].map((p) => ({ url: `${SITE_URL}/${p}` }));
  return [...pages, ...articles, ...legal];
}
