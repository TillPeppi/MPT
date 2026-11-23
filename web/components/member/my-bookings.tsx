"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNow } from "@/hooks/use-now";
import { weekdayDate } from "@/lib/format";
import { bookingStart } from "@/lib/member-view";
import type { Booking } from "@/types/member";
import { Pill } from "./ui";

interface Props {
  bookings: Booking[];
  cancelHours: number;
}

export function MyBookings({ bookings, cancelHours }: Props) {
  const router = useRouter();
  const now = useNow();
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const upcoming = active.filter((b) => (now === null ? true : bookingStart(b).getTime() > now));
  const past = active.filter((b) => !upcoming.includes(b)).sort((a, z) => `${z.date} ${z.start}`.localeCompare(`${a.date} ${a.start}`));
  const canCancel = (b: Booking): boolean => now === null || bookingStart(b).getTime() - now >= cancelHours * 3_600_000;

  async function cancel(b: Booking, series: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/member/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, series }),
      });
      const data = (await res.json().catch(() => ({}))) as { cancelled?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Stornieren hat nicht geklappt.");
      setMsg({ ok: true, text: data.cancelled === 1 ? "Buchung storniert." : `${data.cancelled} Buchungen storniert.` });
      setAsking(null);
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Keine Verbindung zum Server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mybook">
      {msg && (
        <p className={msg.ok ? "okmsg" : "err"} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}
      {upcoming.length === 0 ? (
        <p className="empty">Keine kommenden Buchungen.</p>
      ) : (
        <ul className="rows big">
          {upcoming.map((b) => (
            <li key={b.id}>
              <div>
                <b>{b.title}</b>
                <small>
                  {weekdayDate(b.date)} · {b.start} Uhr{b.seriesId ? " · Serie" : ""}
                </small>
              </div>
              <div className="row-actions">
                {b.status === "waitlist" ? <Pill tone="warn">Warteliste</Pill> : <Pill tone="ok">Gebucht</Pill>}
                {asking === b.id ? (
                  <span className="ask">
                    {b.seriesId ? (
                      <>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => cancel(b, false)}>
                          Nur diesen
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => cancel(b, true)}>
                          Ganze Serie
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => cancel(b, false)}>
                        Ja, stornieren
                      </button>
                    )}
                    <button type="button" className="linkbtn" onClick={() => setAsking(null)}>
                      Zurück
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={!canCancel(b)}
                    title={canCancel(b) ? undefined : `Stornieren nur bis ${cancelHours} Stunden vor Beginn`}
                    onClick={() => setAsking(b.id)}
                  >
                    Stornieren
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <details className="fold">
          <summary>Vergangene Buchungen ({past.length})</summary>
          <ul className="rows">
            {past.map((b) => (
              <li key={b.id}>
                <div>
                  <b>{b.title}</b>
                  <small>
                    {weekdayDate(b.date)} · {b.start} Uhr
                  </small>
                </div>
                <Pill tone="off">{b.status === "waitlist" ? "Warteliste" : "Teilgenommen"}</Pill>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
