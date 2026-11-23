"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookingDialog } from "@/components/member/booking-dialog";
import { LoginForm } from "@/components/member/login-form";
import { Modal } from "@/components/shared/modal";
import { useNow } from "@/hooks/use-now";
import { useMember } from "@/hooks/use-session";
import { DAYS, addDays, endOf, iso, mondayOf, shortDate, toMin } from "@/lib/format";
import { cssVars } from "@/lib/style";
import type { Slot } from "@/types/member";
import type { Course } from "@/types/site";

interface Props {
  courses: Course[];
  variant: string;
  days: number[];
  weeksAhead: number;
  maxSeries?: number;
  cancelHours?: number;
}

/** Anzeige-Daten eines Termins (aus /api/slots, bis zur Antwort aus dem Kurs-Fallback) */
interface View {
  free: number;
  spots: number;
  booked: number;
  past: boolean;
  closed: boolean;
  restricted: boolean;
  allowed: boolean;
  bookable: boolean;
  mine?: "booked" | "waitlist";
  live: boolean;
}

/** Lädt die Belegung einer Woche. `who` ändert sich bei Login/Logout, damit `mine`/`allowed` neu berechnet werden. */
function useSlots(from: string | null, who: string | null | undefined) {
  const [state, setState] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [tick, setTick] = useState(0);
  const key = from && who !== undefined ? `${from}|${who}|${tick}` : null;
  useEffect(() => {
    if (!key || !from) return;
    let alive = true;
    void fetch(`/api/slots?from=${from}&days=7`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ slots: Slot[] }>) : null))
      .then((d) => {
        if (alive && d) setState({ key, slots: d.slots });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key, from]);
  return { slots: state && state.key === key ? state.slots : null, reload: () => setTick((t) => t + 1) };
}

/**
 * Kursplan mit Live-Belegung (GET /api/slots). Ein Klick auf einen Kurs öffnet als Mitglied direkt die Buchung,
 * als Gast den Login. Beschränkte Kurse (B-7) sind für nicht berechtigte Personen gesperrt.
 */
export function ScheduleView({ courses, variant, days, weeksAhead, maxSeries = 12, cancelHours = 12 }: Props) {
  const now = useNow();
  const { session } = useMember();
  const [wk, setWk] = useState(0);
  const [cat, setCat] = useState("");
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const [pick, setPick] = useState<{ course: Course; date: string; full: boolean } | null>(null);
  const [login, setLogin] = useState<{ course: Course; date: string; full: boolean } | null>(null);

  const today = now === null ? null : new Date(now);
  const cats = [...new Set(courses.map((c) => c.category).filter(Boolean))];
  const maxW = Math.max(0, weeksAhead - 1);
  const mon = today ? addDays(mondayOf(today), wk * 7) : null;
  const dateOf = (d: number): string | null => (mon ? iso(addDays(mon, (d + 6) % 7)) : null);
  const visible = courses.filter((c) => !cat || c.category === cat);
  const byDay = (d: number) => visible.filter((c) => Number(c.day) === d).sort((a, z) => toMin(a.start) - toMin(z.start));

  const { slots, reload } = useSlots(mon ? iso(mon) : null, session === undefined ? undefined : (session?.memberId ?? null));

  function slotOf(c: Course, date: string | null): View {
    const live = slots?.find((x) => x.courseId === c.id && x.date === date);
    if (live) {
      const booked = Math.min(live.spots, live.booked);
      return { ...live, booked, free: Math.max(0, live.spots - booked), live: true };
    }
    const past = !!(today && date && new Date(`${date}T${c.start}`) <= today);
    const booked = Math.min(c.spots, c.booked || 0);
    const restricted = !!(c.allowed && (c.allowed.tariffs?.length || c.allowed.groups?.length || c.allowed.memberIds?.length));
    return { spots: c.spots, booked, free: Math.max(0, c.spots - booked), past, closed: false, restricted, allowed: !restricted, bookable: !past, live: false };
  }

  function choose(c: Course, date: string, full: boolean) {
    if (session === undefined) return;
    if (session) setPick({ course: c, date, full });
    else setLogin({ course: c, date, full });
  }

  const first =
    pickedDay !== null && days.includes(pickedDay)
      ? pickedDay
      : wk === 0 && today && days.includes(today.getDay())
        ? today.getDay()
        : days[0];

  function renderCard(c: Course, date: string | null, agenda = false) {
    const sl = slotOf(c, date);
    const full = sl.free === 0;
    const locked = sl.restricted && !sl.allowed;
    const off = sl.past || sl.closed || locked || (sl.live && !sl.bookable && !sl.mine);
    const label = sl.mine
      ? sl.mine === "booked"
        ? "Du bist gebucht"
        : "Du bist auf der Warteliste"
      : sl.past
        ? "vorbei"
        : sl.closed
          ? "Studio geschlossen"
          : locked
            ? "Nur für ausgewählte Mitglieder"
            : !sl.bookable
              ? "noch nicht buchbar"
              : full
                ? "ausgebucht · Warteliste"
                : `${sl.free} frei`;
    const cls = `course ${full && !off && !sl.mine ? "full" : ""} ${off ? "off" : ""} ${sl.mine ? "mine" : ""}`.trim();
    const inner = agenda ? (
      <>
        <span className="t">
          {c.start} – {endOf(c)}
        </span>
        <b>{c.title}</b>
        <span className="s">
          {c.trainer} · {c.category}
        </span>
        <span className="lab">{label}</span>
        <span className="spots" aria-hidden="true">
          {Array.from({ length: sl.spots }, (_, i) => (
            <i key={i} className={i < sl.booked ? "f" : ""} />
          ))}
        </span>
      </>
    ) : (
      <>
        <span className="t">
          {c.start} – {endOf(c)}
        </span>
        <b>{c.title}</b>
        <span className="s">
          <span>{c.trainer}</span>
          {full && !off ? <em>{label}</em> : <span>{label}</span>}
        </span>
      </>
    );
    if (off || sl.mine || !date) {
      return (
        <div key={c.id} className={cls} data-cat={c.category} aria-disabled={off ? "true" : undefined}>
          {inner}
        </div>
      );
    }
    return (
      <button key={c.id} type="button" className={cls} data-cat={c.category} onClick={() => choose(c, date, full)}>
        {inner}
      </button>
    );
  }

  const weekLabel = (() => {
    if (!mon) return " ";
    const sun = addDays(mon, 6);
    return `${shortDate(mon)} – ${shortDate(sun)} ${sun.getFullYear()}`;
  })();
  const todayIso = today ? iso(today) : "";

  return (
    <div>
      <div className="sched-nav">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setWk(0); setPickedDay(null); }}>
          Diese Woche
        </button>
        <div className="wk">
          <button type="button" aria-label="Vorherige Woche" disabled={wk <= 0} onClick={() => { setWk((w) => Math.max(0, w - 1)); setPickedDay(null); }}>
            ‹
          </button>
          <b aria-live="polite">{weekLabel}</b>
          <button type="button" aria-label="Nächste Woche" disabled={wk >= maxW} onClick={() => { setWk((w) => Math.min(maxW, w + 1)); setPickedDay(null); }}>
            ›
          </button>
        </div>
      </div>

      {cats.length > 1 && (
        <div className="sched-filter" role="group" aria-label="Kategorie">
          <button type="button" className={cat === "" ? "on" : ""} aria-pressed={cat === ""} onClick={() => setCat("")}>
            Alle
          </button>
          {cats.map((c) => (
            <button key={c} type="button" className={cat === c ? "on" : ""} aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {variant === "agenda" ? (
        <>
          <div className="agenda-tabs">
            {days.map((d) => (
              <button key={d} type="button" className={d === first ? "on" : ""} aria-pressed={d === first} onClick={() => setPickedDay(d)}>
                {DAYS[d]}
                <small>{mon ? shortDate(addDays(mon, (d + 6) % 7)) : " "}</small>
              </button>
            ))}
          </div>
          <div className="agenda-list">
            {byDay(first).map((c) => renderCard(c, dateOf(first), true))}
            {byDay(first).length === 0 && <div className="empty">Keine Kurse an diesem Tag.</div>}
          </div>
        </>
      ) : (
        <div className="week" style={cssVars({ "--cols": days.length })}>
          {days.map((d) => {
            const date = dateOf(d);
            const isToday = !!date && date === todayIso;
            const list = byDay(d);
            return (
              <div key={d} className={`day ${isToday ? "today" : ""}`}>
                <h4>
                  {DAYS[d]}
                  <small>{isToday ? "Heute" : mon ? shortDate(addDays(mon, (d + 6) % 7)) : " "}</small>
                </h4>
                {list.map((c) => renderCard(c, date))}
                {list.length === 0 && <span className="note">Keine Kurse</span>}
              </div>
            );
          })}
        </div>
      )}
      {pick && (
        <BookingDialog
          course={pick.course}
          date={pick.date}
          full={pick.full}
          maxSeries={maxSeries}
          cancelHours={cancelHours}
          onClose={() => setPick(null)}
          onBooked={reload}
        />
      )}
      {login && (
        <Modal title="Einloggen zum Buchen" text={`${login.course.title} · ${login.course.start} Uhr. Melde dich an, um deinen Platz zu sichern.`} onClose={() => setLogin(null)}>
          <LoginForm
            onSuccess={() => {
              setPick(login);
              setLogin(null);
            }}
          />
          <div className="m-body">
            <p className="note">
              Noch kein Mitglied?{" "}
              <Link className="linkbtn" href="/#kontakt" onClick={() => setLogin(null)}>
                Probetraining anfragen
              </Link>
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
