import { EventSignup } from "@/components/client/event-signup";
import { SectionHead } from "@/components/shared/section-head";
import { MONTHS, iso } from "@/lib/format";
import type { GolfEvent } from "@/types/site";
import type { BlockProps } from "./types";

function dateParts(e: GolfEvent): { d: number; m: string } {
  const d = new Date(`${e.date}T12:00`);
  return { d: d.getDate(), m: MONTHS[d.getMonth()] };
}

export function Events({ block, ctx }: BlockProps<"events">) {
  const p = block.props;
  const today = iso(new Date());
  const { forms } = ctx.site;
  const form = forms.find((f) => f.id === (p.formId || "golf")) ?? forms[0];
  const events = ctx.site.collections.events
    .filter((e) => (!p.type || e.type === p.type) && e.date >= today)
    .sort((a, z) => a.date.localeCompare(z.date));

  const head = <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />;
  if (!events.length) {
    return (
      <div className="sec" id="events">
        <div className="wrap">
          {head}
          <div className="empty">Aktuell keine Events geplant.</div>
        </div>
      </div>
    );
  }

  if (block.variant === "list") {
    return (
      <div className="sec" id="events">
        <div className="wrap">
          {head}
          <div className="ev-list reveal">
            {events.map((e) => {
              const x = dateParts(e);
              const free = e.spots - e.booked;
              return (
                <div key={e.id} className="row">
                  <div className="d">
                    {x.d}. {x.m}
                    <small>
                      {e.time} Uhr · {e.type}
                    </small>
                  </div>
                  <div>
                    <h3>{e.title}</h3>
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>{e.desc}</p>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    {free > 0 ? `${free} Plätze frei` : "ausgebucht"} · {e.price}
                  </span>
                  {form && <EventSignup event={e} form={form} free={free} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sec" id="events">
      <div className="wrap">
        {head}
        <div className="ev-cards reveal">
          {events.map((e) => {
            const x = dateParts(e);
            const free = e.spots - e.booked;
            return (
              <div key={e.id} className="ev">
                <div className={`cover ${e.image ? "" : "ph-img"}`} style={e.image ? { backgroundImage: `url('${e.image}')` } : undefined}>
                  <div className="date">
                    <b>{x.d}</b>
                    <span>{x.m}</span>
                  </div>
                  <span className="type">{e.type}</span>
                </div>
                <div className="body">
                  <h3>{e.title}</h3>
                  <p>{e.desc}</p>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {e.time} Uhr · {e.booked}/{e.spots} Plätze
                    <div className="bar">
                      <i style={{ width: `${Math.min(100, (e.booked / e.spots) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="foot">
                    <b>{e.price}</b>
                    {form && <EventSignup event={e} form={form} free={free} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
