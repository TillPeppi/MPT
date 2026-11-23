import type { MetadataRoute } from "next";
import { IS_DEMO_HOST } from "@/lib/data-paths";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Vercel-Demo nicht indexieren
  if (IS_DEMO_HOST) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/mitglieder"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
