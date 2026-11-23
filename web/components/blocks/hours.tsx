import { HoursBanner, HoursTable, LiveStatus } from "@/components/client/hours-views";
import { rich } from "@/components/shared/rich";
import { SectionHead } from "@/components/shared/section-head";
import type { BlockProps } from "./types";

export function Hours({ block, ctx }: BlockProps<"hours">) {
  const p = block.props;
  const { hours, contact } = ctx.site.settings;
  if (block.variant === "banner") {
    return (
      <div className="sec">
        <div className="wrap">
          <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
          <div className="reveal" style={{ marginBottom: 18 }}>
            <LiveStatus hours={hours} />
          </div>
          <HoursBanner hours={hours} />
        </div>
      </div>
    );
  }
  return (
    <div className="sec">
      <div className="wrap hours-card">
        <div className="reveal">
          {p.eyebrow && <span className="eyebrow">{rich(p.eyebrow)}</span>}
          {p.title && <h2 className="display">{rich(p.title)}</h2>}
          <div style={{ marginTop: 26 }}>
            <LiveStatus hours={hours} />
          </div>
          <p style={{ marginTop: 20, color: "var(--muted)" }}>
            {contact.street}, {contact.zip} {contact.city}
          </p>
        </div>
        <div className="reveal">
          <HoursTable hours={hours} />
        </div>
      </div>
    </div>
  );
}
