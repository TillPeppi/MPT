import Link from "next/link";
import { LineChart } from "@/components/member/charts";
import { Pill } from "@/components/member/ui";
import { eur, fmtDate, weekdayDate } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/member-view";
import { SCORE_KEYS, SCORE_LABELS, scoreTone, weekLabel } from "@/lib/recap";
import type { AdminMemberDetail } from "@/types/admin";
import { Card } from "./ui";

/** Übersicht pro Kunde: Buchungen mit Anwesenheit, Recaps und Score-Verlauf, Shop-Anfragen */
export function MemberOverview({ d }: { d: AdminMemberDetail }) {
  const today = new Date().toISOString().slice(0, 10);
  const past = d.bookings.filter((b) => b.status !== "cancelled" && b.date <= today).slice(0, 12);
  const upcoming = d.bookings.filter((b) => b.status !== "cancelled" && b.date > today).sort((a, z) => a.date.localeCompare(z.date)).slice(0, 5);
  const att = d.bookings.filter((b) => b.status === "booked" && b.date <= today);
  const attended = att.filter((b) => b.attended === true).length;
  const noshow = att.filter((b) => b.attended === false).length;
  const chronological = [...d.recaps].sort((a, z) => a.weekStart.localeCompare(z.weekStart));
  const recent = [...d.recaps].sort((a, z) => z.weekStart.localeCompare(a.weekStart));

  return (
    <div className="adm-grid">
      <Card title="Kommende Buchungen">
        {upcoming.length ? (
          <ul className="adm-list">
            {upcoming.map((b) => (
              <li key={b.id}>
                <div className="t">
                  <b>{b.title}</b>
                  <small>
                    {weekdayDate(b.date)} · {b.start} Uhr
                  </small>
                </div>
                <Pill tone={b.status === "waitlist" ? "warn" : "ok"}>{b.status === "waitlist" ? "Warteliste" : "Gebucht"}</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Keine kommenden Buchungen.</p>
        )}
      </Card>

      <Card title="Letzte Termine & Anwesenheit">
        <p className="muted">
          {attended} anwesend · {noshow} nicht erschienen · {att.length - attended - noshow} nicht erfasst
        </p>
        {past.length ? (
          <ul className="adm-list">
            {past.map((b) => (
              <li key={b.id}>
                <div className="t">
                  <b>{b.title}</b>
                  <small>
                    {weekdayDate(b.date)} · {b.start} Uhr
                  </small>
                </div>
                {b.status === "waitlist" ? <Pill tone="warn">Warteliste</Pill> : b.attended === true ? <Pill tone="ok">War da</Pill> : b.attended === false ? <Pill tone="warn">Nicht erschienen</Pill> : <Pill tone="off">Nicht erfasst</Pill>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Noch keine Termine.</p>
        )}
        <Link className="linkbtn" href="/admin/buchungen">
          Zum Wochenplan
        </Link>
      </Card>

      <Card title="Wochenrecaps & Score">
        {chronological.length >= 2 && <LineChart title="MPT Score im Verlauf" unit="" digits={0} domain={[0, 100]} points={chronological.slice(-12).map((r) => ({ label: r.weekStart, value: r.score }))} />}
        {recent.length ? (
          <ul className="adm-list">
            {recent.slice(0, 8).map((r) => (
              <li key={r.id}>
                <div className="t">
                  <b>{weekLabel(r)}</b>
                  <small>{SCORE_KEYS.map((k) => `${SCORE_LABELS[k]} ${r.components[k]}`).join(" · ")}</small>
                </div>
                <Pill tone={scoreTone(r.score) === "good" ? "ok" : scoreTone(r.score) === "mid" ? "info" : "warn"}>{r.score}</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Noch kein Recap abgeschickt.</p>
        )}
      </Card>

      <Card title="Shop-Anfragen">
        {d.orders.length ? (
          <ul className="adm-list">
            {d.orders.map((o) => (
              <li key={o.id}>
                <Link className="t" href="/admin/anfragen">
                  <b>
                    {o.no} · {eur(o.total)}
                  </b>
                  <small>
                    {fmtDate(o.createdAt.slice(0, 10))} · {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </small>
                </Link>
                <Pill tone={ORDER_STATUS[o.status].tone}>{o.status === "bereit" ? "Bereit" : ORDER_STATUS[o.status].label}</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Keine Anfragen.</p>
        )}
      </Card>
    </div>
  );
}
