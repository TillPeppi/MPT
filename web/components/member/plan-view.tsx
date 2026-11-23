import { fmtDate, num } from "@/lib/format";
import type { Exercise, Plan, PlanDay, SetValue, TrainingLog } from "@/types/member";
import { Sparkline } from "./charts";

const MAX_LOG_COLS = 6;

const fmtSec = (s: number): string => (s >= 120 && s % 60 === 0 ? `${s / 60} min` : s >= 90 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min` : `${s} s`);

/** Ein Satz als Text; nur ausgefüllte Felder (Wdh., kg, Zeit, Distanz, kcal) */
export function fmtSet(s: SetValue): string {
  const parts: string[] = [];
  if (s.reps != null && s.kg != null) parts.push(`${s.reps}×${num(s.kg)} kg`);
  else if (s.reps != null) parts.push(`${s.reps} Wdh.`);
  else if (s.kg != null) parts.push(`${num(s.kg)} kg`);
  if (s.sec != null) parts.push(fmtSec(s.sec));
  if (s.m != null) parts.push(`${num(s.m, 0)} m`);
  if (s.kcal != null) parts.push(`${num(s.kcal, 0)} kcal`);
  return parts.join(" · ");
}

interface Progress {
  values: number[];
  label: string;
  best: string;
}

/** Fortschritt je Übung: geschätztes 1RM (Epley) bei Gewicht × Wdh., sonst Zeit, Distanz oder Kalorien */
function progressOf(ex: Exercise, logs: TrainingLog[]): Progress | null {
  const sessions = logs.filter((l) => l.sets[ex.id]?.length).sort((a, z) => a.date.localeCompare(z.date));
  if (sessions.length < 2) return null;
  const pick = (sets: SetValue[], kind: "1rm" | "sec" | "m" | "kcal"): number | null => {
    const vals = sets
      .map((s) => {
        if (kind === "1rm") return s.kg != null && s.kg > 0 && s.reps ? s.kg * (1 + s.reps / 30) : null;
        const v = s[kind];
        return v ?? null;
      })
      .filter((v): v is number => v !== null);
    return vals.length ? Math.max(...vals) : null;
  };
  const all = sessions.flatMap((l) => l.sets[ex.id]);
  const kind = all.some((s) => s.kg != null && s.kg > 0 && s.reps) ? "1rm" : all.some((s) => s.sec != null) ? "sec" : all.some((s) => s.m != null) ? "m" : all.some((s) => s.kcal != null) ? "kcal" : null;
  if (!kind) return null;
  const values = sessions.map((l) => pick(l.sets[ex.id], kind)).filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  const best = Math.max(...values);
  const label = kind === "1rm" ? "Geschätztes 1RM" : kind === "sec" ? "Beste Zeit" : kind === "m" ? "Beste Distanz" : "Meiste Kalorien";
  const text = kind === "1rm" ? `${num(best)} kg` : kind === "sec" ? fmtSec(Math.round(best)) : kind === "m" ? `${num(best, 0)} m` : `${num(best, 0)} kcal`;
  return { values, label, best: text };
}

function DayTable({ day, plan }: { day: PlanDay; plan: Plan }) {
  const logs = plan.logs.filter((l) => l.dayId === day.id).sort((a, z) => a.date.localeCompare(z.date));
  const shown = logs.slice(-MAX_LOG_COLS);
  return (
    <div className="daytable">
      <h4>{day.name}</h4>
      <div className="tscroll" tabIndex={0} role="region" aria-label={`Trainingsplan ${day.name}`}>
        <table>
          <thead>
            <tr>
              <th scope="col" className="stick">Übung</th>
              <th scope="col">Sätze</th>
              <th scope="col">WH</th>
              <th scope="col">Tempo</th>
              <th scope="col">Pause</th>
              {shown.map((l) => (
                <th key={l.id} scope="col" className="logcol">
                  {fmtDate(l.date).replace(/ \d{4}$/, "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {day.exercises.map((ex) => {
              const pr = progressOf(ex, plan.logs.filter((l) => l.dayId === day.id));
              return (
                <tr key={ex.id}>
                  <th scope="row" className="stick">
                    <span className="grp">{ex.group}</span>
                    <span className="exn">
                      {ex.name}
                      {ex.note && <small>{ex.note}</small>}
                      {pr && (
                        <small className="prog">
                          <Sparkline values={pr.values} label={`${pr.label}: ${pr.values.length} Einheiten, zuletzt ${pr.best}`} />
                          {pr.label} {pr.best}
                        </small>
                      )}
                    </span>
                  </th>
                  <td>{ex.sets}</td>
                  <td>{ex.reps}</td>
                  <td>{ex.tempo}</td>
                  <td>{ex.rest ? `${ex.rest} s` : "–"}</td>
                  {shown.map((l) => {
                    const sets = l.sets[ex.id] ?? [];
                    return (
                      <td key={l.id} className="logcell">
                        {sets.length ? sets.map((s, i) => <span key={i}>{fmtSet(s) || "–"}</span>) : "–"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {logs.length > shown.length && <p className="note">Zeigt die letzten {shown.length} von {logs.length} Trainings.</p>}
      {logs.length === 0 && <p className="note">Noch kein Training eingetragen. Deine Werte trägt dein Coach ein.</p>}
    </div>
  );
}

export function PlanView({ plan }: { plan: Plan }) {
  return (
    <div className="plan">
      <div className="plan-head">
        <h3>{plan.title}</h3>
        <span className="muted">
          {fmtDate(plan.start)}
          {plan.end ? ` – ${fmtDate(plan.end)}` : ""}
        </span>
      </div>
      {plan.goal && <p className="note flush">Ziel: {plan.goal}</p>}
      {plan.note && <p className="note flush">{plan.note}</p>}
      {plan.days.map((d) => (
        <DayTable key={d.id} day={d} plan={plan} />
      ))}
    </div>
  );
}
