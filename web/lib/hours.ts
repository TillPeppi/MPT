import type { Hours, OpeningRange } from "@/types/site";
import { DAYS, DAYS_LONG, fmtDate, iso, toMin } from "./format";

export interface LiveStatus {
  open: boolean;
  title: string;
  sub: string;
}

interface DayRanges {
  ranges: OpeningRange[];
  note?: string;
  exception?: boolean;
}

function rangesFor(hours: Hours, date: Date): DayRanges {
  const ex = (hours.exceptions ?? []).find((e) => e.date === iso(date));
  if (ex) {
    return { ranges: ex.closed ? [] : [[ex.from || "00:00", ex.to || "00:00"]], note: ex.note, exception: true };
  }
  return { ranges: hours.week[String(date.getDay())] ?? [] };
}

export function liveStatus(hours: Hours, now: Date): LiveStatus {
  const cur = now.getHours() * 60 + now.getMinutes();
  const today = rangesFor(hours, now);
  const open = today.ranges.find((r) => cur >= toMin(r[0]) && cur < toMin(r[1]));
  if (open) return { open: true, title: `Jetzt geöffnet · bis ${open[1]} Uhr`, sub: today.note || "Gruppentraining" };
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const r = rangesFor(hours, d).ranges.find((x) => i > 0 || toMin(x[0]) > cur);
    if (r) {
      const when = i === 0 ? "heute" : i === 1 ? "morgen" : DAYS_LONG[d.getDay()];
      return {
        open: false,
        title: "Gerade geschlossen",
        sub: `Öffnet ${when} um ${r[0]} Uhr${today.exception && today.note ? ` · ${today.note}` : ""}`,
      };
    }
  }
  return { open: false, title: "Gerade geschlossen", sub: "" };
}

export interface WeekRow {
  label: string;
  value: string;
  days: number[];
}

/** Gleiche Zeiten werden zu Gruppen zusammengefasst („Mo – Fr“) */
export function weekRows(hours: Hours): WeekRow[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const fmt = (d: number) => (hours.week[String(d)] ?? []).map((r) => `${r[0]} – ${r[1]}`).join(", ") || "Geschlossen";
  const groups: { v: string; days: number[] }[] = [];
  for (const d of order) {
    const v = fmt(d);
    const g = groups[groups.length - 1];
    if (g && g.v === v) g.days.push(d);
    else groups.push({ v, days: [d] });
  }
  return groups.map((g) => ({
    label: g.days.length > 1 ? `${DAYS[g.days[0]]} – ${DAYS[g.days[g.days.length - 1]]}` : DAYS_LONG[g.days[0]],
    value: g.v,
    days: g.days,
  }));
}

export function upcomingExceptions(hours: Hours, now: Date): string[] {
  const t = iso(now);
  return (hours.exceptions ?? [])
    .filter((e) => e.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map((e) => `${fmtDate(e.date)}: ${e.closed ? "geschlossen" : `${e.from}–${e.to}`}${e.note ? ` · ${e.note}` : ""}`);
}

export function bannerDays(hours: Hours): { day: number; label: string; value: string }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    day: d,
    label: DAYS[d],
    value: (hours.week[String(d)] ?? []).map((r) => `${r[0]}–${r[1]}`).join(", ") || "geschlossen",
  }));
}
