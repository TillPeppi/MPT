import { LineChart } from "@/components/member/charts";
import { RecapForm } from "@/components/member/recap-form";
import { MCard, PageTitle } from "@/components/member/ui";
import { backend } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { SCORE_KEYS, SCORE_LABELS, scoreTone, weekLabel } from "@/lib/recap";
import { requireSession } from "@/lib/session";
import type { RecapConfig, RecapEntry } from "@/types/member";

export const metadata = { title: "Wochenrecap | MPT" };

function answerText(q: RecapConfig["questions"][number], e: RecapEntry, max: number): string | null {
  const v = e.answers[q.id];
  if (v === undefined || v === "") return null;
  if (typeof v === "boolean") return v ? "Ja" : "Nein";
  return q.type === "scale" ? `${v} von ${max}` : String(v);
}

function ScoreBars({ entry }: { entry: RecapEntry }) {
  return (
    <ul className="bars" aria-label="Bestandteile des Scores">
      {SCORE_KEYS.map((k) => (
        <li key={k}>
          <span>{SCORE_LABELS[k]}</span>
          <i style={{ ["--w" as string]: `${entry.components[k]}%` }} />
          <em>{entry.components[k]}</em>
        </li>
      ))}
    </ul>
  );
}

export default async function RecapPage() {
  const { token } = await requireSession();
  const { config, current, entries, currentWeek } = await backend.recap(token);
  const history = [...entries].reverse();

  return (
    <>
      <PageTitle title="Wochenrecap" text="Ein kurzer Rückblick pro Woche. Aus deinen Antworten entsteht dein MPT Performance Score." />

      {current ? (
        <MCard title={`Erledigt: ${weekLabel(current)}`}>
          <div className="score">
            <b className={`big ${scoreTone(current.score)}`}>{current.score}</b>
            <span>
              von 100
              <small>MPT Performance Score</small>
            </span>
          </div>
          <ScoreBars entry={current} />
          <dl className="answers">
            {config.questions.map((q) => {
              const t = answerText(q, current, config.scale.max);
              return t ? (
                <div key={q.id}>
                  <dt>{q.label}</dt>
                  <dd>{t}</dd>
                </div>
              ) : null;
            })}
            <div>
              <dt>Trainingseinheiten in dieser Woche</dt>
              <dd>
                {current.sessions} von max. {config.maxSessions} gewertet
              </dd>
            </div>
          </dl>
          <p className="note">Dein Recap ist abgeschickt und nicht mehr änderbar. Der nächste ist ab Montag möglich.</p>
        </MCard>
      ) : (
        <MCard title={`Diese Woche (${currentWeek.replace("-W", " / KW ")})`}>
          <RecapForm config={config} />
        </MCard>
      )}

      <h2 className="sub">Score-Verlauf</h2>
      {history.length === 0 ? (
        <p className="empty">Noch kein Score. Er erscheint nach deinem ersten Recap.</p>
      ) : (
        <div className="mgrid two">
          <MCard title="Verlauf">
            <LineChart points={history.map((e) => ({ label: e.weekStart, value: e.score }))} title="MPT Performance Score" digits={0} domain={[0, 100]} />
          </MCard>
          <MCard title="Wochen">
            <ul className="rows">
              {entries.map((e) => (
                <li key={e.id}>
                  <div>
                    <b>{weekLabel(e)}</b>
                    <small>ab {fmtDate(e.weekStart)}</small>
                  </div>
                  <b className={`big sm ${scoreTone(e.score)}`}>{e.score}</b>
                </li>
              ))}
            </ul>
          </MCard>
        </div>
      )}
    </>
  );
}
