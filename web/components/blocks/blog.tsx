import Link from "next/link";
import { SectionHead } from "@/components/shared/section-head";
import { SmartLink } from "@/components/shared/smart-link";
import { fmtDate, lines } from "@/lib/format";
import { bg } from "@/lib/style";
import type { Post } from "@/types/site";
import type { BlockProps } from "./types";

function PostCard({ post }: { post: Post }) {
  return (
    <Link className="post" href={`/blog/${post.slug}`}>
      <div className={`cover ${post.cover ? "" : "ph-img"}`} style={bg(post.cover)} />
      <div className="body">
        <div className="meta">
          <span>{fmtDate(post.date)}</span>
          <span>{post.readMin || 3} Min.</span>
          <span>{lines(post.tags)[0] || ""}</span>
        </div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <span className="more">Weiterlesen →</span>
      </div>
    </Link>
  );
}

export function Blog({ block, ctx }: BlockProps<"blog">) {
  const p = block.props;
  const all = [...ctx.site.collections.posts].sort((a, z) => String(z.date).localeCompare(a.date));
  let posts = all;
  if (p.tag) posts = posts.filter((x) => lines(x.tags).includes(p.tag as string));
  posts = posts.slice(0, p.limit || 99);
  return (
    <div className="sec">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className={`${block.variant === "featured" ? "blog-featured" : "blog-grid"} reveal`}>
          {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <div className="empty">Noch keine Beiträge.</div>}
        </div>
        {block.variant === "grid" && all.length > posts.length && (
          <div style={{ marginTop: 30 }}>
            <SmartLink className="btn btn-ghost" href="/blog">
              Alle Beiträge →
            </SmartLink>
          </div>
        )}
      </div>
    </div>
  );
}
