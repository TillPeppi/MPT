"use client";

import { useNow } from "@/hooks/use-now";
import { bannerDays, liveStatus, upcomingExceptions, weekRows } from "@/lib/hours";
import type { Hours } from "@/types/site";

/** Live-Status („Jetzt geöffnet“). Bis zur Hydration neutraler Platzhalter, danach minütlich aktuell. */
export function LiveStatus({ hours }: { hours: Hours }) {
  const now = useNow();
  const s = now === null ? null : liveStatus(hours, new Date(now));
  return (
    <div className={`status-badge ${s?.open ? "" : "closed"}`} role="status">
      <div className="dot" />
      <div>
        <b>{s ? s.title : "Öffnungszeiten"}</b>
        <span>{s ? s.sub : " "}</span>
      </div>
    </div>
  );
}

function Exceptions({ hours, now }: { hours: Hours; now: number | null }) {
  if (now === null) return null;
  return (
    <>
      {upcomingExceptions(hours, new Date(now)).map((t) => (
        <p key={t} className="exc">
          ⚠ {t}
        </p>
      ))}
    </>
  );
}

export function HoursTable({ hours }: { hours: Hours }) {
  const now = useNow();
  const today = now === null ? -1 : new Date(now).getDay();
  return (
    <div className="hours-table">
      {weekRows(hours).map((r) => (
        <div key={r.label} className={r.days.includes(today) ? "today" : ""}>
          <span>{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
      {hours.note && <small>{hours.note}</small>}
      <Exceptions hours={hours} now={now} />
    </div>
  );
}

export function HoursBanner({ hours }: { hours: Hours }) {
  const now = useNow();
  const today = now === null ? -1 : new Date(now).getDay();
  return (
    <>
      <div className="hours-banner reveal">
        {bannerDays(hours).map((d) => (
          <div key={d.day} className={`d ${d.day === today ? "today" : ""}`}>
            <b>{d.label}</b>
            <span>{d.value}</span>
          </div>
        ))}
      </div>
      {hours.note && <p className="note">{hours.note}</p>}
      <Exceptions hours={hours} now={now} />
    </>
  );
}
