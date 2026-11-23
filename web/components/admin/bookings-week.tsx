"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pill } from "@/components/member/ui";
import { DAYS_LONG, fmtDate, iso, MONTHS } from "@/lib/format";
import type { AdminParticipant, AdminSlot, AttendanceValue } from "@/types/admin";
import { adminApi, errMsg } from "./api";
import type { MemberOption } from "./fields";
import { useToast } from "./toast";

function useAction() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

const att = (p: AdminParticipant): AttendanceValue => (p.attended === true ? "attended" : p.attended === false ? "noshow" : "open");

function SlotCard({ s, members, autoPromote }: { s: AdminSlot; members: MemberOption[]; autoPromote: boolean }) {
  const { busy, run } = useAction();
  const [pick, setPick] = useState("");
  const [force, setForce] = useState(false);
  const free = s.spots - s.participants.length;
  const setSpots = (n: number | null) => run(() => adminApi("POST", "/api/admin/slots/spots", { courseId: s.courseId, date: s.date, spots: n }), n === null ? "Platzzahl zurückgesetzt." : "Plätze geändert.");
  const available = members.filter((m) => ![...s.participants, ...s.waitlist].some((p) => p.memberId === m.id));

  return (
    <section className="adm-card adm-slot">
      <div className="head">
        <div>
          <b>
            {s.start} Uhr · {s.title}
          </b>
          <div className="muted">
            {s.trainer || "Trainer offen"} · {s.category}
            {s.restricted ? " · beschränkt" : ""}
          </div>
        </div>
        <div className="adm-actions">
          {s.closed && <Pill tone="off">Studio geschlossen</Pill>}
          <Pill tone={free <= 0 ? "warn" : "ok"}>{free <= 0 ? "Voll" : `${free} frei`}</Pill>
        </div>
      </div>

      <div className="adm-actions">
        <div className="adm-cap" role="group" aria-label="Plätze für diesen Termin">
          <button type="button" aria-label="Einen Platz weniger" disabled={busy || s.spots <= 0} onClick={() => setSpots(s.spots - 1)}>
            −
          </button>
          <span>
            {s.participants.length} / {s.spots} Plätze
          </span>
          <button type="button" aria-label="Einen Platz mehr" disabled={busy || s.spots >= 100} onClick={() => setSpots(s.spots + 1)}>
            +
          </button>
        </div>
        {s.overridden && (
          <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => setSpots(null)}>
            Standard ({s.baseSpots}) wiederherstellen
          </button>
        )}
      </div>
      {s.overridden && <small className="hint">Nur für diesen Termin geändert. {autoPromote ? "Mehr Plätze lassen die Warteliste automatisch nachrücken." : "Die automatische Warteliste ist aus: bitte manuell nachrücken lassen."}</small>}

      <div>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Teilnehmer ({s.participants.length})</h3>
        {s.participants.length ? (
          <ul className="adm-people">
            {s.participants.map((p) => (
              <li key={p.bookingId}>
                <div className="nm">
                  {p.memberId ? <Link href={`/admin/kunden/${p.memberId}`}>{p.name}</Link> : p.name}
                  <small>{p.by === "admin" ? "vom Studio eingetragen" : "selbst gebucht"}</small>
                </div>
                <div className="adm-actions">
                  <div className="adm-seg" role="group" aria-label={`Anwesenheit ${p.name}`}>
                    <button type="button" className={att(p) === "attended" ? "on yes" : ""} aria-pressed={att(p) === "attended"} disabled={busy} onClick={() => run(() => adminApi("POST", `/api/admin/bookings/${p.bookingId}/attendance`, { value: att(p) === "attended" ? "open" : "attended" }))}>
                      war da
                    </button>
                    <button type="button" className={att(p) === "noshow" ? "on no" : ""} aria-pressed={att(p) === "noshow"} disabled={busy} onClick={() => run(() => adminApi("POST", `/api/admin/bookings/${p.bookingId}/attendance`, { value: att(p) === "noshow" ? "open" : "noshow" }))}>
                      nicht erschienen
                    </button>
                  </div>
                  <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => window.confirm(`${p.name} wirklich aus diesem Termin austragen? Das geht auch nach der Stornofrist.`) && run(() => adminApi("POST", `/api/admin/bookings/${p.bookingId}/cancel`, {}), "Buchung storniert.")}>
                    Stornieren
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Noch niemand eingetragen.</p>
        )}
      </div>

      {s.waitlist.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Warteliste ({s.waitlist.length})</h3>
          <ul className="adm-people">
            {s.waitlist.map((p, i) => (
              <li key={p.bookingId}>
                <div className="nm">
                  <span>
                    {i + 1}. {p.memberId ? <Link href={`/admin/kunden/${p.memberId}`}>{p.name}</Link> : p.name}
                  </span>
                </div>
                <div className="adm-actions">
                  <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => run(() => adminApi("POST", `/api/admin/bookings/${p.bookingId}/promote`, {}), "Nachgerückt.")}>
                    Nachrücken lassen
                  </button>
                  <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => window.confirm(`${p.name} von der Warteliste nehmen?`) && run(() => adminApi("POST", `/api/admin/bookings/${p.bookingId}/cancel`, {}), "Von der Warteliste entfernt.")}>
                    Entfernen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="adm-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pick) return;
          void run(async () => {
            const r = await adminApi<{ status: string }>("POST", "/api/admin/bookings", { courseId: s.courseId, date: s.date, memberId: pick, force });
            setPick("");
            return r;
          }, force ? "Kunde eingetragen (über die Platzzahl hinaus erlaubt)." : "Kunde eingetragen (bei vollem Kurs: Warteliste).");
        }}
      >
        <select aria-label={`Kunde in ${s.title} eintragen`} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Kunde eintragen …</option>
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="adm-check">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          auch über die Platzzahl
        </label>
        <button type="submit" className="btn btn-primary adm-b sm" disabled={busy || !pick}>
          Eintragen
        </button>
      </form>
    </section>
  );
}

export function BookingsWeek({ from, prev, next, slots, members, autoPromote }: { from: string; prev: string; next: string; slots: AdminSlot[]; members: MemberOption[]; autoPromote: boolean }) {
  const monday = new Date(`${from}T12:00:00`);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const byDate = new Map<string, AdminSlot[]>();
  for (const s of slots) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  const dates = [...byDate.keys()].sort();
  const today = iso(new Date());

  return (
    <>
      <div className="adm-week">
        <Link className="btn btn-ghost adm-b" href={`/admin/buchungen?from=${prev}`}>
          ← Vorwoche
        </Link>
        <Link className="btn btn-ghost adm-b" href="/admin/buchungen">
          Diese Woche
        </Link>
        <Link className="btn btn-ghost adm-b" href={`/admin/buchungen?from=${next}`}>
          Nächste Woche →
        </Link>
        <b>
          {monday.getDate()}. {MONTHS[monday.getMonth()]} bis {sunday.getDate()}. {MONTHS[sunday.getMonth()]} {sunday.getFullYear()}
        </b>
      </div>
      {dates.length === 0 && <p className="adm-empty">In dieser Woche gibt es keine Kurse.</p>}
      {dates.map((d) => {
        const dt = new Date(`${d}T12:00:00`);
        return (
          <section key={d} className="adm-day">
            <h3>
              {DAYS_LONG[dt.getDay()]} <small>{fmtDate(d)}{d === today ? " · heute" : ""}</small>
            </h3>
            <div className="adm-grid" style={{ marginBottom: 0 }}>
              {(byDate.get(d) ?? []).map((s) => (
                <SlotCard key={`${s.courseId}|${s.date}`} s={s} members={members} autoPromote={autoPromote} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
