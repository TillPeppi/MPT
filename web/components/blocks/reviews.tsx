import { SectionHead } from "@/components/shared/section-head";
import { SmartLink } from "@/components/shared/smart-link";
import { fmtDate } from "@/lib/format";
import type { Review } from "@/types/site";
import type { BlockProps } from "./types";

const stars = (n: number): string => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

function Card({ r }: { r: Review }) {
  return (
    <div className="rev">
      <span className="stars" role="img" aria-label={`${r.rating} von 5 Sternen`}>
        {stars(r.rating)}
      </span>
      <p>„{r.text}“</p>
      <div className="who">
        <i aria-hidden="true">{(r.name || "?")[0]}</i>
        <div>
          {r.name}
          <small>
            {r.source || "Google"} · {fmtDate(r.date)}
          </small>
        </div>
      </div>
    </div>
  );
}

export function Reviews({ block, ctx }: BlockProps<"reviews">) {
  const p = block.props;
  const revs = ctx.site.collections.reviews;
  const avg = revs.length ? revs.reduce((s, r) => s + Number(r.rating || 0), 0) / revs.length : 0;
  const link = p.link || "#";
  const badge = (
    <SmartLink className="g-badge" href={link}>
      <span className="g" aria-hidden="true">G</span>
      <div>
        <b>{avg.toFixed(1).replace(".", ",")}</b> <span className="stars" aria-hidden="true">{stars(avg)}</span>
        <br />
        <small style={{ color: "var(--muted)" }}>{revs.length} Bewertungen · Google</small>
      </div>
    </SmartLink>
  );

  if (block.variant === "badge") {
    return (
      <div className="sec">
        <div className="wrap">
          <div className="rv-head reveal" style={{ justifyContent: "space-between" }}>
            <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
            {badge}
          </div>
          <div className="rev-grid reveal">
            {revs.slice(0, 3).map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  const slider = block.variant === "slider";
  return (
    <div className={`sec ${slider ? "alt" : ""}`}>
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="rv-head reveal">
          {badge}
          <SmartLink href={link} className="btn btn-ghost btn-sm">
            Bewertung schreiben
          </SmartLink>
        </div>
        <div className={`${slider ? "rev-slider" : "rev-grid"} reveal`}>
          {revs.map((r) => (
            <Card key={r.id} r={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
