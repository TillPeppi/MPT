"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pill } from "@/components/member/ui";
import { weekdayDate } from "@/lib/format";
import { APPOINTMENT_STATUS } from "@/lib/member-view";
import type { Appointment, TimeSlot } from "@/types/member";
import { adminApi, errMsg } from "./api";
import type { MemberOption } from "./fields";
import { useToast } from "./toast";

const slotText = (s: TimeSlot): string => `${weekdayDate(s.date)}, ${s.start} Uhr`;

function Card({ a, type }: { a: Appointment; type: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [counter, setCounter] = useState(false);
  const st = APPOINTMENT_STATUS[a.status];
  const open = a.status === "requested" || a.status === "counter";

  async function decide(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      await adminApi("POST", `/api/admin/appointments/${a.id}`, body);
      toast.success(ok);
      setCounter(false);
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function sendCounter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    void decide({ action: "counter", slot: { date: fd.get("date"), start: fd.get("start") }, note: fd.get("note") }, "Gegenvorschlag gesendet.");
  }

  return (
    <section className="adm-card">
      <header>
        <h3>
          <Link href={`/admin/kunden/${a.memberId}`}>{a.name}</Link>
        </h3>
        <Pill tone={st.tone}>{st.label}</Pill>
      </header>
      <dl className="adm-dl">
        <dt>Art</dt>
        <dd>{type}</dd>
        <dt>Wunschtermin</dt>
        <dd>{slotText(a.preferred)}</dd>
        {a.alternative && (
          <>
            <dt>Alternative</dt>
            <dd>{slotText(a.alternative)}</dd>
          </>
        )}
        {a.note && (
          <>
            <dt>Nachricht</dt>
            <dd>{a.note}</dd>
          </>
        )}
        {a.status === "counter" && a.proposal && (
          <>
            <dt>Dein Vorschlag</dt>
            <dd>
              {slotText(a.proposal)}
              {a.proposal.note ? ` (${a.proposal.note})` : ""}
            </dd>
          </>
        )}
        {a.status === "confirmed" && a.confirmed && (
          <>
            <dt>Termin</dt>
            <dd>
              <b>{slotText(a.confirmed)}</b>
            </dd>
          </>
        )}
        {a.status === "declined" && (
          <>
            <dt>Abgelehnt von</dt>
            <dd>{a.declinedBy === "member" ? "Kunde (Gegenvorschlag)" : "Studio"}</dd>
          </>
        )}
      </dl>
      {open && (
        <div className="adm-actions">
          {a.status === "requested" && (
            <>
              <button type="button" className="btn btn-primary adm-b sm" disabled={busy} onClick={() => decide({ action: "confirm" }, "Termin bestätigt.")}>
                Wunschtermin bestätigen
              </button>
              {a.alternative && (
                <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => decide({ action: "confirm", slot: a.alternative }, "Alternativtermin bestätigt.")}>
                  Alternative bestätigen
                </button>
              )}
            </>
          )}
          <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => setCounter((c) => !c)} aria-expanded={counter}>
            Anderen Zeitpunkt vorschlagen
          </button>
          <button type="button" className="btn danger adm-b sm" disabled={busy} onClick={() => window.confirm("Anfrage ablehnen?") && decide({ action: "decline" }, "Anfrage abgelehnt.")}>
            Ablehnen
          </button>
        </div>
      )}
      {counter && (
        <form className="adm-form" onSubmit={sendCounter}>
          <div className="adm-row">
            <div className="adm-field">
              <label htmlFor={`c-d-${a.id}`}>Datum</label>
              <input id={`c-d-${a.id}`} name="date" type="date" required defaultValue={a.preferred.date} />
            </div>
            <div className="adm-field">
              <label htmlFor={`c-t-${a.id}`}>Uhrzeit</label>
              <input id={`c-t-${a.id}`} name="start" type="time" required defaultValue={a.preferred.start} />
            </div>
          </div>
          <div className="adm-field">
            <label htmlFor={`c-n-${a.id}`}>Nachricht an den Kunden (optional)</label>
            <input id={`c-n-${a.id}`} name="note" type="text" maxLength={300} />
          </div>
          <div>
            <button type="submit" className="btn btn-primary adm-b sm" disabled={busy}>
              Vorschlag senden
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function AppointmentsAdmin({ appointments, members, types }: { appointments: Appointment[]; members: MemberOption[]; types: Record<string, string> }) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<"open" | "confirmed" | "all">("open");
  const [busy, setBusy] = useState(false);
  const shown = appointments.filter((a) => (filter === "open" ? a.status === "requested" || a.status === "counter" : filter === "confirmed" ? a.status === "confirmed" : true));
  const openCount = appointments.filter((a) => a.status === "requested").length;

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      await adminApi("POST", "/api/admin/appointments", { memberId: fd.get("memberId"), type: fd.get("type"), slot: { date: fd.get("date"), start: fd.get("start") }, note: fd.get("note") });
      form.reset();
      toast.success("Termin angelegt und bestätigt.");
      router.refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="adm-tabs" aria-label="Filter">
        {([["open", `Offen (${appointments.filter((a) => a.status === "requested" || a.status === "counter").length})`], ["confirmed", "Bestätigt"], ["all", "Alle"]] as const).map(([k, l]) => (
          <a key={k} href="#" className={filter === k ? "on" : ""} onClick={(e) => { e.preventDefault(); setFilter(k); }}>
            {l}
          </a>
        ))}
      </nav>
      {filter === "open" && openCount === 0 && <p className="adm-empty">Keine neuen Anfragen.</p>}
      <div className="adm-grid">
        {shown.map((a) => (
          <Card key={a.id} a={a} type={types[a.type] ?? a.type} />
        ))}
        {shown.length === 0 && filter !== "open" && <p className="adm-empty">Keine Termine.</p>}
      </div>

      <section className="adm-card" style={{ maxWidth: 760 }}>
        <header>
          <h2>Termin direkt anlegen</h2>
        </header>
        <form className="adm-form wide" onSubmit={create}>
          <div className="adm-row">
            <div className="adm-field">
              <label htmlFor="ap-m">Kunde</label>
              <select id="ap-m" name="memberId" required defaultValue="">
                <option value="" disabled>
                  Bitte wählen …
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="ap-t">Art</label>
              <select id="ap-t" name="type" defaultValue="pt">
                {Object.entries(types).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="adm-row">
            <div className="adm-field">
              <label htmlFor="ap-d">Datum</label>
              <input id="ap-d" name="date" type="date" required />
            </div>
            <div className="adm-field">
              <label htmlFor="ap-s">Uhrzeit</label>
              <input id="ap-s" name="start" type="time" required />
            </div>
          </div>
          <div className="adm-field">
            <label htmlFor="ap-n">Notiz (optional)</label>
            <input id="ap-n" name="note" type="text" maxLength={500} />
          </div>
          <div>
            <button type="submit" className="btn btn-primary adm-b" disabled={busy}>
              Termin anlegen
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
