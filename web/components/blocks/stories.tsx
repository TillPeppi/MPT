import { CompareSlider } from "@/components/client/compare-slider";
import { SectionHead } from "@/components/shared/section-head";
import { lines } from "@/lib/format";
import { bg } from "@/lib/style";
import type { Story } from "@/types/site";
import type { BlockProps } from "./types";

function Side({ s, k, label }: { s: Story; k: "before" | "after"; label: string }) {
  const img = k === "before" ? s.beforeImg : s.afterImg;
  return (
    <div className={`side ${k === "after" ? "after" : ""} ${img ? "" : "ph-img"}`} style={bg(img)}>
      {img ? "" : `${label}-Foto folgt`}
    </div>
  );
}

const Stats = ({ s }: { s: Story }) => (
  <div className="stat-row">
    {lines(s.stats).map((x) => (
      <span key={x}>{x}</span>
    ))}
  </div>
);

export function Stories({ block, ctx }: BlockProps<"stories">) {
  const p = block.props;
  const stories = ctx.site.collections.stories.slice(0, p.limit || 99);
  if (!stories.length) {
    return (
      <div className="sec">
        <div className="wrap">
          <div className="empty">Noch keine Erfolgsgeschichten angelegt.</div>
        </div>
      </div>
    );
  }
  if (block.variant === "cards") {
    return (
      <div className="sec alt">
        <div className="wrap">
          <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
          <div className="story-cards reveal">
            {stories.map((s) => (
              <div key={s.id} className="story-card">
                <div className="pair">
                  <div className={s.beforeImg ? "" : "ph-img"} style={bg(s.beforeImg)}>
                    <span>Vorher</span>
                  </div>
                  <div className={s.afterImg ? "" : "ph-img"} style={bg(s.afterImg)}>
                    <span>Nachher</span>
                  </div>
                </div>
                <div className="body">
                  <h3>{s.name}</h3>
                  <p className="goal" style={{ color: "var(--accent-text)", fontWeight: 600, fontSize: 14, marginTop: 8 }}>
                    {s.goal} · {s.duration}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <Stats s={s} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="sec alt">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="story-wrap">
          {stories.map((s) => (
            <div key={s.id} className="story reveal">
              <CompareSlider label={`Vorher/Nachher-Vergleich: ${s.name}`}>
                <Side s={s} k="before" label="Vorher" />
                <Side s={s} k="after" label="Nachher" />
                <span className="lbl l">Vorher</span>
                <span className="lbl r">Nachher</span>
              </CompareSlider>
              <div>
                <span className="goal">
                  {s.goal} · {s.duration}
                </span>
                <h3>{s.name}</h3>
                <blockquote>{s.quote}</blockquote>
                <Stats s={s} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
