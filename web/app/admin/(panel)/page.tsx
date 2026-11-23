import Link from "next/link";
import { AdminTitle, Card } from "@/components/admin/ui";
import { Pill } from "@/components/member/ui";
import { adminBackend } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { fmtDate, weekdayDate } from "@/lib/format";

export const metadata = { title: "Übersicht" };

export default async function DashboardPage() {
  const { admin, token } = await requireAdmin();
  const d = await adminBackend.dashboard(token);
  const typeLabel = (t: string) => (t === "pt" ? "Personal Training" : "Check-up");

  return (
    <>
      <AdminTitle title={`Hallo ${admin.name.split(" ")[0]}`} text={`Heute ist ${weekdayDate(d.today)}. Das steht an.`} />
      <div className="adm-grid">
        <Card title="Heute im Studio" action={<Link className="linkbtn" href="/admin/buchungen">Wochenplan</Link>}>
          {d.todayBookings.length ? (
            <ul className="adm-list">
              {d.todayBookings.map((b) => (
                <li key={b.courseId}>
                  <Link className="t" href={`/admin/buchungen?from=${d.today}`}>
                    <b>
                      {b.start} · {b.title}
                    </b>
                    <small>
                      {b.trainer || "Trainer offen"}
                      {b.waitlist > 0 ? ` · ${b.waitlist} auf der Warteliste` : ""}
                    </small>
                  </Link>
                  {b.closed ? <Pill tone="off">Geschlossen</Pill> : <Pill tone={b.booked >= b.spots ? "warn" : "ok"}>{`${b.booked}/${b.spots}`}</Pill>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">Heute finden keine Kurse statt.</p>
          )}
        </Card>

        <Card title="Offene Terminanfragen" action={<Link className="linkbtn" href="/admin/termine">Alle Termine</Link>}>
          {d.openAppointments.length ? (
            <ul className="adm-list">
              {d.openAppointments.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link className="t" href="/admin/termine">
                    <b>{a.name}</b>
                    <small>
                      {typeLabel(a.type)} · {weekdayDate(a.preferred.date)} {a.preferred.start} Uhr
                    </small>
                  </Link>
                  <Pill tone="info">Angefragt</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">Keine offenen Anfragen.</p>
          )}
        </Card>

        <Card title="Neue Shop-Anfragen" action={<Link className="linkbtn" href="/admin/anfragen">Alle Anfragen</Link>}>
          {d.newOrders.length ? (
            <ul className="adm-list">
              {d.newOrders.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link className="t" href="/admin/anfragen">
                    <b>
                      {o.no} · {o.customer.name}
                    </b>
                    <small>
                      {o.items.length} {o.items.length === 1 ? "Position" : "Positionen"} · {fmtDate(o.createdAt.slice(0, 10))}
                    </small>
                  </Link>
                  <Pill tone="info">Neu</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">Keine neuen Anfragen.</p>
          )}
        </Card>

        <Card title="Messung fällig (7 Tage)" action={<Link className="linkbtn" href="/admin/kunden">Kunden</Link>}>
          {d.measurementsDue.length ? (
            <ul className="adm-list">
              {d.measurementsDue.slice(0, 8).map((m) => (
                <li key={m.memberId}>
                  <Link className="t" href={`/admin/kunden/${m.memberId}?tab=messungen`}>
                    <b>{m.name}</b>
                    <small>fällig am {fmtDate(m.due)}</small>
                  </Link>
                  <Pill tone={m.due < d.today ? "warn" : "info"}>{m.due < d.today ? "Überfällig" : "Bald"}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">Keine Messungen fällig.</p>
          )}
        </Card>
      </div>
    </>
  );
}
