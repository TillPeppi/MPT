import { ContactForm } from "@/components/client/contact-form";
import { HoursTable, LiveStatus } from "@/components/client/hours-views";
import { rich } from "@/components/shared/rich";
import { SectionHead } from "@/components/shared/section-head";
import type { BlockProps } from "./types";

export function Contact({ block, ctx }: BlockProps<"contact">) {
  const p = block.props;
  const { settings, forms } = ctx.site;
  const c = settings.contact;
  const form = forms.find((f) => f.id === p.formId) ?? forms[0];
  const formEl = form ? <ContactForm form={form} /> : <div className="empty">Kein Formular angelegt.</div>;

  if (block.variant === "center") {
    return (
      <div className="sec" id="kontakt">
        <div className="wrap contact-center reveal">
          {p.eyebrow && <span className="eyebrow">{rich(p.eyebrow)}</span>}
          {p.title && <h2 className="display">{rich(p.title)}</h2>}
          {p.text && <p>{rich(p.text)}</p>}
          {formEl}
        </div>
      </div>
    );
  }
  return (
    <div className="sec" id="kontakt">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="contact-grid">
          <div className="reveal">
            {p.showHours && (
              <div className="info-card">
                <h4>Öffnungszeiten</h4>
                <LiveStatus hours={settings.hours} />
                <div style={{ marginTop: 14 }}>
                  <HoursTable hours={settings.hours} />
                </div>
              </div>
            )}
            {p.showInfo && (
              <div className="info-card">
                <h4>Kontakt</h4>
                <p>
                  {c.street}
                  <br />
                  {c.zip} {c.city}
                </p>
                <p style={{ marginTop: 12 }}>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                  <br />
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a>
                </p>
              </div>
            )}
          </div>
          <div className="reveal">{formEl}</div>
        </div>
      </div>
    </div>
  );
}
