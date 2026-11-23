import type { Metadata } from "next";
import type { Page, Post, SiteData } from "@/types/site";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function base(site: SiteData, title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: site.settings.name, locale: "de_DE", type: "website" },
  };
}

/** Titel/Beschreibung: page.seo → Standard aus den Einstellungen */
export function pageMetadata(site: SiteData, page: Page): Metadata {
  const { name, seo } = site.settings;
  const title = page.seo?.title || (page.slug ? `${page.title} | ${name}` : seo.title);
  const description = page.seo?.description || seo.description;
  return base(site, title, description, page.slug ? `/${page.slug}` : "/");
}

export function postMetadata(site: SiteData, post: Post): Metadata {
  const title = post.seoTitle || `${post.title} | ${site.settings.name}`;
  const description = post.seoDesc || post.excerpt || site.settings.seo.description;
  const meta = base(site, title, description, `/blog/${post.slug}`);
  meta.openGraph = { ...meta.openGraph, type: "article", publishedTime: post.date, ...(post.cover ? { images: [post.cover] } : {}) };
  return meta;
}

export function businessJsonLd(site: SiteData): Record<string, unknown> {
  const { name, contact } = site.settings;
  return {
    "@context": "https://schema.org",
    "@type": "HealthClub",
    name,
    telephone: contact.phone,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.street,
      postalCode: contact.zip,
      addressLocality: contact.city,
      addressCountry: "DE",
    },
  };
}

export function postJsonLd(site: SiteData, post: Post): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    description: post.seoDesc || post.excerpt,
    publisher: { "@type": "Organization", name: site.settings.name },
  };
}
