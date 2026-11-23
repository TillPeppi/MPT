import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { JsonLd } from "@/components/shared/json-ld";
import { fmtDate, lines } from "@/lib/format";
import { postJsonLd } from "@/lib/seo";
import { bg } from "@/lib/style";
import { Body } from "@/components/shared/mini-markdown";
import type { Post, SiteData } from "@/types/site";

export function BlogArticle({ site, post }: { site: SiteData; post: Post }) {
  return (
    <PageShell site={site} activeSlug="blog">
      <JsonLd data={postJsonLd(site, post)} />
      <article className="article">
        <div className="wrap">
          <Link className="back" href="/blog">
            ← Alle Beiträge
          </Link>
          <div className="meta" style={{ marginTop: 30 }}>
            {fmtDate(post.date)} · {post.readMin} Min. Lesezeit · {lines(post.tags).join(", ")}
          </div>
          <h1 className="display">{post.title}</h1>
          <p className="lead" style={{ fontSize: 20 }}>
            {post.excerpt}
          </p>
          {post.cover && <div className="cover" style={bg(post.cover)} role="img" aria-label={post.title} />}
          <div className="content">
            <Body text={post.body} />
          </div>
          <div className="cta-outline" style={{ marginTop: 50 }}>
            <div className="box">
              <div>
                <h2 className="display">Lust auf mehr?</h2>
                <p>Im Check-up finden wir deine größten Hebel.</p>
              </div>
              <Link href="/training" className="btn btn-primary">
                Check-up buchen
              </Link>
            </div>
          </div>
        </div>
      </article>
    </PageShell>
  );
}
