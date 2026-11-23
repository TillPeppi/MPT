import type { CSSProperties } from "react";
import { rich } from "@/components/shared/rich";
import { SectionHead } from "@/components/shared/section-head";
import { SmartLink } from "@/components/shared/smart-link";
import { lines } from "@/lib/format";
import { bg, cssVars } from "@/lib/style";
import type { TeamMember } from "@/types/site";
import type { BlockProps } from "./types";

/** fit "contain" zeigt das ganze Bild (Text-Overlays bleiben lesbar), "cover" füllt mit Fokuspunkt */
function picStyle(m: TeamMember): CSSProperties | undefined {
  if (!m.image) return undefined;
  if (m.fit === "contain") return { ...cssVars({ "--img": `url('${m.image}')` }), backgroundImage: `url('${m.image}')` };
  return { backgroundImage: `url('${m.image}')`, backgroundPosition: `center ${m.focus || "20%"}` };
}

export function Team({ block, ctx }: BlockProps<"team">) {
  const p = block.props;
  const team = ctx.site.collections.team.slice(0, p.limit || 99);
  if (!team.length) {
    return (
      <div className="sec">
        <div className="wrap">
          <div className="empty">Noch keine Team-Mitglieder.</div>
        </div>
      </div>
    );
  }
  const fitCls = (m: TeamMember) => (m.image && m.fit === "contain" ? " fit" : "");

  if (block.variant === "spotlight") {
    const [m, ...rest] = team;
    return (
      <div className="sec">
        <div className="wrap spot">
          <div className={`pic reveal${fitCls(m)}`} style={picStyle(m)} role={m.image ? "img" : undefined} aria-label={m.image ? m.name : undefined}>
            <div className="label">
              <b>{m.name}</b>
              <span>{m.role}</span>
            </div>
          </div>
          <div className="reveal">
            {p.eyebrow && <span className="eyebrow">{rich(p.eyebrow)}</span>}
            {p.title && <h2 className="display">{rich(p.title)}</h2>}
            {p.text && <p>{rich(p.text)}</p>}
            <p>{m.bio}</p>
            <SmartLink href="/team" className="btn btn-ghost" style={{ marginTop: 12 }}>
              Ganzes Team →
            </SmartLink>
            {rest.length > 0 && (
              <div className="others">
                {rest.map((o) => (
                  <div key={o.id}>
                    <i style={bg(o.image)}>{o.image ? "" : (o.name || "?")[0]}</i>
                    {o.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sec">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="team-grid reveal">
          {team.map((m) => (
            <div key={m.id} className={`member ${m.hiring ? "hiring" : ""}`}>
              <div
                className={`pic${fitCls(m)} ${m.image ? "" : "ph-img"}`}
                style={picStyle(m)}
                role={m.image ? "img" : undefined}
                aria-label={m.image ? m.name : undefined}
              >
                {m.image ? "" : m.hiring ? "+" : (m.name || "?")[0]}
              </div>
              <div className="body">
                <h3>{m.name}</h3>
                <div className="role">{m.role}</div>
                <p>{m.bio}</p>
                <div className="tags">
                  {lines(m.tags).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                {m.hiring && (
                  <SmartLink href={ctx.anchors.has("kontakt") ? "#kontakt" : "/#kontakt"} className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                    Bewerben
                  </SmartLink>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
