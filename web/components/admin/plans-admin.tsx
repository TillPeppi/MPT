"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Pill } from "@/components/member/ui";
import { fmtDate, iso, weekdayDate } from "@/lib/format";
import { defaultColumns, setText, type SetCol } from "@/lib/plan-compare";
import type { Exercise, Plan, PlanDay, SetValue, TrainingLog } from "@/types/member";
import { adminApi, errMsg } from "./api";
import { useToast } from "./toast";
import { useUnsavedGuard } from "./use-unsaved";

const NEW = "__new__";
const uid = (): string => Math.random().toString(36).slice(2, 10);

type PlanDraft = Omit<Plan, "logs"> & { logs?: TrainingLog[] };

const blankPlan = (n: number): PlanDraft => ({
  id: "",
  title: `Plan ${n}`,
  status: "active",
  start: iso(new Date()),
  end: null,
  goal: "",
  note: "",
  days: [{ id: `d_${uid()}`, name: "Einheit 1", exercises: [] }],
});

/** A1 → A2 → B1 → B2 … als Vorschlag für die nächste Übung */
function nextGroup(prev: string | undefined): string {
  const m = /^([A-Z])(\d+)$/.exec(prev ?? "");
  if (!m) return "A1";
  return Number(m[2]) % 2 === 1 ? `${m[1]}${Number(m[2]) + 1}` : `${String.fromCharCode(m[1].charCodeAt(0) + 1)}1`;
}

/* ---------- Plan-Editor ---------- */

function PlanForm({ plan, onSaved, onDeleted, memberId }: { plan: PlanDraft; onSaved: (id: string) => void; onDeleted: () => void; memberId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState<PlanDraft>(() => {
    const { logs, ...rest } = plan; // Logs werden getrennt gepflegt
    void logs;
    return structuredClone(rest);
  });
  const [base, setBase] = useState(() => JSON.stringify(value));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(value) !== base;
  useUnsavedGuard(dirty);

  const upd = <K extends keyof PlanDraft>(k: K, v: PlanDraft[K]) => setValue((p) => ({ ...p, [k]: v }));
  const updDay = (di: number, fn: (d: PlanDay) => PlanDay) => setValue((p) => ({ ...p, days: p.days.map((d, i) => (i === di ? fn(d) : d)) }));
  const updEx = (di: number, ei: number, patch: Partial<Exercise>) => updDay(di, (d) => ({ ...d, exercises: d.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) }));
  const moveEx = (di: number, ei: number, dir: number) =>
    updDay(di, (d) => {
      const ex = d.exercises.slice();
      const [it] = ex.splice(ei, 1);
      ex.splice(ei + dir, 0, it);
      return { ...d, exercises: ex };
    });

  async function save() {
    setBusy(true);
    try {
      const body = { ...value, id: value.id || undefined };
      const res = await adminApi<{ id: string }>("POST", `/api/admin/members/${memberId}/plans`, body);
      const saved = { ...value, id: res.id };
      setValue(saved);
      setBase(JSON.stringify(saved));
      toast.success("Plan gespeichert.");
      router.refresh();
      onSaved(res.id);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!value.id || !window.confirm("Plan samt Trainingslogs wirklich löschen? Das lässt sich nicht rückgängig machen.")) return;
    setBusy(true);
    try {
      await adminApi("DELETE", `/api/admin/members/${memberId}/plans/${value.id}`);
      toast.success("Plan gelöscht.");
      router.refresh();
      onDeleted();
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="adm-form wide">
      <div className="adm-row">
        <div className="adm-field">
          <label htmlFor="pl-t">Titel *</label>
          <input id="pl-t" type="text" value={value.title} maxLength={120} onChange={(e) => upd("title", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="pl-s">Start *</label>
          <input id="pl-s" type="date" value={value.start} onChange={(e) => upd("start", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="pl-e">Ende</label>
          <input id="pl-e" type="date" value={value.end ?? ""} onChange={(e) => upd("end", e.target.value || null)} />
        </div>
        <div className="adm-field">
          <label htmlFor="pl-st">Status</label>
          <select id="pl-st" value={value.status} onChange={(e) => upd("status", e.target.value as Plan["status"])}>
            <option value="active">Aktiv</option>
            <option value="done">Abgeschlossen</option>
          </select>
        </div>
      </div>
      <div className="adm-field">
        <label htmlFor="pl-g">Ziel</label>
        <input id="pl-g" type="text" value={value.goal ?? ""} maxLength={300} onChange={(e) => upd("goal", e.target.value)} />
      </div>
      <div className="adm-field">
        <label htmlFor="pl-n">Hinweis zum Plan</label>
        <textarea id="pl-n" rows={2} value={value.note ?? ""} maxLength={1000} onChange={(e) => upd("note", e.target.value)} />
      </div>

      {value.days.map((d, di) => (
        <section key={d.id} className="adm-card">
          <header>
            <div className="adm-field" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor={`d-${di}`}>Einheit</label>
              <input id={`d-${di}`} type="text" value={d.name} maxLength={80} onChange={(e) => updDay(di, (x) => ({ ...x, name: e.target.value }))} />
            </div>
            <button type="button" className="btn danger adm-b sm" disabled={value.days.length <= 1 && d.exercises.length === 0} onClick={() => window.confirm(`Einheit „${d.name}“ entfernen?`) && setValue((p) => ({ ...p, days: p.days.filter((_, i) => i !== di) }))}>
              Einheit entfernen
            </button>
          </header>
          <div className="adm-ex-scroll">
            <div className="adm-plan-ex head" aria-hidden="true">
              <span>Gruppe</span>
              <span>Übung</span>
              <span>Sätze</span>
              <span>Wdh.</span>
              <span>Tempo</span>
              <span>Pause (s)</span>
              <span>Notiz</span>
              <span />
            </div>
            {d.exercises.map((e, ei) => (
              <div key={e.id} className="adm-plan-ex">
                <input aria-label="Gruppe (A1, A2 …)" value={e.group} maxLength={6} onChange={(ev) => updEx(di, ei, { group: ev.target.value.toUpperCase() })} />
                <input aria-label="Übung" value={e.name} maxLength={120} onChange={(ev) => updEx(di, ei, { name: ev.target.value })} />
                <input aria-label="Sätze" type="number" inputMode="numeric" min={0} max={20} value={e.sets} onChange={(ev) => updEx(di, ei, { sets: Number(ev.target.value) })} />
                <input aria-label="Wiederholungen" value={e.reps} maxLength={20} placeholder="6-8" onChange={(ev) => updEx(di, ei, { reps: ev.target.value })} />
                <input aria-label="Tempo" value={e.tempo} maxLength={12} placeholder="4010" onChange={(ev) => updEx(di, ei, { tempo: ev.target.value })} />
                <input aria-label="Pause in Sekunden" type="number" inputMode="numeric" min={0} max={900} value={e.rest} onChange={(ev) => updEx(di, ei, { rest: Number(ev.target.value) })} />
                <input aria-label="Notiz" value={e.note ?? ""} maxLength={300} onChange={(ev) => updEx(di, ei, { note: ev.target.value })} />
                <span className="adm-actions" style={{ flexWrap: "nowrap", gap: 4 }}>
                  <button type="button" className="adm-iconbtn" aria-label="Übung nach oben" disabled={ei === 0} onClick={() => moveEx(di, ei, -1)}>↑</button>
                  <button type="button" className="adm-iconbtn" aria-label="Übung nach unten" disabled={ei === d.exercises.length - 1} onClick={() => moveEx(di, ei, 1)}>↓</button>
                  <button type="button" className="adm-iconbtn" aria-label="Übung entfernen" onClick={() => updDay(di, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== ei) }))}>×</button>
                </span>
              </div>
            ))}
          </div>
          <div>
            <button type="button" className="btn btn-ghost adm-b sm" onClick={() => updDay(di, (x) => ({ ...x, exercises: [...x.exercises, { id: `e_${uid()}`, group: nextGroup(x.exercises[x.exercises.length - 1]?.group), name: "", sets: 4, reps: "6-8", tempo: "", rest: 90, note: "" }] }))}>
              + Übung
            </button>
          </div>
        </section>
      ))}
      <div>
        <button type="button" className="btn btn-ghost adm-b" onClick={() => setValue((p) => ({ ...p, days: [...p.days, { id: `d_${uid()}`, name: `Einheit ${p.days.length + 1}`, exercises: [] }] }))}>
          + Einheit
        </button>
      </div>

      <div className="adm-bar">
        <button type="button" className="btn btn-primary adm-b" disabled={busy || !dirty} onClick={save}>
          {busy ? "Speichert …" : "Plan speichern"}
        </button>
        {dirty ? <span className="dirty" role="status">Ungespeicherte Änderungen</span> : <span className="hint">Alles gespeichert.</span>}
        <span className="spacer" />
        {value.id && (
          <button type="button" className="btn danger adm-b" disabled={busy} onClick={del}>
            Plan löschen
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Trainingslog ---------- */

type Cell = number | "" | null;
type SetDraft = Partial<Record<SetCol, Cell>>;
const COLS: { k: SetCol; l: string; step?: string }[] = [
  { k: "reps", l: "Wdh." },
  { k: "kg", l: "kg", step: "0.5" },
  { k: "sec", l: "Sek." },
  { k: "m", l: "Meter" },
  { k: "kcal", l: "kcal" },
];

function LogForm({ plan, log, previous, memberId, onDone }: { plan: Plan; log: TrainingLog | null; previous: TrainingLog[]; memberId: string; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [dayId, setDayId] = useState(log?.dayId ?? plan.days[0]?.id ?? "");
  const [date, setDate] = useState(log?.date ?? iso(new Date()));
  const [note, setNote] = useState(log?.note ?? "");
  const day = plan.days.find((d) => d.id === dayId);
  const [sets, setSets] = useState<Record<string, SetDraft[]>>(() => {
    const out: Record<string, SetDraft[]> = {};
    for (const [id, list] of Object.entries(log?.sets ?? {})) out[id] = list.map((s) => ({ ...s }));
    return out;
  });
  const [cols, setCols] = useState<Record<string, SetCol[]>>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty);

  const prevFor = (exId: string, i: number): SetValue | undefined => {
    const l = [...previous].filter((p) => p.id !== log?.id && p.date <= date).sort((a, z) => z.date.localeCompare(a.date)).find((p) => p.sets[exId]?.length);
    return l?.sets[exId]?.[i];
  };
  const colsOf = (ex: Exercise): SetCol[] => cols[ex.id] ?? defaultColumns(ex, (sets[ex.id] ?? []) as SetValue[]);
  const setsOf = (ex: Exercise): SetDraft[] => sets[ex.id] ?? Array.from({ length: Math.max(1, ex.sets) }, () => ({}));

  const setCell = (ex: Exercise, i: number, col: SetCol, raw: string) => {
    setDirty(true);
    setSets((s) => {
      const list = setsOf(ex).map((x) => ({ ...x }));
      list[i] = { ...list[i], [col]: raw === "" ? "" : Number(raw.replace(",", ".")) };
      return { ...s, [ex.id]: list };
    });
  };

  async function save() {
    if (!day) return toast.error("Bitte wähle eine Einheit.");
    const payload: Record<string, SetValue[]> = {};
    for (const ex of day.exercises) {
      const list = (sets[ex.id] ?? []).map((s) => {
        const v: SetValue = {};
        for (const c of ["reps", "kg", "sec", "m", "kcal"] as SetCol[]) {
          const x = s[c];
          if (typeof x === "number" && Number.isFinite(x)) v[c] = x;
        }
        return v;
      });
      if (list.some((s) => Object.keys(s).length)) payload[ex.id] = list;
    }
    setBusy(true);
    try {
      await adminApi("POST", `/api/admin/members/${memberId}/logs`, { id: log?.id, planId: plan.id, dayId, date, note, sets: payload });
      toast.success("Training gespeichert.");
      setDirty(false);
      router.refresh();
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-form wide">
      <div className="adm-row">
        <div className="adm-field">
          <label htmlFor="lg-d">Datum</label>
          <input id="lg-d" type="date" value={date} onChange={(e) => { setDate(e.target.value); setDirty(true); }} />
        </div>
        <div className="adm-field">
          <label htmlFor="lg-day">Einheit</label>
          <select id="lg-day" value={dayId} disabled={!!log} onChange={(e) => { setDayId(e.target.value); setSets({}); setCols({}); setDirty(true); }}>
            {plan.days.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {day?.exercises.length === 0 && <p className="adm-empty">Diese Einheit hat noch keine Übungen. Lege sie zuerst im Plan an.</p>}
      {day?.exercises.map((ex) => {
        const active = colsOf(ex);
        return (
          <div key={ex.id} className="adm-log-ex">
            <h4>
              <span className="acc">{ex.group}</span> {ex.name}
              <small>
                {ex.sets} × {ex.reps}
                {ex.tempo ? ` · Tempo ${ex.tempo}` : ""}
              </small>
            </h4>
            <div className="adm-chips" role="group" aria-label={`Spalten für ${ex.name}`}>
              {COLS.map((c) => (
                <button key={c.k} type="button" className={active.includes(c.k) ? "on" : ""} aria-pressed={active.includes(c.k)} onClick={() => setCols((x) => ({ ...x, [ex.id]: active.includes(c.k) ? active.filter((y) => y !== c.k) : COLS.map((z) => z.k).filter((y) => y === c.k || active.includes(y)) }))}>
                  {c.l}
                </button>
              ))}
            </div>
            <div className="adm-sets">
              {setsOf(ex).map((s, i) => (
                <div key={i} className="adm-set">
                  <span className="n">{i + 1}</span>
                  {COLS.filter((c) => active.includes(c.k)).map((c) => {
                    const p = prevFor(ex.id, i)?.[c.k];
                    return (
                      <label key={c.k}>
                        {c.l}
                        <input type="text" inputMode="decimal" aria-label={`${ex.name}, Satz ${i + 1}, ${c.l}`} value={s[c.k] ?? ""} placeholder={p != null ? String(p) : ""} onChange={(e) => setCell(ex, i, c.k, e.target.value)} />
                      </label>
                    );
                  })}
                  {setsOf(ex).length > 1 && (
                    <button type="button" className="adm-iconbtn" aria-label={`Satz ${i + 1} entfernen`} onClick={() => { setDirty(true); setSets((st) => ({ ...st, [ex.id]: setsOf(ex).filter((_, j) => j !== i) })); }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div>
                <button type="button" className="btn btn-ghost adm-b sm" onClick={() => { setDirty(true); setSets((st) => ({ ...st, [ex.id]: [...setsOf(ex), {}] })); }}>
                  + Satz
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="adm-field">
        <label htmlFor="lg-n">Notiz zur Einheit</label>
        <input id="lg-n" type="text" value={note} maxLength={500} onChange={(e) => { setNote(e.target.value); setDirty(true); }} />
      </div>
      <div className="adm-bar">
        <button type="button" className="btn btn-primary adm-b" disabled={busy || !day} onClick={save}>
          {busy ? "Speichert …" : log ? "Training aktualisieren" : "Training speichern"}
        </button>
        <button type="button" className="btn btn-ghost adm-b" onClick={() => { if (!dirty || window.confirm("Eingaben verwerfen?")) { setDirty(false); onDone(); } }}>
          Abbrechen
        </button>
        {dirty && <span className="dirty" role="status">Ungespeicherte Eingaben</span>}
      </div>
    </div>
  );
}

function LogsPanel({ plan, memberId }: { plan: Plan; memberId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null); // Log-ID, NEW oder null
  const logs = useMemo(() => [...plan.logs].sort((a, z) => z.date.localeCompare(a.date)), [plan.logs]);
  const exName = (id: string): string => plan.days.flatMap((d) => d.exercises).find((e) => e.id === id)?.name ?? "Übung";

  async function del(l: TrainingLog) {
    if (!window.confirm(`Training vom ${fmtDate(l.date)} löschen?`)) return;
    try {
      await adminApi("DELETE", `/api/admin/members/${memberId}/logs/${l.id}?plan=${plan.id}`);
      toast.success("Training gelöscht.");
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <section className="adm-card">
      <header>
        <h2>Trainingslogs</h2>
        {editing === null && (
          <button type="button" className="btn btn-primary adm-b" onClick={() => setEditing(NEW)}>
            + Training eintragen
          </button>
        )}
      </header>
      {editing !== null && <LogForm key={editing} plan={plan} log={editing === NEW ? null : (plan.logs.find((l) => l.id === editing) ?? null)} previous={plan.logs} memberId={memberId} onDone={() => setEditing(null)} />}
      {editing === null &&
        (logs.length ? (
          <ul className="adm-list">
            {logs.map((l) => {
              const day = plan.days.find((d) => d.id === l.dayId);
              const entries = Object.entries(l.sets);
              return (
                <li key={l.id}>
                  <div className="t">
                    <b>
                      {weekdayDate(l.date)} · {day?.name ?? "Einheit"}
                    </b>
                    <small>{entries.length ? entries.slice(0, 3).map(([id, s]) => `${exName(id)}: ${setText(s[0])}`).join(" · ") + (entries.length > 3 ? " …" : "") : "ohne Werte"}</small>
                  </div>
                  <div className="adm-actions">
                    <button type="button" className="btn btn-ghost adm-b sm" onClick={() => setEditing(l.id)}>
                      Bearbeiten
                    </button>
                    <button type="button" className="btn danger adm-b sm" onClick={() => del(l)}>
                      Löschen
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="adm-empty">Noch kein Training eingetragen.</p>
        ))}
    </section>
  );
}

/* ---------- Tab ---------- */

export function PlansAdmin({ memberId, plans }: { memberId: string; plans: Plan[] }) {
  const sorted = useMemo(() => [...plans].sort((a, z) => z.start.localeCompare(a.start)), [plans]);
  const [sel, setSel] = useState<string>(sorted.find((p) => p.status === "active")?.id ?? sorted[0]?.id ?? NEW);
  const [formKey, setFormKey] = useState(0);
  const plan = plans.find((p) => p.id === sel);

  const pick = (id: string) => {
    if (id === sel) return;
    setSel(id);
    setFormKey((k) => k + 1);
  };

  return (
    <div className="adm-split">
      <div>
        <div className="adm-actions" style={{ marginBottom: 12 }}>
          <button type="button" className="btn btn-primary adm-b" onClick={() => pick(NEW)}>
            + Neuer Plan
          </button>
        </div>
        <div className="adm-pick">
          {sorted.map((p) => (
            <button key={p.id} type="button" className={sel === p.id ? "on" : ""} onClick={() => pick(p.id)}>
              <b>{p.title}</b>
              <small>
                ab {fmtDate(p.start)} · {p.status === "active" ? "aktiv" : "abgeschlossen"} · {p.logs.length} Logs
              </small>
            </button>
          ))}
          {sorted.length === 0 && <p className="adm-empty">Noch kein Plan.</p>}
        </div>
      </div>
      <div className="adm-listed" style={{ gap: 22 }}>
        {plan && (
          <div className="adm-actions">
            <Pill tone={plan.status === "active" ? "ok" : "off"}>{plan.status === "active" ? "Aktiv" : "Abgeschlossen"}</Pill>
          </div>
        )}
        <section className="adm-card">
          <header>
            <h2>{plan ? "Plan bearbeiten" : "Neuer Plan"}</h2>
          </header>
          <PlanForm key={`${formKey}`} plan={plan ?? blankPlan(plans.length + 1)} memberId={memberId} onSaved={(id) => setSel(id)} onDeleted={() => pick(NEW)} />
        </section>
        {plan && <LogsPanel key={plan.id} plan={plan} memberId={memberId} />}
      </div>
    </div>
  );
}
