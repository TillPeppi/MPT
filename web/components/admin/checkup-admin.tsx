"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fmtDate, iso, weekdayDate } from "@/lib/format";
import { comparePlans, setText } from "@/lib/plan-compare";
import { weekLabel } from "@/lib/recap";
import type { CheckUp, CheckupPoint } from "@/types/admin";
import type { Measurement, Plan, RecapEntry, RecapQuestion } from "@/types/member";
import type { MeasurePoint } from "@/types/site";
import { adminApi, errMsg } from "./api";
import { blankMeasure, isBlankMeasure, MeasureFields, measureToPayload, type MeasureDraft } from "./measure-fields";
import { useToast } from "./toast";
import { useUnsavedGuard } from "./use-unsaved";

const NEW = "__new__";
const NEW_MEASURE = "__new_measure__";

interface Props {
  memberId: string;
  checkups: CheckUp[];
  measurements: Measurement[];
  plans: Plan[];
  recaps: RecapEntry[];
  points: CheckupPoint[];
  questions: RecapQuestion[];
  measure: { skinfolds: MeasurePoint[]; girths: MeasurePoint[] };
}

/** Plan zum Stichtag (letzter Start <= Datum) und sein Vorgänger */
function plansAt(plans: Plan[], date: string): { current: Plan | null; previous: Plan | null } {
  const sorted = [...plans].sort((a, z) => z.start.localeCompare(a.start));
  const idx = Math.max(0, sorted.findIndex((p) => p.start <= date));
  return { current: sorted[idx] ?? null, previous: sorted[idx + 1] ?? null };
}

function CheckupForm({ initial, props, onDone }: { initial: CheckUp | null; props: Props; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { memberId, measurements, plans, recaps, points, questions, checkups } = props;
  const [date, setDate] = useState(initial?.date ?? iso(new Date()));
  const [measureSel, setMeasureSel] = useState<string>(initial?.measurementId ?? "");
  const [draft, setDraft] = useState<MeasureDraft>(blankMeasure);
  const [screen, setScreen] = useState<CheckUp["screen"]>(initial?.screen ?? {});
  const [note, setNote] = useState(initial?.note ?? "");
  const [planId, setPlanId] = useState<string>(initial?.planId ?? "");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty);
  const touch = <T,>(fn: (v: T) => void) => (v: T) => {
    setDirty(true);
    fn(v);
  };

  const { current, previous } = useMemo(() => {
    const auto = plansAt(plans, date);
    const cur = planId ? (plans.find((p) => p.id === planId) ?? auto.current) : auto.current;
    const sorted = [...plans].sort((a, z) => z.start.localeCompare(a.start));
    const prev = cur ? (sorted[sorted.findIndex((p) => p.id === cur.id) + 1] ?? null) : null;
    return { current: cur, previous: prev };
  }, [plans, date, planId]);
  const rows = useMemo(() => (current ? comparePlans(current, previous) : []), [current, previous]);

  /** Schlaf-Antworten seit dem letzten Check-up davor */
  const sleepQs = useMemo(() => {
    const sleep = questions.filter((q) => q.score === "schlaf" && q.type === "yesno");
    return sleep.length ? sleep : questions.filter((q) => q.type === "yesno");
  }, [questions]);
  const sinceRecaps = useMemo(() => {
    const before = checkups.filter((c) => c.id !== initial?.id && c.date < date).sort((a, z) => z.date.localeCompare(a.date))[0];
    return recaps.filter((r) => (!before || r.weekStart > before.date) && r.weekStart <= date).sort((a, z) => a.weekStart.localeCompare(z.weekStart));
  }, [recaps, checkups, initial?.id, date]);

  const groups = [...new Set(points.map((p) => p.group))];
  const flagged = Object.values(screen).filter((f) => f.flag).length;

  async function save() {
    setBusy(true);
    try {
      let measurementId: string | null = measureSel && measureSel !== NEW_MEASURE ? measureSel : null;
      if (measureSel === NEW_MEASURE) {
        if (isBlankMeasure(draft)) throw new Error("Bitte trage mindestens einen Messwert ein oder wähle „Keine Messung“.");
        const m = await adminApi<{ id: string }>("POST", `/api/admin/members/${memberId}/measurements`, measureToPayload({ ...draft, date }));
        measurementId = m.id;
      }
      await adminApi("POST", `/api/admin/members/${memberId}/checkups`, { id: initial?.id, date, measurementId, planId: planId || current?.id || null, screen, note });
      toast.success("Check-up gespeichert.");
      setDirty(false);
      router.refresh();
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!initial || !window.confirm("Check-up wirklich löschen?")) return;
    setBusy(true);
    try {
      await adminApi("DELETE", `/api/admin/members/${memberId}/checkups/${initial.id}`);
      toast.success("Check-up gelöscht.");
      setDirty(false);
      router.refresh();
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="adm-form wide">
      <p className="hint">Check-up-Notizen sind intern. Der Kunde sieht nur die Messwerte (im Bereich Messungen).</p>
      <div className="adm-row">
        <div className="adm-field">
          <label htmlFor="cu-d">Datum</label>
          <input id="cu-d" type="date" value={date} onChange={(e) => touch(setDate)(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="cu-m">Messung</label>
          <select id="cu-m" value={measureSel} onChange={(e) => touch(setMeasureSel)(e.target.value)}>
            <option value="">Keine Messung verknüpft</option>
            {measurements.map((m) => (
              <option key={m.id} value={m.id}>
                Messung vom {fmtDate(m.date)}
                {m.weight != null ? ` · ${m.weight} kg` : ""}
              </option>
            ))}
            <option value={NEW_MEASURE}>+ Neue Messung jetzt eintragen</option>
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="cu-p">Plan</label>
          <select id="cu-p" value={planId} onChange={(e) => touch(setPlanId)(e.target.value)}>
            <option value="">Automatisch (Plan zum Datum)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (ab {fmtDate(p.start)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {measureSel === NEW_MEASURE && (
        <section className="adm-card">
          <header>
            <h3>Neue Messung</h3>
          </header>
          <MeasureFields idp="cu-ms" value={{ ...draft, date }} onChange={touch((d: MeasureDraft) => setDraft(d))} skinfolds={props.measure.skinfolds} girths={props.measure.girths} />
        </section>
      )}

      <section className="adm-card">
        <header>
          <h3>Planübersicht</h3>
        </header>
        {current ? (
          <>
            <p className="muted">
              Aktueller Plan: <b>{current.title}</b> (ab {fmtDate(current.start)}){previous ? <> · Vorplan: <b>{previous.title}</b></> : " · kein Vorplan"}
            </p>
            {rows.length ? (
              <div className="tscroll">
                <table className="adm-cmp">
                  <thead>
                    <tr>
                      <th>Übung</th>
                      <th>Vorplan (bester Satz)</th>
                      <th>Aktueller Plan (bester Satz)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <span className="acc">{r.group}</span> {r.name}
                        </td>
                        <td>{r.previous ? `${setText(r.previous.set)} (${fmtDate(r.previous.date)})` : "–"}</td>
                        <td>{r.current ? `${setText(r.current.set)} (${fmtDate(r.current.date)})` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="adm-empty">Der Plan hat noch keine Übungen.</p>
            )}
          </>
        ) : (
          <p className="adm-empty">Es gibt noch keinen Plan.</p>
        )}
      </section>

      <section className="adm-card">
        <header>
          <h3>Screen Überkopfkniebeuge</h3>
          {flagged > 0 && <span className="pill warn">{flagged} auffällig</span>}
        </header>
        {groups.map((g) => (
          <div key={g} className="adm-screen">
            <b>{g}</b>
            {points.filter((p) => p.group === g).map((p) => {
              const f = screen[p.id] ?? { flag: false, note: "" };
              return (
                <div key={p.id} className={`pt ${f.flag ? "flag" : ""}`}>
                  <span>{p.label}</span>
                  <label className="adm-check">
                    <input type="checkbox" checked={f.flag} onChange={(e) => touch(setScreen)({ ...screen, [p.id]: { ...f, flag: e.target.checked } })} />
                    auffällig
                  </label>
                  <input type="text" aria-label={`Notiz ${p.label}`} placeholder="Notiz" maxLength={500} value={f.note} onChange={(e) => touch(setScreen)({ ...screen, [p.id]: { ...f, note: e.target.value } })} />
                </div>
              );
            })}
          </div>
        ))}
        {points.length === 0 && <p className="adm-empty">Keine Screen-Punkte konfiguriert (Einstellungen: Check-up).</p>}
      </section>

      <section className="adm-card">
        <header>
          <h3>Schlaf-Antworten aus den Wochenrecaps</h3>
        </header>
        {sinceRecaps.length && sleepQs.length ? (
          <div className="tscroll">
            <table className="adm-cmp">
              <thead>
                <tr>
                  <th>Woche</th>
                  {sleepQs.map((q) => (
                    <th key={q.id}>{q.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sinceRecaps.map((r) => (
                  <tr key={r.id}>
                    <td>{weekLabel(r)}</td>
                    {sleepQs.map((q) => {
                      const a = r.answers[q.id];
                      return <td key={q.id}>{a === true ? "Ja" : a === false ? "Nein" : "–"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-empty">Seit dem letzten Check-up gibt es keine Recap-Antworten.</p>
        )}
      </section>

      <div className="adm-field">
        <label htmlFor="cu-n">Notizen zum Check-up (intern)</label>
        <textarea id="cu-n" rows={4} maxLength={3000} value={note} onChange={(e) => touch(setNote)(e.target.value)} />
      </div>

      <div className="adm-bar">
        <button type="button" className="btn btn-primary adm-b" disabled={busy} onClick={save}>
          {busy ? "Speichert …" : "Check-up speichern"}
        </button>
        <button type="button" className="btn btn-ghost adm-b" disabled={busy} onClick={() => { if (!dirty || window.confirm("Eingaben verwerfen?")) { setDirty(false); onDone(); } }}>
          Abbrechen
        </button>
        {dirty && <span className="dirty" role="status">Ungespeicherte Änderungen</span>}
        <span className="spacer" />
        {initial && (
          <button type="button" className="btn danger adm-b" disabled={busy} onClick={del}>
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}

export function CheckupAdmin(props: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const current = editing && editing !== NEW ? props.checkups.find((c) => c.id === editing) : undefined;
  const pointLabel = (id: string) => props.points.find((p) => p.id === id)?.label ?? id;

  return (
    <section className="adm-card">
      <header>
        <h2>Check-ups</h2>
        {editing === null && (
          <button type="button" className="btn btn-primary adm-b" onClick={() => setEditing(NEW)}>
            + Neuer Check-up
          </button>
        )}
      </header>
      {editing !== null ? (
        <CheckupForm key={editing} initial={current ?? null} props={props} onDone={() => setEditing(null)} />
      ) : props.checkups.length ? (
        <ul className="adm-list">
          {props.checkups.map((c) => {
            const flags = Object.entries(c.screen).filter(([, f]) => f.flag).map(([id]) => pointLabel(id));
            return (
              <li key={c.id}>
                <div className="t">
                  <b>{weekdayDate(c.date)} {new Date(`${c.date}T12:00:00`).getFullYear()}</b>
                  <small>{flags.length ? `Auffällig: ${flags.join(", ")}` : "Keine Auffälligkeiten"}{c.measurementId ? " · mit Messung" : ""}</small>
                </div>
                <button type="button" className="btn btn-ghost adm-b sm" onClick={() => setEditing(c.id)}>
                  Öffnen
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="adm-empty">Noch kein Check-up.</p>
      )}
    </section>
  );
}
