import Link from "next/link";
import { Pill, MCard, PageTitle } from "@/components/member/ui";
import { backend, getPosts } from "@/lib/api";
import { fmtDate, num, weekdayDate } from "@/lib/format";
import { APPOINTMENT_STATUS, recentSessions, skinSum, upcomingBookings } from "@/lib/member-view";
import { SCORE_KEYS, SCORE_LABELS, scoreTone, weekLabel } from "@/lib/recap";
import { requireSession } from "@/lib/session";
import type { Measurement } from "@/types/member";

export const metadata = { title: "Übersicht | MPT" };

function delta(cur: number | null | undefined, prev: number | null | undefined, digits = 1): string | null {
  if (cur == null || prev == null) return null;
  const d = Math.round((cur - prev) * 10 ** digits) / 10 ** digits;
  return d === 0 ? "±0" : `${d > 0 ? "+" : "−"}${num(Math.abs(d), digits)}`;
}

export default async function OverviewPage() {
  const { token } = await requireSession();
  const [me, posts] = await Promise.all([backend.me(token), getPosts()]);
  const now = new Date();
  const upcoming = upcomingBookings(me.bookings, now).slice(0, 3);
  const recent = recentSessions(me, now, 5);
  const open = me.appointments.filter((a) => a.status === "counter" || a.status === "requested" || (a.status === "confirmed" && a.confirmed && a.confirmed.date >= now.toISOString().slice(0, 10))).slice(0, 3);
  const lastScore = me.recap.entries[0];
  const m = me.measurements;
  const cur: Measurement | undefined = m[m.length - 1];
  const prev: Measurement | undefined = m[m.length - 2];
  const post = posts[0];
  const news = me.news.slice(0, 2);

  return (
    <>
      <PageTitle title="Übersicht" />

      {cur && (
        <div className="kpis">
          <div className="kpi">
            <small>Trainings (30 Tage)</small>
            <b>{me.attendedCount30d}</b>
          </div>
          {cur.weight != null && (
            <div className="kpi">
              <small>Gewicht</small>
              <b>{num(cur.weight)} kg</b>
              <em>{delta(cur.weight, prev?.weight) ?? ""}</em>
            </div>
          )}
          {cur.bodyfat != null && (
            <div className="kpi">
              <small>Körperfett</small>
              <b>{num(cur.bodyfat)} %</b>
              <em>{delta(cur.bodyfat, prev?.bodyfat) ?? ""}</em>
            </div>
          )}
          {skinSum(cur) != null && (
            <div className="kpi">
              <small>Σ Hautfalten</small>
              <b>{num(skinSum(cur) ?? 0)} mm</b>
              <em>{delta(skinSum(cur), prev ? skinSum(prev) : null) ?? ""}</em>
            </div>
          )}
        </div>
      )}

      <div className="mgrid">
        <MCard title="Nächste Buchungen" action={<Link className="linkbtn" href="/mitglieder/buchen">Alle ansehen</Link>}>
          {upcoming.length ? (
            <ul className="rows">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <div>
                    <b>{b.title}</b>
                    <small>
                      {weekdayDate(b.date)} · {b.start} Uhr
                    </small>
                  </div>
                  {b.status === "waitlist" ? <Pill tone="warn">Warteliste</Pill> : <Pill tone="ok">Gebucht</Pill>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Keine kommenden Buchungen.</p>
          )}
          <Link className="btn btn-primary btn-sm" href="/mitglieder/buchen">
            Kurs buchen
          </Link>
        </MCard>

        <MCard title="MPT Score" action={<Link className="linkbtn" href="/mitglieder/recap">Verlauf</Link>}>
          {lastScore ? (
            <>
              <div className="score">
                <b className={`big ${scoreTone(lastScore.score)}`}>{lastScore.score}</b>
                <span>
                  von 100
                  <small>{weekLabel(lastScore)}</small>
                </span>
              </div>
              <ul className="bars" aria-label="Bestandteile des Scores">
                {SCORE_KEYS.map((k) => (
                  <li key={k}>
                    <span>{SCORE_LABELS[k]}</span>
                    <i style={{ ["--w" as string]: `${lastScore.components[k]}%` }} />
                    <em>{lastScore.components[k]}</em>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Noch kein Score. Er entsteht aus deinem Wochenrecap.</p>
          )}
          {me.recap.current ? (
            <p className="okmsg">Wochenrecap dieser Woche erledigt: Score {me.recap.current.score}.</p>
          ) : (
            <Link className="btn btn-primary btn-sm" href="/mitglieder/recap">
              Wochenrecap ausfüllen
            </Link>
          )}
        </MCard>

        <MCard title="Zuletzt dabei">
          {recent.length ? (
            <ul className="rows">
              {recent.map((s) => (
                <li key={s.key}>
                  <div>
                    <b>{s.title}</b>
                    <small>{s.detail}</small>
                  </div>
                  <span className="when">{weekdayDate(s.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Noch keine Einheiten.</p>
          )}
        </MCard>

        <MCard title="PT & Check-up" action={<Link className="linkbtn" href="/mitglieder/buchen?tab=termine">Termine</Link>}>
          {open.length ? (
            <ul className="rows">
              {open.map((a) => {
                const st = APPOINTMENT_STATUS[a.status];
                const slot = a.status === "confirmed" && a.confirmed ? a.confirmed : a.status === "counter" && a.proposal ? a.proposal : a.preferred;
                return (
                  <li key={a.id}>
                    <div>
                      <b>{a.type === "pt" ? "Personal Training" : "Check-up"}</b>
                      <small>
                        {weekdayDate(slot.date)} · {slot.start} Uhr
                      </small>
                    </div>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Keine offenen Terminanfragen.</p>
          )}
          {me.appointments.some((a) => a.status === "counter") && (
            <Link className="btn btn-primary btn-sm" href="/mitglieder/buchen?tab=termine">
              Gegenvorschlag beantworten
            </Link>
          )}
        </MCard>

        {me.member.nextMeasurementDue && (
          <MCard title="Nächste Messung">
            <p className="big-line">{fmtDate(me.member.nextMeasurementDue)}</p>
            <Link className="linkbtn" href="/mitglieder/messungen">
              Zu den Messungen
            </Link>
          </MCard>
        )}

        {news.length > 0 && (
          <MCard title="News">
            <ul className="rows">
              {news.map((n) => (
                <li key={n.id}>
                  <div>
                    {n.link ? (
                      <a className="news" href={n.link}>
                        <b>{n.title}</b>
                        <small>{fmtDate(n.publishAt.slice(0, 10))}</small>
                        <span>{n.text}</span>
                      </a>
                    ) : (
                      <div className="news">
                        <b>{n.title}</b>
                        <small>{fmtDate(n.publishAt.slice(0, 10))}</small>
                        <span>{n.text}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </MCard>
        )}

        {post && (
          <MCard title="Neu im Blog">
            <Link className="news" href={`/blog/${post.slug}`}>
              <b>{post.title}</b>
              <small>{fmtDate(post.date)}</small>
              <span>{post.excerpt}</span>
            </Link>
          </MCard>
        )}
      </div>
    </>
  );
}
