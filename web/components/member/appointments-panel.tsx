"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useNow } from "@/hooks/use-now";
import { addDays, iso, weekdayDate } from "@/lib/format";
import { APPOINTMENT_STATUS } from "@/lib/member-view";
import type { Appointment, AppointmentType, TimeSlot } from "@/types/member";
import type { SiteSettings } from "@/types/site";
import { Pill } from "./ui";

interface Props {
  appointments: Appointment[];
  config: SiteSettings["appointments"];
}

const typeLabel = (cfg: Props["config"], t: AppointmentType): string => cfg.types[t]?.label ?? t;
const slotText = (s: TimeSlot): string => `${weekdayDate(s.date)} · ${s.start} Uhr`;

/** PT & Check-up (B-1/B-2): Wunschtermin anfragen, Status verfolgen, Gegenvorschläge beantworten. */
export function AppointmentsPanel({ appointments, config }: Props) {
  const uid = useId();
  const router = useRouter();
  const now = useNow();
  const [type, setType] = useState<AppointmentType>("pt");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showAlt, setShowAlt] = useState(false);

  const minDate = now === null ? undefined : iso(addDays(new Date(now + config.minLeadHours * 3_600_000), 0));
  const maxDate = now === null ? undefined : iso(addDays(new Date(now), config.daysAhead));
  const types = Object.keys(config.types) as AppointmentType[];

  async function request(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const slot = (d: string, t: string): TimeSlot | null => (d && t ? { date: d, start: t } : null);
    const preferred = slot(String(fd.get("date") ?? ""), String(fd.get("time") ?? ""));
    if (!preferred) return setError("Bitte wähle Datum und Uhrzeit für deinen Wunschtermin.");
    const alternative = slot(String(fd.get("altDate") ?? ""), String(fd.get("altTime") ?? ""));
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/member/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, preferred, alternative, note: String(fd.get("note") ?? "") }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Die Anfrage hat nicht geklappt.");
      form.reset();
      setShowAlt(false);
      setOk("Anfrage gesendet. Wir bestätigen den Termin oder schlagen dir eine andere Uhrzeit vor.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(id: string, action: "accept" | "decline") {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/member/appointments/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Die Antwort hat nicht geklappt.");
      setOk(action === "accept" ? "Termin bestätigt." : "Gegenvorschlag abgelehnt.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="appt">
      <form className="form plain appt-form" onSubmit={request}>
        <fieldset className="types">
          <legend>Terminart</legend>
          {types.map((t) => (
            <label key={t} className={`typecard ${type === t ? "on" : ""}`}>
              <input type="radio" name={`${uid}-t`} checked={type === t} onChange={() => setType(t)} />
              <b>{typeLabel(config, t)}</b>
              <small>
                {config.types[t].minutes} Min.{config.types[t].text ? ` · ${config.types[t].text}` : ""}
              </small>
            </label>
          ))}
        </fieldset>
        <div className="row">
          <div>
            <label htmlFor={`${uid}-d`}>Wunschtag</label>
            <input id={`${uid}-d`} name="date" type="date" required min={minDate} max={maxDate} />
          </div>
          <div>
            <label htmlFor={`${uid}-h`}>Uhrzeit</label>
            <input id={`${uid}-h`} name="time" type="time" required min="06:00" max="21:00" step={900} />
          </div>
        </div>
        {showAlt ? (
          <div className="row">
            <div>
              <label htmlFor={`${uid}-ad`}>Alternativer Tag (optional)</label>
              <input id={`${uid}-ad`} name="altDate" type="date" min={minDate} max={maxDate} />
            </div>
            <div>
              <label htmlFor={`${uid}-ah`}>Alternative Uhrzeit</label>
              <input id={`${uid}-ah`} name="altTime" type="time" min="06:00" max="21:00" step={900} />
            </div>
          </div>
        ) : (
          <p>
            <button type="button" className="linkbtn" onClick={() => setShowAlt(true)}>
              + Alternativtermin angeben
            </button>
          </p>
        )}
        <label htmlFor={`${uid}-n`}>Notiz (optional)</label>
        <textarea id={`${uid}-n`} name="note" maxLength={500} rows={2} placeholder="Worum geht es? Was sollen wir wissen?" />
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        {ok && (
          <p className="okmsg" role="status">
            {ok}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Einen Moment …" : "Termin anfragen"}
        </button>
        <p className="note">Frühester Termin: in {config.minLeadHours} Stunden. Die Anfrage ist unverbindlich, bis wir sie bestätigen.</p>
      </form>

      <h3 className="sub">Deine Terminanfragen</h3>
      {appointments.length === 0 ? (
        <p className="empty">Noch keine Terminanfragen.</p>
      ) : (
        <ul className="rows big">
          {appointments.map((a) => {
            const st = APPOINTMENT_STATUS[a.status];
            return (
              <li key={a.id} className="appt-row">
                <div>
                  <b>{typeLabel(config, a.type)}</b>
                  {a.status === "confirmed" && a.confirmed ? (
                    <small>Termin: {slotText(a.confirmed)}</small>
                  ) : (
                    <>
                      <small>Wunsch: {slotText(a.preferred)}</small>
                      {a.alternative && <small>Alternative: {slotText(a.alternative)}</small>}
                    </>
                  )}
                  {a.note && <small className="quote">„{a.note}“</small>}
                  {a.status === "declined" && <small>{a.declinedBy === "member" ? "Du hast den Gegenvorschlag abgelehnt." : "Das Studio kann den Termin leider nicht anbieten."}</small>}
                  {a.status === "counter" && a.proposal && (
                    <div className="counter">
                      <b>Vorschlag vom Studio: {slotText(a.proposal)}</b>
                      {a.proposal.note && <small>{a.proposal.note}</small>}
                      <span className="ask">
                        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => respond(a.id, "accept")}>
                          Annehmen
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => respond(a.id, "decline")}>
                          Ablehnen
                        </button>
                      </span>
                    </div>
                  )}
                </div>
                <Pill tone={st.tone}>{st.label}</Pill>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
