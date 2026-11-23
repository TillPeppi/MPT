"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Modal } from "@/components/shared/modal";
import { weekdayDate } from "@/lib/format";
import type { BookResult } from "@/types/member";
import type { Course } from "@/types/site";

interface Props {
  course: Course;
  date: string;
  full: boolean;
  maxSeries: number;
  cancelHours: number;
  onClose: () => void;
  /** Nach einer Buchung: Belegung neu laden */
  onBooked: () => void;
}

/** Buchung eines Kurstermins: einmalig oder jede Woche (Serie). Volle Termine landen automatisch auf der Warteliste. */
export function BookingDialog({ course, date, full, maxSeries, cancelHours, onClose, onBooked }: Props) {
  const uid = useId();
  const router = useRouter();
  const [mode, setMode] = useState<"once" | "series">("once");
  const [weeks, setWeeks] = useState(Math.min(4, maxSeries));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BookResult | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, date, weeks: mode === "once" ? 1 : weeks }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<BookResult> & { error?: string };
      if (!res.ok || !data.created) throw new Error(data.error || "Die Buchung hat nicht geklappt.");
      setResult(data as BookResult);
      onBooked();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server.");
    } finally {
      setBusy(false);
    }
  }

  const title = `${course.title}`;
  const sub = `${weekdayDate(date)} · ${course.start} Uhr · ${course.trainer}`;

  if (result) {
    return (
      <Modal title="Erledigt" text={`${title}, ${sub}`} onClose={onClose}>
        <div className="m-body">
          <ul className="result" role="status">
            {result.created.map((c) => (
              <li key={c.id} className={c.status === "waitlist" ? "wl" : "ok"}>
                <b>{weekdayDate(c.date)}</b> {c.status === "waitlist" ? "Warteliste (du rückst automatisch nach)" : "gebucht"}
              </li>
            ))}
            {result.skipped.map((s) => (
              <li key={s.date} className="skip">
                <b>{weekdayDate(s.date)}</b> übersprungen: {s.reason}
              </li>
            ))}
          </ul>
        </div>
        <div className="m-actions">
          <Link className="btn btn-primary" href="/mitglieder/buchen?tab=meine" onClick={onClose}>
            Meine Buchungen
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Schließen
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} text={sub} onClose={onClose}>
      <form onSubmit={submit} className="m-body book-form">
        <fieldset>
          <legend className="sr">Buchungsart</legend>
          <label className="opt">
            <input type="radio" name={`${uid}-m`} checked={mode === "once"} onChange={() => setMode("once")} />
            <span>Nur diesen Termin</span>
          </label>
          <label className="opt">
            <input type="radio" name={`${uid}-m`} checked={mode === "series"} onChange={() => setMode("series")} disabled={maxSeries < 2} />
            <span>
              Jede Woche
              {mode === "series" && (
                <>
                  {" · "}
                  <select aria-label="Anzahl Wochen" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                    {Array.from({ length: maxSeries - 1 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n} Wochen
                      </option>
                    ))}
                  </select>
                </>
              )}
            </span>
          </label>
        </fieldset>
        {full && <p className="note warn">Dieser Termin ist ausgebucht. Du kommst auf die Warteliste und rückst automatisch nach, sobald jemand absagt.</p>}
        <p className="note">Stornieren kannst du bis {cancelHours} Stunden vor Beginn, einzeln oder als ganze Serie.</p>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <div className="m-actions flush">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Einen Moment …" : full ? "Auf die Warteliste" : "Verbindlich buchen"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  );
}
